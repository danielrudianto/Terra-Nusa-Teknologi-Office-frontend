import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { RefreshButtonComponent } from 'src/app/components/refresh-button/refresh-button.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * Daftar Certificate of Payment.
 *
 * Tiga keadaan yang dibedakan — draf, diperiksa, disetujui — karena itulah
 * yang menentukan siapa harus berbuat apa berikutnya. Tombol periksa dan
 * setujui muncul mengikuti wewenang, tetapi keputusannya tetap di server.
 */
@Component({
  selector: 'app-certificate-of-payment-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressBarModule,
    TranslateModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './certificate-of-payment-list.component.html',
  styleUrl: './certificate-of-payment-list.component.scss',
})
export class CertificateOfPaymentListComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);

  readonly data = signal<CertificateOfPayment[]>([]);
  readonly total = signal(0);
  readonly memuat = signal(false);

  halaman = 0;
  ukuran = 20;

  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);
  readonly bolehBuat = computed(() =>
    this.izin.can('certificate_of_payment', 'create'),
  );
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  readonly bolehSetujui = computed(() => this.izin.level() >= 3);

  get kolom(): string[] {
    const dasar = ['nomor', 'spk', 'proyek', 'tanggal', 'keadaan', 'pembuat'];
    return this.bolehLihatNilai()
      ? [...dasar, 'nilai', 'aksi']
      : [...dasar, 'aksi'];
  }

  ngOnInit(): void {
    void this.muat();
  }

  private pesan(e: any): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.translate.instant('common.close'),
      { duration: 6000 },
    );
  }

  async muat(): Promise<void> {
    this.memuat.set(true);
    try {
      const hasil: any = await firstValueFrom(
        this.service.daftar({ page: this.halaman, pageSize: this.ukuran }),
      );
      this.data.set(hasil?.data || []);
      this.total.set(hasil?.total || 0);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  gantiHalaman(e: PageEvent): void {
    this.halaman = e.pageIndex;
    this.ukuran = e.pageSize;
    void this.muat();
  }

  /** Keadaan dokumen, untuk lencana. */
  keadaan(c: CertificateOfPayment): 'draft' | 'diperiksa' | 'disetujui' {
    if (c.isApproved) return 'disetujui';
    if (c.isChecked) return 'diperiksa';
    return 'draft';
  }

  nilaiTotal(c: CertificateOfPayment): number | null {
    if (!this.bolehLihatNilai() || !c.items) return null;
    return c.items.reduce((t, i) => t + Number(i.amount || 0), 0);
  }

  buat(): void {
    this.router.navigate(['/Certificate-of-payment/Create']);
  }

  buka(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/View', c.id]);
  }

  ubah(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  async periksa(c: CertificateOfPayment, checked: boolean): Promise<void> {
    try {
      await firstValueFrom(this.service.periksa(c.id, checked));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }

  async setujui(c: CertificateOfPayment): Promise<void> {
    try {
      await firstValueFrom(this.service.setujui(c.id));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }

  async hapus(c: CertificateOfPayment): Promise<void> {
    try {
      await firstValueFrom(this.service.hapus(c.id));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
  }
}
