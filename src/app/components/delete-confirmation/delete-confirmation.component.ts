import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export interface DeleteConfirmationData {
  title: string;
  prompt: string;
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
  ) {}

  /** Detect a destructive action from the title/prompt so the dialog can
   *  show a trash illustration + red accent, otherwise a friendly blue one. */
  get isDestructive(): boolean {
    const s =
      `${this.data?.title || ''} ${this.data?.prompt || ''}`.toLowerCase();
    return /delete|hapus|remove|buang|destroy/.test(s);
  }

  onCancel(): void {
    this.dialog.close();
  }

  onConfirm(): void {
    this.dialog.close(true);
  }
}
