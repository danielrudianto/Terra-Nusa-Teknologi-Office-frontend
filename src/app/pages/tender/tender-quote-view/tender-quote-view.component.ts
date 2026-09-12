import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import {
  kategoriTerpakai,
  keteranganPada,
  labelKategori,
} from 'src/app/constants/tender-keterangan.constant';
import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import {
  BarisRekap,
  DataRekap,
  PenawaranRekap,
  biayaSebenarnya,
  dibayarkan,
  hargaBaris,
  jumlahDitawar,
  nilaiPpn,
  subtotal,
  tidakLengkap,
} from 'src/app/helpers/tender-rekap.helper';

export interface DataLihatPenawaran {
  rekap: DataRekap;
  quote: PenawaranRekap;
}

/**
 * Satu penawaran, utuh.
 *
 * Layar perbandingan menampilkan seluruh pemasok berdampingan — dan justru
 * karena itu tiap penawaran terpotong: satu kolom sempit, harga dibulatkan ke
 * rupiah penuh, catatan per baris tersembunyi, dan keterangan pemasok
 * dipadatkan menjadi satu sel. Yang hendak memeriksa SATU penawaran sebelum
 * memutuskan tidak punya tempat untuk melakukannya.
 *
 * Dialog ini tempat itu: satu pemasok, seluruh barisnya, beserta jejak siapa
 * mengubah apa pada penawarannya.
 *
 * Seluruh angkanya diambil dari `tender-rekap.helper` — penyebut yang sama
 * dengan yang dipakai layar perbandingan, PDF, dan Excel. Menghitungnya
 * sendiri di sini berarti empat salinan satu rumus, dan yang membandingkan
 * dialog ini dengan lembar Excel-nya menemukan dua angka berbeda untuk
 * penawaran yang sama.
 */
@Component({
  selector: 'app-tender-quote-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    DialogGeserDirective,
    AuditTrailComponent,
  ],
  templateUrl: './tender-quote-view.component.html',
  styleUrl: './tender-quote-view.component.scss',
})
export class TenderQuoteViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DataLihatPenawaran,
    private dialogRef: MatDialogRef<TenderQuoteViewComponent>,
  ) {}

  get rekap(): DataRekap {
    return this.data.rekap;
  }

  get quote(): PenawaranRekap {
    return this.data.quote;
  }

  get items(): BarisRekap[] {
    return this.rekap?.items ?? [];
  }

  get isJasa(): boolean {
    return this.rekap?.jenis === 'jasa';
  }

  get namaPemasok(): string {
    return `${this.quote?.supplierPrefix ?? ''} ${this.quote?.supplierName ?? ''}`.trim();
  }

  // ------------------------------------------------------------------
  // Angka — seluruhnya dari helper bersama
  // ------------------------------------------------------------------

  harga(itemId: number): number | null {
    return hargaBaris(this.quote, itemId);
  }

  /**
   * Jumlah satu baris: harga satuan dikali volume.
   *
   * Baris tanpa volume TIDAK berjumlah nol — ia tidak dapat dijumlahkan sama
   * sekali, dan menuliskannya sebagai nol membuat yang membacanya mengira
   * barisnya gratis. Dikembalikan `null` supaya tampilannya menyebut itu.
   */
  jumlahBaris(it: BarisRekap): number | null {
    const h = this.harga(it.id);
    const v = Number(it.quantity) || 0;
    if (h === null || !v) return null;
    return h * v;
  }

  /** Kategori keterangan yang diisi penawaran ini. */
  get kategoriTerisi(): string[] {
    return kategoriTerpakai([this.quote as any]);
  }

  readonly labelKategori = labelKategori;

  keteranganPada(kategori: string): string[] {
    return keteranganPada(this.quote as any, kategori);
  }

  catatanBaris(itemId: number): string {
    const b = (this.quote?.items ?? []).find((x) => x.tenderItemID === itemId);
    return b?.notes ?? '';
  }

  get subtotal(): number {
    return subtotal(this.rekap, this.quote);
  }

  get nilaiPpn(): number {
    return nilaiPpn(this.rekap, this.quote);
  }

  get dibayarkan(): number {
    return dibayarkan(this.rekap, this.quote);
  }

  get biayaLain(): number {
    return Number(this.quote?.otherCost) || 0;
  }

  get biayaSebenarnya(): number {
    return biayaSebenarnya(this.rekap, this.quote);
  }

  get jumlahDitawar(): number {
    return jumlahDitawar(this.rekap, this.quote);
  }

  get tidakLengkap(): boolean {
    return tidakLengkap(this.rekap, this.quote);
  }

  /**
   * Loco tanpa ongkos angkut yang ditaksir.
   *
   * Loco berarti AKN yang menjemput, dan ongkosnya tidak pernah muncul di
   * surat penawaran. Dibiarkan kosong, penawaran ini tampak lebih murah
   * daripada yang sebenarnya — dan yang tidak terlihat itulah yang paling
   * sering menjungkirkan perbandingan.
   */
  get locoTanpaOngkos(): boolean {
    return this.quote?.deliveryMethod === 'loco' && !this.biayaLain;
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
