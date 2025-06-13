import { Component, Inject } from '@angular/core';
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
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './delete-confirmation.component.html',
  styleUrl: './delete-confirmation.component.scss',
})
export class DeleteConfirmationComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationData,
    private dialog: MatDialogRef<DeleteConfirmationComponent>
  ) {}

  onCancel(): void {
    this.dialog.close();
  }

  onConfirm(): void {
    this.dialog.close(true);
  }
}
