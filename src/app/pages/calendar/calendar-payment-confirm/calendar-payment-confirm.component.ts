import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-calendar-payment-confirm',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormsModule,
  ],
  templateUrl: './calendar-payment-confirm.component.html',
  styleUrl: './calendar-payment-confirm.component.scss',
})
export class CalendarPaymentConfirmComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialogRef<CalendarPaymentConfirmComponent>
  ) {}

  agreeControl: FormControl = new FormControl(false, [
    Validators.required,
    Validators.requiredTrue,
  ]);

  onConfirm() {
    this.dialog.close(true);
  }
}
