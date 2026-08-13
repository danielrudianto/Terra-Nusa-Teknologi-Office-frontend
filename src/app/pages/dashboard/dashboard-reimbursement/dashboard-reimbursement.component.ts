import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { ReimbursementViewComponent } from '../../reimbursement/reimbursement-view/reimbursement-view.component';

interface ReimbursementItem {
  id: number;
  name: string;
  date: string;
  projectName: string;
  amount: number;
}

@Component({
  selector: 'app-dashboard-reimbursement',
  templateUrl: './dashboard-reimbursement.component.html',
  styleUrls: ['./dashboard-reimbursement.component.scss'],
  standalone: true,
  imports: [TranslatePipe, CommonModule],
})
export class DashboardReimbursementComponent implements OnInit {
  items: ReimbursementItem[] = [];
  isLoading = false;
  errorMsg = '';

  // Selaras dengan kartu pembayaran di sebelahnya.
  readonly maxVisible = 5;
  readonly skeletonRows = [1, 2, 3];

  constructor(
    private apiService: ApiService,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  get visibleItems(): ReimbursementItem[] {
    return this.items.slice(0, this.maxVisible);
  }

  get hiddenCount(): number {
    return Math.max(0, this.items.length - this.maxVisible);
  }

  fetch(): void {
    this.isLoading = true;
    this.errorMsg = '';
    // ambil reimbursement yang BELUM di-approve (pending)
    this.apiService
      .get('reimbursements', {
        // filter:1 -> backend hanya menerapkan flag yang kita kirim (bukan semua)
        filter: 1,
        isPending: true,
        page: 1,
        pageSize: 20,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          const raw = res?.data ?? [];
          this.items = raw.map((r: any) => this.normalize(r));
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMsg =
            err?.error?.detail || 'Gagal memuat reimbursement tertunda';
          this.isLoading = false;
        },
      });
  }

  /** Ubah baris mentah reimbursement jadi item tampilan. */
  private normalize(r: any): ReimbursementItem {
    // total = jumlah semua item; fallback ke amount kalau ada
    let amount = 0;
    if (Array.isArray(r?.items)) {
      amount = r.items.reduce(
        (s: number, it: any) =>
          s + (Number(it.amount) || Number(it.total) || 0),
        0,
      );
    } else {
      amount = Number(r?.amount) || Number(r?.total) || 0;
    }
    return {
      id: r.id,
      name: r.name || 'Reimbursement',
      date: r.date,
      projectName: r.projectName || '—',
      amount,
    };
  }

  formatIDR(v: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v || 0);
  }

  initial(name: string): string {
    return (name || '?').charAt(0).toUpperCase();
  }

  trackById(_: number, it: ReimbursementItem): number {
    return it.id;
  }

  /** view per reimbursement -> buka dialog detail yang sama dengan list. */
  viewReimbursement(id: number): void {
    this.dialog.open(ReimbursementViewComponent, {
      data: { id },
      width: '640px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  /** view list -> ke halaman reimbursement. */
  openList(): void {
    this.router.navigate(['/Reimbursement']);
  }
}
