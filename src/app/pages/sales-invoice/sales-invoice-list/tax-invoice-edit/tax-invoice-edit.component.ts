import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, Inject, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';
import { MonthSelectorComponent } from 'src/app/components/month-selector/month-selector.component';

/**
 * Ubah nomor faktur pajak KELUARAN, dan geser masa pajaknya.
 *
 * Layar ini menutup satu lubang: nomor faktur hanya dapat diketik sekali,
 * yaitu di dialog persetujuan — padahal nomor fakturnya justru kerap terbit
 * SESUDAH invoicenya berjalan, dan yang salah ketik baru ketahuan setelah itu.
 *
 * Masa pajaknya dibiarkan KOSONG selama fakturnya dilaporkan pada masa
 * tanggal invoicenya sendiri — itu keadaan yang normal, dan tidak perlu
 * dicatat dua kali. Ia diisi hanya bila fakturnya jatuh ke masa lain.
 */
@Component({
  selector: 'app-tax-invoice-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './tax-invoice-edit.component.html',
  styleUrl: './tax-invoice-edit.component.scss',
})
export class TaxInvoiceEditComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      name?: string;
      taxInvoiceName?: string;
      taxPeriod?: string | null;
      date?: string;
      dpp?: number;
      ppn?: number;
    },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<TaxInvoiceEditComponent>,
    private pilih: MatDialog,
  ) {}

  isSubmitting = false;

  formGroup: FormGroup = new FormGroup({
    taxInvoiceName: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    taxPeriod: new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    if (this.data.taxInvoiceName) {
      this.formGroup.patchValue({ taxInvoiceName: this.data.taxInvoiceName });
    }
    if (this.data.taxPeriod) {
      this.formGroup.patchValue({ taxPeriod: new Date(this.data.taxPeriod) });
    }
  }

  get ppnAmount(): number {
    return ((this.data.dpp || 0) * (this.data.ppn || 0)) / 100;
  }

  /** Tanggal invoice, untuk dibandingkan dengan masanya. */
  get tanggalTampil(): string {
    if (!this.data.date) return '—';
    const d = new Date(this.data.date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** "Agustus 2026", atau kosong bila mengikuti tanggal invoice. */
  get masaPajakTampil(): string {
    const d = this.formGroup.get('taxPeriod')?.value as Date | null;
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Masa yang dipilih ternyata bulan yang sama dengan tanggal invoicenya.
   *
   * Bukan galat — servernya menyimpannya sebagai kosong. Diberitahukan supaya
   * tidak ada yang mengira fakturnya sudah digeser padahal tidak.
   */
  get masaPajakSamaDenganTanggal(): boolean {
    const masa = this.formGroup.get('taxPeriod')?.value as Date | null;
    if (!masa || !this.data.date) return false;
    const a = new Date(this.data.date);
    if (isNaN(a.getTime())) return false;
    const b = new Date(masa);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  /**
   * Selisih BULAN antara masa pajak dan tanggal invoice.
   *
   * Positif: masanya SESUDAH tanggal invoice — fakturnya baru terbit
   * belakangan. Negatif: masanya SEBELUM tanggal invoice — inilah
   * pembetulan, dan bentuknya normal (lihat `masaPajakMundur`).
   */
  private get selisihMasa(): number | null {
    const masa = this.formGroup.get('taxPeriod')?.value as Date | null;
    if (!masa || !this.data.date) return null;
    const a = new Date(this.data.date);
    if (isNaN(a.getTime())) return null;
    const b = new Date(masa);
    return (
      (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
    );
  }

  /**
   * Masanya MENDAHULUI tanggal dokumen — dokumen pembetulan.
   *
   * Faktur pengganti terbit pada bulan ditemukannya kesalahan, tetapi masa
   * pajaknya tetap mengikuti faktur ASLI. Invoice Januari yang dibetulkan
   * Februari berdokumen Februari, bermasa Januari.
   *
   * Ini keadaan yang WAJAR, bukan kekeliruan. Dahulu ia ikut ditandai
   * sebagai "masa jauh" — keliru, dan keliru pada arah yang justru paling
   * sering dipakai.
   */
  get masaPajakMundur(): boolean {
    const s = this.selisihMasa;
    return s !== null && s < 0;
  }

  /**
   * Masanya lebih dari tiga bulan SESUDAH tanggal invoice.
   *
   * Peringatan, bukan larangan — yang dicegah hanya masa yang terisi jauh
   * tanpa disadari, biasanya karena salah ketik tahun.
   */
  get masaPajakJauh(): boolean {
    const s = this.selisihMasa;
    return s !== null && s > 3;
  }

  pilihMasaPajak(): void {
    const awal =
      (this.formGroup.get('taxPeriod')?.value as Date | null) ||
      (this.data.date ? new Date(this.data.date) : null) ||
      new Date();
    const d = new Date(awal);
    this.pilih
      .open(MonthSelectorComponent, {
        data: { month: d.getMonth(), year: d.getFullYear() },
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil: { month: number; year: number } | undefined) => {
        if (!hasil) return;
        // Hari PERTAMA bulannya: masa pajak adalah BULAN, bukan hari.
        this.formGroup
          .get('taxPeriod')
          ?.setValue(new Date(hasil.year, hasil.month, 1));
      });
  }

  kosongkanMasaPajak(): void {
    this.formGroup.get('taxPeriod')?.setValue(null);
  }

  private masaPajakIso(): string | null {
    const d = this.formGroup.get('taxPeriod')?.value as Date | null;
    if (!d) return null;
    const t = new Date(d);
    const b = String(t.getMonth() + 1).padStart(2, '0');
    return `${t.getFullYear()}-${b}-01`;
  }

  onSubmit(): void {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;
    const dikirim = this.masaPajakIso();
    this.apiService
      .put(`sales-invoices/tax-invoice/${this.data.id}`, {
        taxInvoiceName: this.formGroup.value.taxInvoiceName.trim(),
        taxPeriod: dikirim,
      })
      .subscribe({
        next: (hasil: any) => {
          // Apa yang BENAR-BENAR tersimpan, bukan apa yang kita kirim.
          //
          // Server yang belum diperbarui membuang bidang yang belum
          // dikenalnya tanpa galat dan tetap menjawab "berhasil" — masa
          // pajaknya diam-diam tidak tersimpan, dan barulah ketahuan
          // berminggu-minggu kemudian lewat Posisi PPN yang angkanya
          // meleset. Kegagalan senyap itu dijadikan terlihat di sini.
          const tersimpan =
            hasil && 'taxPeriod' in hasil ? hasil.taxPeriod ?? null : undefined;
          const tidakTersimpan =
            tersimpan === undefined || (dikirim ?? null) !== tersimpan;

          if (tidakTersimpan) {
            this.snackBar.open(
              this.translate.instant('notify.taxPeriodNotStored'),
              'Close',
              { duration: 9000 },
            );
          } else {
            this.snackBar.open(
              this.translate.instant('notify.taxInvoiceSaved'),
              'Close',
              { duration: 3000 },
            );
          }
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            this.serverMessage.terjemahkan(error, 'notify.updateFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
