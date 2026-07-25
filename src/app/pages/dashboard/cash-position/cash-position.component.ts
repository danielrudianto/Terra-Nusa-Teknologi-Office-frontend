import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

interface CashAccount {
  bankAccountID: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  balance: number;
  lastMutationDate: string | null;
  hasActivity: boolean;
}

interface CashPositionResponse {
  accounts: CashAccount[];
  totalBalance: number;
  accountCount: number;
  generatedAt: string;
}

@Component({
  selector: 'app-cash-position',
  templateUrl: './cash-position.component.html',
  styleUrls: ['./cash-position.component.scss'],
  standalone: false,
})
export class CashPositionComponent implements OnInit {
  accounts: CashAccount[] = [];
  totalBalance = 0;
  generatedAt = '';
  isLoading = false;
  errorMsg = '';

  // Placeholder rows for the loading shimmer
  readonly skeletonRows = [1, 2, 3, 4];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.apiService.get('dashboard/cash-position', {}).subscribe({
      next: (res: any) => {
        const data = res as CashPositionResponse;
        this.accounts = data.accounts ?? [];
        this.totalBalance = data.totalBalance ?? 0;
        this.generatedAt = data.generatedAt ?? '';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'Gagal memuat posisi kas';
        this.isLoading = false;
      },
    });
  }

  /** Rp 1.234.567 (Indonesian grouping, no decimals) */
  formatIDR(n: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);
  }

  /** Show only the last 4 digits of an account number */
  maskAccount(no: string): string {
    if (!no) return '—';
    const s = String(no);
    return s.length <= 4 ? s : '•••• ' + s.slice(-4);
  }

  /** Trim "PT", "(Persero)", "Tbk" noise so the bank name fits on one line */
  shortBank(name: string): string {
    if (!name) return '';
    return name
      .replace(/PT\.?\s*/gi, '')
      .replace(/\(Persero\),?\s*/gi, '')
      .replace(/,?\s*Tbk\.?/gi, '')
      .trim();
  }

  /** Nicely format the "as of" date */
  asOfLabel(): string {
    if (!this.generatedAt) return '';
    const d = new Date(this.generatedAt);
    if (isNaN(d.getTime())) return this.generatedAt;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  trackByAccount(_: number, a: CashAccount): number {
    return a.bankAccountID;
  }
}
