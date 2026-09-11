import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { DialogGeserDirective } from '../../directives/dialog-geser.directive';

export interface SelisihLunas {
  nilai: number;
  dibayar: number;
  selisih: number;
}

/**
 * Selisihnya kecil — tandai lunas, atau catat pembayaran pembulatannya?
 *
 * Dialog ini muncul untuk selisih di antara satu sen dan lima rupiah. Di
 * bawah itu dokumennya langsung lunas tanpa bertanya; di atas itu ia jelas
 * kurang bayar dan tidak ada yang perlu ditanyakan.
 *
 * Lapisan tengah itu yang dulu diputuskan sendiri oleh sistem, dan akibatnya
 * berurutan: dokumen bertanda lunas begitu tombol selaraskan ditekan, isyarat
 * "masih kurang sedikit" hilang, dan pembayaran pembulatan yang seharusnya
 * dicatat tidak pernah dibuat — sebab tidak ada lagi yang menunjukkan bahwa
 * masih ada yang kurang.
 *
 * Angkanya datang dari server, BUKAN dihitung ulang di sini. Nilai dokumen
 * dihitung dari DPP, PPN, PPh, dan biaya lain dengan rumus yang tinggal di
 * satu tempat; menyalin rumus itu ke layar berarti dua salinan yang akan
 * berselisih — dan yang membaca dialog ini memutuskan berdasarkan angka yang
 * berbeda dari yang dipakai menandai lunas.
 */
@Component({
  selector: 'app-selisih-lunas-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  providers: [DecimalPipe],
  template: `
    <div class="slh">
      <div class="slh-head dlg__head" mat-dialog-title appDialogGeser>
        <span class="dlg__head-icon"><mat-icon>rule</mat-icon></span>
        <div class="dlg__head-text">
          <h2 class="dlg__title">{{ 'lunas.selisihJudul' | translate }}</h2>
          <span class="dlg__sub">{{ 'lunas.selisihSub' | translate }}</span>
        </div>
      </div>

      <mat-dialog-content class="slh-isi">
        <div class="slh-baris">
          <span>{{ 'lunas.nilaiDokumen' | translate }}</span>
          <strong>{{ rupiah(data.nilai) }}</strong>
        </div>
        <div class="slh-baris">
          <span>{{ 'lunas.sudahDibayar' | translate }}</span>
          <strong>{{ rupiah(data.dibayar) }}</strong>
        </div>
        <div class="slh-baris slh-baris--selisih">
          <span>{{ 'lunas.selisihnya' | translate }}</span>
          <strong>{{ rupiah(data.selisih) }}</strong>
        </div>

        <!--
          Banner, bukan mat-hint: keterangan inilah yang menentukan pilihan,
          dan huruf kecil di bawah kotak isian tidak terbaca.
        -->
        <div class="slh-banner">
          <mat-icon>info</mat-icon>
          <div>
            <span>{{ 'lunas.selisihKeterangan' | translate }}</span>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="slh-aksi">
        <button mat-button (click)="batal()">
          {{ 'lunas.belumDulu' | translate }}
        </button>
        <button mat-flat-button color="primary" (click)="konfirmasi()">
          {{ 'lunas.tandaiLunas' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .slh-isi {
        padding: 1.25rem 1.5rem !important;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .slh-baris {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        font-size: 0.86rem;
      }

      .slh-baris span {
        color: var(--muted, #8a90a0);
      }

      /*
       * Selisihnya diberi garis pemisah dan warna peringatan: ia satu-satunya
       * angka yang menjadi dasar keputusan, dua baris di atasnya hanya
       * konteks.
       */
      .slh-baris--selisih {
        margin-top: 0.35rem;
        padding-top: 0.65rem;
        border-top: 1px solid var(--line, #e4e9fb);
        color: var(--warn-fg, #8a5a00);
      }

      .slh-baris--selisih span,
      .slh-baris--selisih strong {
        color: var(--warn-fg, #8a5a00);
      }

      .slh-banner {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        margin-top: 0.6rem;
        padding: 0.8rem 1rem;
        border-radius: 12px;
        background: var(--surface-2, #f6f8ff);
        border: 0.5px solid var(--line, #e4e9fb);
        color: var(--muted, #6b7280);
      }

      .slh-banner mat-icon {
        flex: 0 0 auto;
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }

      .slh-banner span {
        font-size: 0.78rem;
        line-height: 1.45;
      }

      .slh-aksi {
        padding: 0.9rem 1.5rem !important;
        gap: 0.5rem;
        justify-content: flex-end;
        border-top: 1px solid var(--line, #e4e9fb);
      }
    `,
  ],
})
export class SelisihLunasDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SelisihLunas,
    private dialogRef: MatDialogRef<SelisihLunasDialogComponent>,
    private angka: DecimalPipe,
  ) {}

  /**
   * Dua angka di belakang koma, selalu.
   *
   * Selisihnya kerap di bawah satu rupiah — justru itu yang sedang
   * ditanyakan. Dibulatkan ke rupiah penuh, ia tampil sebagai "Rp 0" dan
   * pertanyaannya kehilangan seluruh maknanya.
   */
  rupiah(v: number): string {
    return 'Rp ' + (this.angka.transform(v ?? 0, '1.2-2', 'id') ?? '0,00');
  }

  batal(): void {
    this.dialogRef.close(false);
  }

  konfirmasi(): void {
    this.dialogRef.close(true);
  }
}
