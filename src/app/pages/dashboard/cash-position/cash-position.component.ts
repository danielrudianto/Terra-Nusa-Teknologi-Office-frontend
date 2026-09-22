import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ApiService } from 'src/app/services/api.service';
import { HitungNaikDirective } from '../../../directives/hitung-naik.directive';

interface CashAccount {
  bankAccountID: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  balance: number;
  lastMutationDate: string | null;
  hasActivity: boolean;
  /** Ditandai dikecualikan di halaman Bank — saldonya tidak masuk total. */
  excludeFromCalendar?: boolean;
}

interface CashPositionResponse {
  accounts: CashAccount[];
  /** TANPA rekening yang dikecualikan. */
  totalBalance: number;
  /** Jumlah saldo rekening yang dikecualikan, dilaporkan terpisah. */
  excludedBalance?: number;
  excludedCount?: number;
  /** `totalBalance` + `excludedBalance`. */
  grandTotalBalance?: number;
  accountCount: number;
  generatedAt: string;
}

@Component({
  selector: 'app-cash-position',
  templateUrl: './cash-position.component.html',
  styleUrls: ['./cash-position.component.scss'],
  standalone: true,
  imports: [
    HitungNaikDirective, TranslatePipe, CommonModule],
})
export class CashPositionComponent implements OnInit {

  /*
   * Daftar rekening dilipat secara bawaan.
   *
   * Yang paling sering ditanyakan hanya dua: per tanggal berapa, dan berapa
   * totalnya — dan keduanya TETAP terlihat saat terlipat. Rincian per
   * rekening baru diperlukan saat ada yang tidak cocok, bukan setiap kali
   * beranda dibuka.
   *
   * Kartunya menempati dua pertiga layar saat seluruh rekening ditampilkan,
   * sehingga kartu lain di beranda terdorong ke bawah lipatan.
   */
  terbuka = false;

  toggleRincian(): void {
    this.terbuka = !this.terbuka;
  }
  accounts: CashAccount[] = [];
  totalBalance = 0;

  /*
   * Saldo yang DIKECUALIKAN, dipisah dari total — bukan dibuang.
   *
   * Rekening yang ditandai `excludeFromCalendar` (mis. deposit jaminan) tidak
   * boleh ikut dihitung sebagai kas yang dapat dipakai; itu yang membuat
   * angka Total Saldo di beranda dulu lebih besar daripada uang yang benar
   * dapat dibelanjakan.
   *
   * Tetapi uangnya tetap ada, jadi ia tetap dicetak — sebagai baris
   * tersendiri, dengan penjumlahannya yang dapat dicocokkan. Angka yang
   * dihilangkan sama sekali adalah angka yang tidak pernah dicocokkan lagi.
   */
  excludedBalance = 0;
  excludedCount = 0;
  grandTotalBalance = 0;

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
        this.excludedBalance = data.excludedBalance ?? 0;
        this.excludedCount = data.excludedCount ?? 0;
        /*
         * Cadangannya `totalBalance`, bukan nol.
         *
         * Backend yang belum diperbarui tidak mengirim `grandTotalBalance`
         * sama sekali. Nol di sana berarti beranda mencetak "Total seluruh
         * rekening: Rp 0" di bawah total yang benar — salah, dan terlihat
         * seperti data yang hilang. Dengan cadangan ini, versi lama hanya
         * kehilangan barisnya (`excludedCount` nol), tidak mencetak angka
         * yang keliru.
         */
        this.grandTotalBalance = data.grandTotalBalance ?? this.totalBalance;
        this.generatedAt = data.generatedAt ?? '';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.detail || 'Gagal memuat posisi kas';
        this.isLoading = false;
      },
    });
  }

  /**
   * Rekening yang benar-benar MENDUKUNG `totalBalance`.
   *
   * Dipakai di kepala kartu. Sebelumnya di sana tertulis `accounts.length` —
   * seluruh rekening yang dimuat — dan sesudah yang dikecualikan berhenti
   * masuk total, angka itu menerangkan sesuatu yang bukan dirinya: "12
   * rekening" tepat di atas total yang hanya berisi delapan.
   */
  get jumlahDihitung(): number {
    return Math.max(0, this.accounts.length - this.excludedCount);
  }

  /** Rp 1.234.567 (Indonesian grouping, no decimals) */
  formatIDR(n: number): string {
    const nilai = n ?? 0;
    /*
     * Nol negatif dinormalkan menjadi nol.
     *
     * `Intl.NumberFormat` mencetak `-0` sebagai "-Rp 0,00", dan saldo yang
     * dibulatkan dari pecahan negatif yang sangat kecil juga keluar begitu.
     * Di layar itu terbaca sebagai rekening bermasalah — merah, bertanda
     * minus — padahal saldonya nol.
     *
     * AMBANGNYA IKUT DESIMALNYA. Dulu 0,5, karena angkanya dicetak tanpa
     * desimal. Sejak dua desimal, ambang itu akan menelan saldo Rp 0,30 yang
     * SUNGGUHAN — dicetak "Rp 0,00" padahal seharusnya "Rp 0,30". Yang
     * dinormalkan hanya yang memang membulat menjadi nol pada dua desimal.
     */
    const dibulatkan = Math.abs(nilai) < 0.005 ? 0 : nilai;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dibulatkan);
  }

  /**
   * Merah HANYA bila angka yang TERCETAK memang negatif.
   *
   * `n < 0` dan `formatIDR(n)` dulu dapat berbeda pendapat: saldo −0,3
   * dicetak "Rp 0" tetapi diwarnai merah, sehingga rekening bersaldo nol
   * terbaca sebagai rekening bermasalah. Dua aturan untuk satu angka akan
   * selalu berselisih di tepinya.
   */
  negatif(n: number): boolean {
    return (n ?? 0) <= -0.005;
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
