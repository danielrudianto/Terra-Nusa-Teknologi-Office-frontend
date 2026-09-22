import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import {
  RUTE_TAHAP,
  TahapAntrean,
  kelompokkan,
  ringkasAntrean,
  tingkatUmur,
} from './meja';

/**
 * Antrean pekerjaan per divisi.
 *
 * Satu kartu per divisi yang tahapnya boleh dilihat pengguna; tiap baris satu
 * tahap: jumlah dokumen, umur tunggu tertua, dan sebaran umurnya. Angkanya
 * "yang tertahan di tahap ini", bukan "yang menunggu SAYA" — itu tugas
 * lencana di menu samping, dan keduanya boleh berbeda.
 */
@Component({
  selector: 'app-meja-antrean',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule, TranslatePipe],
  templateUrl: './meja-antrean.component.html',
  styleUrl: './meja.shared.scss',
})
export class MejaAntreanComponent {
  private readonly api = inject(ApiService);

  /** Divisi pengguna — kartunya didahulukan. */
  readonly divisiSaya = input<string[]>([]);

  /** Ringkasan untuk petak angka di puncak dasbor. */
  readonly ringkasan = output<ReturnType<typeof ringkasAntrean>>();

  readonly memuat = signal(true);
  readonly gagal = signal(false);
  readonly tahap = signal<TahapAntrean[]>([]);

  readonly susunan = computed(() => kelompokkan(this.tahap(), this.divisiSaya()));
  readonly kosong = computed(() => !this.memuat() && !this.gagal() && this.tahap().length === 0);
  readonly semuaBeres = computed(
    () => !this.memuat() && this.tahap().length > 0 && ringkasAntrean(this.tahap()).menunggu === 0,
  );

  readonly rute = RUTE_TAHAP;
  readonly tingkat = tingkatUmur;

  constructor() {
    void this.muat();
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.gagal.set(false);
    try {
      const res: any = await firstValueFrom(this.api.get('kpi/antrean', {}));
      this.tahap.set(Array.isArray(res?.tahap) ? res.tahap : []);
    } catch {
      this.tahap.set([]);
      this.gagal.set(true);
    } finally {
      this.memuat.set(false);
      this.ringkasan.emit(ringkasAntrean(this.tahap()));
    }
  }

  /** Lebar tiap ember umur pada batang sebaran (persen). */
  lebar(t: TahapAntrean, kunci: string): number {
    const n = Number(t.jumlah) || 0;
    return n ? Math.round(((Number(t.ember?.[kunci]) || 0) / n) * 100) : 0;
  }

  readonly ember = ['0-2', '3-7', '8-14', '15+'];
}
