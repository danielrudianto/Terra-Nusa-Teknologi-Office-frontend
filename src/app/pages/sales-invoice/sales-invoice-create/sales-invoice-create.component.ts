import { Component, ViewChild, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ClientSelectorComponent } from 'src/app/components/client-selector/client-selector.component';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { ApiService } from 'src/app/services/api.service';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Alignment, Margins, PageBreak, PageSize } from 'pdfmake/interfaces';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { ProjectLookupService } from 'src/app/services/project-lookup.service';
import { PILIHAN_CETAK_TERPISAH } from 'src/app/constants/pilihan-faktur';

pdfMake.vfs = pdfFonts.vfs;

@Component({
  selector: 'app-sales-invoice-create',
  standalone: true,
  providers: [provideNgxMask()],
  templateUrl: './sales-invoice-create.component.html',
  styleUrl: './sales-invoice-create.component.scss',
  imports: [
    HeaderTitleComponent,
    ProjectSelectorComponent,
    NgxMaskDirective,
    TranslatePipe,
    MatSelectModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDatepickerModule,
  ],
})
export class SalesInvoiceCreateComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private projectLookup: ProjectLookupService,
  ) {}

  bankAccounts: any[] = [];
  isSubmitting: boolean = false;
  /**
   * Seluruh bagian harus sah, bukan bagian pembayarannya saja.
   *
   * Bentuk lama memakai `mat-stepper` dengan `[linear]="false"` — langkahnya
   * boleh dilompati — sementara tombol simpan hanya memeriksa
   * `paymentFormGroup`. Faktur tanpa klien, tanpa tanggal, dan tanpa DPP
   * karena itu dapat terkirim asal rekeningnya terisi.
   */
  get isValid(): boolean {
    return (
      this.metaFormGroup.valid &&
      this.valueFormGroup.valid &&
      this.paymentFormGroup.valid
    );
  }

  readonly pilihanCetakTerpisah = PILIHAN_CETAK_TERPISAH;

  /** Faktur pajaknya dicetak terpisah dari invoicenya. */
  get cetakTerpisah(): boolean {
    return this.valueFormGroup.get('separatedInvoice')?.value === true;
  }

  /**
   * Bagian yang belum sah, disebut namanya.
   *
   * Tombol simpan mati sampai KETIGA bagiannya benar, dan sampai sekarang
   * tidak ada satu pun tanda mengapa. Isian yang salah bisa berada di kartu
   * yang sudah tergulir jauh ke atas — yang menekan tombolnya hanya melihat
   * tombol yang tidak menanggapi, dan itu terbaca sebagai kerusakan.
   */
  get bagianKurang(): string[] {
    const kurang: string[] = [];
    if (this.metaFormGroup.invalid) {
      kurang.push('salesInvoiceCreate.sectionInvoiceDetail');
    }
    if (this.valueFormGroup.invalid) {
      kurang.push('salesInvoiceCreate.sectionValueTax');
    }
    if (this.paymentFormGroup.invalid) {
      kurang.push('salesInvoiceCreate.sectionPayment');
    }
    return kurang;
  }

  /**
   * Nomor fakturnya terisi tetapi TIDAK sesuai pola.
   *
   * Dibedakan dari "belum diisi": polanya ditolak tanpa pesan di mana pun,
   * sehingga yang sudah mengisinya menyangka nomornya sudah benar dan mencari
   * kesalahannya di isian lain.
   *
   * Contoh bentuk yang benar disebutkan di layar, bukan hanya aturannya —
   * "001-INV-MICZ-VIII-2026" lebih cepat dicocokkan daripada uraian pola.
   */
  get nomorTidakSesuai(): boolean {
    const c = this.metaFormGroup.get('name');
    return !!c && !!c.value && c.hasError('pattern');
  }

  metaFormGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    name: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^[0-9]{3}-INV-[A-Z0-9]{4,5}-(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)-20[0-9]{2}$/,
      ),
      Validators.maxLength(100),
    ]),
    projectName: new FormControl('', Validators.required),
    description: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    spkNumber: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    clientID: new FormControl('', Validators.required),
    clientName: new FormControl('', Validators.required),
    clientAddress: new FormControl('', Validators.required),
    clientNPWP: new FormControl(''),
  });

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppnPercentage: new FormControl(0, Validators.required),
    ppnValue: new FormControl(0, Validators.required),
    pphCode: new FormControl(''),
    pphTaxObjectName: new FormControl(''),
    pphPercentage: new FormControl(0, Validators.required),
    pphValue: new FormControl(0, Validators.required),
    bpjs: new FormControl(0, [Validators.required, Validators.min(0)]),
    total: new FormControl(0, Validators.required),
    // Nama isian mengikuti kolomnya: `separatedInvoice`, bukan `separate`.
    // Nama yang berbeda antara layar dan server membuat nilainya mudah
    // tertinggal saat muatan disusun — dan itulah yang terjadi.
    separatedInvoice: new FormControl(false),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    paymentTotal: new FormControl(0, Validators.required),
    bankAccountID: new FormControl('', Validators.required),
    bankName: new FormControl('', Validators.required),
    bankAccountNumber: new FormControl('', Validators.required),
    bankAccountName: new FormControl('', Validators.required),
  });

  /**
   * Nilai form dari <input> selalu string. Tanpa konversi, `dpp + ppnValue`
   * jadi penggabungan teks ("1000000" + 110000 = "1000000110000") sehingga
   * total dan payment total ngawur.
   */
  private num(group: FormGroup, control: string): number {
    return Number(group.get(control)?.value) || 0;
  }

  /** Hitung ulang total & payment total dari nilai form saat ini. */
  private recalculate(): void {
    const dpp = this.num(this.valueFormGroup, 'dpp');
    const ppnValue =
      (dpp * this.num(this.valueFormGroup, 'ppnPercentage')) / 100;
    const pphValue =
      (dpp * this.num(this.valueFormGroup, 'pphPercentage')) / 100;
    const bpjsValue = this.num(this.valueFormGroup, 'bpjs');

    this.valueFormGroup.patchValue(
      { ppnValue, pphValue, total: dpp + ppnValue },
      { emitEvent: false },
    );
    this.paymentFormGroup.patchValue({
      paymentTotal: dpp + ppnValue - pphValue - bpjsValue,
    });
  }

  ngOnInit(): void {
    this.fetchBankAccounts();
  }

  ngAfterViewInit(): void {
    this.metaFormGroup.controls['name'].valueChanges.subscribe((value) => {
      // if it matches the pattern, set the value in the valueFormGroup
      if (
        /^[0-9]{3}-INV-[A-Z0-9]{4,5}-(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)-20[0-9]{2}$/.test(
          value,
        )
      ) {
        this.metaFormGroup.patchValue({
          projectName: value.split('-')[2],
        });
      }
    });

    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        const dpp = Number(value) || 0;
        const ppnPercentage = this.num(this.valueFormGroup, 'ppnPercentage');
        const pphPercentage = this.num(this.valueFormGroup, 'pphPercentage');
        const ppnValue = (dpp * ppnPercentage) / 100;
        const pphValue = (dpp * pphPercentage) / 100;
        const bpjsValue = this.num(this.valueFormGroup, 'bpjs');

        this.valueFormGroup.patchValue({
          pphValue: pphValue,
          ppnValue: ppnValue,
          total: dpp + ppnValue,
        });

        this.paymentFormGroup.patchValue({
          paymentTotal: dpp + ppnValue - pphValue - bpjsValue,
        });
      }
    });

    this.valueFormGroup.controls['ppnPercentage'].valueChanges.subscribe(
      (value) => {
        if (value) {
          const dpp = this.num(this.valueFormGroup, 'dpp');
          const ppnValue = (dpp * (Number(value) || 0)) / 100;
          this.valueFormGroup.patchValue({
            ppnValue: ppnValue,
            total: dpp + ppnValue,
          });

          const pphValue = this.num(this.valueFormGroup, 'pphValue');
          const bpjsValue = this.num(this.valueFormGroup, 'bpjs');

          this.paymentFormGroup.patchValue({
            paymentTotal: dpp + ppnValue - pphValue - bpjsValue,
          });
        }
      },
    );

    // BPJS ikut mengurangi payment total, jadi harus memicu hitung ulang juga.
    this.valueFormGroup.controls['bpjs'].valueChanges.subscribe(() => {
      this.recalculate();
    });

    this.valueFormGroup.controls['pphPercentage'].valueChanges.subscribe(
      (value) => {
        if (value) {
          const dpp = this.num(this.valueFormGroup, 'dpp');
          const ppnPercentage = this.num(this.valueFormGroup, 'ppnPercentage');
          const ppnValue = (dpp * ppnPercentage) / 100;
          const pphValue = (dpp * (Number(value) || 0)) / 100;
          this.valueFormGroup.patchValue({
            pphValue: pphValue,
            total: dpp + ppnValue,
          });

          const bpjsValue = this.num(this.valueFormGroup, 'bpjs');

          this.paymentFormGroup.patchValue({
            paymentTotal: dpp + ppnValue - pphValue - bpjsValue,
          });
        }
      },
    );
  }

  /**
   * Nomor SPK proyek ini, diambil dari baris KONTRAKNYA.
   *
   * Bukan dari faktur lama: faktur menyalin nomor yang diketik, sehingga
   * salah ketik satu kali akan terus diusulkan pada faktur berikutnya —
   * kesalahan yang menyebar sendiri. Baris kontrak adalah tempat nomor itu
   * dicatat pertama kali, dan satu-satunya yang dapat dipercaya.
   */
  nomorSpk: Array<{ nomor: string; jenis: string; tanggal: string }> = [];

  /** Faktur yang sudah terbit untuk proyek ini; kosong sebelum proyek dipilih. */
  tagihanLalu: any[] = [];
  memuatTagihan = false;

  /**
   * Proyek dipilih — isi kliennya, lalu tampilkan tagihan yang sudah ada.
   *
   * Klien melekat pada proyeknya; mengetik ulang berarti menyalin dari layar
   * sebelah, dan yang disalin tangan cepat atau lambat berbeda dari
   * sumbernya — pada faktur, itu berarti NPWP yang tidak cocok dengan yang
   * dilaporkan.
   *
   * Riwayat tagihan ditampilkan karena tagih ganda adalah kesalahan yang
   * paling mahal di sini: pelanggan membayar dua kali untuk pekerjaan yang
   * sama, dan yang menemukannya biasanya pelanggan, bukan AKN.
   */
  onProyekBerubah(kode: string): void {
    this.tagihanLalu = [];
    const proyek: any = this.projectLookup.cari(String(kode || ''));

    if (proyek?.clientID) {
      /*
       * Klien TIDAK ditimpa bila sudah diisi sendiri.
       *
       * Sebagian faktur ditagihkan ke pihak lain — induk perusahaan, atau
       * pemberi kerja yang berbeda dari pemilik proyeknya. Menimpanya
       * menghapus keterangan yang justru disengaja.
       */
      if (!this.metaFormGroup.value.clientID) {
        this.isiKlien(proyek.clientID);
      }
    }

    if (kode) {
      this.muatTagihan(String(kode));
      if (proyek?.id) this.muatNomorSpk(proyek.id);
    } else {
      this.nomorSpk = [];
    }
  }

  /** Ambil data klien lalu isikan; dipakai saat proyek dipilih. */
  private isiKlien(clientID: number): void {
    this.apiService.get(`clients/${clientID}`, {}).subscribe({
      next: (c: any) => {
        if (!c) return;
        this.metaFormGroup.patchValue({
          clientID: c.id,
          clientName: `${c.name}, ${c.prefix}`,
          clientAddress: `${c.address}, ${c.city}, ${c.province}`,
          clientNPWP: c.npwp,
        });
      },
      // Gagal memuat TIDAK menghalangi pengisian: kliennya masih dapat
      // dipilih tangan seperti sebelumnya.
      error: () => {},
    });
  }

  private muatNomorSpk(projectId: number): void {
    this.apiService.get(`projects/${projectId}`, {}).subscribe({
      next: (res: any) => {
        this.nomorSpk = (res?.contracts ?? [])
          .filter((k: any) => String(k?.documentNumber || '').trim())
          .map((k: any) => ({
            nomor: String(k.documentNumber).trim(),
            jenis: String(k.documentType || ''),
            tanggal: String(k.date || ''),
          }));
      },
      // Gagal memuat TIDAK menghalangi pengisian: nomornya masih dapat
      // diketik tangan seperti sebelumnya.
      error: () => (this.nomorSpk = []),
    });
  }

  private muatTagihan(kode: string): void {
    this.memuatTagihan = true;
    this.apiService.get(`purchases/report/project/${kode}`, {}).subscribe({
      next: (res: any) => {
        this.tagihanLalu = res?.sales_invoices ?? [];
        this.memuatTagihan = false;
      },
      error: () => {
        this.tagihanLalu = [];
        this.memuatTagihan = false;
      },
    });
  }

  /** Total yang sudah ditagihkan pada proyek ini, termasuk PPN. */
  get totalTagihanLalu(): number {
    return this.tagihanLalu.reduce(
      (a, b: any) =>
        a + Number(b.dpp || 0) + (Number(b.ppn || 0) * Number(b.dpp || 0)) / 100,
      0,
    );
  }

  openClientSelector() {
    this.dialog
      .open(ClientSelectorComponent, {})
      .afterClosed()
      .subscribe((result) => {
        this.metaFormGroup.patchValue({
          clientName: `${result.name}, ${result.prefix}`,
          clientAddress: `${result.address}, ${result.city}, ${result.province}`,
          clientID: result.id,
          clientNPWP: result.npwp,
        });
      });
  }

  openPphSelector() {
    this.dialog
      .open(PphSelectorComponent, {
        // AKN penyedia jasa konstruksi; kode yang biasa dipakai diusulkan
        // lebih dulu, daftar lengkapnya tetap tersedia di bawahnya.
        data: { purchaseType: 'SALES' },
      })
      .afterClosed()
      .subscribe((result) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya sempat sama-sama menutup tanpa nilai, sehingga cabang di
         * bawah tidak berjalan dan PPh yang sudah terlanjur dipilih tidak
         * pernah hilang.
         */
        if (result?.hapus) {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObjectName: '',
            pphPercentage: 0,
          });
          return;
        }
        if (result) {
          this.valueFormGroup.patchValue({
            pphCode: result.code,
            pphTaxObjectName: result.taxObjectName,
            pphPercentage: result.tariff,
            pphValue:
              (this.num(this.valueFormGroup, 'dpp') * result.tariff) / 100,
          });
        } else {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObjectName: '',
            pphPercentage: 0,
            pphValue: 0,
          });
        }
      });
  }

  fetchBankAccounts() {
    this.apiService
      .get('banks/all', {})
      .subscribe({
        next: (data: any) => {
          this.bankAccounts = data;
        },
        error: (error) => {
          console.error('Error fetching bank accounts:', error);
        },
      })
      .add(() => {});
  }

  onBankAccountSelected(event: any) {
    const value = event.option.value;
    this.paymentFormGroup.patchValue({
      bankAccountID: value.id,
      bankName: value.bankName,
      bankAccountNumber: value.bankAccountNumber,
      bankAccountName: value.bankAccountName,
    });
  }

  displayBankAccount(account: any): string {
    return `${account.bankAccountNumber} - ${account.bankAccountName} (${account.bankName})`;
  }

  checkExisting() {
    this.isSubmitting = true;
    this.snackBar.open(
      this.translate.instant('notify.checkingInvoice'), 'Close', {
      duration: 3000,
    });
    return this.apiService
      .get('sales-invoices/exists', {
        name: this.metaFormGroup.value.name,
        clientID: this.metaFormGroup.value.clientID,
        description: this.metaFormGroup.value.description,
        projectName: this.metaFormGroup.value.projectName,
      })
      .pipe(
        tap((data: any) => {
          if (data.exists) {
            this.snackBar.open(
              `An invoice with the same details already exists. [${data.field}]`,
              'Close',
              {
                duration: 5000, // Longer duration for important messages
              },
            );
          }
        }),
        map((data: any) => {
          return !data.exists; // Returns true if invoice does NOT exist, false if it DOES exist
        }),
        catchError((error) => {
          console.error('Error checking existing invoice:', error);
          this.snackBar.open(
      this.translate.instant('notify.loadFailed'),
            'Close',
            {
              duration: 5000,
            },
          );
          return of(false); // On error, assume it exists or check failed, so return false
        }),
        finalize(() => {
          this.isSubmitting = false;
        }),
      );
  }

  onSubmit() {
    this.checkExisting().subscribe((validation) => {
      if (validation) {
        this.isSubmitting = true;
        // need to extract the date to only YYYY-MM-DD format
        const date = new Date(this.metaFormGroup.value.date);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        this.apiService
          .post('sales-invoices', {
            name: this.metaFormGroup.value.name,
            date: formattedDate,
            projectName: this.metaFormGroup.value.projectName,
            description: this.metaFormGroup.value.description,
            spkNumber: this.metaFormGroup.value.spkNumber,
            clientID: this.metaFormGroup.value.clientID,
            dpp: this.valueFormGroup.value.dpp,
            ppn: this.valueFormGroup.value.ppnPercentage,
            pphCode:
              this.valueFormGroup.value.pphCode == ''
                ? null
                : this.valueFormGroup.value.pphCode,
            pphTaxObject: this.valueFormGroup.value.pphTaxObjectName
              ? this.valueFormGroup.value.pphTaxObjectName
              : null,
            pphPercentage: this.valueFormGroup.value.pphPercentage,
            bpjs: this.valueFormGroup.value.bpjs,
            bankAccountID: this.paymentFormGroup.value.bankAccountID,
            // Pilihan cetak terpisah ikut dikirim.
            //
            // Isiannya sudah lama ada di layar dan kolomnya sudah ada di
            // basis data, tetapi nilainya tidak pernah disertakan di sini —
            // penggunanya memilih, lalu pilihannya hilang tanpa galat.
            separatedInvoice: !!this.valueFormGroup.value.separatedInvoice,
          })
          .subscribe({
            next: (_) => {
              this.previewInvoice();

              // Ketiga langkah dikosongkan; sebelumnya `valueFormGroup`
              // direset dua kali sedangkan `paymentFormGroup` tidak sama
              // sekali, sehingga rekening bank faktur sebelumnya tertinggal
              // terisi pada faktur berikutnya.
              this.metaFormGroup.reset();
              this.valueFormGroup.reset();
              this.paymentFormGroup.reset();

              // Kembali ke atas: seluruh isian kini berada pada satu
              // halaman, sehingga yang perlu dikembalikan gulirannya — bukan
              // langkah yang sudah tidak ada.
              window.scrollTo({ top: 0, behavior: 'smooth' });

              this.snackBar.open(
      this.translate.instant('notify.createSuccess'),
                'Close',
                {
                  duration: 3000,
                },
              );
            },
            error: (error) => {
              console.error('Error creating sales invoice:', error);
              this.snackBar.open(
      this.translate.instant('notify.createFailed'), 'Close', {
                duration: 3000,
              });
            },
          })
          .add(() => {
            this.isSubmitting = false;
          });
      } else {
        this.isSubmitting = false;
      }
    });
  }

  previewInvoice() {
    const invoiceData = {
      meta: this.metaFormGroup.value,
      value: this.valueFormGroup.value,
      payment: this.paymentFormGroup.value,
    };

    console.log('Preview Invoice Data:', invoiceData);
    // Here you can implement the logic to preview the invoice, e.g., open a dialog with the invoice data
    const day = new Date(invoiceData.meta.date);
    // the day in Indonesian (e.g., "Senin", "Selasa", etc.)
    const daysInIndonesian = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
    ];

    const monthInIndonesian = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const dayInIndonesian = daysInIndonesian[day.getDay()];
    const dd = {
      pageSize: 'A4' as PageSize,
      pageMargins: [40, 5, 40, 20] as Margins,
      footer: {
        text: 'Office : Ruko Asia Tropis Blok AT 12 No 21,a Kota Harapan Indah Bekasi | Phone : 021 - 888 98 292 | Email : finance@alphakonstruksi.id',
        fontSize: 8,
        alignment: 'center' as Alignment,
      },
      content: [
        {
          image:
            'data:image/png;base64,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zu26665u5syZQWoyt9xyi3cIahuGYxBWQX333nuva9eunf/95ZdfDnLLEycAZs2a5Tp37uw++ugj//m3335zTz75pOvQoYPr06ePd/ajmADYZ599/Oc///zTh+YwytmzZ89KQ0LmzZvnBRHlOAejvmPGjAlyqyZJAHTr1s2nH3nkkX7mJg6ulefF9XJu2vDPP/8EuQvheiiTnZ3tP3/xxRfukUce8aLtzTff9KPfceDQI+aefvppP8rPPfnqq6/KBBn3/aGHHnLrrbeeF42EkfGZ+z179mxf5ueff/bn5p5Q3zvvvOPv64QJE3y+tY17GMd///3n87/88ssgpXIBQDgX94L7F74uwsroW5y7U6dO7sMPP6zQF8hnxok1IZURFgDYQQcdFPuMkgQAoXZcU1K43bvvvuvz7R4ZzAD169fPfy+4voEDB/q1C8wUheEesE6ia9euPnyMexcnxvl+cx777jIL1aNHD3+Pnn/+eX/vw7zyyitl3/eNN97Y9wme92uvvRaUWAjH2v1+7rnn3E8//RTklGfkyJG+Db///rv/zCwjx4T7MdfDveR6mB2kD86fPz/IFULUBxIAQqQQCICVVlrJbbHFFkFKPAcffLD/Jx/nTEYh3p+yOHa1hdCLZs2auaWXXto7qziNyy+/vHfM48Iy4gSAxfMfffTRPpxjmWWW8Z/NNthgA/fYY4+Vc5pwBP/3v//52QaEBwIofMzaa6/tnnjiiaD0QnCymK0Il8U22WSTWKcojjgBgKND2t577+3GjRsXpJbn448/jj03MyesnTAHHHDqyCP9tNNOq3AMo7nM3IQhzv2EE04oK8N95B7xOwISB++ee+4py8cQARj55rwiMsgjXv+www4rK2sOIaKCzziWceB0kn/11VcHKckCYPjw4W7PPff0eTjJCCRADO64444+HbMwuDXXXNM7nAaOPOmIlsowAdC0adOyazrrrLMqzIAkCYADDjjAp5vTG8X6RPiZ9O3b14fnkW7tx0izRfCs8bn77rt9fyWP75GVa9GihX+mYUaNGuXzjjrqKC/emP2z8tg666zjxZyBGA3nW39o1apVUML5tSwspubvTLgM36lLLrmkXL8ExA75V1xxRdmaHgxhipNPu+Kuh+8333UhRP0gASBEClFdAXD88cf7f7KE8VRFXQoAHHnqwkk1zjnnHJ+GMxUlTgAw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',
          width: 520,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          text: 'KWITANSI',
          bold: true,
          alignment: 'center' as Alignment,
          fontSize: 18,
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          text: `No. ${invoiceData.meta.name.replace('INV', 'FU')}`,
          bold: true,
          fontSize: 14,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 20] as Margins,
        },
        {
          text: `Pada hari ${dayInIndonesian}, tanggal ${day.getDate()} ${
            monthInIndonesian[day.getMonth()]
          } ${day.getFullYear()}, telah diterima dari:`,
          margin: [0, 0, 0, 20] as Margins,
          alignment: 'left' as Alignment,
        },
        {
          table: {
            widths: [150, 3, '*'],
            body: [
              [
                {
                  text: 'Nama',
                },
                {
                  text: ':',
                },
                {
                  text: invoiceData.meta.clientName,
                },
              ],
              [
                {
                  text: 'Alamat',
                },
                {
                  text: ':',
                },
                {
                  text: invoiceData.meta.clientAddress,
                },
              ],
              [
                {
                  text: 'Pembayaran',
                },
                {
                  text: ':',
                },
                {
                  text: `${invoiceData.meta.description} - ${invoiceData.meta.spkNumber}`,
                },
              ],
              [
                {
                  text: 'Jumlah',
                },
                {
                  text: ':',
                },
                {
                  text: `${new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(Math.round(parseFloat(invoiceData.value.total)))}`,
                  bold: true,
                },
              ],
              [
                {
                  text: 'Terbilang',
                },
                {
                  text: ':',
                },
                {
                  text: this.capitalizeWords(
                    this.toWords(invoiceData.value.total),
                  ),
                },
              ],
              [
                {
                  text: '\nPembayaran mohon dilakukan kepada:',
                  colSpan: 3,
                  margin: [0, 0, 0, 20] as Margins,
                  alignment: 'left' as Alignment,
                },
                {},
                {},
              ],
              [
                {
                  text: 'Bank',
                },
                {
                  text: ':',
                },
                {
                  text: invoiceData.payment.bankName,
                },
              ],
              [
                {
                  text: 'No. Acc.',
                },
                {
                  text: ':',
                },
                {
                  text: invoiceData.payment.bankAccountNumber,
                },
              ],
              [
                {
                  text: 'Atas Nama',
                },
                {
                  text: ':',
                },
                {
                  text: invoiceData.payment.bankAccountName,
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
        // create a divider line
        {
          table: {
            headerRows: 1,
            widths: ['*'],
            body: [[''], ['']],
          },
          layout: 'headerLineOnly',
          margin: [0, 20, 0, 20] as Margins,
        },
        {
          text: 'Hormat Kami,',
          alignment: 'left' as Alignment,
        },
        {
          text: 'PT. Alpha Konstruksi Nusantara',
          alignment: 'left' as Alignment,
          margin: [0, 0, 0, 80] as Margins,
        },
        {
          text: 'Michael Andi Rudianto',
          alignment: 'left' as Alignment,
        },
        {
          text: 'Direktur',
          alignment: 'left' as Alignment,
          pageBreak: 'after' as PageBreak,
        },
        {
          image:
            'data:image/png;base64,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zu26665u5syZQWoyt9xyi3cIahuGYxBWQX333nuva9eunf/95ZdfDnLLEycAZs2a5Tp37uw++ugj//m3335zTz75pOvQoYPr06ePd/ajmADYZ599/Oc///zTh+YwytmzZ89KQ0LmzZvnBRHlOAejvmPGjAlyqyZJAHTr1s2nH3nkkX7mJg6ulefF9XJu2vDPP/8EuQvheiiTnZ3tP3/xxRfukUce8aLtzTff9KPfceDQI+aefvppP8rPPfnqq6/KBBn3/aGHHnLrrbeeF42EkfGZ+z179mxf5ueff/bn5p5Q3zvvvOPv64QJE3y+tY17GMd///3n87/88ssgpXIBQDgX94L7F74uwsroW5y7U6dO7sMPP6zQF8hnxok1IZURFgDYQQcdFPuMkgQAoXZcU1K43bvvvuvz7R4ZzAD169fPfy+4voEDB/q1C8wUheEesE6ia9euPnyMexcnxvl+cx777jIL1aNHD3+Pnn/+eX/vw7zyyitl3/eNN97Y9wme92uvvRaUWAjH2v1+7rnn3E8//RTklGfkyJG+Db///rv/zCwjx4T7MdfDveR6mB2kD86fPz/IFULUBxIAQqQQCICVVlrJbbHFFkFKPAcffLD/Jx/nTEYh3p+yOHa1hdCLZs2auaWXXto7qziNyy+/vHfM48Iy4gSAxfMfffTRPpxjmWWW8Z/NNthgA/fYY4+Vc5pwBP/3v//52QaEBwIofMzaa6/tnnjiiaD0QnCymK0Il8U22WSTWKcojjgBgKND2t577+3GjRsXpJbn448/jj03MyesnTAHHHDqyCP9tNNOq3AMo7nM3IQhzv2EE04oK8N95B7xOwISB++ee+4py8cQARj55rwiMsgjXv+www4rK2sOIaKCzziWceB0kn/11VcHKckCYPjw4W7PPff0eTjJCCRADO64444+HbMwuDXXXNM7nAaOPOmIlsowAdC0adOyazrrrLMqzIAkCYADDjjAp5vTG8X6RPiZ9O3b14fnkW7tx0izRfCs8bn77rt9fyWP75GVa9GihX+mYUaNGuXzjjrqKC/emP2z8tg666zjxZyBGA3nW39o1apVUML5tSwspubvTLgM36lLLrmkXL8ExA75V1xxRdmaHgxhipNPu+Kuh+8333UhRP0gASBEClFdAXD88cf7f7KE8VRFXQoAHHnqwkk1zjnnHJ+GMxUlTgAw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',
          width: 520,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 20] as Margins,
        },
        {
          text: `Bekasi ${day.getDate()} ${
            monthInIndonesian[day.getMonth()]
          } ${day.getFullYear()}`,
          alignment: 'right' as Alignment,
        },
        {
          table: {
            widths: [250, '*'],
            body: [
              [
                {
                  text: 'Kepada Yth.',
                  alignment: 'left' as Alignment,
                },
                {},
              ],
              [
                {
                  text: invoiceData.meta.clientName,
                  alignment: 'left' as Alignment,
                  bold: true,
                },
                {},
              ],
              [
                {
                  text: invoiceData.meta.clientAddress,
                  alignment: 'left' as Alignment,
                },
                {},
              ],
            ],
          },
          layout: 'noBorders',
        },
        {
          text: 'INVOICE',
          bold: true,
          alignment: 'center' as Alignment,
          margin: [0, 20, 0, 10] as Margins,
          fontSize: 18,
        },
        {
          text: `No. ${invoiceData.meta.name}`,
          bold: true,
          fontSize: 14,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 20] as Margins,
        },
        {
          text: `Untuk ${invoiceData.meta.description} pekerjaan kami atas dasar SPK / PO / WO / LOA bernomor`,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          text: invoiceData.meta.spkNumber,
          bold: true,
          alignment: 'center' as Alignment,
          margin: [0, 0, 0, 10] as Margins,
        },
        {
          text: 'Dengan nilai sebagai berikut:',
          margin: [0, 0, 0, 10] as Margins,
          alignment: 'center' as Alignment,
        },
        {
          text: `${new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
          }).format(Math.round(parseFloat(invoiceData.value.total)))}`,
          margin: [0, 0, 0, 10] as Margins,
          alignment: 'center' as Alignment,
          bold: true,
        },
        {
          text: `(${this.capitalizeWords(
            this.toWords(invoiceData.value.total),
          )})`,
          margin: [0, 0, 0, 20] as Margins,
          alignment: 'center' as Alignment,
          bold: true,
        },
        // create a divider line
        {
          table: {
            headerRows: 1,
            widths: ['*'],
            body: [[''], ['']],
          },
          layout: 'headerLineOnly',
          margin: [0, 20, 0, 20] as Margins,
        },
        {
          table: {
            widths: [150, 3, '*'],
            body: [
              [
                {
                  text: 'Pembayaran mohon dilakukan kepada:',
                  alignment: 'left' as Alignment,
                  colSpan: 3,
                },
                {},
                {},
              ],
              [
                {
                  text: 'Bank',
                  alignment: 'left' as Alignment,
                },
                {
                  text: ':',
                  alignment: 'left' as Alignment,
                },
                {
                  text: invoiceData.payment.bankName,
                  alignment: 'left' as Alignment,
                },
              ],
              [
                {
                  text: 'No. Acc.',
                  alignment: 'left' as Alignment,
                },
                {
                  text: ':',
                  alignment: 'left' as Alignment,
                },
                {
                  text: invoiceData.payment.bankAccountNumber,
                  alignment: 'left' as Alignment,
                },
              ],
              [
                {
                  text: 'Atas Nama',
                  alignment: 'left' as Alignment,
                },
                {
                  text: ':',
                  alignment: 'left' as Alignment,
                },
                {
                  text: invoiceData.payment.bankAccountName,
                  alignment: 'left' as Alignment,
                },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 20] as Margins,
        },
        {
          text: 'Hormat Kami,',
          alignment: 'left' as Alignment,
        },
        {
          text: 'PT. Alpha Konstruksi Nusantara',
          alignment: 'left' as Alignment,
          margin: [0, 0, 0, 80] as Margins,
        },
        {
          text: 'Michael Andi Rudianto',
          alignment: 'left' as Alignment,
        },
        {
          text: 'Direktur',
          alignment: 'left' as Alignment,
          margin: [0, 0, 0, 20] as Margins,
        },
        // this.valueFormGroup.controls['pphValue'].value > 0
        //   ? {
        //       table: {
        //         widths: [75, 3, '*'],
        //         body: [
        //           [
        //             {
        //               text: '\nUntuk mempermudah proses administrasi, mohon untuk menggunakan kode Pajak Penghasilan (PPH) berikut:',
        //               alignment: 'left' as Alignment,
        //               colSpan: 3,
        //               fontSize: 10,
        //             },
        //             {},
        //             {},
        //           ],
        //           [
        //             {
        //               text: 'Kode PPh',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: ':',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: invoiceData.value.pphCode || 'N/A',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //           ],
        //           [
        //             {
        //               text: 'Objek PPh',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: ':',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: invoiceData.value.pphTaxObjectName || 'N/A',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //           ],
        //           [
        //             {
        //               text: 'Tarif PPh (%)',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: ':',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //             {
        //               text: invoiceData.value.pphPercentage
        //                 ? `${invoiceData.value.pphPercentage}%`
        //                 : 'N/A',
        //               alignment: 'left' as Alignment,
        //               fontSize: 10,
        //             },
        //           ],
        //         ],
        //       },
        //       layout: 'noBorders',
        //       margin: [0, 0, 0, 20] as Margins,
        //     }
        //   : {
        //       text: '',
        //     },
      ],
    };

    pdfMake.createPdf(dd).open({}, window.open(''));
  }

  toWords(value: number): string {
    const satuan = [
      '',
      'satu',
      'dua',
      'tiga',
      'empat',
      'lima',
      'enam',
      'tujuh',
      'delapan',
      'sembilan',
      'sepuluh',
      'sebelas',
    ];

    function spell(n: number): string {
      if (n < 12) {
        return satuan[n];
      } else if (n < 20) {
        return `${spell(n - 10)} belas`;
      } else if (n < 100) {
        return `${spell(Math.floor(n / 10))} puluh${
          n % 10 !== 0 ? ' ' + spell(n % 10) : ''
        }`;
      } else if (n < 200) {
        return `seratus${n > 100 ? ' ' + spell(n - 100) : ''}`;
      } else if (n < 1000) {
        return `${spell(Math.floor(n / 100))} ratus${
          n % 100 !== 0 ? ' ' + spell(n % 100) : ''
        }`;
      } else if (n < 2000) {
        return `seribu${n > 1000 ? ' ' + spell(n - 1000) : ''}`;
      } else if (n < 1_000_000) {
        return `${spell(Math.floor(n / 1000))} ribu${
          n % 1000 !== 0 ? ' ' + spell(n % 1000) : ''
        }`;
      } else if (n < 1_000_000_000) {
        return `${spell(Math.floor(n / 1_000_000))} juta${
          n % 1_000_000 !== 0 ? ' ' + spell(n % 1_000_000) : ''
        }`;
      } else if (n < 1_000_000_000_000) {
        return `${spell(Math.floor(n / 1_000_000_000))} miliar${
          n % 1_000_000_000 !== 0 ? ' ' + spell(n % 1_000_000_000) : ''
        }`;
      } else if (n < 1_000_000_000_000_000) {
        return `${spell(Math.floor(n / 1_000_000_000_000))} triliun${
          n % 1_000_000_000_000 !== 0 ? ' ' + spell(n % 1_000_000_000_000) : ''
        }`;
      } else {
        return 'nilai terlalu besar';
      }
    }

    if (value === 0) return 'nol rupiah';

    return `${spell(Math.round(value)).replace(/\s+/g, ' ').trim()} rupiah`;
  }

  capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
