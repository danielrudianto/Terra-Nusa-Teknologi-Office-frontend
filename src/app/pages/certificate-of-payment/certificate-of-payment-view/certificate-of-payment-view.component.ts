import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, Optional, computed, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NamaBadanComponent } from 'src/app/components/nama-badan/nama-badan.component';
// SEMENTARA — alat tautkan pembelian lama; hapus bersama folder dialognya.
import { TautanPembelianComponent } from '../tautan-pembelian/tautan-pembelian.component';
import { TautanPembelianService } from '../tautan-pembelian/tautan-pembelian.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import {
  AksiCop,
  AksiCopBerkonfirmasi,
  nomorCop,
  pesanBerhasilCop,
  teksKonfirmasiCop,
} from '../cop-konfirmasi';
import { firstValueFrom } from 'rxjs';

import { AuditTrailComponent } from 'src/app/components/audit-trail/audit-trail.component';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import {
  CertificateOfPayment,
  CertificateOfPaymentService,
  SyaratSpk,
  TagihanCoP,
} from 'src/app/services/certificate-of-payment.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { CanDirective } from 'src/app/directives/can.directive';
import { spkTenagaKerja } from 'src/app/helpers/invoice-tenaga.helper';
import {
  CertificateOfPaymentInvoiceComponent,
  DataInvoiceCop,
  HasilInvoiceCop,
} from '../certificate-of-payment-invoice/certificate-of-payment-invoice.component';

