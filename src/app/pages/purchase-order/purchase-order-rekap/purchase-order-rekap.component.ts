import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
  IRekapItem,
  IRekapPO,
  unduhRekapPurchaseOrder,
} from '../../../helpers/purchase-order-rekap-excel';
import { unduhRekapPurchaseOrderPdf } from '../../../helpers/purchase-order-rekap-pdf';
import { vendorDisplayName } from '../../../helpers/purchase-order-shared.helper';
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
  private readonly dialog = inject(MatDialog);

  /**
   * SUDUT PANDANG rekapnya — per proyek atau per pemasok.
   *
   * Dua pertanyaan yang berbeda dan sama seringnya: "berapa yang sudah kita
   * keluarkan di proyek ini", dan "sudah berapa banyak kita pesan ke vendor
   * ini tahun ini" — yang kedua ditanyakan saat menawar ulang harga dan saat
   * menagih diskon volume.
   *
   * Satu dialog, bukan dua: seluruh sisanya — bentuk berkas, rentang
   * tanggal, pesan kosong — sama persis, dan dialog kedua berarti keduanya
   * harus dijaga tetap sepakat.
   */
  sudut: 'proyek' | 'pemasok' = 'proyek';

  /** Pemasok terpilih; dipilih lewat dialog pencarian yang sudah ada. */
  pemasok: { id: number; name: string; prefix?: string } | null = null;

  /**
   * PUSAT sengaja tidak ditawarkan.
   *
   * Ia bukan proyek melainkan pusat biaya, sehingga rekap purchase order
   * proyek untuknya tidak bermakna.
   */
  readonly proyek = new FormControl<string | null>(null);

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

  /**
   * Ganti sudut pandang.
   *
   * Pilihan yang lama DIBUANG. Membiarkannya membuat dialog memegang dua
   * sasaran sekaligus — dan yang kembali ke sudut sebelumnya mendapati
   * proyek yang dipilih setengah jam lalu masih terpasang, lalu mengunduh
   * rekap yang bukan yang dimaksudnya.
   */
  pilihSudut(v: 'proyek' | 'pemasok'): void {
    if (this.sudut === v) return;
    this.sudut = v;
    /*
     * Pilihan lama DIBUANG — kecuali proyeknya saat pindah ke pemasok.
     *
     * Kembali ke sudut sebelumnya dengan sasaran lama masih terpasang
     * membuat orang mengunduh rekap yang bukan yang dimaksudnya. Proyek
     * dikecualikan satu arah: pada mode pemasok ia menjadi penyempit
     * PILIHAN, dan yang baru saja memilih proyek lalu menekan "Pemasok"
     * hampir selalu sedang menuju "vendor ini, di proyek itu".
     */
    if (v === 'proyek') this.pemasok = null;
    else this.proyek.setValue(this.proyek.value);
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

  /**
   * Nama yang dicetak di kepala berkas.
   *
   * `vendorDisplayName`, bukan disusun sendiri di sini. Menempelkan prefiks
   * di depan nama begitu saja menghasilkan "CV. Baja Selatan Mandiri, CV.":
   * sebagian baris pemasok menyimpan badan usahanya DI DALAM namanya
   * (", CV." di ujung) sekaligus pada kolom `prefix`. Fungsi bersama itu
   * sudah membuang ekor yang terbawa dan menahan penulisan ganda, dan
   * dipakai seluruh dokumen tercetak — termasuk lembar Per Dokumen pada
   * rekap yang sama, yang kalau berbeda menyebut vendor yang sama dengan
   * dua nama dalam satu berkas.
   */
  get namaPemasok(): string {
    if (!this.pemasok) return '';
    const nama = vendorDisplayName(
      this.pemasok.name || undefined,
      this.pemasok.prefix || undefined,
    );
    return nama === '-' ? this.pemasok.name : nama;
  }

  /** Sasaran sudah dipilih — proyeknya, atau pemasoknya. */
  get adaSasaran(): boolean {
    return this.sudut === 'proyek' ? !!this.proyek.value : !!this.pemasok;
  }

  /**
   * Proyek ikut menyempitkan rekap pemasok.
   *
   * PILIHAN, bukan syarat: yang menanyakan "sudah berapa banyak kita pesan
   * ke vendor ini" tidak sedang memikirkan proyek tertentu. Yang menagih ke
   * pemilik proyek justru sebaliknya.
   */
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
    if (!this.adaSasaran || this.sedangMenyusun || this.rentangBelumSah) return;

    /*
     * Judul berkas — kode proyek, atau nama pemasok.
     *
     * Dipegang satu variabel, bukan dicabang di tiga tempat penyusunan
     * berkas: judul yang berbeda antara Excel dan PDF untuk permintaan yang
     * sama adalah kekeliruan yang hanya ketahuan setelah berkasnya dikirim.
     */
    const sempit = this.proyekPenyempit;
    const kode =
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
    // Proyek penyempit ikut dikirim; server memperlakukan keduanya sebagai
    // irisan, bukan memilih salah satu.
    if (sempit) parameter['proyek'] = sempit;
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
              : this.sudut === 'pemasok'
                ? sempit
                  ? 'poRekap.kosongPemasokProyek'
                  : 'poRekap.kosongPemasok'
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
            unduhRekapPurchaseOrderPdf(
              kode,
              daftar,
              items,
              this.translate,
              rentang,
              this.sudut,
            );
          } else {
            await unduhRekapPurchaseOrder(
              kode,
              daftar,
              items,
              this.translate,
              rentang,
              this.sudut,
            );
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
