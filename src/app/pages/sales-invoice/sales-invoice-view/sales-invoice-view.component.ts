import { DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
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
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-sales-invoice-view',
  providers: [provideNgxMask()],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    NgxMaskDirective,
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
    private datePipe: DatePipe
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
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0),
    pphValue: new FormControl(0),
    total: new FormControl(0),
    totalPayment: new FormControl(0),
  });

  ngOnInit(): void {
    this.apiService.get(`sales-invoices/${this.data.id}`, {}).subscribe({
      next: (data: any) => {
        console.log(data);
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
