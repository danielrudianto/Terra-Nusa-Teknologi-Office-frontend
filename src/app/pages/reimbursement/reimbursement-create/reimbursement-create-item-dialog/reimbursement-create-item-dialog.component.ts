import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-reimbursement-create-item-dialog',
  templateUrl: './reimbursement-create-item-dialog.component.html',
  styleUrls: ['./reimbursement-create-item-dialog.component.scss'],
  standalone: false,
})
export class ReimbursementCreateItemDialogComponent {
  constructor(
    private dialog: MatDialogRef<ReimbursementCreateItemDialogComponent>
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    description: new FormControl('', [
      Validators.required,
      Validators.maxLength(255),
      Validators.minLength(10),
    ]),
    amount: new FormControl('', [Validators.required]),
  });

  onSubmit() {
    const date = this.formGroup.get('date')?.value;
    // i think the date here is moment object, so we need to format it
    this.formGroup.get('date')?.setValue(date.format('YYYY-MM-DD'));
    this.dialog.close(this.formGroup.value);
  }

  onCancel() {
    this.dialog.close();
  }
}
