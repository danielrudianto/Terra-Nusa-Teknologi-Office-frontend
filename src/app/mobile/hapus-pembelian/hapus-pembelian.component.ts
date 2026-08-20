import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { ApiService } from '../../services/api.service';
import { ServerMessageService } from '../../services/server-message.service';

/**
 * Menghapus pembelian dari ponsel.
 *
 * SATU-SATUNYA LAYAR DI SINI YANG MERUSAK
 *
 * Menyetujui masih dapat dicabut; menghapus tidak. Karena itu layar ini
 * berbeda dari dua layar persetujuan dalam tiga hal, dan ketiganya sengaja:
 *
 *   1. Daftarnya TIDAK ditampilkan dengan sendirinya. Harus dicari lebih
 *      dulu — yang membuka layar ini tanpa maksud menghapus apa pun tidak
 *      disodori deretan tombol hapus.
 *   2. Rinciannya menuntut konfirmasi kedua, dan tombolnya baru hidup
 *      sesudah itu.
 *   3. Server tetap menolak yang sudah disetujui, kecuali bagi pemilik —
 *      aturan itu TIDAK disalin ke sini, hanya pesannya yang ditampilkan.
 */
@Component({
  selector: 'app-hapus-pembelian',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './hapus-pembelian.component.html',
  styleUrls: ['./hapus-pembelian.component.scss'],
})
export class HapusPembelianComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  readonly pencarian = new FormControl('');
  daftar: any[] = [];
  sedangMemuat = false;
  sedangKirim = false;
  sudahMencari = false;
  dipilih: any = null;
  yakin = false;

  ngOnInit(): void {
    this.pencarian.valueChanges
      .pipe(debounceTime(450))
      .subscribe(() => this.muat());
  }

  muat(): void {
    const kata = (this.pencarian.value ?? '').trim();
    /*
     * Tanpa kata kunci, tidak ada daftar.
     *
     * Bukan penghematan permintaan: layar hapus yang terbuka dengan sendirinya
     * berisi deretan dokumen yang tidak dicari siapa pun, dan setiap barisnya
     * satu ketukan dari hilang.
     */
    if (!kata) {
      this.daftar = [];
      this.sudahMencari = false;
      return;
    }

    this.sedangMemuat = true;
    this.sudahMencari = true;
    this.api
      .get('purchases', {
        keyword: kata,
        page: 1,
        pageSize: 25,
        filter: 0,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          this.daftar = res?.data ?? res?.items ?? [];
        },
        error: () =>
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.sedangMemuat = false));
  }

  buka(p: any): void {
    this.dipilih = p;
    // Konfirmasi selalu dimulai dari nol pada setiap dokumen.
    this.yakin = false;
  }

  tutup(): void {
    this.dipilih = null;
    this.yakin = false;
  }

  nilai(p: any): number {
    const dpp = Number(p?.dpp) || 0;
    const ppn = ((Number(p?.ppn) || 0) * dpp) / 100;
    return dpp + ppn + (Number(p?.pbbkb) || 0) + (Number(p?.otherValue) || 0);
  }

  hapus(p: any): void {
    if (!this.yakin) return;
    this.sedangKirim = true;
    this.api
      .delete(`purchases/${p.id}`)
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('mobile.pembelian.terhapus', {
              nomor: p.invoiceName ?? p.id,
            }),
            'Close',
            { duration: 2500 },
          );
          this.tutup();
          this.muat();
        },
        error: (err) =>
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
            duration: 6000,
          }),
      })
      .add(() => (this.sedangKirim = false));
  }
}
