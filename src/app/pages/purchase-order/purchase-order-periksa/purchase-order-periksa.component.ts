import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import {
  NgxExtendedPdfViewerComponent,
  NgxExtendedPdfViewerModule,
} from 'ngx-extended-pdf-viewer';

/** Jeda terpendek sebelum tombol konfirmasi terbuka, dalam detik. */
export const JEDA_PERIKSA_DETIK = 3;

export interface DataPeriksa {
  /** Dokumen yang akan diperiksa, sebagai data URL. */
  sumber: string;
  /** Nomor dokumennya, untuk judul dialog. */
  nomor: string;
}

/**
 * Pemeriksaan purchase order: dokumennya dibaca dulu, baru ditandai.
 *
 * Sebelumnya "Periksa" hanya satu butir menu. Menekannya menandai dokumen
 * sudah diperiksa tanpa dokumennya pernah terbuka — dan tanda itulah yang
 * membuka tombol Setujui. Tahap yang seharusnya menghadirkan mata kedua
 * karena itu dapat dilewati tanpa satu pun mata melihatnya.
 *
 * Tiga hal menahan tombol konfirmasinya, dan ketiganya harus terpenuhi:
 *
 *   1. jeda terpendek — dokumennya sempat tampil, bukan berkedip;
 *   2. tergulir sampai halaman terakhir — isinya benar-benar terlewati;
 *   3. pernyataan dicentang — pemeriksanya menyatakan telah membacanya.
 *
 * Tidak satu pun dari ketiganya membuktikan dokumennya dibaca. Yang dapat
 * dilakukan sebuah layar hanya menghapus kemungkinan menandainya TANPA
 * membukanya sama sekali — dan itu keadaan yang selama ini terjadi.
 */
@Component({
  selector: 'app-purchase-order-periksa',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxExtendedPdfViewerModule,
    TranslatePipe,
  ],
  templateUrl: './purchase-order-periksa.component.html',
  styleUrls: ['./purchase-order-periksa.component.scss'],
})
export class PurchaseOrderPeriksaComponent implements OnDestroy {
  @ViewChild(NgxExtendedPdfViewerComponent)
  private pdfViewer?: NgxExtendedPdfViewerComponent;

  readonly sumber: string;
  readonly nomor: string;

  /** Sisa jeda dalam detik; nol berarti syarat waktunya sudah terpenuhi. */
  readonly sisaDetik = signal(JEDA_PERIKSA_DETIK);

  readonly jumlahHalaman = signal(0);

  /**
   * Halaman TERJAUH yang pernah dicapai, bukan halaman yang sedang tampil.
   *
   * Menyimpan halaman berjalan saja membuat syaratnya batal begitu orangnya
   * menggulir kembali ke atas untuk memastikan sesuatu — justru perbuatan
   * yang paling ingin didorong.
   *
   * Bawaannya SATU, dan itu yang membuat dokumen berhalaman satu terpenuhi
   * dengan sendirinya. Dokumen semacam itu tidak pernah memicu perubahan
   * halaman, sehingga bawaan nol akan menutup gerbangnya selamanya justru
   * pada dokumen yang paling sering diperiksa.
   */
  readonly halamanTerjauh = signal(1);

  readonly sudahBaca = signal(false);

  private jam?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: DataPeriksa,
    private readonly dialogRef: MatDialogRef<PurchaseOrderPeriksaComponent>,
  ) {
    this.sumber = data?.sumber ?? '';
    this.nomor = data?.nomor ?? '';

    this.jam = setInterval(() => {
      const sisa = this.sisaDetik() - 1;
      this.sisaDetik.set(sisa > 0 ? sisa : 0);
      if (sisa <= 0) this.hentikanJam();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.hentikanJam();
    /*
     * Penampil PDF dihentikan sendiri.
     *
     * Ia memasang pekerja latar dan pemantau ukuran yang tidak ikut berhenti
     * ketika dialognya tertutup. Memeriksa dua puluh dokumen berturut-turut
     * karena itu meninggalkan dua puluh penampil yang masih hidup, dan
     * peramban melambat tanpa sebab yang terlihat.
     */
    try {
      this.pdfViewer?.ngOnDestroy();
    } catch {
      // Penampilnya belum sempat terpasang; tidak ada yang perlu dihentikan.
    }
  }

  private hentikanJam(): void {
    clearInterval(this.jam);
    this.jam = undefined;
  }

  /** Berapa halaman yang belum terlewati. */
  readonly sisaHalaman = computed(() =>
    Math.max(0, this.jumlahHalaman() - this.halamanTerjauh()),
  );

  readonly sudahSampaiBawah = computed(
    () => this.jumlahHalaman() > 0 && this.sisaHalaman() === 0,
  );

  readonly menungguWaktu = computed(() => this.sisaDetik() > 0);

  readonly bolehKonfirmasi = computed(
    () => !this.menungguWaktu() && this.sudahSampaiBawah() && this.sudahBaca(),
  );

  /**
   * Dokumen selesai dimuat.
   *
   * Hanya mencatat jumlah halamannya. Dokumen berhalaman satu tidak perlu
   * diperlakukan khusus di sini — `halamanTerjauh` sudah bernilai satu sejak
   * awal, sehingga syarat "sampai bawah" terpenuhi begitu jumlahnya
   * diketahui. Penanganan khusus yang sempat ada di sini tidak pernah
   * mengubah apa pun, dan komentarnya membuatnya tampak menentukan.
   */
  halamanSiap(peristiwa: any): void {
    this.jumlahHalaman.set(Number(peristiwa?.pagesCount ?? peristiwa) || 0);
  }

  halamanBerpindah(halaman: any): void {
    const n = Number(halaman) || 1;
    if (n > this.halamanTerjauh()) this.halamanTerjauh.set(n);
  }

  ubahPernyataan(centang: boolean): void {
    this.sudahBaca.set(centang);
  }

  batal(): void {
    this.dialogRef.close(false);
  }

  konfirmasi(): void {
    // Dijaga di sini juga, bukan hanya lewat `[disabled]`: tombol yang mati
    // masih dapat ditekan lewat papan ketik pada sebagian peramban.
    if (!this.bolehKonfirmasi()) return;
    this.dialogRef.close(true);
  }
}
