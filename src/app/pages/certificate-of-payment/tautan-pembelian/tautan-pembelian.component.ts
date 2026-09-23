/*
 * ALAT SEMENTARA — tautkan pembelian lama ke CoP.
 *
 * Dipakai saat merapikan data historis: pembelian yang sudah terbit sebelum
 * jalur CoP ada dihubungkan ke CoP-nya, bukan dihapus lalu dibuat ulang.
 *
 * DIBUAT UNTUK DICOPOT. Seluruh layarnya ada di folder ini; yang menyentuh
 * berkas lain hanya dua tombol di layar CoP dan satu metode di servicenya,
 * dan keduanya ditandai komentar yang sama dengan berkas ini.
 */
import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { TautanPembelianService } from './tautan-pembelian.service';

export interface DataTautanPembelian {
  copId: number;
  copNomor: string;
  nilaiBersih: number;
}

export interface CalonPembelian {
  id: number;
  invoiceName: string;
  date: string;
  dpp: number;
  projectName: string;
  purchaseOrderName: string;
  isPaid: boolean | number;
}

@Component({
  selector: 'app-tautan-pembelian',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './tautan-pembelian.component.html',
  styleUrl: './tautan-pembelian.component.scss',
})
export class TautanPembelianComponent {
  private readonly service = inject(TautanPembelianService);

  readonly memuat = signal(true);
  readonly menyimpan = signal(false);
  readonly galat = signal('');
  readonly calon = signal<CalonPembelian[]>([]);
  readonly dipilih = signal<CalonPembelian | null>(null);

  readonly cari = new FormControl('');

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: DataTautanPembelian,
    private readonly dialogRef: MatDialogRef<TautanPembelianComponent>,
  ) {
    this.muat();
    this.cari.valueChanges.pipe(debounceTime(300)).subscribe(() => this.muat());
  }

  private muat(): void {
    this.memuat.set(true);
    this.galat.set('');
    this.service.calon(this.data.copId, this.cari.value || '').subscribe({
      next: (r: any) => {
        this.calon.set(r?.data ?? []);
        this.memuat.set(false);
      },
      error: (e) => {
        this.galat.set(e?.error?.detail || 'Gagal memuat daftar pembelian.');
        this.calon.set([]);
        this.memuat.set(false);
      },
    });
  }

  pilih(p: CalonPembelian): void {
    this.dipilih.set(this.dipilih()?.id === p.id ? null : p);
  }

  /** Selisih DPP pembelian terhadap nilai bersih CoP; hanya diperlihatkan. */
  selisih(p: CalonPembelian): number {
    return Math.round((Number(p.dpp || 0) - this.data.nilaiBersih) * 100) / 100;
  }

  simpan(): void {
    const p = this.dipilih();
    if (!p || this.menyimpan()) return;
    this.menyimpan.set(true);
    this.galat.set('');
    this.service.tautkan(this.data.copId, p.id).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e) => {
        this.galat.set(e?.error?.detail || 'Gagal menautkan pembelian.');
        this.menyimpan.set(false);
      },
    });
  }

  tutup(): void {
    this.dialogRef.close(false);
  }
}