/**
 * Layar baca Certificate of Payment — sekaligus tempat memeriksa & menyetujui.
 *
 * Yang memeriksa perlu MEMBACA isinya lebih dulu, bukan menekan tombol dari
 * daftar tanpa membuka apa pun. Karena itu kedua tombol itu ada di sini,
 * bukan hanya di daftar.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-certificate-of-payment-view',
  standalone: true,
  imports: [
    CanDirective,
    CommonModule,
    MatTableModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslateModule,
    HeaderTitleComponent,
    AuditTrailComponent,
    DialogGeserDirective,
    NamaBadanComponent,
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
  // Dialog konfirmasi dibuka DI ATAS dialog ini; `MatDialogRef` yang
  // sudah ada menunjuk dialog INI, bukan pembuka dialog baru.
  private readonly dialog = inject(MatDialog);
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
  /** Membuat CoP (mengisi harga & potongan) — engineering level 2+. */
  readonly bolehPeriksa = computed(() => this.izin.level() >= 2);
  /** Menyetujui BAP maupun CoP — keduanya level 4+. */
  readonly bolehSetujuiBap = computed(() => this.izin.level() >= 4);
  readonly bolehSetujui = computed(() => this.izin.level() >= 4);

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
   * Invoice & kuitansi tenaga kerja dapat dicetak dari CoP ini?
   *
   * Hanya SPK D (tenaga kerja): tukang dan mandor tidak punya kop surat, jadi
   * invoicenya kita yang membuatkan — dulu lewat Generator Invoice. Subkon
   * berbadan usaha menerbitkan invoicenya sendiri. Rupiah hanya untuk yang
   * boleh melihat nilai, dan CoP-nya harus sudah disetujui: sebelum itu
   * nilainya masih dapat berubah.
   */
  get bolehCetakInvoice(): boolean {
    const c: any = this.cop();
    if (!c || !this.bolehLihatNilai()) return false;
    const jenis = String(c.purchaseType ?? '').trim().toUpperCase();
    return jenis ? jenis === 'D' : spkTenagaKerja(c.purchaseOrderName);
  }

  /*
   * TAMPIL TAPI MATI selama CoP belum disetujui — bukan disembunyikan.
   *
   * Tombol yang hilang menimbulkan pertanyaan baru ("kok cetak invoice-nya
   * tidak ada?"), dan yang bertanya tidak punya cara menebak jawabannya.
   * Tombol mati yang menyebutkan syaratnya menjawab pertanyaan itu sebelum
   * sempat ditanyakan.
   *
   * Syaratnya sendiri tidak berubah: nilai CoP masih dapat berubah sebelum
   * disetujui, dan invoice yang tercetak dari angka yang belum final adalah
   * dokumen yang harus ditarik kembali.
   */
  get cetakInvoiceSiap(): boolean {
    return !!(this.cop() as any)?.isApproved;
  }

  /* ---------------------------------------------------------------- */
  /* ALAT SEMENTARA — tautkan / lepas pembelian lama.                   */
  /* Hapus blok ini, dua tombolnya di templat, dan folder                */
  /* `../tautan-pembelian` saat fiturnya dicopot.                        */
  /* ---------------------------------------------------------------- */
  private readonly tautanService = inject(TautanPembelianService);

  /** CoP disetujui dan belum ditagihkan — sama dengan syarat server. */
  get bolehTautkan(): boolean {
    return this.bolehBuatPembelian;
  }

  bukaTautan(): void {
    const c: any = this.cop();
    if (!c) return;
    this.dialog
      .open(TautanPembelianComponent, {
        data: {
          copId: c.id,
          copNomor: c.name,
          nilaiBersih: Number(c.netAmount) || 0,
        },
        maxWidth: '94vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) void this.muat();
      });
  }

  lepasTautan(): void {
    const c: any = this.cop();
    const beli = this.tagihan()?.pembelian;
    if (!c || !beli) return;
    this.tautanService.lepas(c.id, beli.id).subscribe({
      next: () => void this.muat(),
      error: (e) => this.pesan(e),
    });
  }

  cetakInvoice(): void {
    const c = this.cop();
    if (!c) return;
    const data: DataInvoiceCop = {
      cop: c,
      nomorTerbit: this.tagihan()?.pembelian?.invoiceName ?? null,
      bolehBuatPembelian: this.bolehBuatPembelian,
    };
    this.dialog
      .open(CertificateOfPaymentInvoiceComponent, {
        data,
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((h: HasilInvoiceCop | undefined) => {
        if (h?.lanjutPembelian) this.buatPembelian(h.nomorInvoice);
      });
  }

  /**
   * Menuju formulir pembelian dengan CoP ini sebagai dasarnya.
   *
   * Lewat parameter rute, bukan dengan menyalin isian ke sana: formulir
   * pembelian yang membaca sendiri dari server mendapat angka TERKINI, dan
   * tidak ada salinan yang dapat basi di antara dua layar.
   */
  buatPembelian(nomorInvoice?: string): void {
    const c = this.cop();
    if (!c) return;
    this.dialogRef?.close(this.adaPerubahan);
    this.router.navigate(['/Purchase/Create'], {
      // Nomor invoice yang baru dicetak ikut, supaya pembeliannya tercatat
      // dengan nomor yang SAMA dengan dokumen di tangan pemasok.
      queryParams: nomorInvoice ? { cop: c.id, invoice: nomorInvoice } : { cop: c.id },
    });
  }

  /** Keadaan dokumen, untuk lencana pada kepala dialog. */
  keadaan(c: CertificateOfPayment): 'draft' | 'bap' | 'dibuat' | 'disetujui' {
    if (c.isApproved) return 'disetujui';
    if (c.isCopCreated) return 'dibuat';
    if (c.isBapApproved) return 'bap';
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
      this.kabarkan(checked ? 'periksa' : 'cabutPeriksa');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  /**
   * Minta konfirmasi lebih dulu; `false` berarti dibatalkan.
   *
   * Teksnya datang dari `cop-konfirmasi`, dipakai bersama layar daftar —
   * supaya peringatan yang muncul tidak bergantung pada dari layar mana
   * tombolnya ditekan.
   */
  private async konfirmasi(aksi: AksiCopBerkonfirmasi): Promise<boolean> {
    const c = this.cop();
    if (!c) return false;
    const setuju = await firstValueFrom(
      this.dialog
        .open(DeleteConfirmationComponent, {
          data: teksKonfirmasiCop(this.translate, aksi, nomorCop(c)),
        })
        .afterClosed(),
    );
    return !!setuju;
  }

  /** Pesan berhasil; tanpa ini tidak ada yang menyatakan tindakannya jadi. */
  private kabarkan(aksi: AksiCop): void {
    const c = this.cop();
    if (!c) return;
    this.snackBar.open(
      pesanBerhasilCop(this.translate, aksi, nomorCop(c)),
      this.translate.instant('common.close'),
      { duration: 5000 },
    );
  }

  /** Gerbang 1 — setujui BAP (level 4+). Membuka pengisian harga. */
  async setujuiBap(): Promise<void> {
    const c = this.cop();
    if (!c) return;
    if (!(await this.konfirmasi('setujuiBap'))) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.setujuiBap(c.id, true));
      this.adaPerubahan = true;
      this.kabarkan('setujuiBap');
      await this.muat();
    } catch (e) {
      this.pesan(e);
    } finally {
      this.bekerja.set(false);
    }
  }

  /** Gerbang 3 — setujui CoP (level 4+). Siap ditagih. */
  async setujui(): Promise<void> {
    const c = this.cop();
    if (!c) return;
    if (!(await this.konfirmasi('setujui'))) return;
    this.bekerja.set(true);
    try {
      await firstValueFrom(this.service.setujui(c.id));
      this.adaPerubahan = true;
      this.kabarkan('setujui');
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

  /**
   * Unduh berkas CoP dalam salah satu dari tiga bentuk:
   *   'bap'      — BAP saja;
   *   'cop'      — lembar CoP saja (tanpa lampiran BAP);
   *   'keduanya' — CoP beserta lampiran BAP (dokumen resminya).
   *
   * Ketiganya dijadikan satu tombol dengan menu, bukan tiga tombol berjajar:
   * yang mengunduh memilih bentuknya sekali, dan kaki dialog tidak penuh oleh
   * tombol yang jarang dipakai bersamaan.
   */
  async unduh(jenis: 'bap' | 'cop' | 'keduanya' = 'keduanya'): Promise<void> {
    const c = this.cop();
    if (!c) return;
    this.mengunduh.set(true);
    try {
      const sumber =
        jenis === 'bap'
          ? this.service.unduhBap(c.id)
          : jenis === 'cop'
            ? this.service.unduhCop(c.id)
            : this.service.unduhPdf(c.id);
      const berkas = (await firstValueFrom(sumber)) as Blob;
      const aman = (c.name || 'CoP').replace(/\//g, '-');
      const akhiran =
        jenis === 'bap' ? '-BAP' : jenis === 'cop' ? '-CoP' : '';
      this.simpanBerkas(berkas, `${aman}${akhiran}.pdf`);
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

  /** Tarif PPh menurut SPK; 0 berarti dokumen ini memang tidak dipotong PPh. */
  get tarifPph(): number {
    return Number(this.syarat?.pphPercentage || 0);
  }

  /**
   * PPh atas periode ini — KETERANGAN, bukan potongan.
   *
   * Dihitung dari tarif SPK dikali DPP, sama persis dengan yang dikerjakan
   * formulir pembelian (`pphPercentage * dpp / 100`). Inilah angka yang
   * nanti benar-benar dipotong ketika CoP ini ditagihkan, dan menampilkan
   * angka yang berbeda dari yang akan terpotong membuat lembar ini tidak
   * dapat dipakai menyiapkan pembayaran.
   *
   * TIDAK dibaca dari daftar penyesuaian. `pph` sudah dikeluarkan dari
   * kategori potongan CoP — ia dipotong sekali di pembelian, bukan dua kali
   * — sehingga membacanya dari sana selalu menghasilkan nol, dan barisnya
   * tidak pernah muncul sekalipun SPK-nya jelas memuat tarif PPh.
   */
  get nilaiPph(): number {
    return (Number(this.cop()?.netAmount || 0) * this.tarifPph) / 100;
  }

  /**
   * Nilai tagihan periode ini: DPP + PPN.
   *
   * PPh TIDAK dikurangkan di sini, dan itu disengaja. Angka ini harus sama
   * persis dengan "Total Progress Periode Ini" pada lembar CoP yang
   * tercetak — satu dokumen yang menyatakan dua jumlah berbeda di layar dan
   * di kertas adalah dokumen yang tidak dapat dipakai membayar, dan
   * selisihnya baru ketahuan setelah transfernya jalan.
   *
   * Pemotongan PPh terjadi pada pembelian yang menagihkan CoP ini. Ia
   * ditampilkan sebagai keterangan di sebelah total, bukan sebagai
   * pengurang.
   */
  get totalDibayar(): number {
    return Number(this.cop()?.netAmount || 0) + this.nilaiPpn;
  }
}
