import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { RefreshButtonComponent } from 'src/app/components/refresh-button/refresh-button.component';
import { CertificateOfPaymentViewComponent } from '../certificate-of-payment-view/certificate-of-payment-view.component';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-certificate-of-payment-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressBarModule,
    TranslateModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './certificate-of-payment-list.component.html',
  styleUrl: './certificate-of-payment-list.component.scss',
})
export class CertificateOfPaymentListComponent implements OnInit {
  /** track by id: hindari render ulang seluruh baris saat data berubah. */
  trackById = (_: number, row: any): any => row?.id ?? _;

  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);

  readonly data = signal<CertificateOfPayment[]>([]);
  /**
   * Kata pencarian.
   *
   * Dikirim ke server, bukan dipakai menyaring `data()`: daftar ini dipenggal
   * per halaman, dan menyaring satu halaman hanya mencari di baris yang
   * kebetulan sedang terbuka.
   */
  readonly cari = new FormControl<string>('');

  /*
   * Pengurutan DI SERVER, sama seperti pencariannya.
   *
   * Mengurutkan di layar hanya mengurutkan dua puluh baris yang kebetulan
   * terbuka. Yang mencari CoP bernilai terbesar akan menemukan yang terbesar
   * DI HALAMAN INI — angka yang tidak berarti apa-apa, dan tidak ada apa pun
   * di layar yang memberitahu bahwa itulah yang barusan terjadi.
   *
   * Bawaan `tanggal` menurun — SAMA dengan urutan bawaan server.
   *
   * Server mengurutkan `c.date DESC, c.id DESC` bila tidak diberi kolom, dan
   * `tanggal` menurun menghasilkan perintah yang persis sama. Jadi menyetel
   * bawaan di sini tidak mengubah baris yang keluar; ia hanya membuat kepala
   * kolomnya JUJUR — sebelumnya daftar jelas terurut menurut tanggal
   * sementara ketujuh kolomnya sama-sama menampilkan ikon "belum diurutkan".
   */
  readonly urutKolom = signal<string>('tanggal');
  readonly urutArah = signal<'asc' | 'desc'>('desc');

  /**
   * Tekan kolom yang sama membalik arah; kolom lain mulai dari menaik.
   *
   * Persis perilaku `changeSortBy` pada daftar Pembelian dan Purchase Order.
   * Keadaan ketiga — "tidak diurutkan" — SENGAJA tidak ada: ia tidak ada di
   * kedua daftar itu, dan satu daftar yang butuh tiga ketukan untuk kembali
   * ke awal sementara dua lainnya butuh dua adalah perbedaan yang hanya
   * ditemukan dengan salah menekan.
   */
  gantiUrutan(kolom: string): void {
    if (this.urutKolom() === kolom) {
      this.urutArah.set(this.urutArah() === 'asc' ? 'desc' : 'asc');
    } else {
      this.urutKolom.set(kolom);
      this.urutArah.set('asc');
    }
    // Kembali ke halaman pertama: urutan baru membuat "halaman ketiga"
    // menunjuk baris yang sama sekali lain.
    this.halaman = 0;
    void this.muat();
  }

  /** Kolom inikah yang sedang mengurutkan? Menentukan ikonnya redup atau tidak. */
  diurutkan(kolom: string): boolean {
    return this.urutKolom() === kolom;
  }

  /**
   * Ikon kepala kolom.
   *
   * `unfold_more` yang redup pada kolom yang sedang tidak mengurutkan bukan
   * hiasan: tanpanya tidak ada tanda sama sekali bahwa judulnya dapat
   * ditekan, dan pengurutannya hanya ditemukan orang yang kebetulan
   * menekannya.
   */
  urutIkon(kolom: string): string {
    if (!this.diurutkan(kolom)) return 'unfold_more';
    return this.urutArah() === 'asc' ? 'arrow_drop_up' : 'arrow_drop_down';
  }

  /** Penyaring keadaan: '', 'draft', 'diperiksa', 'disetujui'. */
  readonly saring = signal<string>('');
  readonly total = signal(0);
  readonly memuat = signal(false);

  halaman = 0;
  ukuran = 20;

  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);
  readonly bolehBuat = computed(() =>
    this.izin.can('certificate_of_payment', 'create'),
  );
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  readonly bolehSetujuiBap = computed(() => this.izin.level() >= 4);
  readonly bolehSetujui = computed(() => this.izin.level() >= 4);

  get kolom(): string[] {
    // Nomor SPK ikut di dalam sel nomor CoP sebagai baris kedua, sehingga
    // tidak perlu kolom sendiri — daftar jadi muat tanpa digulir menyamping.
    const dasar = ['nomor', 'pemasok', 'proyek', 'tanggal', 'keadaan', 'pembuat'];
    return this.bolehLihatNilai()
      ? [...dasar, 'nilai', 'aksi']
      : [...dasar, 'aksi'];
  }

  /**
   * Baris yang tampil.
   *
   * Penyaringnya sudah dikerjakan SERVER — lihat `keadaan` pada rute daftar.
   * Sebelumnya disaring di sini, dan itu keliru pada daftar berhalaman: yang
   * tersaring hanya dua puluh baris yang kebetulan terbuka, sementara
   * pemenggal halaman di bawahnya tetap menyebut jumlah SELURUHNYA. Memilih
   * "Draf" pada daftar berisi ratusan dokumen lalu menampilkan tiga baris di
   * atas keterangan "1–20 dari 340".
   */
  readonly terlihat = computed(() => this.data());

  pilihSaring(nilai: string): void {
    this.saring.set(nilai || '');
    // Kembali ke halaman pertama: penyaring baru membuat "halaman ketiga"
    // menunjuk baris yang sama sekali lain.
    this.halaman = 0;
    void this.muat();
  }

  /** Unduh CoP + lampiran BAP sebagai satu berkas PDF. */
  async unduh(c: CertificateOfPayment): Promise<void> {
    try {
      const berkas = (await firstValueFrom(
        this.service.unduhPdf(c.id),
      )) as Blob;
      this.simpanBerkas(berkas, `${(c.name || 'CoP').replace(/\//g, '-')}.pdf`);
    } catch (e) {
      this.pesan(e);
    }
  }

  /**
   * Simpan blob sebagai unduhan.
   *
   * URL sementaranya DICABUT setelah dipakai: tanpa itu tiap unduhan
   * menahan berkasnya di memori peramban sampai tabnya ditutup.
   */
  private simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit(): void {
    // Datang dari beranda ponsel dengan `?keadaan=draft|diperiksa`: keping
    // penyaringnya sudah terpilih saat layar terbuka, sehingga yang menekan
    // kartu "CoP perlu diperiksa" langsung melihat yang perlu diperiksa —
    // bukan seluruh daftar yang harus disaring ulang tangan.
    const awal = this.route.snapshot.queryParamMap.get('keadaan');
    if (awal) this.saring.set(awal);

    /*
     * Jeda 300ms sebelum server ditanya.
     *
     * Tanpa jeda, mengetik "R501" mengirimkan empat permintaan yang
     * jawabannya dapat tiba tidak berurutan — dan yang tiba terakhir,
     * jawaban untuk "R50", menimpa jawaban yang benar.
     */
    this.cari.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        // Kembali ke halaman pertama: hasil pencarian baru hampir selalu
        // lebih pendek, dan bertahan di halaman ketiga menampilkan daftar
        // kosong untuk kata yang sebenarnya ada hasilnya.
        this.halaman = 0;
        void this.muat();
      });
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
        this.service.daftar({
          page: this.halaman,
          pageSize: this.ukuran,
          keyword: (this.cari.value || '').trim() || undefined,
          sortBy: this.urutKolom() || undefined,
          sortDir: this.urutArah() || undefined,
          keadaan: this.saring() || undefined,
        }),
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

  /** Huruf pertama nama pemasok; "?" bila tidak ada. */
  inisialPemasok(c: CertificateOfPayment): string {
    const nama = (c.supplierName || '').trim();
    return nama ? nama.charAt(0).toUpperCase() : '?';
  }

  /** Keadaan dokumen, untuk lencana. */
  keadaan(c: CertificateOfPayment): 'draft' | 'bap' | 'dibuat' | 'disetujui' {
    if (c.isApproved) return 'disetujui';
    if (c.isCopCreated) return 'dibuat';
    if (c.isBapApproved) return 'bap';
    return 'draft';
  }

  nilaiTotal(c: CertificateOfPayment): number | null {
    if (!this.bolehLihatNilai() || !c.items) return null;
    return c.items.reduce((t, i) => t + Number(i.amount || 0), 0);
  }

  buat(): void {
    this.router.navigate(['/Certificate-of-payment/Create']);
  }

  /**
   * Buka dokumen sebagai DIALOG, bukan berpindah halaman.
   *
   * Membaca satu CoP adalah pekerjaan sekilas: melihat volumenya, melihat
   * siapa yang sudah menandatangani, lalu kembali. Berpindah halaman
   * membuang kata pencarian, penyaring, urutan, dan halaman yang sedang
   * dibuka — dan yang memeriksa sepuluh dokumen berturut-turut harus
   * menyusunnya ulang sepuluh kali.
   *
   * Yang bukan sekilas — memeriksa, menyunting — tetap berpindah halaman;
   * keduanya menutup dialognya lebih dulu.
   */
  buka(c: CertificateOfPayment): void {
    this.dialog
      .open(CertificateOfPaymentViewComponent, {
        data: { id: c.id },
        width: '900px',
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((berubah) => {
        // Dimuat ulang HANYA bila ada yang berubah. Memuat ulang setiap kali
        // dialog ditutup membuat daftar berkedip tiap kali orang sekadar
        // melihat-lihat.
        if (berubah) void this.muat();
      });
  }

  ubah(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  /** Buka lembar periksa — tandanya dibubuhkan di sana, sebagai akibat simpan. */
  bukaPeriksa(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Periksa', c.id]);
  }

  async setujuiBap(c: CertificateOfPayment): Promise<void> {
    try {
      await firstValueFrom(this.service.setujuiBap(c.id, true));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    }
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
