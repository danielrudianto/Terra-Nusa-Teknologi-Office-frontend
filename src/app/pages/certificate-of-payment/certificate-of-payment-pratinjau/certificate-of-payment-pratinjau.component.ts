import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { BarisPagu, SpkKandidat } from 'src/app/services/certificate-of-payment.service';

/** Satu baris yang benar-benar akan tersimpan. */
export interface BarisPratinjauCoP {
  purchaseOrderItemID: number;
  task: string | null;
  unit: string | null;
  pagu: number;
  terpakai: number;
  volume: number;
  /** Sisa pagu SETELAH baris ini tersimpan. */
  sisaSetelah: number;
  keterangan: string | null;
  catatan: string | null;
}

export interface DataPratinjauCoP {
  spk: SpkKandidat;
  tanggal: Date | null;
  periodeAwal: Date | null;
  periodeAkhir: Date | null;
  catatan: string | null;
  baris: BarisPratinjauCoP[];
  /** Sedang menyunting CoP yang sudah ada? Mengubah kata kerjanya saja. */
  menyunting: boolean;
}

/**
 * Pratinjau sebelum Certificate of Payment disimpan.
 *
 * MENGAPA ADA SAMA SEKALI
 *
 * Yang tersimpan di sini menjadi dasar penagihan. Volume yang keliru satu
 * digit baru ketahuan setelah pemeriksa membandingkannya dengan lapangan —
 * kalau ketahuan — dan sampai saat itu ia sudah memakan pagu baris yang
 * seharusnya tersedia untuk periode berikutnya.
 *
 * Lembar ini memindahkan koreksi ke saat masih murah: sebelum dokumennya
 * ada. Bentuknya sama dengan pratinjau purchase order, karena maksudnya
 * memang sama.
 *
 * TIGA SYARAT, BUKAN SATU CENTANG
 *
 * Jeda tiga detik menahan gerak refleks — mencentang dan menyimpan dalam
 * satu tarikan tanpa mata pernah singgah pada isinya. Gulir sampai bawah
 * memastikan halamannya pernah dilewati. Centangnya meminta seseorang
 * menanggungnya dengan sadar. Ketiganya menjawab hal yang berbeda; satu
 * saja tidak menggantikan dua lainnya.
 *
 * TIDAK ADA SATU PUN ANGKA RUPIAH DI SINI
 *
 * Ini pratinjau TAHAP PENCATATAN VOLUME, dan tahap itu tetap volume siapa
 * pun yang mengerjakannya. Harga tidak dikirimkan server kepada level 1,
 * dan menampilkannya bagi yang berwenang pun akan mengaburkan batas
 * tahapnya. Uang muncul pertama kali di lembar periksa.
 */
