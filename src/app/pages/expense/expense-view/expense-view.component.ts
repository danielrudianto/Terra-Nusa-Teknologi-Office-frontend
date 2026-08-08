import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../services/api.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-expense-view',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule,
    CommonModule,
    TranslatePipe,
  ],
  templateUrl: './expense-view.component.html',
  styleUrl: './expense-view.component.scss',
})
export class ExpenseViewComponent {
  constructor(
    private apiService: ApiService,
    private datePipe: DatePipe,
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private formBuilder: FormBuilder,
    private dialog: MatDialogRef<ExpenseViewComponent>,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
  ) {}

  isLoading = true;

  // raw monetary values (for consistent currency formatting in the template)
  vDpp = 0;
  vPph = 0;
  vPbbkb = 0;
  vTotal = 0;

  private readonly expenseTypeMap: { [key: string]: string } = {
    '5.1.1': 'Asset purchase',
    '5.1.2': 'Asset maintenance',
    '5.1.3': 'Prepaid rent expense',
    '5.1.4': 'Employee expense',
    '5.1.5': 'Logistic expense',
    '5.1.6': 'Document handling & Stationaries',
    '5.1.7': 'Utilities',
    '5.1.8': 'Tax',
    '5.1.8.1': 'PPN',
    '5.1.8.2': 'PPh pasal 23 dan 4 ayat 2',
    '5.1.8.3': 'PPh pasal 21',
    '5.1.8.4': 'PPh tahunan',
    '5.1.8.5': 'Annual tax report service',
    '5.1.8.6': 'Penalty',
    '5.1.8.7': 'Tax on interest',
    '5.1.9': 'Administration fees',
    '5.1.10': 'Interests',
    '5.1.11': 'Rounding up',
    '5.1.12': 'Software',
    '5.1.13': 'Penalty fees',
    '5.1.14': 'Social and Community Expense',
    A: 'Transportation',
    B: 'Equipment rental',
    C: 'Fuel',
    D: 'Manpower',
    E: 'Coordination; Consumption; and Accomodation',
    F: 'Material',
    G: 'Project supporting equipment and supplies',
    H1: 'Corporate Subcontractor',
    H2: 'Unincorporated Subcontractor',
    '6.3.1': 'Advertising Expense',
    '6.3.2': 'Promotional Merchandise',
    '6.4.1': 'Legal Document (Akta, SBU)',
    '6.4.2': 'Insurances (Marine, CAR TPL, Surety Bond, etc.)',
    '6.5.1': 'Recruitment Expense',
    '6.5.2': 'Training Expense',
    '6.5.3': 'Healthcare Expense',
  };

  formGroup: FormGroup = new FormGroup({
    date: new FormControl(''),
    createdAt: new FormControl(''),
    dueDate: new FormControl(''),
    invoiceName: new FormControl(''),
    receiptName: new FormControl(''),
    purchaseType: new FormControl(''),
    description: new FormControl(''),
    pphCode: new FormControl(''),
    pphObject: new FormControl(''),
    opponentName: new FormControl(''),
    opponentDescription: new FormControl(''),
    bankAccountName: new FormControl(''),
    bankAccountNumber: new FormControl(''),
    bankName: new FormControl(''),
    payments: new FormArray([]),
  });

  ngOnInit(): void {
    this.fetchData();
  }

  get f() {
    return this.formGroup.controls;
  }

  get t() {
    return this.f['payments'] as FormArray;
  }

  get expenseTypeLabel(): string {
    const code = this.formGroup.get('purchaseType')?.value;
    return this.expenseTypeMap[code] || code || '—';
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`expenses/${this.data.id}`, {})
      .subscribe({
        next: (data: any) => {
          const e = data.expense;

          this.vDpp = e.dpp || 0;
          // NOTE: standard formula PPh = percentage% x DPP (matches expense-list)
          this.vPph = ((e.pphPercentage || 0) * (e.dpp || 0)) / 100;
          this.vPbbkb = e.pbbkb || 0;
          this.vTotal = (e.dpp || 0) + (e.pbbkb || 0);

          this.formGroup.patchValue({
            date: this.datePipe.transform(e.date, 'dd MMMM yyyy'),
            createdAt: this.datePipe.transform(e.createdAt, 'dd MMMM yyyy'),
            dueDate: this.datePipe.transform(e.dueDate, 'dd MMMM yyyy'),
            invoiceName: e.invoiceName,
            receiptName: e.receiptName,
            purchaseType: e.purchaseType,
            description: e.description,
            pphCode: e.pphCode || '',
            pphObject: e.pphTaxObject || '',
            opponentName: e.expense_opponent_name || '',
            opponentDescription: e.expense_opponent_description || '',
            bankAccountName: e.bankAccountName,
            bankAccountNumber: e.bankAccountNumber,
            bankName: e.bankName,
          });

          data.payments.forEach((x: any) => {
            this.t.push(
              this.formBuilder.group({
                id: [x.id],
                bankAccountName: [x.bankAccountName],
                bankAccountNumber: [x.bankAccountNumber],
                bankName: [x.bankName],
                amount: [x.amount],
                date: [x.date],
                isApprove: [x.isApprove],
              }),
            );
          });
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal memuat data expense',
            'Close',
            { duration: 3000 },
          );
          this.dialog.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  get pphLabel(): string {
    const code = this.formGroup.get('pphCode')?.value;
    const name = this.formGroup.get('pphObject')?.value;
    if (!code && !name) return '';
    return `[${code || '-'}] ${name || ''}`.trim();
  }

  copyPphObject(): void {
    if (!this.pphLabel) return;
    this.clipboard.copy(this.pphLabel);
    this.snackBar.open('Objek PPh disalin', 'Close', { duration: 3000 });
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private rp(n: number): string {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  }

  copyDocument(): void {
    const f = this.formGroup.value;
    const paid = this.t.controls.reduce(
      (s, p) => s + (Number(p.get('amount')?.value) || 0),
      0,
    );
    const lines = [
      '*DATA EXPENSE*',
      f.invoiceName || f.receiptName || '-',
      '',
      `*Tanggal:* ${f.date || '-'}`,
      `*Jatuh tempo:* ${f.dueDate || '-'}`,
      `*Opponent:* ${f.opponentName || '-'}`,
      `*Tipe:* ${this.expenseTypeLabel}`,
      `*Deskripsi:* ${f.description || '-'}`,
      '',
      '*RINCIAN NILAI*',
      `DPP: ${this.rp(this.vDpp)}`,
      ...(this.vPbbkb ? [`PBBKB: ${this.rp(this.vPbbkb)}`] : []),
      `PPh: ${this.rp(this.vPph)}`,
      ...(this.vPph && this.pphLabel ? [`Objek PPh: ${this.pphLabel}`] : []),
      `*Total:* ${this.rp(this.vTotal)}`,
      ...(this.t.length
        ? [
            '',
            `Sudah dibayar: ${this.rp(paid)}`,
            `Sisa: ${this.rp(this.vTotal - paid)}`,
          ]
        : []),
    ];
    this.clipboard.copy(lines.join('\n'));
    this.snackBar.open('Detail expense disalin', 'Close', { duration: 3000 });
  }

  close() {
    this.dialog.close();
  }
}
