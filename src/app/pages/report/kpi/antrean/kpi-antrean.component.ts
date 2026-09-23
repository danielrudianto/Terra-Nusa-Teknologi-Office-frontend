import { memoPerBaris } from 'src/app/utils/memo-larik';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/** Satu ember umur tunggu, digambar sebagai batang. */
export interface Ember {
  kunci: string;
  nilai: number;
  /** Ember paling lama — diwarnai berbeda. */
  mendesak?: boolean;
}

/**
 * Urutan ember; kuncinya sama persis dengan yang dikirim server.
 *
 * Didaftarkan di sini, bukan dibaca dari jawaban server: ember yang hilang
 * dari satu tahap akan membuat papannya berbeda lebar per tahap, dan
 * sebaran umur tidak lagi dapat dibandingkan antar-tahap sekilas.
 */
export const URUT_EMBER = ['0-2', '3-7', '8-14', '15+'];

/**
 * Sejak berapa hari sebuah antrean disebut TERTAHAN.
 *
 * Dipakai hanya untuk menyorot, bukan menyaring. Angkanya sama dengan batas
 * ember terakhir di server (`EMBER_UMUR` di `kpi_repository.py`), dan
 * keduanya harus bergerak bersama — kalau tidak, tahap yang masuk ember
 * "15+" bisa tidak tersorot, atau sebaliknya.
 */
export const BATAS_TERTAHAN = 15;

/*
 * Ingatan per baris, DI TINGKAT MODUL.
 *
 * Kuncinya objek tahapnya sendiri (WeakMap), jadi berbagi antar-instansi
 * tidak menimbulkan kebocoran: entri ikut hilang bersama datanya. Ditaruh di
 * sini, bukan sebagai bidang kelas, supaya `emberTahap` tetap METODE pada
 * prototipe — uji memanggilnya tanpa menyalakan komponennya.
 */
const emberTahapBaris = memoPerBaris((t: any): Ember[] => {
  const e = t?.ember ?? {};
  return URUT_EMBER.map((k) => ({
    kunci: k,
    nilai: Number(e[k]) || 0,
    mendesak: k === '15+',
  }));
});

@Component({
  selector: 'app-kpi-antrean',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './kpi-antrean.component.html',
  styleUrls: ['../kpi.shared.scss'],
})
export class KpiAntreanComponent {
  private readonly api = inject(ApiService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);

  readonly memuat = signal(false);
  readonly galat = signal('');
  readonly antrean = signal<any>(null);

  constructor() {
    void this.muat();
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const res = await firstValueFrom(this.api.get('kpi/antrean', {}));
      this.antrean.set(res);
    } catch (e) {
      this.antrean.set(null);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }

  readonly tahap = computed<any[]>(() => this.antrean()?.tahap ?? []);

  /**
   * Ada tahap yang boleh dilihat sama sekali.
   *
   * Papan kosong TIDAK ditampilkan: kosong berarti "tidak ada yang
   * menunggu", dan itu pernyataan yang berbeda dari "Anda tidak berhak
   * melihatnya" — pada saat antreannya panjang, kosong itu juga keliru.
   */
  readonly adaAntrean = computed<boolean>(() => this.tahap().length > 0);

  /* Di dalam `*ngFor`, sekali per tahap tiap putaran — diingat per baris. */
  emberTahap(t: any): Ember[] {
    return emberTahapBaris(t);
  }

  /** Lebar batang, dalam persen dari jumlah tahap itu sendiri. */
  lebar(t: any, em: Ember): number {
    const total = Number(t?.jumlah) || 0;
    if (!total) return 0;
    return Math.round((em.nilai / total) * 100);
  }

  tertahan(t: any): boolean {
    return Number(t?.tertuaHari) >= BATAS_TERTAHAN;
  }

  labelTahap(t: any): string {
    return this.translate.instant(`kpi.tahap.${t?.kode}`);
  }
}
