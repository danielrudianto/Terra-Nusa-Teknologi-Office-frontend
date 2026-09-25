import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { SupplierSelectorComponent } from '../../../components/supplier-selector/supplier-selector.component';
import {
  PILIHAN_PERIODE,
  PeriodeRekap,
  RentangRekap,
  labelRentang,
  rentangPeriode,
  rentangSah,
  tanggalLokal,
} from '../../../constants/rentang-rekap';
import {
  IRekapCop,
  IRekapSpk,
  unduhRekapCop,
} from '../../../helpers/certificate-of-payment-rekap-excel';
import { vendorDisplayName } from '../../../helpers/purchase-order-shared.helper';
import { ApiService } from '../../../services/api.service';
import { ServerMessageService } from '../../../services/server-message.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Pilih proyek / pemasok dan rentang tanggalnya, lalu unduh rekap CoP-nya.
 *
 * BENTUKNYA MENIRU DIALOG REKAP PURCHASE ORDER, sampai ke nama kelasnya.
 *
 * Yang membuka keduanya orang yang sama pada hari yang sama, untuk
 * pertanyaan yang bersebelahan: "apa yang kita PESAN" dan "apa yang sudah
 * kita SERTIFIKASI". Dua dialog yang tata letaknya berbeda membuat yang
 * kedua terbaca seperti berasal dari sistem lain — dan yang terbiasa dengan
 * satu harus belajar ulang yang satunya.
 *
 * Gayanya pun DIIMPOR dari sana (lihat berkas `.scss`), bukan disalin:
 * salinan berhenti sama pada perubahan berikutnya, dan yang tertinggal tidak
 * menimbulkan galat apa pun.
 *
 * SATU BENTUK BERKAS, bukan dua. Rekap purchase order menawarkan Excel dan
 * PDF karena keduanya memang dipakai berbeda — PDF dikirim ke pemilik
 * proyek. Rekap CoP dibaca ke dalam: ditelusuri, dijumlah, dicocokkan dengan
 * tagihan. Menawarkan PDF yang tidak dapat diolah hanya menambah pilihan
 * yang menyesatkan.
 */
@Component({
  selector: 'app-certificate-of-payment-rekap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    ProjectSelectorComponent,
    TranslatePipe,
    DialogGeserDirective,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './certificate-of-payment-rekap.component.html',
  styleUrls: ['./certificate-of-payment-rekap.component.scss'],
})
export class CertificateOfPaymentRekapComponent {
  private readonly dialogRef = inject(
    MatDialogRef<CertificateOfPaymentRekapComponent>,
  );
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly dialog = inject(MatDialog);

  /** Sudut pandang rekapnya — per proyek atau per pemasok. */
  sudut: 'proyek' | 'pemasok' = 'proyek';

  pemasok: { id: number; name: string; prefix?: string } | null = null;

  readonly proyek = new FormControl<string | null>(null);

  readonly pilihanPeriode = PILIHAN_PERIODE;

  /** Bawaannya seluruh periode. */
  periode: PeriodeRekap = 'semua';

  readonly rentangManual = new FormGroup({
    mulai: new FormControl<Date | null>(null),
    selesai: new FormControl<Date | null>(null),
  });

  sedangMenyusun = false;

  /**
   * Ganti sudut pandang; pilihan lama dibuang.
   *
   * Kecuali proyeknya saat pindah ke pemasok: di mode pemasok ia menjadi
   * penyempit PILIHAN, dan yang baru saja memilih proyek lalu menekan
   * "Pemasok" hampir selalu sedang menuju "vendor ini, di proyek itu".
   */
  pilihSudut(v: 'proyek' | 'pemasok'): void {
    if (this.sudut === v) return;
    this.sudut = v;
    if (v === 'proyek') this.pemasok = null;
  }

  bukaPemasok(): void {
    this.dialog
      .open(SupplierSelectorComponent, {})
      .afterClosed()
      .subscribe((data: any) => {
        if (data?.id) {
          this.pemasok = {
            id: Number(data.id),
            name: String(data.name ?? ''),
            prefix: data.prefix || '',
          };
        }
      });
  }

