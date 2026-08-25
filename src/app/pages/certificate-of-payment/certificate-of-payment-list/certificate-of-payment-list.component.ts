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
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
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
  private readonly service = inject(CertificateOfPaymentService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
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
   */
  readonly urutKolom = signal<string>('');
  readonly urutArah = signal<SortDirection>('');

  gantiUrutan(s: Sort): void {
    this.urutKolom.set(s.direction ? s.active : '');
    this.urutArah.set(s.direction);
    // Kembali ke halaman pertama: urutan baru membuat "halaman ketiga"
    // menunjuk baris yang sama sekali lain.
    this.halaman = 0;
    void this.muat();
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
  readonly bolehSetujui = computed(() => this.izin.level() >= 3);

  get kolom(): string[] {
    // Nomor SPK ikut di dalam sel nomor CoP sebagai baris kedua, sehingga
    // tidak perlu kolom sendiri — daftar jadi muat tanpa digulir menyamping.
    const dasar = ['nomor', 'pemasok', 'proyek', 'tanggal', 'keadaan', 'pembuat'];
    return this.bolehLihatNilai()
      ? [...dasar, 'nilai', 'aksi']
      : [...dasar, 'aksi'];
  }

  /**
   * Baris yang lolos penyaring.
   *
   * Disaring DI LAYAR, bukan lewat server: keadaan dokumen tidak tersimpan
   * sebagai satu kolom melainkan disimpulkan dari `isChecked`/`isApproved`,
   * dan menambah parameter untuk itu berarti aturan yang sama ditulis di
   * dua tempat.
   */
  readonly terlihat = computed(() => {
    const s = this.saring();
    if (!s) return this.data();
    return this.data().filter((c) => this.keadaan(c) === s);
  });

  pilihSaring(nilai: string): void {
    this.saring.set(nilai || '');
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

  /** Buka lembar periksa — tandanya dibubuhkan di sana, sebagai akibat simpan. */
  bukaPeriksa(c: CertificateOfPayment): void {
    this.router.navigate(['/Certificate-of-payment/Periksa', c.id]);
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
