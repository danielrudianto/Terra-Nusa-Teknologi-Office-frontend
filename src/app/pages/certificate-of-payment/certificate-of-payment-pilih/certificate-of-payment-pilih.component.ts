import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  CoPSiapTagih,
  CertificateOfPaymentService,
} from 'src/app/services/certificate-of-payment.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/** Penyaring awal dialog; kosong berarti seluruh SPK. */
export interface DataPilihCoP {
  purchaseOrderID?: number | null;
}

/**
 * Pemilih Certificate of Payment sebagai dasar tagihan.
 *
 * BUKAN gerbang di awal formulir pembelian. Dokumen yang dihasilkan sama
 * saja — CoP hanya mengisikan lebih dulu — sehingga memaksa memilih "dari
 * CoP atau manual" sebelum apa pun terlihat justru mengunci yang baru
 * menyadari ada CoP-nya setelah separuh formulir terisi.
 *
 * Daftarnya datang dari `/siap-tagih`: hanya yang SUDAH DISETUJUI dan BELUM
 * ditagihkan. Menyaringnya di layar akan menampilkan dokumen yang pasti
 * ditolak server saat disimpan.
 */
@Component({
  selector: 'app-certificate-of-payment-pilih',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './certificate-of-payment-pilih.component.html',
  styleUrl: './certificate-of-payment-pilih.component.scss',
})
export class CertificateOfPaymentPilihComponent implements OnInit {
  private readonly layanan = inject(CertificateOfPaymentService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly dialogRef =
    inject<MatDialogRef<CertificateOfPaymentPilihComponent, CoPSiapTagih>>(
      MatDialogRef,
    );
  private readonly data = inject<DataPilihCoP | null>(MAT_DIALOG_DATA, {
    optional: true,
  });

  readonly daftar = signal<CoPSiapTagih[]>([]);
  readonly memuat = signal(false);
  readonly galat = signal<string>('');
  readonly cari = new FormControl<string>('');

  ngOnInit(): void {
    void this.muat();
    this.cari.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => void this.muat());
  }

  /**
   * Pencariannya DI SERVER.
   *
   * Daftarnya dipenggal tiga puluh baris; menyaring yang sudah terambil
   * hanya mencari di tiga puluh itu, dan CoP yang dicari kerap berada di
   * luarnya — layar lalu menjawab "tidak ada" untuk dokumen yang jelas ada.
   */
  async muat(): Promise<void> {
    this.memuat.set(true);
    this.galat.set('');
    try {
      const hasil = (await firstValueFrom(
        this.layanan.siapTagih(
          this.cari.value || undefined,
          this.data?.purchaseOrderID || undefined,
        ),
      )) as CoPSiapTagih[];
      this.daftar.set(hasil || []);
    } catch (e) {
      this.daftar.set([]);
      this.galat.set(this.pesanServer.terjemahkan(e));
    } finally {
      this.memuat.set(false);
    }
  }

  pilih(c: CoPSiapTagih): void {
    this.dialogRef.close(c);
  }

  tutup(): void {
    this.dialogRef.close();
  }

  inisial(c: CoPSiapTagih): string {
    const nama = (c.supplierName || '').trim();
    if (!nama) return '—';
    return nama
      .split(/\s+/)
      .slice(0, 2)
      .map((k) => k[0])
      .join('')
      .toUpperCase();
  }
}
