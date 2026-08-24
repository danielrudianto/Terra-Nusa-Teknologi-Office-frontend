import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
  KATEGORI_POTONGAN,
  KATEGORI_TAMBAHAN,
  PenyesuaianCoP,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/**
 * Layar baca Certificate of Payment — sekaligus tempat memeriksa & menyetujui.
 *
 * Yang memeriksa perlu MEMBACA isinya lebih dulu, bukan menekan tombol dari
 * daftar tanpa membuka apa pun. Karena itu kedua tombol itu ada di sini,
 * bukan hanya di daftar.
 */
@Component({
  selector: 'app-certificate-of-payment-view',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    NgxMaskDirective,
    TranslateModule,
    HeaderTitleComponent,
  ],
  providers: [provideNgxMask()],
  templateUrl: './certificate-of-payment-view.component.html',
  styleUrl: './certificate-of-payment-view.component.scss',
})
export class CertificateOfPaymentViewComponent implements OnInit {
  private readonly service = inject(CertificateOfPaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  readonly izin = inject(PermissionService);

  readonly cop = signal<CertificateOfPayment | null>(null);
  readonly memuat = signal(false);
  readonly bekerja = signal(false);

  /**
   * Salinan penyesuaian yang sedang disunting.
   *
   * Disalin, bukan disunting langsung pada `cop()`: yang batal menyimpan
   * harus kembali ke keadaan semula, dan menyunting di tempat membuat
   * "batal" tidak membatalkan apa pun.
   */
  readonly penyesuaian = signal<PenyesuaianCoP[]>([]);
  readonly menyuntingPenyesuaian = signal(false);
  readonly menyimpanPenyesuaian = signal(false);

  readonly KATEGORI_POTONGAN = KATEGORI_POTONGAN;
  readonly KATEGORI_TAMBAHAN = KATEGORI_TAMBAHAN;

  readonly bolehLihatNilai = computed(() => this.izin.level() >= 2);
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  readonly bolehSetujui = computed(() => this.izin.level() >= 3);

  get kolom(): string[] {
    const dasar = ['pekerjaan', 'satuan', 'volume'];
    return this.bolehLihatNilai()
      ? [...dasar, 'harga', 'jumlah', 'catatan']
      : [...dasar, 'catatan'];
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
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.detail(id),
      )) as CertificateOfPayment;
      this.cop.set(hasil);
      this.penyesuaian.set(
        (hasil.adjustments || []).map((a) => ({ ...a })),
      );
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  get total(): number | null {
    const c = this.cop();
    if (!this.bolehLihatNilai() || !c?.items) return null;
    return c.items.reduce((t, i) => t + Number(i.amount || 0), 0);
  }

