import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-calendar-payment-reject',
  imports: [
    TranslatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormsModule,
    DialogGeserDirective,
  ],
  templateUrl: './calendar-payment-reject.component.html',
  styleUrl: './calendar-payment-reject.component.scss',
})
export class CalendarPaymentRejectComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialogRef<CalendarPaymentRejectComponent>,
  ) {}

  agreeControl: FormControl = new FormControl(false, [
    Validators.required,
    Validators.requiredTrue,
  ]);

  onConfirm() {
    this.dialog.close(true);
  }
}
