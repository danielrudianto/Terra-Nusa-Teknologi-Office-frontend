import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-purchase-report-select',
  templateUrl: './purchase-report-select.component.html',
  styleUrls: ['./purchase-report-select.component.scss'],
  standalone: true,
  imports: [MatDialogModule, MatSelectModule, FormsModule, ReactiveFormsModule],
})
export class PurchaseReportSelectComponent {
  formGroup: FormGroup = new FormGroup({
    projectName: new FormControl(''),
    month: new FormControl('', [
      Validators.required,
      Validators.min(1),
      Validators.max(12),
    ]),
    year: new FormControl('', [
      Validators.required,
      Validators.min(2020),
      Validators.max(new Date().getFullYear()),
    ]),
  });
}
