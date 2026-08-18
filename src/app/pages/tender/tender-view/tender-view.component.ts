import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { CanDirective } from 'src/app/directives/can.directive';
import {
  DataGambar,
  gambarPermintaanPenawaran,
  naskahWhatsApp,
} from 'src/app/helpers/tender-gambar.helper';
import { MINIMAL_PENAWARAN, TenderService } from 'src/app/services/tender.service';
import { TenderQuoteDialogComponent } from '../tender-quote-dialog/tender-quote-dialog.component';
import {
  DataRekap,
  MAKS_PEMASOK_CETAK,
  cetakRekapTender,
  unduhRekapTenderExcel,
} from 'src/app/helpers/tender-rekap.helper';

@Component({
  selector: 'app-tender-view',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TranslateModule,
    CanDirective,
  ],
  templateUrl: './tender-view.component.html',
  styleUrl: './tender-view.component.scss',
})
export class TenderViewComponent implements OnInit {
  private readonly service = inject(TenderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly MINIMAL = MINIMAL_PENAWARAN;

  tenderId = 0;
  data: any = null;
  isLoading = true;

  ngOnInit(): void {
    this.tenderId = Number(this.route.snapshot.paramMap.get('id'));
    this.muat();
  }

  muat(): void {
    this.isLoading = true;
    this.service
      .ambil(this.tenderId)
      .subscribe({
        next: (d: any) => (this.data = d),
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => (this.isLoading = false));
  }

  get items(): any[] {
    return this.data?.items ?? [];
  }

  get quotes(): any[] {
    return this.data?.quotes ?? [];
  }

  get isJasa(): boolean {
    return this.data?.tenderType === 'jasa';
  }

  get dapatDisunting(): boolean {
    return ['draft', 'berjalan'].includes(this.data?.status);
  }

  get kurangPenawaran(): number {
    return Math.max(this.MINIMAL - this.quotes.length, 0);
  }

  /** Harga satu baris pada satu penawaran; null bila tidak ditawar. */
  harga(quote: any, itemId: number): number | null {
    const b = (quote?.items ?? []).find((x: any) => x.tenderItemID === itemId);
    return b ? Number(b.price) : null;
  }

  catatanBaris(quote: any, itemId: number): string {
    const b = (quote?.items ?? []).find((x: any) => x.tenderItemID === itemId);
    return b?.notes ?? '';
  }

  /**
   * Penawaran termurah pada satu baris.
   *
   * Hanya di antara yang BENAR-BENAR menawar: yang tidak menawar tidak punya
   * harga, dan memperlakukannya sebagai nol akan menandainya termurah pada
   * setiap baris yang dilewatinya.
   *
   * Bila hanya satu yang menawar, TIDAK ditandai: satu-satunya penawaran
   * bukan yang termurah, ia sekadar satu-satunya — dan menandainya membuat
   * yang membaca mengira sudah ada pembanding.
   */
  termurah(itemId: number): number | null {
    const semua = this.quotes
      .map((q) => this.harga(q, itemId))
      .filter((x): x is number => x !== null);
    if (semua.length < 2) return null;
    return Math.min(...semua);
  }

  isTermurah(quote: any, itemId: number): boolean {
    const h = this.harga(quote, itemId);
    const m = this.termurah(itemId);
    return h !== null && m !== null && h === m;
  }

  /**
   * Total satu penawaran.
   *
   * Hanya baris yang ditawar DAN bervolume; baris tanpa volume tidak dapat
   * dijumlahkan dan hanya dibandingkan per satuan.
   */
  total(quote: any): number {
    return this.items.reduce((a, it) => {
      const h = this.harga(quote, it.id);
      const v = Number(it.quantity) || 0;
      return a + (h ?? 0) * v;
    }, 0);
  }

  /** Nilai PPN atas satu penawaran; nol bila pemasoknya bukan PKP. */
  nilaiPpn(quote: any): number {
    if (!quote?.includePpn) return 0;
    return (this.total(quote) * (Number(quote.ppnPercentage) || 0)) / 100;
  }

  /** Yang benar-benar dibayarkan ke pemasok. */
  dibayarkan(quote: any): number {
    return this.total(quote) + this.nilaiPpn(quote);
  }

  /**
   * Biaya yang benar-benar DITANGGUNG AKN.
   *
   * PPN yang dipungut PKP dikreditkan sebagai pajak masukan, sehingga yang
   * menjadi beban hanya DPP-nya. Pemasok non-PKP tidak memungut apa pun —
   * dan seluruh harganya menjadi biaya.
   *
   * Inilah yang layak dibandingkan. Membandingkan harga tertulis saja
   * menyesatkan bila status pajak pemasoknya berbeda: Rp 105 tanpa PPN lebih
   * mahal daripada Rp 100 + PPN, sekalipun angkanya lebih kecil.
   */
  biayaSebenarnya(quote: any): number {
    // PPN dikreditkan sehingga tidak ikut; biaya lain TIDAK dapat
    // dikreditkan dan seluruhnya menjadi beban.
    return this.total(quote) + (Number(quote?.otherCost) || 0);
  }

  biayaLain(quote: any): number {
    return Number(quote?.otherCost) || 0;
  }

  /**
   * Penawaran Loco TANPA biaya angkut yang ditaksir.
   *
   * Loco berarti AKN yang menjemput, dan ongkosnya tidak pernah muncul di
   * surat penawaran. Membiarkannya kosong membuat penawaran itu tampak lebih
   * murah daripada yang sebenarnya — dan perbandingannya menyesatkan justru
   * pada hal yang tidak terlihat.
   */
  locoTanpaOngkos(quote: any): boolean {
    return quote?.deliveryMethod === 'loco' && !this.biayaLain(quote);
  }

  /**
   * Penawaran dengan biaya sebenarnya TERENDAH.
   *
   * Hanya di antara yang lengkap: penawaran atas sebagian baris selalu tampak
   * lebih murah, dan menandainya membuat perbandingan menyesatkan.
   *
   * Bila hanya satu yang lengkap, tidak ditandai — satu-satunya bukan yang
   * terendah, ia sekadar satu-satunya.
   */
  get biayaTerendah(): number | null {
    const lengkap = this.quotes.filter((q) => !this.tidakLengkap(q));
    if (lengkap.length < 2) return null;
    return Math.min(...lengkap.map((q) => this.biayaSebenarnya(q)));
  }

  isBiayaTerendah(quote: any): boolean {
    const m = this.biayaTerendah;
    return (
      m !== null &&
      !this.tidakLengkap(quote) &&
      this.biayaSebenarnya(quote) === m
    );
  }

  /** Berapa baris yang ditawar penawaran ini. */
  jumlahDitawar(quote: any): number {
    return this.items.filter((it) => this.harga(quote, it.id) !== null).length;
  }

  /**
   * Penawaran yang TIDAK lengkap.
   *
   * Ditandai karena totalnya tidak sebanding: penawaran atas tiga baris
   * selalu tampak lebih murah daripada penawaran atas sepuluh baris, dan
   * membandingkan keduanya tanpa menyadari itu menghasilkan keputusan keliru.
   */
  tidakLengkap(quote: any): boolean {
    return this.jumlahDitawar(quote) < this.items.length;
  }

  // ------------------------------------------------------------------
  // Tindakan
  // ------------------------------------------------------------------

  sunting(): void {
    this.router.navigate(['/Tender/Edit', this.tenderId]);
  }

  sebarkan(): void {
    this.service.sebarkan(this.tenderId).subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('tender.sudahDisebar'),
          'Close',
          { duration: 3000 },
        );
        this.muat();
      },
      error: (e: any) =>
        this.snackBar.open(e?.error?.detail || 'Gagal', 'Close', {
          duration: 4000,
        }),
    });
  }

  batalkan(): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('tender.batalkanJudul'),
          prompt: this.translate.instant('tender.batalkanKet'),
        },
        width: '440px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ya) => {
        if (!ya) return;
        this.service.batalkan(this.tenderId).subscribe({
          next: () => this.muat(),
          error: (e: any) =>
            this.snackBar.open(e?.error?.detail || 'Gagal', 'Close', {
              duration: 4000,
            }),
        });
      });
  }

  catatPenawaran(quote: any = null): void {
    this.dialog
      .open(TenderQuoteDialogComponent, {
        data: { items: this.items, quote },
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (!hasil) return;
        const permintaan = quote?.id
          ? this.service.ubahPenawaran(this.tenderId, quote.id, hasil)
          : this.service.tambahPenawaran(this.tenderId, hasil);
        permintaan.subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('tender.penawaranTersimpan'),
              'Close',
              { duration: 3000 },
            );
            this.muat();
          },
          error: (e: any) =>
            this.snackBar.open(e?.error?.detail || 'Gagal', 'Close', {
              duration: 4000,
            }),
        });
      });
  }

  hapusPenawaran(quote: any): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('tender.hapusPenawaranJudul'),
          prompt: this.translate.instant('tender.hapusPenawaranKet', {
            nama: quote.supplierName,
          }),
        },
        width: '440px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ya) => {
        if (!ya) return;
        this.service.hapusPenawaran(this.tenderId, quote.id).subscribe({
          next: () => this.muat(),
          error: (e: any) =>
            this.snackBar.open(e?.error?.detail || 'Gagal', 'Close', {
              duration: 4000,
            }),
        });
      });
  }

  // ------------------------------------------------------------------
  // Sebar lewat WhatsApp
  // ------------------------------------------------------------------

  private dataGambar(): DataGambar {
    const tgl = (v: any) =>
      v
        ? new Date(v).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : null;

    return {
      nomor: this.data?.number ?? null,
      nama: this.data?.name ?? '',
      proyek: this.data?.projectName ?? '',
      jenis: this.isJasa ? 'jasa' : 'barang',
      tanggal: tgl(this.data?.date) ?? '',
      batas: tgl(this.data?.dueDate),
      uraian: this.data?.description ?? null,
      syarat: this.data?.requirements ?? null,
      items: this.items.map((x) => ({
        name: x.name,
        specification: x.specification,
        quantity: x.quantity !== null ? Number(x.quantity) : null,
        unit: x.unit,
      })),
    };
  }

  /**
   * Unduh gambar permintaan penawaran.
   *
   * Diunduh, bukan dibuka di tab baru: yang menyebarkannya perlu melampirkan
   * berkasnya ke WhatsApp, dan gambar di tab baru harus disimpan dulu lewat
   * klik kanan — satu langkah tambahan yang dikerjakan puluhan kali sehari.
   */
  unduhGambar(): void {
    const kanvas = gambarPermintaanPenawaran(this.dataGambar());
    kanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permintaan-penawaran-${this.data?.number ?? this.tenderId}.png`;
      a.click();
      // Alamat objek DILEPAS setelah dipakai; tanpa ini berkasnya tetap
      // tersimpan di memori peramban sampai halamannya ditutup.
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /** Salin naskah pesan ke papan klip. */
  salinNaskah(): void {
    const teks = naskahWhatsApp(this.dataGambar());
    navigator.clipboard
      .writeText(teks)
      .then(() =>
        this.snackBar.open(
          this.translate.instant('tender.naskahDisalin'),
          'Close',
          { duration: 3000 },
        ),
      )
      .catch(() =>
        this.snackBar.open(
          this.translate.instant('tender.gagalSalin'),
          'Close',
          { duration: 3000 },
        ),
      );
  }

  /**
   * Data untuk rekap cetak.
   *
   * Disusun sekali dan dipakai kedua bentuknya. Menyusunnya terpisah di
   * masing-masing berarti satu di antaranya pasti tertinggal ketika bidangnya
   * bertambah — dan yang membandingkan PDF dengan Excel menemukan dua isi
   * berbeda untuk tender yang sama.
   */
  private dataRekap(): DataRekap {
    return {
      nomor: this.data?.number ?? null,
      nama: this.data?.name ?? '',
      proyek: this.data?.projectName ?? '',
      jenis: this.isJasa ? 'jasa' : 'barang',
      tanggal: this.data?.date ?? '',
      uraian: this.data?.description ?? null,
      ketentuan: this.data?.requirements ?? null,
      items: this.items.map((x) => ({
        id: x.id,
        name: x.name,
        specification: x.specification,
        quantity: x.quantity !== null ? Number(x.quantity) : null,
        unit: x.unit,
      })),
      quotes: this.quotes,
    };
  }

  cetakPdf(): void {
    if (!this.quotes.length) {
      this.snackBar.open(
        this.translate.instant('tender.belumAdaPenawaran'),
        'Close',
        { duration: 3000 },
      );
      return;
    }
    /*
     * Lebih dari sembilan pemasok tidak terbaca dalam satu halaman.
     *
     * Tiap kolomnya menyusut di bawah 52pt dan angka rupiah terpotong di
     * tengah. Diberitahukan, bukan dicegah: yang mencetaknya berhak
     * memutuskan sendiri, tetapi tidak boleh terkejut setelahnya.
     */
    if (this.quotes.length > MAKS_PEMASOK_CETAK) {
      this.snackBar.open(
        this.translate.instant('tender.terlaluBanyakCetak', {
          n: MAKS_PEMASOK_CETAK,
        }),
        'Close',
        { duration: 5000 },
      );
    }
    cetakRekapTender(this.dataRekap(), 'download');
  }

  unduhExcel(): void {
    if (!this.quotes.length) {
      this.snackBar.open(
        this.translate.instant('tender.belumAdaPenawaran'),
        'Close',
        { duration: 3000 },
      );
      return;
    }
    unduhRekapTenderExcel(this.dataRekap()).catch(() =>
      this.snackBar.open(
        this.translate.instant('notify.saveFailed'),
        'Close',
        { duration: 3000 },
      ),
    );
  }

  kembali(): void {
    this.router.navigate(['/Tender']);
  }
}
