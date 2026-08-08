import { Component, Inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';
import { DeleteConfirmationComponent } from '../../../../components/delete-confirmation/delete-confirmation.component';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sales-invoice-confirm',
  imports: [
    MatIconModule,
    MatDialogModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatInputModule,
    NgxMaskDirective,
    MatButtonModule,
  ],
  templateUrl: './sales-invoice-confirm.component.html',
  styleUrl: './sales-invoice-confirm.component.scss',
})
export class SalesInvoiceConfirmComponent {
  constructor(
    private clipboard: Clipboard,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private dialogRef: MatDialogRef<SalesInvoiceConfirmComponent>,
    private dialog: MatDialog,
  ) {}

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  formGroup: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    projectName: new FormControl('', Validators.required),
    invoiceName: new FormControl(''),
    taxInvoiceName: new FormControl(''),
    description: new FormControl('', Validators.required),
    spkNumber: new FormControl('', Validators.required),
    clientID: new FormControl('', Validators.required),
    clientName: new FormControl('', Validators.required),
    clientAddress: new FormControl('', Validators.required),
    clientNPWP: new FormControl(''),
    dpp: new FormControl(0, Validators.required),
    ppn: new FormControl('', Validators.required),
    pphCode: new FormControl(''),
    pphTaxObject: new FormControl(''),
    pphPercentage: new FormControl(0, Validators.required),
    pphValue: new FormControl(0, Validators.required),
    total: new FormControl(0, Validators.required),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`sales-invoices/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          this.formGroup.patchValue({
            date: this.datePipe.transform(data.date, 'dd MMMM yyyy'),
            invoiceName: data.name,
            projectName: data.projectName,
            spkNumber: data.spkNumber,
            clientID: data.clientID,
            clientName: `${data.client_name}, ${data.client_prefix}`,
            clientAddress: `${data.client_address}, ${data.client_city}, ${data.client_province}`,
            clientNPWP: data.client_npwp,
            dpp: data.dpp,
            ppn: (data.dpp * data.ppn) / 100,
            pphCode: data.pphCode,
            pphPercentage: data.pphPercentage,
            pphTaxObject: data.pphTaxObject,
            pphValue: (data.dpp * data.pphPercentage) / 100,
            total:
              data.dpp +
              (data.dpp * data.ppn) / 100 -
              (data.dpp * data.pphPercentage) / 100,
            description: data.description,
          });
        },
        error: (error) => {
          this.snackBar.open(error.error.detail, 'Close', {
            duration: 3000,
          });

          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /** Salin nilai ke clipboard — dipakai saat menyiapkan faktur pajak. */
  copy(value: any, label: string) {
    const text = value === null || value === undefined ? '' : String(value);
    if (!text.trim()) return;
    this.clipboard.copy(text);
    this.snackBar.open(`${label} disalin`, 'Close', { duration: 2000 });
  }

  /** DPP tanpa pemisah ribuan, supaya siap ditempel ke aplikasi pajak. */
  get dppPlain(): string {
    return String(Math.round(Number(this.formGroup.get('dpp')?.value) || 0));
  }

  confirm() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Confirm sales invoice',
          prompt:
            'Are you sure to confirm this sales invoice? Please ensure tax invoice name has been input correctly',
        },
      })
      .afterClosed()
      .subscribe((value) => {
        if (value == true) {
          this.isSubmitting = true;
          this.apiService
            .put(`sales-invoices/approve/${this.data.id}`, {
              taxInvoiceName:
                this.formGroup.value.taxInvoiceName == ''
                  ? null
                  : this.formGroup.value.taxInvoiceName,
            })
            .subscribe({
              next: () => {
                this.dialogRef.close('approve');
                this.snackBar.open(
                  'Successfully confirmed sales invoice',
                  'Close',
                  {
                    duration: 3000,
                  },
                );
              },
              error: (error) => {
                this.snackBar.open(error.error.detail, 'Close', {
                  duration: 3000,
                });
              },
            })
            .add(() => {
              this.isSubmitting = false;
            });
        }
      });
  }

  reject() {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: 'Delete sales invoice',
          prompt: 'Are you sure to delete this sales invoice?',
        },
      })
      .afterClosed()
      .subscribe((value) => {
        if (value == true) {
          this.isSubmitting = true;
          this.apiService
            .put(`sales-invoices/reject/${this.data.id}`, {})
            .subscribe({
              next: () => {
                this.dialogRef.close('deleted');
                this.snackBar.open(
                  'Successfully confirmed sales invoice',
                  'Close',
                  {
                    duration: 3000,
                  },
                );
              },
              error: (error) => {
                this.snackBar.open(error.error.detail, 'Close', {
                  duration: 3000,
                });
              },
            })
            .add(() => {
              this.isSubmitting = false;
            });
        }
      });
  }
}