  get namaPemasok(): string {
    if (!this.pemasok) return '';
    const nama = vendorDisplayName(
      this.pemasok.name || undefined,
      this.pemasok.prefix || undefined,
    );
    return nama === '-' ? this.pemasok.name : nama;
  }

  get adaSasaran(): boolean {
    return this.sudut === 'proyek' ? !!this.proyek.value : !!this.pemasok;
  }

  get proyekPenyempit(): string | null {
    if (this.sudut !== 'pemasok') return null;
    const k = (this.proyek.value || '').trim();
    return k || null;
  }

  lepasProyekPenyempit(): void {
    this.proyek.setValue(null);
  }

  pilihPeriode(v: PeriodeRekap): void {
    this.periode = v;
    if (v !== 'manual') this.rentangManual.reset();
  }

  get rentang(): RentangRekap {
    if (this.periode === 'manual') {
      return {
        dari: tanggalLokal(this.rentangManual.value.mulai ?? null),
        sampai: tanggalLokal(this.rentangManual.value.selesai ?? null),
      };
    }
    return rentangPeriode(this.periode);
  }

  get keteranganRentang(): string {
    return labelRentang(this.rentang);
  }

  get rentangBelumSah(): boolean {
    if (this.periode !== 'manual') return false;
    const r = this.rentang;
    if (!r.dari && !r.sampai) return true;
    return !rentangSah(r);
  }

  tutup(): void {
    this.dialogRef.close();
  }

  unduh(): void {
    if (!this.adaSasaran || this.sedangMenyusun || this.rentangBelumSah) return;

    const sempit = this.proyekPenyempit;
    const subjek =
      this.sudut === 'proyek'
        ? String(this.proyek.value)
        : sempit
          ? `${this.namaPemasok} · ${sempit}`
          : this.namaPemasok;

    const rentang = this.rentang;
    const parameter: Record<string, string> =
      this.sudut === 'proyek'
        ? { proyek: String(this.proyek.value) }
        : { pemasok: String(this.pemasok!.id) };
    if (sempit) parameter['proyek'] = sempit;
    // Hanya yang terisi yang dikirim: `dari=null` pada querystring sampai ke
    // server sebagai teks "null", bukan sebagai ketiadaan nilai.
    if (rentang.dari) parameter['dari'] = rentang.dari;
    if (rentang.sampai) parameter['sampai'] = rentang.sampai;

    this.sedangMenyusun = true;
    this.apiService.get('certificate-of-payments/rekap', parameter).subscribe({
      next: async (res: any) => {
        const daftar: IRekapCop[] = res?.certificateOfPayments || [];
        const spk: IRekapSpk[] = res?.purchaseOrders || [];

        if (!daftar.length) {
          this.sedangMenyusun = false;
          // Kosong karena rentangnya, atau kosong karena memang belum ada
          // CoP-nya — dua sebab yang berbeda, dan yang membaca pesannya
          // perlu tahu yang mana.
          const kunci =
            rentang.dari || rentang.sampai
              ? 'copRekap.kosongRentang'
              : this.sudut === 'pemasok'
                ? 'copRekap.kosongPemasok'
                : 'copRekap.kosong';
          this.snackBar.open(
            this.translate.instant(kunci, { rentang: this.keteranganRentang }),
            'Close',
            { duration: 5000 },
          );
          return;
        }

        try {
          await unduhRekapCop(
            subjek,
            daftar,
            spk,
            this.translate,
            rentang,
            this.sudut,
          );
          this.dialogRef.close(true);
        } catch (e) {
          // Penyusunan berkas berjalan di peramban; kegagalannya tidak
          // menghasilkan galat server, sehingga perlu disebut sendiri.
          console.error('Gagal menyusun rekap CoP:', e);
          this.snackBar.open(
            this.translate.instant('copRekap.gagal'),
            'Close',
            { duration: 5000 },
          );
        } finally {
          this.sedangMenyusun = false;
        }
      },
      error: (err: any) => {
        this.sedangMenyusun = false;
        this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
          duration: 5000,
        });
      },
    });
  }
}
