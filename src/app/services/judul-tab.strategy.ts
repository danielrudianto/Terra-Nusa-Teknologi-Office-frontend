import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const JUDUL_DASAR = 'TerraBot | PT. Alpha Konstruksi Nusantara';

/**
 * Judul tab peramban mengikuti halaman yang dibuka, dan menyebut berapa
 * yang menunggu persetujuan.
 *
 *   "(3) Purchase Order · TerraBot"
 *
 * Yang membuka belasan tab dapat menemukan halaman yang dicari dari
 * judulnya, dan tahu ada yang menunggu tanpa harus berpindah tab.
 *
 * Nama halamannya diambil dari `data.title` rute terdalam — nilai yang sama
 * yang sudah tampil di kepala halaman — bukan dari properti `title` Angular,
 * yang tidak pernah dipakai di berkas rute ini.
 *
 * Hitungannya jumlah seluruh lencana, DIKIRIM oleh MainComponent lewat
 * `setMenunggu`. Strategi ini sengaja tidak menyuntik LencanaService
 * sendiri: layanan itu langsung meminta `dashboard/lencana` saat dibuat,
 * dan strategi judul dibuat untuk SETIAP halaman — termasuk halaman masuk
 * dan halaman ujian kandidat yang tidak punya sesi. Permintaan tanpa sesi
 * dibalas 401, dan interceptor mengalihkan kandidat ke halaman masuk.
 *
 * Nol tidak ditulis: "(0)" di setiap tab hanya derau.
 */
@Injectable({ providedIn: 'root' })
export class JudulTabStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly halaman = signal<string>('');
  private readonly menunggu = signal(0);

  setMenunggu(n: number): void {
    this.menunggu.set(Number.isFinite(n) && n > 0 ? n : 0);
  }

  constructor() {
    super();
    effect(() => {
      this.title.setTitle(susunJudul(this.halaman(), this.menunggu()));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let r = snapshot.root;
    let judul = '';
    while (r) {
      const t = r.data?.['title'];
      if (typeof t === 'string' && t) judul = t;
      r = r.firstChild!;
    }
    this.halaman.set(judul);
  }
}

export function susunJudul(halaman: string, menunggu: number): string {
  const awal = menunggu > 0 ? `(${menunggu}) ` : '';
  return halaman ? `${awal}${halaman} · TerraBot` : `${awal}${JUDUL_DASAR}`;
}
