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
          // Jawaban berhasil tetapi tanpa isi diperlakukan seperti gagal:
          // menampilkannya menghasilkan halaman dengan nilai kosong dan
          // persentase yang tidak sah, dan itu terbaca sebagai kerusakan.
          if (!data?.loan?.id) {
            this.snackBar.open('Data pinjaman tidak ditemukan', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close();
            return;
          }
          this.loan = data.loan;
          this.payments = data.payments || [];
        },
        error: (error) => {
          this.snackBar.open(
            error?.error?.detail || 'Gagal memuat data loan',
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /** Pembayaran yang belum dihapus — termasuk yang belum disetujui. */
  get activePayments(): any[] {
    return this.payments.filter((p) => !p.isDelete);
  }

  /**
   * Pembayaran yang benar-benar mengurangi hutang.
   *
   * Hanya yang sudah disetujui. Pembayaran yang masih menunggu persetujuan
   * belum tentu jadi — memasukkannya ke pelunasan membuat hutang terlihat
   * lebih kecil daripada kenyataannya, dan itu jenis kekeliruan yang tidak
   * terlihat karena angkanya tetap tampak wajar.
   */
  get approvedPayments(): any[] {
    return this.activePayments.filter((p) => p.isApprove === true);
  }

  /** Pembayaran yang sudah diajukan tetapi belum disetujui. */
  get pendingPayments(): any[] {
    return this.activePayments.filter((p) => p.isApprove !== true);
  }

  get pendingAmount(): number {
    return this.pendingPayments.reduce(
      (a, b) => a + this.angka(b?.amount),
      0,
    );
  }

  /**
   * Angka dari server dibaca lewat penjaga ini, bukan dipakai apa adanya.
   *
   * Nilai yang kosong atau bukan angka menghasilkan NaN begitu ikut
   * berhitung, dan NaN menular: satu pembayaran tanpa nominal membuat total,
   * sisa, dan persentasenya sekaligus tampil sebagai "NaN%". Yang terlihat
   * pengguna bukan data yang kurang, melainkan halaman yang rusak.
   */
  private angka(nilai: any): number {
    const n = Number(nilai);
    return Number.isFinite(n) ? n : 0;
  }

  get totalPaid(): number {
    return this.approvedPayments.reduce((a, b) => a + this.angka(b?.amount), 0);
  }

  get remaining(): number {
    if (this.loan == null) return 0;
    return this.angka(this.loan.debt) - this.totalPaid;
  }

  get progress(): number {
    const hutang = this.angka(this.loan?.debt);
    // Tanpa nilai hutang, persentase tidak punya arti — 0 lebih jujur
    // daripada angka hasil pembagian yang tidak sah.
    if (hutang <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((this.totalPaid / hutang) * 100)));
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
