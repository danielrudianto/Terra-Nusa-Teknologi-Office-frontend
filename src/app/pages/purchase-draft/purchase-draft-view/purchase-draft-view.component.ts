import { DatePipe } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { jagaPenutupanDialog } from 'src/app/utils/jaga-penutupan-dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { PermissionService } from 'src/app/services/permission.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-purchase-draft-view',
  standalone: true,
  templateUrl: './purchase-draft-view.component.html',
  styleUrl: './purchase-draft-view.component.scss',
  imports: [
    CommonModule,
    TranslatePipe,
    MatInputModule,
    MatSelectModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    DialogGeserDirective,
    AuditTrailComponent,
    MatDatepickerModule,
    MatProgressSpinnerModule,
  ],
})
export class PurchaseDraftViewComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  private readonly izin = inject(PermissionService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialog: MatDialogRef<PurchaseDraftViewComponent>,
    private snackBar: MatSnackBar,
    private apiService: ApiService,
    private datePipe: DatePipe,
    private router: Router,
  ) {}

  /*
   * MODE UBAH.
   *
   * Draf lapangan kerap perlu dibetulkan — angka salah ketik, periode
   * meleset. Sebelum ini satu-satunya jalan menghapus lalu membuat ulang,
   * yang menghilangkan siapa memasukkannya dan kapan. Sekarang nilainya
   * diubah di tempat, dan perubahannya tercatat di Riwayat di bawah.
   *
   * Yang boleh diubah HANYA angka, keterangan, tanggal, dan periodenya.
   * Pemasok, proyek, dan SPK tidak: menggantinya berarti ini draf yang
   * lain, bukan draf yang dibetulkan. Server menegakkan batas yang sama.
   */
  mengubah = false;
  menyimpan = false;
  /** Dinaikkan tiap pemuatan ulang agar Riwayat ikut menyegarkan dirinya. */
  muatUlangRiwayat = 0;
  /** Ada yang tersimpan — daftar di belakangnya memuat angka lama. */
  private adaPerubahan = false;

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    createdAt: new FormControl(''),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl('', Validators.required),
    supplierAddress: new FormControl('', Validators.required),
    dpp: new FormControl(0, Validators.required),
    ppn: new FormControl(0, Validators.required),
    pbbkb: new FormControl(0, Validators.required),
    total: new FormControl(0, Validators.required),
    purchaseOrderName: new FormControl('', Validators.required),
    purchaseType: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    periodStart: new FormControl<string | null>(null),
    periodEnd: new FormControl<string | null>(null),
  });

  /** Nilai mentah untuk mode ubah — bukan yang sudah diformat tampilan. */
  private asli: any = null;

  ngOnInit(): void {
    // Latar dan `Esc` ikut mengabarkan perubahannya — lihat penolongnya.
    jagaPenutupanDialog(this.dialog, () => (this.adaPerubahan ? 'ubah' : undefined));
    this.muat();
  }

  private muat(): void {
    this.apiService.get(`purchase-draft/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.asli = data;
        this.isiDariData(data);
        this.muatUlangRiwayat++;
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });

        this.dialog.close();
      },
    });
  }

  /**
   * Isi tampilan dari jawaban server.
   *
   * `ppn` di layar adalah RUPIAH (persen × dpp), bukan persennya. Mode ubah
   * memakai angka mentah dari `asli`, dan ini yang mengembalikannya ke
   * bentuk tampilan begitu ubahannya batal atau tersimpan.
   */
  private isiDariData(data: any): void {
    if (!data) return;
    this.formGroup.patchValue({
      periodStart: data.periodStart ?? null,
      periodEnd: data.periodEnd ?? null,
      date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
      createdAt: this.datePipe.transform(data.createdAt, 'dd MMMM yyyy'),
      supplierName: data.supplier_name,
      supplierAddress: data.supplier_address,
      dpp: data.dpp,
      ppn: (data.ppn * data.dpp) / 100,
      pbbkb: data.pbbkb,
      total: data.dpp + (data.ppn * data.dpp) / 100 + data.pbbkb,
      purchaseOrderName: data.purchaseOrderName,
      purchaseType: data.purchaseType,
      projectName: data.projectName,
      description: data.description,
    });
  }

  /**
   * Draf yang sudah DIKONVERSI atau DIHAPUS tidak lagi dapat diubah:
   * angkanya sudah menjadi tagihan, dan tagihan dibetulkan pada
   * pembeliannya. Server menolak hal yang sama — ini hanya supaya
   * tombolnya tidak ada untuk ditekan.
   */
  get bolehUbah(): boolean {
    if (!this.asli) return false;
    if (this.asli.convertedAt || this.asli.isDelete) return false;
    return this.izin.can('purchase_draft', 'update');
  }

  /** Tanggal dokumen tersimpan — kepala dialog memakai ini, bukan isian. */
  get asliTanggal(): string | null {
    return this.asli?.date ?? null;
  }

  /** Periode tersimpan — dibaca dari `asli`, bukan dari isian tampilan. */
  get asliPeriodeMulai(): string | null {
    return this.asli?.periodStart ?? null;
  }

  get asliPeriodeSelesai(): string | null {
    return this.asli?.periodEnd ?? null;
  }

  /** PPN dalam rupiah: yang diisi persennya, yang ditampilkan nominalnya. */
  get ppnRupiah(): number {
    const dpp = Number(this.formGroup.get('dpp')?.value) || 0;
    const persen = Number(this.formGroup.get('ppn')?.value) || 0;
    return (dpp * persen) / 100;
  }

  get totalUbah(): number {
    const dpp = Number(this.formGroup.get('dpp')?.value) || 0;
    const pbbkb = Number(this.formGroup.get('pbbkb')?.value) || 0;
    return dpp + this.ppnRupiah + pbbkb;
  }

  mulaiUbah(): void {
    // Isian memakai angka MENTAH: `ppn` di layar sudah menjadi rupiah
    // (persen × dpp), dan menyimpannya kembali apa adanya akan mengubah
    // tarifnya menjadi nominal.
    this.formGroup.patchValue({
      dpp: this.asli?.dpp ?? 0,
      ppn: this.asli?.ppn ?? 0,
      pbbkb: this.asli?.pbbkb ?? 0,
      description: this.asli?.description ?? '',
      // `date` di tampilan sudah menjadi teks "23 September 2026"; yang
      // masuk datepicker harus tanggal aslinya.
      date: this.asli?.date ?? null,
      periodStart: this.asli?.periodStart ?? null,
      periodEnd: this.asli?.periodEnd ?? null,
    });
    this.mengubah = true;
  }

  batalUbah(): void {
    this.mengubah = false;
    this.isiDariData(this.asli);
  }

  simpanUbah(): void {
    if (this.menyimpan) return;
    const v = this.formGroup.getRawValue();
    const muatan: Record<string, unknown> = {
      dpp: Number(v.dpp) || 0,
      ppn: Number(v.ppn) || 0,
      pbbkb: Number(v.pbbkb) || 0,
      description: v.description,
      // Periode BOLEH dikosongkan, jadi null-nya sengaja ikut terkirim —
      // server membedakan "dikosongkan" dari "tidak dikirim".
      periodStart: this.tanggalIso(v.periodStart),
      periodEnd: this.tanggalIso(v.periodEnd),
    };

    // Tanggal dokumen TIDAK boleh kosong (kolomnya NOT NULL). Bila isiannya
    // tidak terbaca, bidangnya tidak dikirim sama sekali — yang lama tetap
    // dipakai — bukan dikirim sebagai null dan menjatuhkan penyimpanan.
    const tgl = this.tanggalIso(v.date);
    if (tgl) muatan['date'] = tgl;
    this.menyimpan = true;
    this.apiService
      .patch(`purchase-draft/${this.data.id}`, muatan)
      .subscribe({
        next: () => {
          this.menyimpan = false;
          this.mengubah = false;
          this.adaPerubahan = true;
          this.snackBar.open(
            this.translate.instant('notify.updateSuccess'),
            'Close',
            { duration: 3000 },
          );
          // Dimuat ulang supaya riwayat di bawahnya ikut memuat baris baru.
          this.muat();
        },
        error: (error) => {
          this.menyimpan = false;
          this.snackBar.open(this.serverMessage.terjemahkan(error), 'Close', {
            duration: 5000,
          });
        },
      });
  }

  /**
   * Tutup dialog, sambil memberi tahu daftar bila ada yang berubah.
   *
   * `true` sudah berarti "dihapus" bagi pemanggilnya, jadi perubahan
   * memakai penanda sendiri — bukan nilai yang sama.
   */
  tutup(): void {
    this.dialog.close(this.adaPerubahan ? 'ubah' : undefined);
  }

  /** `Date` atau teks -> `YYYY-MM-DD` waktu setempat; kosong tetap null. */
  private tanggalIso(v: any): string | null {
    if (!v) return null;
    // Datepicker aplikasi ini memakai adapter Moment, jadi nilainya objek
    // Moment — bukan `Date`. `toDate()` yang mengembalikannya ke Date.
    const d =
      v instanceof Date
        ? v
        : typeof v?.toDate === 'function'
          ? v.toDate()
          : new Date(v);
    if (isNaN(d.getTime())) return null;
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  }

  deletePurchaseDraft() {
    this.apiService.delete(`purchase-draft/${this.data.id}`).subscribe({
      next: (data) => {
        this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
          duration: 3000,
        });
        this.dialog.close(true);
      },
      error: (error) => {
        this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
