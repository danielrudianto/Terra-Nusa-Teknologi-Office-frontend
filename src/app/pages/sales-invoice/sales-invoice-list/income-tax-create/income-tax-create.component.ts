import { Component, Inject, OnInit, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-income-tax-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './income-tax-create.component.html',
  styleUrl: './income-tax-create.component.scss',
})
export class IncomeTaxCreateComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: number;
      name?: string;
      incomeTaxInvoiceName?: string;
      dpp?: number;
      pphPercentage?: number;
      pphCode?: string;
      pphTaxObject?: string;
    },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<IncomeTaxCreateComponent>,
  ) {}

  isSubmitting = false;

  get pphAmount(): number {
    const dpp = this.data.dpp || 0;
    const pct = this.data.pphPercentage || 0;
    return (dpp * pct) / 100;
  }

  formGroup: FormGroup = new FormGroup({
    incomeTaxInvoiceName: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
  });

  ngOnInit(): void {
    // kalau sudah pernah diisi, tampilkan nilainya (mode edit)
    if (this.data.incomeTaxInvoiceName) {
      this.formGroup.patchValue({
        incomeTaxInvoiceName: this.data.incomeTaxInvoiceName,
      });
    }
  }

  onSubmit(): void {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;
    this.apiService
      .put(`sales-invoices/income-tax/${this.data.id}`, {
        incomeTaxInvoiceName: this.formGroup.value.incomeTaxInvoiceName.trim(),
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.taxSlipSaved'), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal menyimpan bukti potong',
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
