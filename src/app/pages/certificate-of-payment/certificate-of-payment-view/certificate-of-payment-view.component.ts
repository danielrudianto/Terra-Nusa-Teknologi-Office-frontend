import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, Optional, computed, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
  SyaratSpk,
  TagihanCoP,
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
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    TranslateModule,
    HeaderTitleComponent,
    DialogGeserDirective,
  ],
  templateUrl: './certificate-of-payment-view.component.html',
  styleUrl: './certificate-of-payment-view.component.scss',
})
export class CertificateOfPaymentViewComponent implements OnInit {
  /**
   * Dibuka sebagai DIALOG, bukan halaman.
   *
   * Ditentukan dari ada tidaknya `MAT_DIALOG_DATA`, bukan dari sebuah
   * masukan yang harus diingat pemanggilnya: yang membuka lewat
   * `dialog.open` selalu mendapatkannya, dan yang membuka lewat rute tidak
   * pernah. Tidak ada yang perlu diingat, jadi tidak ada yang dapat lupa.
   */
  readonly modeDialog: boolean;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: { id?: number } | null,
    @Optional()
    private dialogRef: MatDialogRef<CertificateOfPaymentViewComponent> | null,
  ) {
    this.modeDialog = !!dialogData?.id;
  }

  /**
   * Dialog ditutup dengan menyampaikan APAKAH ada yang berubah.
   *
   * Daftar di belakangnya memuat keadaan dokumen; menutup setelah menyetujui
   * tanpa mengabarkannya membuat lencananya tetap "diperiksa" sampai
   * halamannya dimuat ulang — dan yang membacanya menyimpulkan
   * persetujuannya gagal.
   */
  private adaPerubahan = false;

  tutupDialog(): void {
    this.dialogRef?.close(this.adaPerubahan);
  }

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
   * Keadaan penagihan.
   *
   * Dibaca terpisah dari dokumennya, dan KEGAGALANNYA tidak menghentikan
   * apa pun: yang membuka layar ini kebanyakan datang untuk membaca
   * volumenya, dan dokumen yang tidak mau terbuka karena satu keterangan
   * tambahan gagal dimuat jauh lebih mengganggu daripada keterangan yang
   * tidak muncul.
   */
  readonly tagihan = signal<TagihanCoP | null>(null);


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
    const id =
      Number(this.dialogData?.id) ||
      Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.service.detail(id),
      )) as CertificateOfPayment;
      this.cop.set(hasil);
      void this.muatTagihan(id);
    } catch (e) {
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }
  }

  private async muatTagihan(id: number): Promise<void> {
    // Hanya untuk yang boleh melihat rupiah — jawabannya menyebut DPP
    // pembeliannya.
    if (!this.bolehLihatNilai()) return;
    try {
      this.tagihan.set(
        (await firstValueFrom(this.service.tagihan(id))) as TagihanCoP,
      );
    } catch {
      // Sengaja diam: lihat catatan pada `tagihan`.
      this.tagihan.set(null);
    }
  }

  /**
   * Boleh dibuatkan pembelian?
   *
   * Cerminan aturan server — sudah disetujui dan belum ditagihkan. Yang
   * menegakkan tetap server, termasuk indeks unik pada basis data yang
   * menahan dua permintaan bersamaan.
   */
  get bolehBuatPembelian(): boolean {
    return (
      this.bolehLihatNilai() &&
      !!this.cop()?.isApproved &&
      this.tagihan() !== null &&
      !this.tagihan()!.ditagihkan
    );
  }

  /**
   * Menuju formulir pembelian dengan CoP ini sebagai dasarnya.
   *
   * Lewat parameter rute, bukan dengan menyalin isian ke sana: formulir
   * pembelian yang membaca sendiri dari server mendapat angka TERKINI, dan
   * tidak ada salinan yang dapat basi di antara dua layar.
   */
  buatPembelian(): void {
    const c = this.cop();
    if (!c) return;
    this.dialogRef?.close(this.adaPerubahan);
    this.router.navigate(['/Purchase/Create'], {
      queryParams: { cop: c.id },
    });
  }

  /** Keadaan dokumen, untuk lencana pada kepala dialog. */
  keadaan(c: CertificateOfPayment): 'draft' | 'diperiksa' | 'disetujui' {
    if (c.isApproved) return 'disetujui';
    if (c.isChecked) return 'diperiksa';
    return 'draft';
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
      this.adaPerubahan = true;
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
      this.adaPerubahan = true;
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  ubah(): void {
    const c = this.cop();
    if (!c) return;
    this.dialogRef?.close(this.adaPerubahan);
    this.router.navigate(['/Certificate-of-payment/Edit', c.id]);
  }

  /**
   * Buka lembar periksa.
   *
   * Tandanya dibubuhkan DI SANA, sebagai akibat menyimpan — bukan di sini
   * sebagai tindakan tersendiri. Lihat catatan pada rute `Periksa/:id`.
   */
  bukaPeriksa(): void {
    const c = this.cop();
    if (!c) return;
    // Dialognya ditutup lebih dulu: tanpa itu rutenya berganti di belakang
    // dialog yang masih menutupi layar, dan yang menekannya melihat lembar
    // periksa hanya setelah menutup sesuatu yang tampak tidak berhubungan.
    this.dialogRef?.close(this.adaPerubahan);
    this.router.navigate(['/Certificate-of-payment/Periksa', c.id]);
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
   * Syarat pembayaran menurut SPK.
   *
   * Yang tersisa di layar ini dari seluruh urusan potongan: panel sisa uang
   * muka & retensi, yang sifatnya KETERANGAN. Penyuntingannya sendiri sudah
   * pindah ke lembar periksa — dua tempat mengerjakan satu pekerjaan yang
   * sama membuat urutannya tidak pernah jelas, dan yang membukanya harus
   * menebak apakah menyimpan potongan sudah berarti memeriksa.
   */
  get syarat(): SyaratSpk | null {
    return this.cop()?.spkSyarat || null;
  }

  // ---- pajak & jumlah yang dibayarkan ----------------------------------

  /** Tarif PPN menurut SPK; 0 berarti dokumen ini tidak kena PPN. */
  get tarifPpn(): number {
    return Number(this.syarat?.ppn || 0);
  }

  get nilaiPpn(): number {
    return (Number(this.cop()?.netAmount || 0) * this.tarifPpn) / 100;
  }

  /**
   * PPh yang SUDAH dipotong pada dokumen ini.
   *
   * Dibaca dari daftar potongannya, BUKAN dihitung dari tarif SPK. Yang
   * memeriksa boleh membetulkan angkanya — periode ini mungkin disepakati
   * lain — dan menghitungnya ulang dari tarif akan menampilkan angka yang
   * berbeda dari yang benar-benar dipotong tepat di sebelahnya.
   */
  get nilaiPph(): number {
    return (this.cop()?.adjustments || [])
      .filter((a) => a.kind === 'deduction' && a.category === 'pph')
      .reduce((t, a) => t + Number(a.amount || 0), 0);
  }

  /**
   * Yang benar-benar berpindah ke rekening pemasok.
   *
   * DPP + PPN. PPh tidak dikurangkan lagi di sini: ia sudah berada di daftar
   * potongan yang membentuk DPP, dan menguranginya dua kali membuat angka
   * ini lebih kecil daripada yang tertagih.
   */
  get totalDibayar(): number {
    return Number(this.cop()?.netAmount || 0) + this.nilaiPpn;
  }
}
