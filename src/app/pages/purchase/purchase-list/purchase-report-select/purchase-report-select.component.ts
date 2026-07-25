import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-purchase-report-select',
    templateUrl: './purchase-report-select.component.html',
    styleUrls: ['./purchase-report-select.component.scss'],
    standalone: false
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
