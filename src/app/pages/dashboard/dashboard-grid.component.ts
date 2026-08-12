import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, Type, computed, inject, signal } from '@angular/core';

import { PermissionService } from '../../services/permission.service';
import { DASHBOARD_BLOCKS, DashboardBlock } from './dashboard-blocks';

interface BlokSiap {
  id: string;
  span: number;
  primary: boolean;
  component: Type<unknown> | null;
}

/**
 * Susunan blok dashboard.
 *
 * Yang ditampilkan mengikuti wilayah kerja penggunanya, bukan versi terpotong
 * dari dashboard orang lain. Blok yang tidak lolos izin tidak dirender sama
 * sekali — komponennya pun tidak dimuat, sehingga permintaannya ke server
 * tidak pernah dikirim.
 *
 * Bila tidak ada satu pun blok yang lolos, halaman ini tidak menampilkan
 * kerangka kosong: lebih baik menyebutkannya terus terang daripada
 * menyisakan bingkai berisi tulisan "belum ada data" yang tidak pernah
 * berubah.
 */
@Component({
  selector: 'app-dashboard-grid',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  template: `
    @if (blokTampil().length === 0) {
      <div class="dg-empty">
        <span class="dg-empty__title">Belum ada ringkasan untuk Anda</span>
        <span class="dg-empty__sub">
          Ringkasan pada halaman ini mengikuti wilayah kerja. Hubungi
          administrator bila Anda memerlukan akses tertentu.
        </span>
      </div>
    } @else {
      <div class="dg-grid">
        @for (b of blokTampil(); track b.id) {
          <div class="dg-cell" [class.dg-cell--full]="b.span === 12">
            @if (b.component) {
              <ng-container *ngComponentOutlet="b.component" />
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .dg-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }
      .dg-cell {
        min-width: 0;
      }
      .dg-cell--full {
        grid-column: 1 / -1;
      }
      /* Layar sempit: satu kolom, karena dua kartu berdampingan pada lebar
         ponsel membuat angkanya terpotong. */
      @media (max-width: 860px) {
        .dg-grid {
          grid-template-columns: 1fr;
        }
      }
      .dg-empty {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 2.5rem 1.5rem;
        border-radius: 14px;
        border: 1px dashed var(--border, #e3e6eb);
        text-align: center;
        color: var(--muted, #6b7280);
      }
      .dg-empty__title {
        font-weight: 700;
        color: var(--ink, #16181d);
      }
      .dg-empty__sub {
        font-size: 0.82rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class DashboardGridComponent {
  private readonly permission = inject(PermissionService);

  private readonly dimuat = signal<Record<string, Type<unknown>>>({});

  /**
   * Blok yang boleh dilihat pengguna ini.
   *
   * Dihitung ulang ketika peta izin berubah — misalnya setelah izin selesai
   * dimuat pada pemuatan pertama, atau setelah masuk kembali.
   */
  private readonly blokLolos = computed<DashboardBlock[]>(() => {
    // Dibaca agar perhitungan ini ikut diperbarui saat izin berubah.
    this.permission.permissions();

    return DASHBOARD_BLOCKS.filter((b) => {
      const [modul, aksi] = b.permission.split(':');
      return this.permission.can(modul, aksi);
    });
  });

  readonly blokTampil = computed<BlokSiap[]>(() => {
    const lolos = this.blokLolos();
    const utama = lolos.find((b) => b.primary)?.id;
    const dimuat = this.dimuat();

    return lolos.map((b) => ({
      id: b.id,
      span: b.span ?? 6,
      primary: b.id === utama,
      component: dimuat[b.id] ?? null,
    }));
  });

  constructor() {
    this.muatKomponen();
  }

  /**
   * Muat komponen blok yang lolos saja.
   *
   * Blok yang tidak boleh dilihat tidak pernah diunduh berkasnya — jadi
   * bukan hanya disembunyikan dari layar.
   */
  private async muatKomponen(): Promise<void> {
    await this.permission.load();

    for (const b of this.blokLolos()) {
      if (this.dimuat()[b.id]) continue;
      try {
        const komponen = await b.component();
        this.dimuat.update((x) => ({ ...x, [b.id]: komponen }));
      } catch (e) {
        // Satu blok yang gagal dimuat tidak boleh menjatuhkan seluruh
        // halaman; sisanya tetap tampil.
        console.error(`[Dashboard] Blok "${b.id}" gagal dimuat:`, e);
      }
    }
  }
}
