import { Clipboard } from '@angular/cdk/clipboard';
import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from 'src/app/services/api.service';
import { AvatarComponent } from '../../../components/avatar/avatar.component';

@Component({
  selector: 'app-interpayment-view',
  standalone: true,
  imports: [
    AuditTrailComponent,
    AvatarComponent,
    TranslatePipe,
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './interpayment-view.component.html',
  styleUrl: './interpayment-view.component.scss',
})
export class InterpaymentViewComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number },
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialog: MatDialogRef<InterpaymentViewComponent>,
    private clipboard: Clipboard,
  ) {}

  isLoading = true;
  ip: any = null;

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    this.isLoading = true;
    this.apiService
      .get(`interpayments/${this.data.id}`, {})
      .subscribe({
        next: (res: any) => {
          this.ip = res.interpayment;
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal memuat data interpayment',
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

  /** "08 Juli 2026" */
  formatDate(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** "08 Juli 2026, 16:33" — for audit timestamps */
  formatDateTime(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return (
      d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) +
      ', ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    );
  }

  private rp(n: number): string {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  }

  copyDocument(): void {
    if (!this.ip) return;
    const lines = [
      '*INTERPAYMENT*',
      `#${this.ip.id}`,
      '',
      `*Tanggal:* ${this.formatDate(this.ip.date)}`,
      `*Jumlah:* ${this.rp(this.ip.amount)}`,
      `*Deskripsi:* ${this.ip.description || '-'}`,
      '',
      '*DARI*',
      `${this.ip.originBankName || '-'}`,
      `${this.ip.originBankAccountName || '-'} · ${this.ip.originBankAccountNumber || '-'}`,
      '',
      '*KE*',
      `${this.ip.destinationBankName || '-'}`,
      `${this.ip.destinationBankAccountName || '-'} · ${this.ip.destinationBankAccountNumber || '-'}`,
      '',
      `Dibuat oleh: ${this.ip.createdByName || '-'} (${this.formatDateTime(this.ip.createdAt)})`,
      ...(this.ip.isDelete
        ? [
            `Dihapus oleh: ${this.ip.deletedByName || '-'} (${this.formatDateTime(this.ip.deletedAt)})`,
          ]
        : []),
    ];
    this.clipboard.copy(lines.join('\n'));
    this.snackBar.open(
      this.translate.instant('notify.copied'), 'Close', {
      duration: 3000,
    });
  }

  close() {
    this.dialog.close();
  }
}
