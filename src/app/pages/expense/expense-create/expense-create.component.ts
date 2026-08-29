import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { nilaiUang } from '../../../utils/angka';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { banks, IBank } from 'src/app/utils/bank';
import { IPPh } from 'src/app/utils/pph';
import { ExpenseOpponentSelectorComponent } from '../../../components/expense-opponent-selector/expense-opponent-selector.component';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ExpenseCreateAdministrationComponent } from './expense-create-administration/expense-create-administration.component';
import { TranslatePipe } from '@ngx-translate/core';
import { BankAccountSelectorComponent } from '../../../components/bank-account-selector/bank-account-selector.component';

@Component({
  selector: 'app-expense-create',
  imports: [
    BankAccountSelectorComponent,
    TranslatePipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDividerModule,
    MatButtonModule,
    MatSlideToggleModule,
    HeaderTitleComponent,
    NgxMaskDirective,
  ],
  // `provideNgxMask()` WAJIB ada di komponen yang memakai mask;
  // mengimpor direktifnya saja tidak cukup — masknya diam.
  providers: [provideNgxMask()],
  templateUrl: './expense-create.component.html',
  styleUrl: './expense-create.component.scss',
  standalone: true,
})
export class ExpenseCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private decimalPipe: DecimalPipe,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;

  /** Mode ubah: aktif bila rute membawa :id (mis. /Expense/Create/42). */
  editMode = false;
  editId: number | null = null;

  isFinal: boolean = false;
  filteredOptions: IBank[] = [];
  options: IBank[] = banks;
  isSubmitting: boolean = false;
  bankAccounts: any[] = [];

  metaFormGroup: FormGroup = new FormGroup({
    invoiceName: new FormControl('', Validators.maxLength(100)),
    receiptName: new FormControl('', Validators.maxLength(100)),
    // Opsional: pemasok non-PKP tidak menerbitkan faktur pajak.
    taxInvoiceName: new FormControl('', Validators.maxLength(100)),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(500),
    ]),
    purchaseType: new FormControl('', Validators.required),
    opponentID: new FormControl(''),
    opponentName: new FormControl(''),
    opponentDescription: new FormControl(''),
    date: new FormControl(new Date(), Validators.required),
    dueDate: new FormControl(new Date(), Validators.required),
    // Masa yang ditanggung (untuk beban berkala). Default periode berjalan;
    // hanya dipakai bila kategorinya termasuk MASA_* (lihat `perluMasa`).
    masaBulan: new FormControl(new Date().getMonth() + 1),
    masaTahun: new FormControl(new Date().getFullYear()),
  });

  /**
   * Kategori beban berkala yang periodenya sering beda dari tanggal bayar.
   *
   * BULANAN: setoran PPN/PPh, iuran BPJS, premi asuransi.
   * TAHUNAN: PPh Badan lewat SPT Tahunan (masa = tahun pajaknya).
   *
   * Denda pajak SENGAJA tidak di sini: denda diakui pada saat ditetapkan
   * (tanggal dokumen), bukan menanggung suatu periode.
   */
  readonly KATEGORI_MASA_BULANAN = [
    '5.1.8.1',
    '5.1.8.2',
    '5.1.8.3',
    '6.4.2',
    '6.5.4',
    '6.5.5',
  ];
  readonly KATEGORI_MASA_TAHUNAN = ['5.1.8.4'];

  readonly bulanList = [
    { v: 1, n: 'Januari' },
    { v: 2, n: 'Februari' },
    { v: 3, n: 'Maret' },
    { v: 4, n: 'April' },
    { v: 5, n: 'Mei' },
    { v: 6, n: 'Juni' },
    { v: 7, n: 'Juli' },
    { v: 8, n: 'Agustus' },
    { v: 9, n: 'September' },
    { v: 10, n: 'Oktober' },
    { v: 11, n: 'November' },
    { v: 12, n: 'Desember' },
  ];
  readonly tahunList: number[] = Array.from(
    { length: new Date().getFullYear() - 2024 + 1 },
    (_, i) => new Date().getFullYear() - i,
  );

  get perluMasa(): boolean {
    const t = this.metaFormGroup.controls['purchaseType'].value;
    return (
      this.KATEGORI_MASA_BULANAN.includes(t) ||
      this.KATEGORI_MASA_TAHUNAN.includes(t)
    );
  }
  get masaTahunan(): boolean {
    return this.KATEGORI_MASA_TAHUNAN.includes(
      this.metaFormGroup.controls['purchaseType'].value,
    );
  }

  /**
   * Nilai `masaPajak` yang dikirim ke server (hari pertama periode, atau null).
   *
   * NULL bila:
   *  - kategorinya bukan beban berkala (tak butuh masa), ATAU
   *  - masanya BULANAN dan sama persis dengan bulan/tahun tanggal dokumen.
   *
   * Kasus kedua penting: NULL sudah berarti "ikut tanggal dokumen", jadi
   * menyimpan nilai eksplisit yang kebetulan sama = data ganda. Untuk yang
   * TAHUNAN (SPT Tahunan) nilainya selalu disimpan (1 Januari tahun pajak),
   * karena maknanya "tahun pajak", bukan bulan pembayarannya.
   */
  private hitungMasaPajak(tanggalDokumen: Date | null): string | null {
    if (!this.perluMasa) return null;
    const tahun = Number(this.metaFormGroup.controls['masaTahun'].value);

    if (this.masaTahunan) {
      return `${tahun}-01-01`;
    }

    const bulan = Number(this.metaFormGroup.controls['masaBulan'].value);
    const d = tanggalDokumen ? new Date(tanggalDokumen) : null;
    if (
      d &&
      !isNaN(d.getTime()) &&
      bulan === d.getMonth() + 1 &&
      tahun === d.getFullYear()
    ) {
      // Sama dengan tanggal dokumen -> ikut tanggal (NULL).
      return null;
    }
    return `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  }

  valueFormGroup: FormGroup = new FormGroup({
    dpp: new FormControl('', [Validators.required, Validators.min(0.01)]),
    /*
     * PPN diisi sebagai PERSEN, disimpan sebagai rupiah — sama seperti pada
     * Pembelian, supaya keduanya tidak berbeda cara pengisiannya.
     *
     * Boleh nol: sebagian pemasok bukan PKP dan tidak memungut PPN. Yang
     * tidak boleh adalah tidak punya tempatnya sama sekali — beban ber-PPN
     * lalu tercatat seolah tanpa PPN, dan PPN masukannya hilang.
     */
    ppn: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    ppnValue: new FormControl(0),
    pbbkb: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, [Validators.required, Validators.min(0)]),
    pphValue: new FormControl(0),
    total: new FormControl(0),
  });

  paymentFormGroup: FormGroup = new FormGroup({
    bankName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    bankAccountName: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    bankAccountNumber: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    paymentMethod: new FormControl('', Validators.required),
    paymentTotal: new FormControl(0, [Validators.required]),
    createPayment: new FormControl(false),
    bankAccountID: new FormControl(null),
  });

  ngOnInit(): void {
    this.fetchBankAccounts();

    // Mode ubah bila rute membawa :id — ambil bebannya lalu isi formulir.
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = Number(id);
      this.muatUntukUbah(this.editId);
    }
  }

  /** Ambil satu beban untuk diubah, lalu isikan ke formulir. */
  private muatUntukUbah(id: number): void {
    this.apiService.get(`expenses/${id}`, {}).subscribe({
      next: (res: any) => {
        const e = res?.expense ?? res;
        if (e) this.isiFormDariBeban(e);
      },
      error: (error) => {
        this.snackBar.open(this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  /**
   * Isi ketiga grup formulir dari data beban yang diambil.
   *
   * Termasuk field bank/metode bayar — itu KOLOM beban (bukan sekadar untuk
   * membuat pembayaran), jadi harus ikut diisi agar PUT tidak menimpanya jadi
   * kosong. `masaPajak` (bila ada) dipecah kembali menjadi bulan & tahun.
   */
  private isiFormDariBeban(e: any): void {
    this.metaFormGroup.patchValue({
      invoiceName: e.invoiceName ?? '',
      receiptName: e.receiptName ?? '',
      taxInvoiceName: e.taxInvoiceName ?? '',
      // get_by_id memberi nama lawan transaksi sebagai `expense_opponent_name`
      // (hasil join), bukan `opponentName`.
      opponentID: e.opponentID ?? '',
      opponentName: e.expense_opponent_name ?? e.opponentName ?? '',
      opponentDescription:
        e.expense_opponent_description ?? e.opponentDescription ?? '',
      date: e.date ? new Date(e.date) : new Date(),
      dueDate: e.dueDate ? new Date(e.dueDate) : new Date(),
      purchaseType: e.purchaseType ?? '',
      description: e.description ?? '',
    });

    if (e.masaPajak) {
      const m = new Date(e.masaPajak);
      this.metaFormGroup.patchValue({
        masaBulan: m.getMonth() + 1,
        masaTahun: m.getFullYear(),
      });
    }

    this.valueFormGroup.patchValue({
      dpp: e.dpp ?? '',
      ppn: e.ppn ?? 0,
      pbbkb: e.pbbkb ?? 0,
      pphCode: e.pphCode ?? '',
      pphTaxObject: e.pphTaxObject ?? '',
      pphPercentage: e.pphPercentage ?? 0,
    });

    // Field bank ada di grup pembayaran; di mode ubah tidak membuat pembayaran
    // baru — hanya menyimpan info bank yang memang milik bebannya.
    this.paymentFormGroup.patchValue({
      bankName: e.bankName ?? '',
      bankAccountName: e.bankAccountName ?? '',
      bankAccountNumber: e.bankAccountNumber ?? '',
      paymentMethod: e.paymentMethod ?? '',
      createPayment: false,
    });
  }

  ngAfterViewInit() {
    this.valueFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        const pphPercentage =
          this.valueFormGroup.controls['pphPercentage'].value;
        const pphValue = (value * pphPercentage) / 100;
        this.valueFormGroup.controls['pphValue'].setValue(nilaiUang(pphValue));

        // Nilai PPN ikut berubah: persennya tetap, dasarnya yang bergeser.
        const ppn = Number(this.valueFormGroup.controls['ppn'].value) || 0;
        this.valueFormGroup.controls['ppnValue'].setValue(
          nilaiUang((value * ppn) / 100),
        );
      }

      this.isFinal = false;
    });

    this.valueFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      const dpp = Number(this.valueFormGroup.controls['dpp'].value) || 0;
      this.valueFormGroup.controls['ppnValue'].setValue(
        value ? nilaiUang((dpp * Number(value)) / 100) : 0,
      );
      this.isFinal = false;
    });

    this.valueFormGroup.controls['pbbkb'].valueChanges.subscribe((_) => {
      this.isFinal = false;
    });
  }

  openOpponentSelector() {
    // Lawan transaksi tidak boleh diganti saat mengubah beban.
    if (this.editMode) return;
    this.dialog
      .open(ExpenseOpponentSelectorComponent, {
        minWidth: '400px',
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.metaFormGroup.patchValue({
            opponentID: data.id,
            opponentName: data.name,
            opponentDescription: data.description,
          });
        }
      });
  }

  openPPHSelector() {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya sempat sama-sama menutup tanpa nilai, sehingga cabang di
         * bawah tidak berjalan dan PPh yang sudah terlanjur dipilih tidak
         * pernah hilang.
         */
        if (data?.hapus) {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
          });
          return;
        }
        if (data) {
          const pph = data as IPPh;
          this.valueFormGroup.patchValue({
            pphCode: pph.code,
            pphTaxObject: pph.taxObjectName,
            pphPercentage: pph.tariff,
          });

          const pphPercentage =
            this.valueFormGroup.controls['pphPercentage'].value;
          const dpp = this.valueFormGroup.controls['dpp'].value;
          const pphValue = (dpp * pphPercentage) / 100;
          this.valueFormGroup.controls['pphValue'].setValue(
            nilaiUang(pphValue),
          );
        } else {
          this.valueFormGroup.patchValue({
            pphCode: '',
            pphTaxObject: '',
            pphPercentage: 0,
          });
        }
      });

    this.isFinal = false;
  }

  get isNumberValid() {
    return (
      this.valueFormGroup.controls['dpp'].valid &&
      this.valueFormGroup.controls['pbbkb'].valid
    );
  }

  get isValid() {
    return (
      this.metaFormGroup.valid &&
      this.valueFormGroup.valid &&
      this.paymentFormGroup.valid
    );
  }

  filter(): void {
    const filterValue = this.input.nativeElement.value.toLowerCase();
    this.filteredOptions = this.options.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        option.alias.toLowerCase().includes(filterValue),
    );
  }

  calculateTotal() {
    const dpp = Number(this.valueFormGroup.controls['dpp'].value);
    const pbbkb = Number(this.valueFormGroup.controls['pbbkb'].value);
    // PPN menambah nilai dokumen, bukan mengurangi yang ditransfer —
    // yang mengurangi hanya PPh. Sama persis dengan Pembelian.
    const ppnValue = Number(this.valueFormGroup.controls['ppnValue'].value) || 0;
    const total = dpp + ppnValue + pbbkb;
    const pph = Number(this.valueFormGroup.controls['pphPercentage'].value);
    const pphValue = (dpp * pph) / 100;

    this.valueFormGroup.patchValue({
      total: this.decimalPipe.transform(total, '1.2-2'),
    });

    this.paymentFormGroup.patchValue({
      paymentTotal: nilaiUang(total - pphValue),
    });

    this.isFinal = true;
  }

  onSubmit() {
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dueDate = new Date(this.metaFormGroup.controls['dueDate'].value);

    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dueDateFormatted = `${dueDate.getFullYear()}-${String(
      dueDate.getMonth() + 1,
    ).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    this.isSubmitting = true;

    const expenseData = {
      invoiceName: this.metaFormGroup.controls['invoiceName'].value,
      receiptName: this.metaFormGroup.controls['receiptName'].value,
      taxInvoiceName:
        this.metaFormGroup.controls['taxInvoiceName'].value || null,
      opponentID: this.metaFormGroup.controls['opponentID'].value,
      // change from date object to YYYY-MM-DD
      date: dateFormatted,
      dueDate: dueDateFormatted,
      purchaseType: this.metaFormGroup.controls['purchaseType'].value,
      // Masa yang ditanggung — hanya untuk kategori berkala; selain itu null.
      // NULL berarti "ikut tanggal dokumen" (dihitung di `hitungMasaPajak`,
      // yang juga meng-NULL-kan bila masanya sama dengan bulan tanggalnya).
      masaPajak: this.hitungMasaPajak(
        this.metaFormGroup.controls['date'].value,
      ),
      description: this.metaFormGroup.controls['description'].value,
      dpp: this.valueFormGroup.controls['dpp'].value,
      /*
       * Yang dikirim PERSENNYA, bukan rupiahnya.
       *
       * `purchases.ppn` menyimpan persen — rekap pajak menghitung ulang
       * nilainya dengan `ppn * dpp / 100`. Menyimpan rupiah di `expenses`
       * membuat kedua tabel berbeda arti pada nama kolom yang sama, dan
       * rekap gabungan pasti salah di salah satunya.
       */
      ppn: Number(this.valueFormGroup.controls['ppn'].value) || 0,
      pbbkb: this.valueFormGroup.controls['pbbkb'].value,
      pphCode:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? null
          : this.valueFormGroup.controls['pphCode'].value,
      pphTaxObject:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? null
          : this.valueFormGroup.controls['pphTaxObject'].value,
      pphPercentage:
        this.valueFormGroup.controls['pphCode'].value == ''
          ? 0
          : this.valueFormGroup.controls['pphPercentage'].value,
      bankName: this.paymentFormGroup.controls['bankName'].value,
      bankAccountName: this.paymentFormGroup.controls['bankAccountName'].value,
      bankAccountNumber:
        this.paymentFormGroup.controls['bankAccountNumber'].value,
      paymentMethod: this.paymentFormGroup.controls['paymentMethod'].value,
    };

    // MODE UBAH: kirim PUT, tanpa membuat pembayaran, lalu kembali ke daftar.
    if (this.editMode && this.editId != null) {
      this.apiService
        .put(`expenses/${this.editId}`, expenseData)
        .subscribe({
          next: (_) => {
            this.snackBar.open(
              this.translate.instant('notify.updateSuccess'),
              'Close',
              { duration: 3000 },
            );
            this.router.navigate(['/Expense']);
          },
          error: (error) => {
            this.snackBar.open(this.serverMessage.terjemahkan(error), 'Close', {
              duration: 3000,
            });
          },
        })
        .add(() => {
          this.isSubmitting = false;
        });
      return;
    }

    if (this.paymentFormGroup.controls['createPayment'].value === true) {
      this.apiService
        .post('expenses', expenseData)
        .subscribe({
          next: (result: any) => {
            const expenseID = result.expense_id;
            const paymentData = {
              purchaseID: null,
              expenseID: expenseID,
              reimbursementID: null,
              salarySlipID: null,
              date: dueDateFormatted,
              amount: this.paymentFormGroup.controls['paymentTotal'].value,
              bankAccountID:
                this.paymentFormGroup.controls['bankAccountID'].value,
              status: 'ready',
            };
            this.apiService
              .post('outgoing-payments', paymentData)
              .subscribe({
                next: (_) => {
                  this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
                    duration: 3000,
                  });
                  this.metaFormGroup.reset();
                  this.valueFormGroup.reset();
                  this.paymentFormGroup.reset();
                  // Dulu me-reset stepper ke langkah pertama; kini cukup
                  // menonaktifkan tombol simpan sampai total dihitung ulang.
                  this.isFinal = false;

                  this.metaFormGroup.patchValue({
                    date: new Date(),
                    dueDate: new Date(),
                    invoiceName: '',
                    receiptName: '',
                  });

                  this.valueFormGroup.patchValue({
                    dpp: '',
                    pbbkb: 0,
                    pphPercentage: 0,
                    pphCode: '',
                  });
                },
                error: (error) => {
                  this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
                    duration: 3000,
                  });
                },
              })
              .add(() => {
                this.isSubmitting = false;
              });
          },
        })
        .add(() => {
          this.isSubmitting = false;
        });
    } else {
      this.apiService
        .post('expenses', expenseData)
        .subscribe({
          next: (_) => {
            this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
              duration: 3000,
            });
            this.metaFormGroup.reset();
            this.valueFormGroup.reset();
            this.paymentFormGroup.reset();
            this.isFinal = false;

            this.metaFormGroup.patchValue({
              date: new Date(),
              dueDate: new Date(),
              invoiceName: '',
              receiptName: '',
            });

            this.valueFormGroup.patchValue({
              dpp: '',
              pbbkb: 0,
              pphPercentage: 0,
              pphCode: '',
            });
          },
          error: (error) => {
            this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
              duration: 3000,
            });
          },
        })
        .add(() => {
          this.isSubmitting = false;
        });
    }
  }

  fetchBankAccounts() {
    this.apiService.get('banks/all', {}).subscribe({
      next: (data: any) => {
        this.bankAccounts = data;
      },
      error: (error) => {
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  createNewAdministrationExpense() {
    if (this.bankAccounts.length == 0) return;
    this.dialog.open(ExpenseCreateAdministrationComponent, {
      data: this.bankAccounts,
    });
  }
}
