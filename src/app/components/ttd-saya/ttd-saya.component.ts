import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { PapanTtdComponent } from '../papan-ttd/papan-ttd.component';

export interface DataTtdSaya {
  /** Boleh ditutup tanpa menyimpan? */
  bolehLewat?: boolean;
  /** Tanda tangan yang sudah ada, untuk digambar sebagai titik mulai. */
  awal?: string | null;
}

/**
 * "Tanda tangan saya" — dibuat sekali, dipakai dokumen resmi.
 *
 * KENAPA BUKAN SEKADAR GAMBAR YANG DISERET SENDIRI
 *
 * Alat tanda tangan pada penyunting PDF menyimpan coretannya di
 * `localStorage` peramban: kenyamanan satu orang di satu perangkat, hilang
 * tanpa merugikan siapa pun. Yang ini lain — ia tersimpan di server dan
 * dicap pada dokumen resmi, jadi ia bukan kenyamanan melainkan identitas.
 *
 * YANG PERLU JUJUR DIKATAKAN DI LAYARNYA
 *
 * Gambar tanda tangan adalah STEMPEL, bukan bukti. Yang membuktikan siapa
 * menyetujui apa tetap jejak akunnya — siapa, kapan, dari akun mana. Karena
 * itu bannernya menyebut hal itu, bukan menjanjikan keamanan yang tidak
 * diberikan oleh sebuah gambar.
 */
@Component({
  selector: 'app-ttd-saya',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
    PapanTtdComponent,
    DialogGeserDirective,
  ],
  templateUrl: './ttd-saya.component.html',
  styleUrls: ['./ttd-saya.component.scss'],
})
export class TtdSayaComponent {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly terjemah = inject(TranslateService);
  private readonly dialogRef = inject<MatDialogRef<TtdSayaComponent>>(MatDialogRef);
  readonly data = inject<DataTtdSaya>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild(PapanTtdComponent) papan?: PapanTtdComponent;

  /** Ada coretan di papannya? Menghidupkan tombol simpan. */
  adaCoretan = false;

  menyimpan = false;

  get bolehLewat(): boolean {
    return this.data?.bolehLewat !== false;
  }

  bersihkan(): void {
    this.papan?.bersihkan();
    this.adaCoretan = false;
  }

  lewati(): void {
    // Menutup dengan `false`: pemanggilnya membedakan "dilewati" dari
    // "tersimpan", dan yang memaksa (layar setujui) menolak yang pertama.
    this.dialogRef.close(false);
  }

  async simpan(): Promise<void> {
    const gambar = this.papan?.gambar();
    if (!gambar || this.menyimpan) return;
    this.menyimpan = true;
    try {
      await firstValueFrom(this.api.put('user-signatures/me', { image: gambar }));
      this.snack.open(
        this.terjemah.instant('ttd.tersimpan'),
        this.terjemah.instant('common.close'),
        { duration: 3000 },
      );
      this.dialogRef.close(true);
    } catch (e) {
      this.snack.open(
        this.pesanServer.terjemahkan(e, 'ttd.gagalSimpan'),
        this.terjemah.instant('common.close'),
        { duration: 6000 },
      );
    } finally {
      this.menyimpan = false;
    }
  }
}
