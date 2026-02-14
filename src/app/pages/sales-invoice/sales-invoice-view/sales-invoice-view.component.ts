import { CommonModule, DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-sales-invoice-view',
  providers: [provideNgxMask()],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    NgxMaskDirective,
    MatListModule,
    MatIconModule,
  ],
  templateUrl: './sales-invoice-view.component.html',
  styleUrl: './sales-invoice-view.component.scss',
})
export class SalesInvoiceViewComponent {
  constructor(
    private apiService: ApiService,
    private dialog: MatDialogRef<SalesInvoiceViewComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
  ) {}

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    name: new FormControl(''),
    projectName: new FormControl(''),
    clientName: new FormControl(''),
    clientAddress: new FormControl(''),
    clientNPWP: new FormControl(''),
    description: new FormControl(''),
    spkNumber: new FormControl(''),
    dpp: new FormControl(0),
    ppn: new FormControl(0),
    bpjs: new FormControl(0),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    pphValue: new FormControl(0),
    total: new FormControl(0),
    totalPayment: new FormControl(0),
    payments: new FormArray([]),
  });

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.f['payments'] as FormArray;
  }

  ngOnInit(): void {
    this.apiService.get(`sales-invoices/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        this.formGroup.patchValue({
          date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
          name: data.name,
          clientName: `${data.client_name}, ${data.client_prefix}`,
          clientAddress: `${data.client_address}, ${data.client_city}, ${data.client_province}`,
          clientNPWP: data.client_npwp,
          description: data.description,
          spkNumber: data.spkNumber,
          dpp: data.dpp,
          ppn: data.ppn,
          bpjs: data.bpjs,
          pphCode: data.pphCode,
          pphTaxObject: data.pphTaxObject,
          pphPercentage: data.pphPercentage,
          pphValue: data.pphValue,
          total: data.dpp + (data.ppn * data.dpp) / 100,
          totalPayment:
            data.dpp +
            (data.ppn * data.dpp) / 100 -
            (data.pphPercentage * data.dpp) / 100,
          projectName: data.projectName,
        });

        data.payments.forEach((x: any) => {
          this.t.push(
            this.formBuilder.group({
              id: [x.id],
              amount: [x.amount],
              date: [x.date],
            }),
          );
        });
      },
      error: (error) => {
        this.snackBar.open(error.error.detail, 'Close', {
          duration: 3000,
        });
        this.dialog.close();
      },
    });
  }
}