  async periksa(checked: boolean): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.periksa(c.id, checked));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  async setujui(): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.setujui(c.id));
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  ubah(): void {
    const c = this.cop();
    if (c) this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  // ---- unduh ----------------------------------------------------------

  readonly mengunduh = signal(false);

  async unduh(hanyaBap = false): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.mengunduh.set(true);
    try {
      const berkas = (await firstValueFrom(
        hanyaBap ? this.service.unduhBap(c.id) : this.service.unduhPdf(c.id),
      )) as Blob;
      const aman = (c.name || 'CoP').replace(/\//g, '-');
      this.simpanBerkas(berkas, `${aman}${hanyaBap ? '-BAP' : ''}.pdf`);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.mengunduh.set(false);
    }
  }

  /** URL sementaranya dicabut setelah dipakai supaya tidak menahan memori. */
  private simpanBerkas(blob: Blob, nama: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nama;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- potongan & tambahan -------------------------------------------

  /**
   * Boleh menyunting penyesuaian?
   *
   * Pemeriksa ke atas, dan HANYA selama belum disetujui — nilai yang sudah
   * disetujui adalah nilai yang akan ditagihkan. Cerminan aturan server;
   * yang menegakkan tetap server.
   */
  get bolehSuntingPenyesuaian(): boolean {
    return this.bolehPeriksa() && !this.cop()?.isApproved;
  }

  mulaiSunting(): void {
    this.penyesuaian.set(
      (this.cop()?.adjustments || []).map((a) => ({ ...a })),
    );
    this.menyuntingPenyesuaian.set(true);
  }

  batalSunting(): void {
    this.penyesuaian.set(
      (this.cop()?.adjustments || []).map((a) => ({ ...a })),
    );
    this.menyuntingPenyesuaian.set(false);
  }

  tambahBaris(kind: 'deduction' | 'addition'): void {
    this.penyesuaian.update((s) => [
      ...s,
      {
        kind,
        category: kind === 'deduction' ? 'uang_muka' : 'biaya_luar_kontrak',
        label: null,
        amount: 0,
        note: null,
      },
    ]);
  }

  hapusBaris(i: number): void {
    this.penyesuaian.update((s) => s.filter((_, idx) => idx !== i));
  }

  /**
   * Teks bermask ("1.234.567,8912") menjadi angka.
   *
   * `Number` tidak mengerti titik ribuan dan koma desimal; hasilnya NaN,
   * dan NaN yang lolos ke muatan menjadi `null` di JSON — nominal yang
   * diketik lenyap tanpa pesan apa pun.
   */
  keAngka(teks: string): number {
    const bersih = (teks ?? '').toString().trim();
    if (!bersih) return 0;
    const angka = Number(bersih.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(angka) ? angka : 0;
  }

  setBaris(i: number, bagian: Partial<PenyesuaianCoP>): void {
    this.penyesuaian.update((s) =>
      s.map((b, idx) => (idx === i ? { ...b, ...bagian } : b)),
    );
  }

  kategoriUntuk(kind: string): readonly string[] {
    return kind === 'deduction' ? KATEGORI_POTONGAN : KATEGORI_TAMBAHAN;
  }

  /** Hitungan sementara di layar — server tetap yang menghitung final. */
  get kotorSunting(): number {
    return Number(this.cop()?.grossAmount || 0);
  }

  get potonganSunting(): number {
    return this.penyesuaian()
      .filter((a) => a.kind === 'deduction')
      .reduce((t, a) => t + Number(a.amount || 0), 0);
  }

  get tambahanSunting(): number {
    return this.penyesuaian()
      .filter((a) => a.kind === 'addition')
      .reduce((t, a) => t + Number(a.amount || 0), 0);
  }

  get bersihSunting(): number {
    return this.kotorSunting - this.potonganSunting + this.tambahanSunting;
  }

  /** Baris yang belum sah — ditandai sebelum dikirim, bukan sesudah ditolak. */
  barisSalah(a: PenyesuaianCoP): boolean {
    if (!a.amount || Number(a.amount) <= 0) return true;
    if (a.category === 'lain_lain' && !(a.label || '').trim()) return true;
    return false;
  }

  get adaBarisSalah(): boolean {
    return this.penyesuaian().some((a) => this.barisSalah(a));
  }

  get bersihNegatif(): boolean {
    return this.bersihSunting < 0;
  }

  async simpanPenyesuaian(): Promise<void> {
    const c = this.cop();
    if (!c || this.adaBarisSalah || this.bersihNegatif) return;
    this.menyimpanPenyesuaian.set(true);
    try {
      await firstValueFrom(
        this.service.simpanPenyesuaian(c.id, this.penyesuaian()),
      );
      this.menyuntingPenyesuaian.set(false);
      await this.muat();
      this.snackBar.open(
        this.translate.instant('cop.penyesuaianTersimpan'),
        this.translate.instant('common.close'),
        { duration: 3000 },
      );
    } catch (e) {
      this.pesan(e);
    } finally {
      this.menyimpanPenyesuaian.set(false);
    }
  }
}
