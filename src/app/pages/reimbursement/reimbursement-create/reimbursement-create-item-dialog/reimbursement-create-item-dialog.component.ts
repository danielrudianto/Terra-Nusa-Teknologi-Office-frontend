import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-reimbursement-create-item-dialog',
  templateUrl: './reimbursement-create-item-dialog.component.html',
  styleUrls: ['./reimbursement-create-item-dialog.component.scss'],
})
export class ReimbursementCreateItemDialogComponent {
  constructor(
    private dialog: MatDialogRef<ReimbursementCreateItemDialogComponent>
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    amount: new FormControl('', [Validators.required]),
  });

  onSubmit() {
    this.dialog.close(this.formGroup.value);
  }

  onCancel() {
    this.dialog.close();
  }
}
