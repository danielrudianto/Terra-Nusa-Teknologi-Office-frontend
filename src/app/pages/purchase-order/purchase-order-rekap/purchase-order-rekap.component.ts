import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
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
  IRekapItem,
  IRekapPO,
  unduhRekapPurchaseOrder,
} from '../../../helpers/purchase-order-rekap-excel';
import { unduhRekapPurchaseOrderPdf } from '../../../helpers/purchase-order-rekap-pdf';
import { ApiService } from '../../../services/api.service';
import { ServerMessageService } from '../../../services/server-message.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/**
 * Pilih proyek dan rentang tanggalnya, lalu unduh rekap purchase order-nya.
 *
 * Proyek dipilih lebih dulu, bukan mengikuti penyaring yang sedang aktif di
 * daftar: rekap adalah dokumen yang dikirim ke luar, dan menerbitkannya dari
 * keadaan layar yang kebetulan sedang tersaring menghasilkan berkas yang
 * isinya tidak sesuai judulnya.
 *
 * Rentang tanggalnya bawaan "semua" — sama seperti sebelum pilihan ini ada,
 * sehingga yang terbiasa menekan unduh langsung tetap mendapat berkas yang
 * sama.
 */
@Component({
  selector: 'app-purchase-order-rekap',
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
  templateUrl: './purchase-order-rekap.component.html',
  styleUrls: ['./purchase-order-rekap.component.scss'],
})
export class PurchaseOrderRekapComponent {
  private readonly dialogRef = inject(
    MatDialogRef<PurchaseOrderRekapComponent>,
  );
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  /**
   * PUSAT sengaja tidak ditawarkan.
   *
   * Ia bukan proyek melainkan pusat biaya, sehingga rekap purchase order
   * proyek untuknya tidak bermakna.
   */
  readonly proyek = new FormControl<string | null>(null, Validators.required);

  /**
   * Bentuk berkas yang diunduh.
   *
   * Keduanya BUKAN salinan satu sama lain. Excel memuat rincian per barang
   * dan dapat disaring serta dijumlah; PDF memuat ikhtisar dan satu baris per
   * dokumen, karena ia dibaca dan dikirim — bukan diolah.
   */
  bentuk: 'excel' | 'pdf' = 'excel';

  readonly pilihanPeriode = PILIHAN_PERIODE;

  /** Bawaannya seluruh periode: perilaku lama tetap perilaku bawaan. */
  periode: PeriodeRekap = 'semua';

  /**
   * Rentang yang diketik sendiri.
   *
   * `mat-date-range-input` menuntut satu FormGroup berisi dua kendali, bukan
   * dua kendali lepas.
   */
  readonly rentangManual = new FormGroup({
    mulai: new FormControl<Date | null>(null),
    selesai: new FormControl<Date | null>(null),
  });

  sedangMenyusun = false;

  pilihBentuk(v: 'excel' | 'pdf'): void {
    this.bentuk = v;
  }

  pilihPeriode(v: PeriodeRekap): void {
    this.periode = v;
    if (v !== 'manual') {
      // Tanggal yang tertinggal dari pilihan manual sebelumnya tidak ikut
      // terkirim, tetapi membiarkannya di layar membuat pilihan pintasan
      // tampak seolah masih dibatasi tanggal itu.
      this.rentangManual.reset();
    }
  }

  /** Rentang yang berlaku sekarang, apa pun cara memilihnya. */
  get rentang(): RentangRekap {
    if (this.periode === 'manual') {
      return {
        dari: tanggalLokal(this.rentangManual.value.mulai ?? null),
        sampai: tanggalLokal(this.rentangManual.value.selesai ?? null),
      };
    }
    return rentangPeriode(this.periode);
  }

  /** Keterangan rentang untuk ditampilkan di dialog dan dicetak di berkasnya. */
  get keteranganRentang(): string {
    return labelRentang(this.rentang);
  }

  /**
   * Pilihan manual yang belum bisa diunduh.
   *
   * Dua keadaan ditolak: tidak satu pun tanggal diisi (yang berarti "semua",
   * dan pintasannya sudah ada), serta rentang terbalik. Keduanya tidak
   * menghasilkan galat dari server — hanya berkas kosong tanpa sebab yang
   * terbaca.
   */
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
    const kode = this.proyek.value;
    if (!kode || this.sedangMenyusun || this.rentangBelumSah) return;

    const rentang = this.rentang;
    const parameter: Record<string, string> = { proyek: kode };
    // Hanya yang terisi yang dikirim: `dari=null` pada querystring sampai ke
    // server sebagai teks "null", bukan sebagai ketiadaan nilai.
    if (rentang.dari) parameter['dari'] = rentang.dari;
    if (rentang.sampai) parameter['sampai'] = rentang.sampai;

    this.sedangMenyusun = true;
    this.apiService.get('purchase-orders/rekap', parameter).subscribe({
      next: async (res: any) => {
        const daftar: IRekapPO[] = res?.purchaseOrders || [];
        const items: IRekapItem[] = res?.items || [];

        if (!daftar.length) {
          this.sedangMenyusun = false;
          // Kosong karena rentangnya, atau kosong karena proyeknya memang
          // belum punya apa pun — dua sebab yang berbeda, dan yang membaca
          // pesannya perlu tahu yang mana.
          const kunci =
            rentang.dari || rentang.sampai
              ? 'poRekap.kosongRentang'
              : 'poRekap.kosong';
          this.snackBar.open(
            this.translate.instant(kunci, { rentang: this.keteranganRentang }),
            'Close',
            { duration: 5000 },
          );
          return;
        }

        try {
          if (this.bentuk === 'pdf') {
            unduhRekapPurchaseOrderPdf(kode, daftar, items, rentang);
          } else {
            await unduhRekapPurchaseOrder(kode, daftar, items, rentang);
          }
          this.dialogRef.close(true);
        } catch (e) {
          // Penyusunan berkas berjalan di peramban; kegagalannya tidak
          // menghasilkan galat server, sehingga perlu disebut sendiri.
          console.error('Gagal menyusun rekap:', e);
          this.snackBar.open(
            this.translate.instant('poRekap.gagal'),
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
