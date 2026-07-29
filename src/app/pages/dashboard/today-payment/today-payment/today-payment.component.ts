import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from 'src/app/services/api.service';
import {
  TodayPaymentDialogComponent,
  TodayPaymentItem,
  PaymentType,
} from '../today-payment-dialog/today-payment-dialog.component';

@Component({
  selector: 'app-today-payment',
  templateUrl: './today-payment.component.html',
  styleUrls: ['./today-payment.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class TodayPaymentComponent implements OnInit {
  items: TodayPaymentItem[] = [];
  total = 0;
  isLoading = false;
  errorMsg = '';

  readonly maxVisible = 3;
  readonly skeletonRows = [1, 2, 3];

  private banks = new Map<number, any>();

  private readonly typeMeta: Record<
    PaymentType,
    { label: string; color: string }
  > = {
    purchase: { label: 'Pembelian', color: '#154dec' },
    expense: { label: 'Beban', color: '#b9770f' },
    reimbursement: { label: 'Reimburse', color: '#0f8f6b' },
    salary: { label: 'Gaji', color: '#6b4ee0' },
    loan: { label: 'Pinjaman', color: '#ca2929' },
    other: { label: 'Lainnya', color: '#8a8f98' },
  };

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  private todayISO(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  get visibleItems(): TodayPaymentItem[] {
    return this.items.slice(0, this.maxVisible);
  }

  get hiddenCount(): number {
    return Math.max(0, this.items.length - this.maxVisible);
  }

  fetch(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.apiService.get('calendar/daily', { date: this.todayISO() }).subscribe({
      next: (res: any) => {
        this.banks = new Map(
          (res?.bankAccounts ?? []).map((b: any) => [b.id, b]),
        );
        const raw = res?.data ?? [];
        this.items = raw
          .map((p: any) => this.normalize(p))
          .sort(
            (a: TodayPaymentItem, b: TodayPaymentItem) => b.amount - a.amount,
          );
        this.total = this.items.reduce((s, i) => s + i.amount, 0);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg =
          err?.error?.detail || 'Gagal memuat pembayaran hari ini';
        this.isLoading = false;
      },
    });
  }

  /** Turn a raw payment row into a display item (what + which bank). */
  private normalize(p: any): TodayPaymentItem {
    let type: PaymentType = 'other';
    let title = 'Pembayaran';
    let subtitle = '';

    if (p.purchase) {
      type = 'purchase';
      title = p.purchase.accountName || p.purchase.invoiceName || 'Pembelian';
      subtitle = [p.purchase.invoiceName, p.purchase.projectName]
        .filter(Boolean)
        .join(' · ');
    } else if (p.expense) {
      type = 'expense';
      title = p.expense.accountName || p.expense.description || 'Beban';
      subtitle = [p.expense.invoiceName, p.expense.description]
        .filter(Boolean)
        .join(' · ');
    } else if (p.reimbursement) {
      type = 'reimbursement';
      title = p.reimbursement.name || 'Reimbursement';
      subtitle = p.reimbursement.projectName || '';
    } else if (p.salarySlip) {
      type = 'salary';
      title = 'Gaji ' + (p.salarySlip.name || '');
      subtitle =
        p.salarySlip.month && p.salarySlip.year
          ? `Periode ${p.salarySlip.month}/${p.salarySlip.year}`
          : '';
    } else if (p.loan) {
      type = 'loan';
      title = 'Cicilan ' + (p.loan.creditorName || '');
      subtitle = p.loan.description || '';
    }

    const bank = this.banks.get(p.bankAccountID);
    const bankLabel = bank
      ? `${this.shortBank(bank.bankName)} · ${bank.bankAccountName}`
      : 'Rekening —';

    const meta = this.typeMeta[type];

    return {
      id: p.id,
      type,
      typeLabel: meta.label,
      color: meta.color,
      title: title.trim(),
      subtitle,
      bankLabel,
      amount: Number(p.amount) || 0,
      isApprove:
        p.isApprove === true || p.isApprove === 1 || p.isApprove === '1',
    };
  }

  private shortBank(name: string): string {
    if (!name) return '';
    return name
      .replace(/PT\.?\s*/gi, '')
      .replace(/\(Persero\),?\s*/gi, '')
      .replace(/,?\s*Tbk\.?/gi, '')
      .trim();
  }

  formatIDR(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  }

  private dateLabel(): string {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  openAll(): void {
    this.dialog.open(TodayPaymentDialogComponent, {
      data: {
        dateLabel: this.dateLabel(),
        items: this.items,
        total: this.total,
      },
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  trackById(_: number, it: TodayPaymentItem): number {
    return it.id;
  }
}
