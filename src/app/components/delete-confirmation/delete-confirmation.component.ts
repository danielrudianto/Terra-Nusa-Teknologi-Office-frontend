import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

export interface DeleteConfirmationData {
  title: string;
  prompt: string;
  /**
   * Label tombol lanjut. Bila kosong, dipilih sendiri menurut sifat
   * tindakannya ("Ya, hapus" atau "Ya, lanjut").
   *
   * Sebelumnya bidang ini dikirim salah satu pemanggil tetapi tidak pernah
   * dibaca — tombolnya tetap berbunyi bawaan, dan tidak ada yang tahu.
   */
  confirmLabel?: string;
  /**
   * Menandai tindakan yang merusak secara tegas.
   *
   * Tanpa ini sifatnya ditebak dari kata pada judul dan isi — cara yang
   * meleset pada kalimat seperti "Ganti jenis PO? Isian akan hilang":
   * tidak memuat kata "hapus", padahal isian memang akan hilang.
   */
  destructive?: boolean;
}

@Component({
  selector: 'app-delete-confirmation',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './delete-confirmation.component.html',
  styleUrl: './delete-confirmation.component.scss',
})
export class DeleteConfirmationComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData,
    private dialog: MatDialogRef<DeleteConfirmationComponent>,
    private translate: TranslateService,
  ) {}

  /** Detect a destructive action from the title/prompt so the dialog can
   *  show a trash illustration + red accent, otherwise a friendly blue one. */
  get isDestructive(): boolean {
    if (typeof this.data?.destructive === 'boolean') return this.data.destructive;
    const s =
      `${this.data?.title || ''} ${this.data?.prompt || ''}`.toLowerCase();
    return /delete|hapus|remove|buang|destroy/.test(s);
  }

  /** Label tombol lanjut; yang dikirim pemanggil menang. */
  get labelLanjut(): string {
    if (this.data?.confirmLabel) return this.data.confirmLabel;
    return this.translate.instant(
      this.isDestructive ? 'confirm.yesDelete' : 'confirm.yesContinue',
    );
  }

  get labelBatal(): string {
    return this.translate.instant('common.cancel');
  }

  onCancel(): void {
    this.dialog.close();
  }

  onConfirm(): void {
    this.dialog.close(true);
  }
}
