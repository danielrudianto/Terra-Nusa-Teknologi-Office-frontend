import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-salary-slip-allowance-create',
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    NgxMaskDirective,
    MatButtonModule,
    CommonModule,
    MatSlideToggleModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  // `provideNgxMask()` WAJIB ada di komponen yang memakai mask;
  // mengimpor direktifnya saja tidak cukup — masknya diam.
  providers: [provideNgxMask()],
  templateUrl: './salary-slip-allowance-create.component.html',
  styleUrl: './salary-slip-allowance-create.component.scss',
})
export class SalarySlipAllowanceCreateComponent {
  constructor(
    private dialog: MatDialogRef<SalarySlipAllowanceCreateComponent>,
  ) {}

  formGroup: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    amount: new FormControl(0, [Validators.required, Validators.min(0)]),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
    ]),
    isIncluded: new FormControl(false, Validators.required),
  });

  onSubmit() {
    if (this.formGroup.valid) {
      this.dialog.close(this.formGroup.value);
    } else {
      this.formGroup.markAllAsTouched();
    }
  }
}
