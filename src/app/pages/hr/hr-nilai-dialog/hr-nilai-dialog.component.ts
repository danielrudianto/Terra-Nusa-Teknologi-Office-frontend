import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

export interface DataNilai {
  id: number;
  name: string;
}

/**
 * Tautan yang dapat diklik di dalam jawaban.
 *
 * Soal gambar dijawab dengan menempelkan tautan berbagi (Drive, Dropbox).
 * Tanpa ini yang memeriksa harus menyalin tautannya dengan tangan dari
 * kotak teks — dua puluh empat kali, untuk setiap pelamar.
 */
const POLA_TAUTAN = /(https?:\/\/[^\s<>"']+)/gi;

export function pecahTautan(
  teks: string | null,
): { teks: string; tautan: boolean }[] {
  if (!teks) return [];
  const bagian: { teks: string; tautan: boolean }[] = [];
  let akhir = 0;
  for (const m of teks.matchAll(POLA_TAUTAN)) {
    const i = m.index ?? 0;
    if (i > akhir) bagian.push({ teks: teks.slice(akhir, i), tautan: false });
    bagian.push({ teks: m[0], tautan: true });
    akhir = i + m[0].length;
  }
  if (akhir < teks.length) {
    bagian.push({ teks: teks.slice(akhir), tautan: false });
  }
  return bagian;
}

@Component({
  selector: 'app-hr-nilai-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './hr-nilai-dialog.component.html',
  styleUrls: ['./hr-nilai-dialog.component.scss'],
})
export class HrNilaiDialogComponent {
  private readonly api = inject(ApiService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  readonly dialogRef = inject(MatDialogRef<HrNilaiDialogComponent>);
  readonly data = inject<DataNilai>(MAT_DIALOG_DATA);

  readonly memuat = signal(false);
  readonly menyimpan = signal(false);
  readonly galat = signal('');
  readonly lembar = signal<any>(null);

  /** Nilai & catatan yang sedang disunting, per questionID. */
  readonly draf = signal<Record<number, { score: any; note: string }>>({});

  constructor() {
    void this.muat();
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const res: any = await firstValueFrom(
        this.api.get(`hr/candidates/${this.data.id}/lembar`, {}),
      );
      this.lembar.set(res);
      const d: Record<number, { score: any; note: string }> = {};
      for (const s of (res?.soal ?? []) as any[]) {
        d[s.questionID] = {
          // `null` dipertahankan: kotak nilai yang kosong berarti BELUM
          // dinilai, dan itu berbeda dari nilai nol.
          score: s.score === null || s.score === undefined ? null : s.score,
          note: s.checkerNote ?? '',
        };
      }
      this.draf.set(d);
    } catch (e) {
      this.lembar.set(null);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }

  readonly soal = computed<any[]>(() => this.lembar()?.soal ?? []);
  readonly pelamar = computed<any>(() => this.lembar()?.pelamar ?? null);

  bagian(teks: string | null) {
    return pecahTautan(teks);
  }

  /**
   * Total yang dihitung dari yang SEDANG disunting, bukan dari server.
   *
   * Yang memeriksa perlu melihat totalnya bergerak saat ia mengetik; total
   * dari server baru berubah setelah disimpan, dan sampai saat itu ia
   * menampilkan angka yang tidak sesuai dengan yang terlihat di layar.
   */
  readonly rekap = computed(() => {
    const d = this.draf();
    let nilai = 0;
    let maks = 0;
    let belum = 0;
    for (const s of this.soal()) {
      maks += Number(s.maxScore) || 0;
      const v = d[s.questionID]?.score;
      if (v === null || v === undefined || v === '') belum++;
      else nilai += Number(v) || 0;
    }
    return { nilai, maks, belum, jumlah: this.soal().length };
  });

  ubahNilai(questionID: number, nilai: any): void {
    const d = { ...this.draf() };
    const kosong = nilai === null || nilai === undefined || nilai === '';
    d[questionID] = {
      ...(d[questionID] ?? { note: '' }),
      score: kosong ? null : Number(nilai),
    };
    this.draf.set(d);
  }

  ubahCatatan(questionID: number, teks: string): void {
    const d = { ...this.draf() };
    d[questionID] = { ...(d[questionID] ?? { score: null }), note: teks };
    this.draf.set(d);
  }

  /** Nilai di luar 0..maxScore — ditandai sebelum dikirim, bukan sesudah ditolak. */
  nilaiTidakSah(s: any): boolean {
    const v = this.draf()[s.questionID]?.score;
    if (v === null || v === undefined || v === '') return false;
    const n = Number(v);
    return !Number.isFinite(n) || n < 0 || n > Number(s.maxScore);
  }

  readonly adaYangTidakSah = computed<boolean>(() =>
    this.soal().some((s) => this.nilaiTidakSah(s)),
  );

  async simpan(): Promise<void> {
    if (this.adaYangTidakSah()) return;
    this.menyimpan.set(true);
    try {
      const d = this.draf();
      const nilai = this.soal().map((s) => ({
        questionID: s.questionID,
        score:
          d[s.questionID]?.score === null ||
          d[s.questionID]?.score === undefined ||
          d[s.questionID]?.score === ''
            ? null
            : Number(d[s.questionID].score),
        checkerNote: (d[s.questionID]?.note ?? '').trim() || null,
      }));
      await firstValueFrom(
        this.api.put(`hr/candidates/${this.data.id}/nilai`, { nilai }),
      );
      this.snackBar.open(
        this.translate.instant('hrNilai.tersimpan'),
        'Close',
        { duration: 2500 },
      );
      // Dimuat ulang supaya nama pemeriksa & waktunya ikut terlihat, dan
      // supaya yang tersimpan benar-benar yang dibaca balik dari server.
      await this.muat();
      this.dialogRef.disableClose = false;
    } catch (e) {
      this.snackBar.open(this.pesanServer.terjemahkan(e), 'Close', {
        duration: 5000,
      });
    } finally {
      this.menyimpan.set(false);
    }
  }

  tutup(): void {
    this.dialogRef.close(true);
  }
}
