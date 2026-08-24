import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { PphSelectorComponent } from 'src/app/components/pph-selector/pph-selector.component';
import { IPPh } from 'src/app/utils/pph';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Sunting META pembelian LUAR — hanya level 5.
 *
 * Ini BUKAN "Update Internal". Update Internal membongkar seluruh isi
 * dokumen internal (yang memang dokumen perusahaan sendiri). Layar ini
 * hanya membetulkan keterangan pembelian LUAR yang terlanjur salah ketik —
 * nomor faktur pajaknya keliru, tanggalnya salah — tanpa menyentuh
 * barang, pemasok, atau proyeknya.
 *
 * Dua bagian, dua aturan:
 *   - Meta (tanggal, faktur pajak, nomor invoice, nomor kuitansi) selalu
 *     boleh dibetulkan.
 *   - Nilai (DPP, PPN, PPh) HANYA selama belum ada pembayaran. Sesudahnya
 *     dikunci: nominal yang sudah disetujui tidak boleh berubah diam-diam.
 *     Servernya menolak juga — kunci di layar hanya agar tidak percuma
 *     mengetik.
 */
@Component({
  selector: 'app-purchase-update-meta',
  standalone: true,
  templateUrl: './purchase-update-meta.component.html',
  styleUrl: './purchase-update-meta.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    NgxMaskDirective,
    DialogGeserDirective,
  ],
  providers: [provideNgxMask()],
})
export class PurchaseUpdateMetaComponent {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private dialog: MatDialogRef<PurchaseUpdateMetaComponent>,
    private pilih: MatDialog,
  ) {}

  memuat = true;
  menyimpan = false;
  /** Ada pembayaran melekat -> kolom nilai dikunci. */
  adaPembayaran = false;

  /** Hanya untuk ditampilkan; tidak ikut dikirim. */
  pemasok = '';
  nomorPO = '';

  meta: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    invoiceName: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    receiptName: new FormControl('', Validators.maxLength(100)),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    // Kode & objek PPh: KLASIFIKASI, bukan nominal. Selalu boleh dibetulkan
    // (mis. kode lupa diisi) meski sudah ada pembayaran — dipilih lewat
    // pemilih PPh, tidak diketik bebas.
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
  });

  nilai: FormGroup = new FormGroup({
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppn: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(11),
    ]),
    pphPercentage: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  /** Nilai awal, untuk tahu apakah bagian nilai memang diubah. */
  private nilaiAwal = { dpp: 0, ppn: 0, pphPercentage: 0 };

  ngOnInit(): void {
    this.api.get(`purchases/${this.data.id}/meta`, {}).subscribe({
      next: (d: any) => {
        this.adaPembayaran = !!d?.hasActivePayment;
        this.pemasok = [d?.supplier?.name, d?.supplier?.prefix]
          .filter((x: any) => x != null && x !== '')
          .join(', ');
        this.nomorPO = d?.purchaseOrderName ?? '';

        this.meta.patchValue({
          date: d?.date,
          invoiceName: d?.invoiceName,
          receiptName: d?.receiptName,
          taxInvoiceName: d?.taxInvoiceName,
          pphCode: d?.pphCode ?? '',
          pphTaxObject: d?.pphTaxObject ?? '',
        });

        this.nilaiAwal = {
          dpp: Number(d?.dpp) || 0,
          ppn: Number(d?.ppn) || 0,
          pphPercentage: Number(d?.pphPercentage) || 0,
        };
        this.nilai.patchValue(this.nilaiAwal);

        // Terkunci bila sudah ada pembayaran — bukan disembunyikan, supaya
        // angkanya tetap terbaca beserta alasan mengapa tak bisa diubah.
        if (this.adaPembayaran) this.nilai.disable();
      },
      error: (err) => {
        this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
          duration: 4000,
        });
        this.dialog.close();
      },
    }).add(() => (this.memuat = false));
  }

  /** Ringkasan PPh terpilih, untuk ditampilkan. */
  get pphRingkas(): string {
    const kode = this.meta.get('pphCode')?.value;
    const objek = this.meta.get('pphTaxObject')?.value;
    if (!kode && !objek) return '';
    return [kode, objek].filter(Boolean).join(' — ');
  }

  /**
   * Buka pemilih objek PPh — sama dengan yang dipakai saat membuat pembelian.
   *
   * Kode & objek SELALU boleh diperbarui (klasifikasi). Tarifnya hanya diikuti
   * bila belum ada pembayaran; bila sudah ada, tarif terkunci — kode/objek
   * tetap dibetulkan, dan bila tarif objek barunya berbeda, penggunanya diberi
   * tahu bahwa yang diperbarui hanya klasifikasinya.
   */
  ubahPph(): void {
    this.pilih
      .open(PphSelectorComponent, {})
      .afterClosed()
      .subscribe((hasil: any) => {
        if (!hasil) return;

        if (hasil.hapus) {
          this.meta.patchValue({ pphCode: '', pphTaxObject: '' });
          if (!this.adaPembayaran) this.nilai.get('pphPercentage')?.setValue(0);
          else if (this.nilaiAwal.pphPercentage !== 0) this.peringatanTarifTerkunci();
          this.meta.markAsDirty();
          return;
        }

        const pph = hasil as IPPh;
        this.meta.patchValue({
          pphCode: pph.code,
          pphTaxObject: pph.taxObjectName,
        });
        if (!this.adaPembayaran) {
          this.nilai.get('pphPercentage')?.setValue(pph.tariff);
        } else if (Number(pph.tariff) !== this.nilaiAwal.pphPercentage) {
          this.peringatanTarifTerkunci();
        }
        this.meta.markAsDirty();
      });
  }

  private peringatanTarifTerkunci(): void {
    this.snackBar.open(
      this.translate.instant('purchaseMeta.tarifTerkunci'),
      'Close',
      { duration: 6000 },
    );
  }

  /** Total dokumen (tanpa PPh), untuk kecocokan mata. */
  get total(): number {
    const dpp = Number(this.nilai.get('dpp')?.value) || 0;
    const ppn = Number(this.nilai.get('ppn')?.value) || 0;
    return dpp + (ppn * dpp) / 100;
  }

  private tglFormat(v: any): string {
    const d = new Date(v);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  simpan(): void {
    // Enter di dalam form ikut memanggil ini; jangan kirim saat masih memuat,
    // sedang menyimpan, atau kolomnya belum sah.
    if (this.memuat || this.menyimpan) return;
    if (this.meta.invalid) {
      this.meta.markAllAsTouched();
      return;
    }

    const muatan: any = {
      date: this.tglFormat(this.meta.get('date')?.value),
      invoiceName: this.meta.get('invoiceName')?.value,
      receiptName: this.meta.get('receiptName')?.value,
      taxInvoiceName:
        this.meta.get('taxInvoiceName')?.value === ''
          ? null
          : this.meta.get('taxInvoiceName')?.value,
      // Kode & objek PPh selalu ikut — klasifikasi, tidak terkunci pembayaran.
      pphCode: this.meta.get('pphCode')?.value || null,
      pphTaxObject: this.meta.get('pphTaxObject')?.value || null,
    };

    // Nilai HANYA dikirim bila memang boleh diubah dan memang berubah —
    // supaya kiriman yang tak menyentuh nominal tidak pernah memicu
    // penolakan "sudah ada pembayaran".
    if (!this.adaPembayaran) {
      const v = this.nilai.getRawValue();
      const berubah =
        Number(v.dpp) !== this.nilaiAwal.dpp ||
        Number(v.ppn) !== this.nilaiAwal.ppn ||
        Number(v.pphPercentage) !== this.nilaiAwal.pphPercentage;
      if (berubah) {
        if (this.nilai.invalid) {
          this.nilai.markAllAsTouched();
          return;
        }
        muatan.dpp = v.dpp;
        muatan.ppn = v.ppn;
        muatan.pphPercentage = v.pphPercentage;
      }
    }

    this.menyimpan = true;
    this.api
      .put(`purchases/${this.data.id}/meta`, muatan)
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('notify.updateSuccess'),
            'Close',
            { duration: 3000 },
          );
          this.dialog.close('updated');
        },
        error: (err) => {
          const detail = err?.error?.detail;
          const kode = typeof detail === 'string' ? detail : detail?.code;
          let pesan: string;
          if (kode === 'PURCHASE_HAS_PAYMENTS') {
            pesan = this.translate.instant('purchase.editHasPayments');
          } else if (kode === 'FORBIDDEN_LEVEL') {
            pesan = this.translate.instant('purchaseMeta.forbiddenLevel');
          } else {
            pesan = this.pesanServer.terjemahkan(err);
          }
          this.snackBar.open(pesan, 'Close', { duration: 6000 });
        },
      })
      .add(() => (this.menyimpan = false));
  }

  tutup(): void {
    this.dialog.close();
  }
}
