import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, Inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../../services/api.service';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';

@Component({
  selector: 'app-loans-view',
  standalone: true,
  imports: [
    AuditTrailComponent,
    TranslatePipe,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './loans-view.component.html',
  styleUrl: './loans-view.component.scss',
})
export class LoansViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
    private dialogRef: MatDialogRef<LoansViewComponent>,
  ) {}

  isLoading: boolean = true;
  loan: any = null;
  payments: any[] = [];

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get('loans/payments/' + this.data.id, {})
      .subscribe({
        next: (data: any) => {
          this.loan = data.loan;
          this.payments = data.payments || [];
        },
        error: (error) => {
          this.snackBar.open('Gagal memuat data loan', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  get activePayments(): any[] {
    return this.payments.filter((p) => !p.isDelete);
  }

  get totalPaid(): number {
    return this.activePayments.reduce((a, b) => a + b.amount, 0);
  }

  get remaining(): number {
    if (this.loan == null) return 0;
    return this.loan.debt - this.totalPaid;
  }

  get progress(): number {
    if (this.loan == null || this.loan.debt === 0) return 0;
    return Math.min(100, Math.round((this.totalPaid / this.loan.debt) * 100));
  }

  copyForWhatsApp() {
    if (this.loan == null) return;
    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n);

    const text =
      `*Loan — ${this.loan.creditorName}*\n` +
      `${this.loan.description || ''}\n` +
      `\nTotal utang: Rp ${fmt(this.loan.debt)}` +
      `\nSudah dibayar: Rp ${fmt(this.totalPaid)}` +
      `\nSisa: Rp ${fmt(this.remaining)}` +
      `\nStatus: ${this.loan.isPaid ? 'Lunas' : 'Belum lunas'}`;

    this.clipboard.copy(text);
    this.snackBar.open('Disalin untuk WhatsApp', 'Close', { duration: 2000 });
  }

  close() {
    this.dialogRef.close();
  }
}
