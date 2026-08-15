import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  OFFICE_TILES,
  PROJECT_TILES,
} from '../../../constants/purchase-order-tiles.constant';
import {
  purchaseTypeDescKey,
  purchaseTypeKey,
} from '../../../constants/purchase-type-label.constant';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Pemilih jenis PO dalam bentuk dialog.
 *
 * Sebelumnya berupa halaman tersendiri, sehingga setiap kali batal memilih
 * pengguna harus menavigasi kembali ke daftar. Sebagai dialog, daftar PO
 * tetap terlihat di belakangnya dan bisa ditutup begitu saja.
 */
@Component({
  selector: 'app-purchase-order-type-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './purchase-order-type-selector.component.html',
  styleUrl: './purchase-order-type-selector.component.scss',
})
export class PurchaseOrderTypeSelectorComponent {
  readonly projectTiles = PROJECT_TILES;
  readonly officeTiles = OFFICE_TILES;

  /*
   * Hasil saringan dihitung saat kata kuncinya berubah, bukan lewat getter.
   *
   * Sebagai getter, `filter()` berjalan ulang setiap kali templat membacanya
   * — tiga kali per putaran, karena `isEmpty` ikut memanggil keduanya lagi.
   * Daftar jenis PO panjang dan tiap baris memeriksa tiga medan sekaligus.
   */
  private _keyword = '';

  get keyword(): string {
    return this._keyword;
  }

  set keyword(nilai: string) {
    this._keyword = nilai ?? '';
    this.hitungSaringan();
  }

  filteredProject: typeof PROJECT_TILES = PROJECT_TILES;
  filteredOffice: typeof OFFICE_TILES = OFFICE_TILES;
  isEmpty = false;

  private hitungSaringan(): void {
    this.filteredProject = this.filter(this.projectTiles);
    this.filteredOffice = this.filter(this.officeTiles);
    this.isEmpty =
      this.filteredProject.length === 0 && this.filteredOffice.length === 0;
  }

  /** Nama & keterangan jenis PO diambil dari berkas terjemahan. */
  typeKey = purchaseTypeKey;
  typeDescKey = purchaseTypeDescKey;

  constructor(
    private dialogRef: MatDialogRef<PurchaseOrderTypeSelectorComponent>,
  ) {}

  /** Saring menurut kode maupun judul, supaya "5.1.1" dan "asset" sama-sama ketemu. */
  private filter(tiles: typeof PROJECT_TILES) {
    const q = this.keyword.toLowerCase().trim();
    if (!q) return tiles;
    return tiles.filter(
      (t) =>
        t.type.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  }

  /** Kode jenis dikembalikan ke pemanggil; navigasinya ditangani di sana. */
  select(type: string) {
    this.dialogRef.close(type);
  }
}