@Component({
  selector: 'app-certificate-of-payment-pratinjau',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './certificate-of-payment-pratinjau.component.html',
  styleUrl: './certificate-of-payment-pratinjau.component.scss',
})
export class CertificateOfPaymentPratinjauComponent
  implements AfterViewChecked, OnDestroy
{
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DataPratinjauCoP,
    private dialogRef: MatDialogRef<CertificateOfPaymentPratinjauComponent>,
  ) {
    this.penghitung = setInterval(() => {
      this.sisaDetik -= 1;
      if (this.sisaDetik <= 0) this.hentikanHitungan();
    }, 1000);
  }

  // ---- syarat 1: jeda ---------------------------------------------------

  /**
   * Tiga detik.
   *
   * Bukan angka keramat — cukup untuk menahan tangan yang sudah bergerak
   * menuju tombol sebelum matanya sampai. Yang benar-benar menahan adalah
   * letak centangnya di dasar dokumen; jeda ini melengkapinya.
   */
  sisaDetik = 3;
  private penghitung?: ReturnType<typeof setInterval>;

  get masihMenunggu(): boolean {
    return this.sisaDetik > 0;
  }

  private hentikanHitungan(): void {
    if (this.penghitung) {
      clearInterval(this.penghitung);
      this.penghitung = undefined;
    }
  }

  ngOnDestroy(): void {
    this.hentikanHitungan();
  }

  // ---- syarat 2: tergulir sampai bawah ----------------------------------

  /**
   * Bawaannya BENAR, dikoreksi setelah isinya digambar.
   *
   * CoP dengan satu baris tidak dapat digulir sama sekali, dan syarat yang
   * mustahil dipenuhi menghalangi orang alih-alih menjaganya.
   */
  sudahSampaiBawah = true;

  @ViewChild('isi') private wadahIsi?: ElementRef<HTMLElement>;
  private diukur = false;

  ngAfterViewChecked(): void {
    if (this.diukur) return;
    const el = this.wadahIsi?.nativeElement;
    if (!el || el.scrollHeight === 0) return;
    this.diukur = true;
    const dapatDigulir = el.scrollHeight - el.clientHeight > 24;
    this.sudahSampaiBawah = !dapatDigulir;
  }

  /**
   * Ambang 24 piksel.
   *
   * `scrollHeight` dan `clientHeight` tidak pernah persis sama pada zoom
   * peramban selain 100%; perbandingan tepat membuat sebagian orang tidak
   * pernah dianggap sampai bawah.
   */
  padaGulir(el: HTMLElement | null): void {
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 24) {
      this.sudahSampaiBawah = true;
    }
  }

  // ---- syarat 3: pernyataan ---------------------------------------------

  dibaca = false;

  get bolehSimpan(): boolean {
    return !this.masihMenunggu && this.sudahSampaiBawah && this.dibaca;
  }

  // ---- ringkasan --------------------------------------------------------

  get jumlahBaris(): number {
    return this.data.baris.length;
  }

  /**
   * Baris yang MENGHABISKAN pagunya.
   *
   * Ditandai bukan sebagai kesalahan — menghabiskan pagu adalah keadaan
   * yang wajar pada periode terakhir — melainkan karena setelah ini baris
   * itu tidak dapat di-CoP-kan lagi tanpa adendum, dan itu hal yang lebih
   * baik diketahui sekarang daripada bulan depan.
   */
  get barisHabis(): BarisPratinjauCoP[] {
    return this.data.baris.filter((b) => b.sisaSetelah <= 0);
  }

  batal(): void {
    this.dialogRef.close(false);
  }

  simpan(): void {
    // Penjaga kedua: tombolnya memang sudah mati, tetapi keadaan tombol
    // bukan tempat menaruh aturan.
    if (!this.bolehSimpan) return;
    this.dialogRef.close(true);
  }

  /** Susun data pratinjau dari keadaan formulir. */
  static dari(
    spk: SpkKandidat,
    baris: BarisPagu[],
    isian: Record<number, number | null>,
    catatanBaris: Record<number, string>,
    volumeAwal: Record<number, number>,
    meta: {
      tanggal: Date | null;
      periodeAwal: Date | null;
      periodeAkhir: Date | null;
      catatan: string | null;
      menyunting: boolean;
    },
  ): DataPratinjauCoP {
    const terpakai = baris
      .filter((b) => {
        const v = isian[b.purchaseOrderItemID];
        return v !== null && v !== undefined && v > 0;
      })
      .map((b) => {
        const volume = Number(isian[b.purchaseOrderItemID]);
        // Sisa dihitung dari pagu yang BOLEH — volume milik CoP ini sendiri
        // dikembalikan lebih dulu, sama seperti di formulirnya. Tanpa itu,
        // menyunting tanpa mengubah apa pun tampak menghabiskan pagu.
        const bolehPakai = b.sisa + (volumeAwal[b.purchaseOrderItemID] || 0);
        return {
          purchaseOrderItemID: b.purchaseOrderItemID,
          task: b.task,
          unit: b.unit,
          pagu: b.pagu,
          terpakai: b.terpakai,
          volume,
          sisaSetelah: bolehPakai - volume,
          keterangan: b.keterangan,
          catatan: catatanBaris[b.purchaseOrderItemID] || null,
        };
      });

    return { spk, ...meta, baris: terpakai };
  }
}
