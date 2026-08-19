import { ServerMessageService } from 'src/app/services/server-message.service';
import { inject } from '@angular/core';
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/services/api.service';

interface Ringkasan {
  jumlah: number;
  total: number;
  belumDibayar: number;
  lewatTempo: number;
}

interface BarisProyek {
  projectName: string;
  total: number;
  jumlah: number;
}

interface BarisDokumen {
  id: number;
  invoiceName: string;
  purchaseOrderName: string;
  projectName: string;
  date: string;
  dueDate: string | null;
  isPaid: boolean;
  nilai: number;
}

/**
 * Laporan satu pemasok.
 *
 * Angkanya dihitung dari PEMBELIAN, bukan purchase order — purchase order
 * adalah pesanan, dan sebagian tidak pernah ditagih. Yang menentukan hubungan
 * dagang adalah apa yang benar-benar ditagihkan.
 */
@Component({
  selector: 'app-supplier-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './supplier-report.component.html',
  styleUrl: './supplier-report.component.scss',
})
export class SupplierReportComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);

  isLoading = false;

  ringkasan: Ringkasan = {
    jumlah: 0,
    total: 0,
    belumDibayar: 0,
    lewatTempo: 0,
  };
  proyek: BarisProyek[] = [];
  terakhir: BarisDokumen[] = [];

  /** Periode: kosong berarti sepanjang waktu. */
  periode = '';
  proyekTerpilih = '';

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private dialog: MatDialogRef<SupplierReportComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {
    this.muat();
  }

  get namaPemasok(): string {
    return this.data?.supplier?.name || '';
  }

  get inisial(): string {
    const n = this.namaPemasok.trim();
    if (!n) return '?';
    return n
      .split(/\s+/)
      .slice(0, 2)
      .map((x: string) => x.charAt(0).toUpperCase())
      .join('');
  }

  get diblacklist(): boolean {
    return !!this.data?.supplier?.isBlacklist;
  }

  /**
   * Bagian tiap proyek terhadap yang terbesar, bukan terhadap totalnya.
   *
   * Batang yang diukur terhadap total membuat proyek terbesar sekalipun
   * tampak pendek ketika pemasoknya dipakai di banyak proyek — dan yang
   * hendak dibaca dari batang ini adalah perbandingan ANTAR proyek.
   */
  lebarBatang(nilai: number): number {
    const tertinggi = this.proyek[0]?.total || 0;
    if (tertinggi <= 0) return 0;
    return Math.max(2, Math.round((nilai / tertinggi) * 100));
  }

  /** Lewat jatuh tempo dan belum lunas. */
  lewatTempo(d: BarisDokumen): boolean {
    if (d.isPaid || !d.dueDate) return false;
    return new Date(d.dueDate) < new Date(new Date().toDateString());
  }

  ubahPenyaring(): void {
    this.muat();
  }

  private rentang(): { date_from: string; date_to: string } {
    const kini = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const tgl = (d: Date) =>
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

    if (this.periode === 'tahun') {
      return {
        date_from: `${kini.getFullYear()}-01-01`,
        date_to: tgl(kini),
      };
    }
    if (this.periode === '3bulan') {
      const mulai = new Date(kini);
      mulai.setMonth(mulai.getMonth() - 3);
      return { date_from: tgl(mulai), date_to: tgl(kini) };
    }
    return { date_from: '', date_to: '' };
  }

  muat(): void {
    const id = this.data?.supplier?.id;
    if (!id) return;

    this.isLoading = true;
    const { date_from, date_to } = this.rentang();

    this.apiService
      .get(`suppliers/${id}/laporan`, {
        date_from,
        date_to,
        project_name: this.proyekTerpilih,
      })
      .subscribe({
        next: (res: any) => {
          this.ringkasan = res?.ringkasan ?? this.ringkasan;
          this.proyek = res?.proyek ?? [];
          this.terakhir = res?.terakhir ?? [];
        },
        error: (err) =>
          this.snackBar.open(
            this.serverMessage.terjemahkan(err, 'supplierReport.gagalMuat'),
            'Close',
            { duration: 3000 },
          ),
      })
      .add(() => (this.isLoading = false));
  }

  tutup(): void {
    this.dialog.close();
  }
}
