import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ContractViewComponent } from '../contract-view/contract-view.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { ApiService } from '../../../services/api.service';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { CanDirective } from '../../../directives/can.directive';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { Project, ProjectContract, keadaanProyek } from '../project.model';
import { PphSelectorComponent } from '../../../components/pph-selector/pph-selector.component';
import { IPPh } from '../../../utils/pph';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import {
  ArahNilai,
  PILIHAN_ARAH_KONTRAK,
  arahDariNilai,
  besaranDariNilai,
  nilaiBerarah,
} from '../../../constants/arah-nilai-kontrak';


/**
 * "Mengurangi" hanya berlaku untuk ADENDUM.
 *
 * Dokumen pertama tidak dapat mengurangi apa pun — belum ada yang disepakati
 * untuk dikurangi, dan nilai proyeknya langsung terbaca terbalik.
 *
 * Galatnya dipasang pada `arah`, bukan pada grupnya, supaya pesannya muncul
 * tepat di bawah pilihan yang salah — bukan sebagai formulir yang menolak
 * simpan tanpa menunjuk apa pun.
 */
function arahKontrakSah(g: AbstractControl): ValidationErrors | null {
  const jenis = g.get('documentType')?.value;
  const arah = g.get('arah');

  if (jenis !== 'adendum' && arah?.value === 'kurang') {
    arah.setErrors({ ...(arah.errors ?? {}), kurangHanyaAdendum: true });
    return { kurangHanyaAdendum: true };
  }

  // Hanya galat YANG DIPASANG DI SINI yang dibersihkan; menghapus seluruhnya
  // akan ikut membuang `required` milik kendalinya sendiri.
  if (arah?.hasError('kurangHanyaAdendum')) {
    const sisa = { ...(arah.errors ?? {}) };
    delete sisa['kurangHanyaAdendum'];
    arah.setErrors(Object.keys(sisa).length ? sisa : null);
  }
  return null;
}

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    CanDirective,
    AuditTrailComponent,
    NgxMaskDirective,
  ],
  providers: [provideNgxMask(), provideNativeDateAdapter()],
  templateUrl: './project-view.component.html',
  styleUrl: './project-view.component.scss',
})
export class ProjectViewComponent implements OnInit {
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private lookup: ProjectLookupService,
  ) {}

  isLoading = true;
  isSubmitting = false;
  project: Project | null = null;
  contracts: ProjectContract[] = [];
  sedangTambah = false;

  formGroup = new FormGroup(
    {
    documentNumber: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    documentType: new FormControl<'spk' | 'adendum'>('spk', Validators.required),
    /*
     * Besarannya selalu POSITIF; tandanya ditentukan `arah`.
     *
     * Sebelumnya nilai negatif diketik langsung, dan itu menuntut tanda minus
     * lolos dari mask pemisah ribuan, terbaca kembali saat dokumen dibuka,
     * dan tetap benar ketika disunting ulang — tiga tempat yang masing-masing
     * gagal tanpa suara.
     *
     * Yang lebih menentukan: minus tidak menyatakan MAKSUD. "-25.000.000"
     * pada layar tidak menyebutkan apa yang dikurangi, sedangkan kartu
     * "Mengurangi nilai kontrak" menyebutkannya.
     */
    dpp: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    /** Menambah atau mengurangi nilai kontrak; lihat `nilaiBerarah`. */
    arah: new FormControl<ArahNilai>('tambah', Validators.required),
    ppn: new FormControl<number>(11, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    pphCode: new FormControl<string | null>(null),
    pphTaxObject: new FormControl<string | null>(null),
    pphPercentage: new FormControl<number | null>(null),
    date: new FormControl<Date | null>(null, Validators.required),
      description: new FormControl('', Validators.maxLength(500)),
    },
    { validators: arahKontrakSah },
  );

  /*
   * Nilai dokumen dan potongan dihitung ulang di layar agar terlihat
   * seketika. Server menghitungnya sendiri saat menyimpan — kalau angkanya
   * boleh dikirim dari sini, nominal dokumen bisa tidak cocok dengan
   * komponennya dan tidak ada yang tahu mana yang benar.
   */
  /** Pilihan kartu menambah/mengurangi. */
  readonly pilihanArah = PILIHAN_ARAH_KONTRAK;

  /**
   * DPP BERTANDA, sesuai arah yang dipilih.
   *
   * Dipakai seluruh angka turunan di layar — PPN, nilai dokumen, PPh, dan
   * nilai diterima — supaya ringkasan yang tampil sama dengan yang disimpan.
   * Menghitungnya dari besaran tanpa tanda membuat layar menunjukkan
   * penambahan sementara yang tersimpan pengurangan.
   */
  get nilaiDpp(): number {
    return nilaiBerarah(
      this.formGroup.value.dpp,
      (this.formGroup.value.arah as ArahNilai) ?? 'tambah',
    );
  }

  get nilaiPpn(): number {
    return (this.nilaiDpp * Number(this.formGroup.value.ppn ?? 0)) / 100;
  }

  get nilaiDokumen(): number {
    return this.nilaiDpp + this.nilaiPpn;
  }

  get nilaiPph(): number {
    return (this.nilaiDpp * Number(this.formGroup.value.pphPercentage ?? 0)) / 100;
  }

  /** Yang benar-benar diterima setelah PPh dipotong. */
  get nilaiDiterima(): number {
    return this.nilaiDokumen - this.nilaiPph;
  }

  pilihPph(): void {
    this.dialog
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((data: any) => {
        /*
         * "Tanpa PPh" MENGHAPUS pilihan, berbeda dari membatalkan.
         *
         * Keduanya sempat sama-sama menutup tanpa nilai, sehingga baris di
         * bawah memperlakukan keduanya sebagai batal — dan PPh yang sudah
         * terlanjur dipilih tidak pernah hilang.
         */
        if (data?.hapus) {
          this.hapusPph();
          return;
        }
        if (!data) return;
        this.formGroup.patchValue({
          pphCode: data.code,
          pphTaxObject: data.taxObjectName,
          pphPercentage: data.tariff,
        });
      });
  }

  hapusPph(): void {
    this.formGroup.patchValue({
      pphCode: null,
      pphTaxObject: null,
      pphPercentage: null,
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((p) => this.fetch(Number(p['id'])));
  }

  /**
   * Induk dan anak-anak proyek ini.
   *
   * Sebagian pekerjaan dipecah menjadi beberapa kode proyek: satu memegang
   * kontraknya, yang lain menampung biaya per paket. Dilihat sendiri-sendiri
   * keduanya tampak ganjil — ada yang berpenjualan tanpa satu pun pembelian,
   * dan sebaliknya — sehingga yang membukanya menyimpulkan datanya rusak.
   *
   * Kosong pada hampir seluruh proyek; hanya yang memang bertaut yang
   * menampilkan bannernya.
   */
  keluarga: { induk: any | null; anak: any[] } = { induk: null, anak: [] };

  get punyaKeluarga(): boolean {
    return !!this.keluarga.induk || this.keluarga.anak.length > 0;
  }

  /** Keadaan sebuah proyek keluarga, untuk mewarnai kepingnya. */
  keadaanKeluarga(p: any): string {
    return keadaanProyek(p);
  }

  /**
   * Buka proyek lain dalam keluarga ini.
   *
   * Berpindah di dalam layar yang sama, bukan membuka tab baru: yang
   * menelusuri keluarga proyek biasanya membandingkan keduanya bergantian,
   * dan tab yang menumpuk membuatnya kehilangan jejak mana yang mana.
   */
  bukaProyek(id: number): void {
    this.router.navigate(['/Project', id]);
  }

  /** Laporan proyek ini — memakai KODE, bukan id. */
  bukaLaporan(kode: string): void {
    this.router.navigate(['/Project/Report', kode]);
  }

  private muatKeluarga(id: number): void {
    // Gagal diam-diam: keterangan keluarga hanya melengkapi, dan galat di
    // sini tidak boleh menutupi proyek yang sudah tampil dengan baik.
    this.apiService.get(`projects/${id}/keluarga`, {}).subscribe({
      next: (res: any) => {
        this.keluarga = {
          induk: res?.induk ?? null,
          anak: res?.anak ?? [],
        };
      },
      error: () => {
        this.keluarga = { induk: null, anak: [] };
      },
    });
  }

  fetch(id: number): void {
    this.isLoading = true;
    this.muatKeluarga(id);
    this.apiService
      .get(`projects/${id}`, {})
      .subscribe({
        next: (res: any) => {
          this.project = res?.project ?? null;
          this.contracts = res?.contracts ?? [];
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
          this.router.navigate(['/Project']);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /**
   * Tandai daftar proyek bersama sebagai USANG.
   *
   * `ProjectLookupService` memuat seluruh proyek SEKALI per sesi, beserta
   * `contractDpp` dan `contractValue`-nya. Laporan proyek membaca nilai
   * kontrak dari sana — bukan dari layar ini.
   *
   * Akibatnya, menambah SPK atau adendum memperbarui basis data dan layar ini
   * (yang memuat ulang dirinya sendiri), tetapi TIDAK menyentuh angka yang
   * dipegang layanan itu. Laporan proyek karena itu tetap menunjukkan nilai
   * kontrak yang lama sampai halamannya dimuat ulang dari awal — dan yang
   * membacanya menyimpulkan kontraknya belum tersimpan.
   *
   * Sebelumnya `segarkan()` hanya dipanggil dari daftar proyek, yaitu ketika
   * PROYEKNYA dibuat, diubah, atau dihapus — bukan ketika kontraknya berubah.
   * Padahal justru kontraknya yang menentukan angka pada laporan.
   */
  private segarkanDaftarProyek(): void {
    this.lookup.segarkan();
  }

  get keadaan(): string {
    return this.project ? keadaanProyek(this.project) : 'berjalan';
  }

  /**
   * Nilai kontrak berjalan dihitung ulang di layar dari baris yang tampil.
   *
   * Angka dari server tetap benar, tetapi setelah menambah atau menghapus
   * adendum, layar harus segera menunjukkan hasilnya tanpa menunggu
   * pengambilan ulang — dan keduanya harus selalu sama.
   */
  /**
   * Nilai satu dokumen: DPP ditambah PPN-nya.
   *
   * Kolom `value` sudah tidak ada — nilainya dihitung dari komponennya agar
   * angka yang tersimpan tidak mungkin berbeda dari penjumlahannya. Membaca
   * `value` yang tidak ada menghasilkan 0 tanpa satu pun galat, dan nilai
   * kontrak tampil nol meski dokumennya ada.
   */
  nilaiKontrak(k: any): number {
    const dpp = Number(k?.dpp ?? 0);
    const ppn = Number(k?.ppn ?? 0);
    return dpp + (dpp * ppn) / 100;
  }

  /**
   * Buka rincian satu kontrak.
   *
   * Rinciannya dipisah ke dialog karena satu proyek dapat memuat banyak
   * dokumen; menampilkan seluruhnya di daftar membuatnya tidak lagi dapat
   * dibaca sekilas.
   */
  lihatKontrak(k: any): void {
    this.dialog
      .open(ContractViewComponent, {
        data: { contract: k, projectName: this.project?.name },
        width: '560px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (hasil?.hapus) this.hapusKontrak(hasil.contract);
      });
  }

  get totalKontrak(): number {
    return this.contracts.reduce((a, b) => a + this.nilaiKontrak(b), 0);
  }

  get adaAdendum(): boolean {
    return this.contracts.some((c) => c.documentType === 'adendum');
  }

  bukaTambah(): void {
    this.sedangTambah = true;
    /*
     * Seluruh kendali disebut, termasuk yang memang dikosongkan.
     *
     * `reset()` memberi `null` kepada yang TIDAK disebut — bukan
     * mengembalikannya ke nilai bawaannya. Di sini akibatnya ringan, sebab
     * bawaan keenam kendali itu memang kosong; yang berubah hanya isian teks
     * yang berakhir `null` alih-alih `''`. Ditulis lengkap supaya yang
     * membaca tidak perlu menebak mana yang disengaja.
     */
    this.formGroup.reset({
      documentNumber: '',
      documentType: this.contracts.length === 0 ? 'spk' : 'adendum',
      // Bawaannya menambah; mengurangi selalu pilihan yang disengaja.
      arah: 'tambah',
      dpp: null,
      ppn: 11,
      pphCode: null,
      pphTaxObject: null,
      pphPercentage: null,
      /*
       * Tanggal DIBIARKAN KOSONG, tidak diisi hari ini.
       *
       * SPK dan adendum bertanggal sesuai dokumen fisiknya — kerap bukan
       * hari dokumen itu dimasukkan ke sistem. Mengisinya "hari ini" di depan
       * berbahaya: tanggalnya sudah terlihat terisi, jadi mudah terlewat, dan
       * dokumen bertanggal keliru itu yang menjadi dasar penagihan dan
       * retensi. Dikosongkan supaya tanggalnya harus diketik sadar; validator
       * `required` menahan simpan sampai diisi.
       */
      date: null,
      description: '',
    });
  }

  batalTambah(): void {
    this.sedangTambah = false;
  }

  simpanKontrak(): void {
    if (!this.project || this.formGroup.invalid || this.isSubmitting) return;

    const v = this.formGroup.value;
    if (!v.dpp || Number(v.dpp) === 0) {
      this.snackBar.open(
        this.translate.instant('project.contractZero'),
        'Close',
        { duration: 4000 },
      );
      return;
    }

    this.isSubmitting = true;
    this.apiService
      .post(`projects/${this.project.id}/contracts`, {
        documentNumber: v.documentNumber,
        documentType: v.documentType,
        // Tandanya dari `arah`, bukan dari angka yang diketik.
        dpp: nilaiBerarah(v.dpp, (v.arah as ArahNilai) ?? 'tambah'),
        ppn: Number(v.ppn ?? 0),
        pphCode: v.pphCode || null,
        pphTaxObject: v.pphTaxObject || null,
        pphPercentage: v.pphPercentage ?? null,
        date: moment(v.date).format('YYYY-MM-DD'),
        description: v.description || null,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('project.contractAdded'),
            'Close',
            { duration: 3000 },
          );
          this.sedangTambah = false;
          this.fetch(this.project!.id);
          this.segarkanDaftarProyek();
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.saveFailed'),
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  hapusKontrak(k: ProjectContract): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (!setuju) return;
        this.apiService.delete(`projects/contracts/${k.id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('project.contractDeleted'),
              'Close',
              { duration: 3000 },
            );
            this.fetch(this.project!.id);
            // Menghapus kontrak sama menentukannya dengan menambah: nilainya
            // ikut berubah, dan laporan membacanya dari daftar bersama.
            this.segarkanDaftarProyek();
          },
          error: () => {
            this.snackBar.open(
              this.translate.instant('notify.deleteFailed'),
              'Close',
              { duration: 4000 },
            );
          },
        });
      });
  }

  kembali(): void {
    this.router.navigate(['/Project']);
  }
}
