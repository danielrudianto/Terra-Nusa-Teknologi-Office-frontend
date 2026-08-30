import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

/**
 * Daftar masukan yang PPN-nya belum boleh dikreditkan karena fakturnya
 * belum terbit.
 *
 * Posisi PPN hanya menyebut totalnya sebagai catatan di bawah rinciannya.
 * Angka itu benar, tetapi tidak menolong siapa pun yang harus MENGEJAR
 * fakturnya: yang dibutuhkan adalah nama pemasoknya, nomor dokumennya, dan
 * berapa nilainya — satu per satu.
 *
 * Komponen ini TIDAK memanggil server. Barisnya sudah ikut terbawa dalam
 * jawaban `taxes/ppn-position` (`masukanTanpaFaktur.rows`) dan dipakai juga
 * oleh unduhan Excel-nya; memanggil ulang hanya akan menghitung dua kali
 * dengan risiko keduanya berbeda.
 */
@Component({
  selector: 'app-masukan-tanpa-faktur',
  standalone: true,
  templateUrl: './masukan-tanpa-faktur.component.html',
  styleUrl: './masukan-tanpa-faktur.component.scss',
  imports: [CommonModule, MatDialogModule, TranslatePipe, DialogGeserDirective],
})
export class MasukanTanpaFakturComponent {
  readonly rows: any[];
  readonly total: number;
  readonly periode: string;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    data: { rows?: any[]; total?: number; periode?: string } | null,
    private readonly translate: TranslateService,
  ) {
    this.rows = data?.rows ?? [];
    this.total = data?.total ?? 0;
    this.periode = data?.periode ?? '';
  }

  /** Pembelian atau beban — keduanya masuk sebagai PPN masukan. */
  sumberLabel(row: any): string {
    return this.translate.instant(
      row?.sumber === 'expense' ? 'tax.sourceExpense' : 'tax.sourcePurchase',
    );
  }

  /**
   * Nama pihak lawan.
   *
   * Pada pembelian ia pemasok lengkap dengan awalannya (PT, CV); pada beban
   * ia lawan transaksi yang boleh kosong — bebannya tetap terutang PPN
   * meski lawannya tidak dicatat, jadi barisnya tidak boleh hilang hanya
   * karena namanya tidak ada.
   */
  namaPihak(row: any): string {
    const s = row?.supplier || {};
    const nama = [s.prefix, s.name].filter(Boolean).join(' ').trim();
    return nama || '—';
  }

  /** Nomor dokumen yang dipakai mencarinya kembali. */
  nomorDokumen(row: any): string {
    return row?.invoiceName || row?.receiptName || '—';
  }

  /** Keterangan tambahan: proyek pada pembelian, uraian pada beban. */
  keterangan(row: any): string {
    return (row?.projectName || row?.description || '').trim();
  }

  /**
   * Masa pajak yang DIGESER, bila ada.
   *
   * Hanya ditampilkan ketika kolomnya benar-benar terisi. Kosong berarti
   * masanya mengikuti tanggal dokumen, dan mengulang tanggal yang sama dua
   * kali dalam satu baris hanya menambah bacaan tanpa menambah keterangan.
   */
  masaDigeser(row: any): string | null {
    return row?.taxPeriod || row?.masaPajak || null;
  }

  nilaiPpn(row: any): number {
    return Number(row?.ppnValue) || 0;
  }

  nilaiDpp(row: any): number {
    return Number(row?.dpp) || 0;
  }

  get totalDpp(): number {
    return this.rows.reduce((a, r) => a + this.nilaiDpp(r), 0);
  }
}
