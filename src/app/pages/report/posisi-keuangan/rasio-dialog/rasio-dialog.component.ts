import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { uangDokumen } from 'src/app/helpers/uang.helper';
import { ApiService } from 'src/app/services/api.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { firstValueFrom } from 'rxjs';

/** Yang dibutuhkan dialog ini; disusun pemanggilnya. */
export interface DataRasioDialog {
  kode: string;
  teks: string;
  posisi: string | null;
  baik: boolean | null;
  pitaTeks: string;
  acuan?: string | null;
  /** Kunci terjemahan arti & risiko, sudah diselesaikan pemanggilnya. */
  arti: string;
  /** Pembilang, penyebut, pengali — boleh kosong. */
  hitungan: any | null;
  /**
   * Bentuk cetak rasio ini — menentukan SKALA kotak isian pita acuan.
   *
   * Pita rasio persen disimpan sebagai pecahan (0,15) dan dibaca orang
   * sebagai 15%. Tanpa bentuk ini, kotak isiannya menerima 15 lalu
   * menyimpannya sebagai 1500% — pita yang tak pernah dilampaui siapa pun,
   * sehingga setiap rasio selamanya "di dalam acuan". Tidak ada galat, dan
   * yang membacanya menyimpulkan perusahaannya baik-baik saja.
   */
  bentuk: 'angka' | 'hari' | 'persen';
  /** Pita yang berlaku sekarang, dalam bentuk SIMPANANNYA (pecahan). */
  pita?: { bawah?: number | null; atas?: number | null } | null;
}

/**
 * Rincian satu rasio: artinya, risikonya, dan hitungannya.
 *
 * DIPISAH DARI PETAKNYA, dan itu yang diminta.
 *
 * Sebagai baris tabel berkolom, tiap rasio membawa satu paragraf arti dan
 * satu panel hitungan — sebelas rasio berarti sebelas baris tinggi yang
 * harus digulir, dan yang dicari orang (membandingkan angkanya) justru
 * tenggelam. Sebagai petak, kesebelas angka muat dalam satu layar; yang
 * ingin tahu artinya membuka satu.
 */
@Component({
  selector: 'app-rasio-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogGeserDirective, 
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './rasio-dialog.component.html',
  styleUrl: './rasio-dialog.component.scss',
})
export class RasioDialogComponent {
  private readonly api = inject(ApiService);
  private readonly perm = inject(PermissionService);
  private readonly pesanServer = inject(ServerMessageService);

  /** Sedang mengubah pita acuan? */
  readonly mengubah = signal(false);
  readonly menyimpan = signal(false);
  readonly galatSimpan = signal('');

  /** Isi kotak, dalam SKALA YANG DIBACA ORANG (persen sebagai 15, bukan 0,15). */
  isianBawah: number | null = null;
  isianAtas: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<RasioDialogComponent>,
    private readonly translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public data: DataRasioDialog,
  ) {
    this.muatIsian();
  }

  /**
   * Boleh mengubah pita acuan?
   *
   * `finance_status:update`, bukan `read`. Mengubah pita mengubah cara
   * SELURUH angka di halaman itu dibaca orang — sebuah pita yang digeser
   * diam-diam membuat rasio yang buruk terbaca "di dalam acuan" tanpa satu
   * angka pun berubah.
   *
   * Gerbang yang sebenarnya tetap di server; ini hanya agar tombolnya tidak
   * tampil lalu ditolak.
   */
  bolehUbah(): boolean {
    return this.perm.can('finance_status', 'update');
  }

  /** Pecahan simpanan -> angka yang dibaca orang. */
  private keLayar(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return this.data.bentuk === 'persen' ? n * 100 : n;
  }

  /** Angka yang dibaca orang -> pecahan simpanan. */
  private keSimpanan(v: unknown): number | null {
    if (v === null || v === undefined || (v as any) === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return this.data.bentuk === 'persen' ? n / 100 : n;
  }

  /** Satuan yang dicetak di sebelah kotak isian, supaya skalanya tidak ditebak. */
  satuan(): string {
    if (this.data.bentuk === 'persen') return '%';
    if (this.data.bentuk === 'hari') {
      return this.translate.instant('posisiKeuangan.satuanHari');
    }
    return '';
  }

  private muatIsian(): void {
    this.isianBawah = this.keLayar(this.data.pita?.bawah);
    this.isianAtas = this.keLayar(this.data.pita?.atas);
  }

  mulaiUbah(): void {
    this.muatIsian();
    this.galatSimpan.set('');
    this.mengubah.set(true);
  }

  batalUbah(): void {
    this.muatIsian();
    this.galatSimpan.set('');
    this.mengubah.set(false);
  }

  /**
   * Pita terbalik ditolak DI SINI juga, bukan hanya di server.
   *
   * Bawah melampaui atas tidak menghasilkan galat pada perhitungannya: ia
   * membuat SETIAP nilai berada di luar acuan sekaligus — seluruh rasio
   * menyala merah, dan yang membacanya mengira perusahaannya yang bermasalah.
   */
  pitaTerbalik(): boolean {
    const b = this.isianBawah;
    const a = this.isianAtas;
    return b !== null && a !== null && Number(b) > Number(a);
  }

  async simpan(): Promise<void> {
    if (this.pitaTerbalik()) return;
    this.menyimpan.set(true);
    this.galatSimpan.set('');
    try {
      await firstValueFrom(
        this.api.put(`finance-status/ambang/${this.data.kode}`, {
          bawah: this.keSimpanan(this.isianBawah),
          atas: this.keSimpanan(this.isianAtas),
        }),
      );
      // Dialog DITUTUP dengan hasil, dan halamannya memuat ulang.
      //
      // Pita yang berubah mengubah letak SELURUH rasio, bukan hanya yang
      // sedang dibuka — menyegarkan satu petak saja akan membiarkan sepuluh
      // petak lain menyebut posisi yang sudah tidak berlaku.
      this.dialogRef.close({ ambangBerubah: true });
    } catch (e) {
      this.galatSimpan.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.menyimpan.set(false);
    }
  }

  async kembalikanBawaan(): Promise<void> {
    this.menyimpan.set(true);
    this.galatSimpan.set('');
    try {
      await firstValueFrom(
        this.api.delete(`finance-status/ambang/${this.data.kode}`),
      );
      this.dialogRef.close({ ambangBerubah: true });
    } catch (e) {
      this.galatSimpan.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.menyimpan.set(false);
    }
  }

  uang(n: unknown): string {
    // Spasi TAK-PUTUS: lihat `uangDokumenRp` untuk alasannya.
    return 'Rp\u00a0' + uangDokumen(n);
  }

  /** Rincian penyusun; daftar KOSONG bila memang tidak dirinci. */
  rincian(sisi: any): any[] {
    return Array.isArray(sisi?.rincian) ? sisi.rincian : [];
  }

  /**
   * Label komponen: terjemahan bila ada, label dari server bila tidak.
   *
   * Kategori beban datang dari DATA, bukan dari daftar tetap. Yang belum
   * punya terjemahan akan tercetak sebagai "posisiKeuangan.komponen.sewa" di
   * layar yang dibaca stakeholder.
   */
  labelKomponen(x: any): string {
    const kunci = 'posisiKeuangan.komponen.' + (x?.kategori ?? '');
    const t = this.translate.instant(kunci);
    if (t && t !== kunci) return t;
    return x?.label || x?.kategori || '—';
  }

  tutup(): void {
    this.dialogRef.close();
  }
}
