import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { TranslatePipe } from '@ngx-translate/core';

export interface DataPratinjauPo {
  /** Dokumen dalam bentuk data URL. */
  src: string;
  /**
   * Menampilkan pernyataan "sudah membaca" dan mengunci tombol lanjut
   * sampai dicentang. Dipakai saat dokumennya akan diterbitkan; pada
   * pratinjau biasa cukup tombol tutup.
   */
  konfirmasi?: boolean;
  /** Judul dialog; bila kosong memakai teks bawaan. */
  judul?: string;
}

/**
 * Menampilkan dokumen purchase order di dalam dialog.
 *
 * Sebelumnya dokumen dibuka di tab baru. Di layar sempit tab itu praktis
 * tidak terbaca, dan peramban kerap memblokirnya karena bukan hasil
 * penekanan tombol secara langsung — sehingga pratinjaunya justru tidak
 * pernah muncul.
 *
 * Dengan `konfirmasi`, dialog yang sama dipakai sebagai langkah terakhir
 * sebelum PO diterbitkan: dokumennya ditampilkan lebih dulu, dan tombol
 * penerbitan baru terbuka setelah pembuatnya menyatakan sudah membacanya.
 */
@Component({
  selector: 'app-po-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    NgxExtendedPdfViewerModule,
    TranslatePipe,
  ],
  template: `
    <div class="pop">
      <div class="pop__head">
        <h2>
          {{ data.judul || ('poForm.previewTitle' | translate) }}
        </h2>
        <button mat-icon-button (click)="tutup()" aria-label="Tutup">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="pop__doc">
        <ngx-extended-pdf-viewer
          [src]="data.src"
          [sidebarVisible]="false"
          [spread]="'off'"
          [showToolbar]="true"
          [showFindButton]="false"
          [showZoomButtons]="true"
          [showOpenFileButton]="false"
          [showPrintButton]="false"
          [showDownloadButton]="false"
          [showDrawEditor]="false"
          [showHighlightEditor]="false"
          [showStampEditor]="false"
          [showTextEditor]="false"
          [showPresentationModeButton]="false"
          [showRotateButton]="false"
          [showScrollingButtons]="false"
          [showSpreadButton]="false"
          [showPropertiesButton]="false"
        ></ngx-extended-pdf-viewer>
      </div>

      @if (data.konfirmasi) {
        <div class="pop__konfirmasi">
          <mat-checkbox color="primary" [checked]="dibaca()" (change)="dibaca.set($event.checked)">
            {{ 'poForm.confirmRead' | translate }}
          </mat-checkbox>
          <p class="pop__ket">{{ 'poForm.confirmReadHint' | translate }}</p>
        </div>
      }

      <div class="pop__foot">
        <button mat-stroked-button type="button" (click)="tutup()">
          {{ (data.konfirmasi ? 'common.cancel' : 'common.close') | translate }}
        </button>
        @if (data.konfirmasi) {
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="!dibaca()"
            (click)="lanjut()"
          >
            {{ 'poForm.confirmCreate' | translate }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .pop {
        display: flex;
        flex-direction: column;
        /* Dialog mengisi hampir seluruh layar: dokumen SPK berformat A4,
           dan pada kotak kecil tulisannya tidak terbaca — persoalan yang
           sama seperti membukanya di tab baru. */
        width: min(56rem, 94vw);
        height: min(88vh, 60rem);
      }
      .pop__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 0.85rem 0.6rem 1.25rem;
        border-bottom: 1px solid var(--line);
      }
      .pop__head h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }
      .pop__doc {
        flex: 1;
        min-height: 0;
        background: var(--surface-2);
      }
      .pop__doc ngx-extended-pdf-viewer {
        display: block;
        width: 100%;
        height: 100%;
      }
      .pop__konfirmasi {
        padding: 0.85rem 1.25rem 0.35rem;
        border-top: 1px solid var(--line);
      }
      .pop__ket {
        margin: 0.35rem 0 0 2rem;
        font-size: 0.76rem;
        color: var(--muted);
        line-height: 1.5;
      }
      .pop__foot {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
        padding: 0.85rem 1.25rem;
      }
    `,
  ],
})
export class PoPreviewDialogComponent {
  readonly dibaca = signal(false);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DataPratinjauPo,
    private dialogRef: MatDialogRef<PoPreviewDialogComponent>,
  ) {}

  tutup(): void {
    this.dialogRef.close(false);
  }

  lanjut(): void {
    // Penjaga kedua: tombolnya memang sudah dinonaktifkan, tetapi keadaan
    // tombol bukan tempat menaruh aturan.
    if (!this.dibaca()) return;
    this.dialogRef.close(true);
  }
}
