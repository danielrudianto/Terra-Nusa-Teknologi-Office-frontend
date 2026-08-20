import { CommonModule } from '@angular/common';
import { konteksKlausulTenagaKerja } from '../../../helpers/klausul-tenaga-kerja.helper';
import {
  jenisEfektifDokumen,
  susunKlausulDokumen,
} from '../../../helpers/klausul-dokumen.helper';
import { ClauseLineComponent } from '../../../components/clause-line/clause-line.component';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { inject } from '@angular/core';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { purchaseTypeKey, purchaseTypeLabel } from '../../../constants/purchase-type-label.constant';
import {
  ClauseSection,
  buildClauseLines,
  buildLegalServiceClauses,
  buildManpowerClauses,
  buildTransportClauses,
  buildPasal5,
  buildInsuranceClauses,
  buildTrainingClauses,
} from '../../../constants/clause-templates';
import { AuditTrailComponent } from '../../../components/audit-trail/audit-trail.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import { barisTampil } from '../../../constants/baris-tampil-po';
import { AccountService } from '../../../services/account.service';
import { PermissionService } from '../../../services/permission.service';


/**
 * Kode jenis PO ke segmen rute formulirnya.
 *
 * Disalin dari daftar purchase order dengan sengaja: adendum memakai
 * formulir varian yang SAMA dengan induknya, dan jenis yang belum punya
 * formulir tidak dapat diadendum.
 */
const ADENDUM_ROUTES: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
  G: 'G',
  H1: 'H',
  H2: 'H',
  '5.1.1': '511',
  '5.1.2': '512',
  '5.1.6': '516',
  '5.1.12': '5112',
  '6.3.1': '63',
  '6.3.2': '63',
  '6.4.1': '641',
  '6.4.2': '642',
  '6.5.1': '651',
  '6.5.2': '652',
};

@Component({
  selector: 'app-purchase-order-view',
  standalone: true,
  imports: [
    FormsModule,
    ClauseLineComponent,
    AuditTrailComponent,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DialogGeserDirective,
    MatTooltipModule,
  ],
  templateUrl: './purchase-order-view.component.html',
  styleUrl: './purchase-order-view.component.scss',
})
export class PurchaseOrderViewComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  private readonly serverMessage = inject(ServerMessageService);

  isLoading = true;
  /*
   * `clauseSections` disusun sekali saat data tiba, bukan lewat getter.
   *
   * Penyusunannya menjalankan `buildXClauses(...)` yang merangkai puluhan
   * kalimat perjanjian; sebagai getter itu berulang setiap kali templat
   * membacanya, dua kali per putaran change detection.
   *
   * Dipasang lewat setter supaya penugasan `data` di mana pun tidak mungkin
   * lupa memperbarui klausulnya.
   */
  private _data: any = null;

  get data(): any {
    return this._data;
  }

  set data(nilai: any) {
    this._data = nilai;
    this.clauseSections = this.susunKlausul();
  }

  clauseSections: ClauseSection[] = [];

  /**
   * Sisa detik sebelum pernyataan "sudah membaca" dapat dicentang.
   *
   * Tiga detik bukan waktu yang cukup untuk membaca seluruh SPK — tidak ada
   * angka yang cukup untuk itu. Gunanya menahan gerak refleks: mencentang
   * dan menekan terbit dalam satu tarikan, tanpa mata pernah singgah pada
   * isinya.
   *
   * Yang benar-benar menahan adalah letaknya di dasar dokumen; jeda ini
   * hanya melengkapi.
   */
  sisaDetik = 3;

  private penghitung?: ReturnType<typeof setInterval>;

  get masihMenunggu(): boolean {
    return this.sisaDetik > 0;
  }

  /**
   * Peringatan sebelum dokumen terbit: harga melompat dan kemungkinan
   * duplikat.
   *
   * Diminta dari server, bukan disimpulkan di layar: pembandingnya adalah
   * dokumen lama yang tidak ada di sini.
   *
   * Dipasang di dialog pratinjau, bukan di keenam belas layar pembuatan —
   * satu tempat, dan yang membaca sudah selesai mengisi sehingga tidak
   * terganggu di tengah pekerjaan.
   */
  peringatan: { harga?: any; duplikat?: any } | null = null;

  private periksaSebelumTerbit(): void {
    if (!this.isPratinjau || !this.input?.konfirmasi) return;

    const d = this.data || {};
    const supplierID = Number(d.supplierID) || 0;
    if (!supplierID) return;

    // Baris bernilai tertinggi yang dipilih sebagai wakil.
    //
    // Memeriksa seluruh baris berarti satu permintaan per barang, dan
    // dokumen dengan dua puluh baris akan menunggu lama justru pada saat
    // orang hendak menerbitkan. Baris termahal yang paling berarti bila
    // angkanya keliru.
    const baris: any[] = Array.isArray(d.items) ? d.items : [];
    const wakil = baris
      .filter((x) => Number(x?.item_id) > 0 && Number(x?.price) > 0)
      .sort((a, b) => Number(b.price) - Number(a.price))[0];

    this.apiService
      .get('purchase-orders/pemeriksaan', {
        supplierID,
        projectName: d.projectName || '',
        dpp: Number(d.dpp) || 0,
        itemID: Number(wakil?.item_id) || 0,
        price: Number(wakil?.price) || 0,
        kecualiID: Number(d.id) || 0,
      })
      .subscribe({
        next: (res: any) => {
          this.peringatan =
            res?.harga || res?.duplikat
              ? { harga: res.harga, duplikat: res.duplikat }
              : null;
        },
        // Pemeriksaan ini pelengkap; kegagalannya tidak boleh menghalangi
        // orang menerbitkan dokumen yang sudah benar.
        error: () => (this.peringatan = null),
      });
  }

  private mulaiHitungMundur(): void {
    // Hanya pada pratinjau yang meminta konfirmasi; dialog yang sekadar
    // menampilkan dokumen tidak perlu menahan siapa pun.
    const menahan =
      (this.isPratinjau && !!this.input?.konfirmasi) || this.modePeriksa;
    if (!menahan) {
      this.sisaDetik = 0;
      return;
    }
    this.penghitung = setInterval(() => {
      this.sisaDetik -= 1;
      if (this.sisaDetik <= 0 && this.penghitung) {
        clearInterval(this.penghitung);
        this.penghitung = undefined;
      }
    }, 1000);
  }

  ngOnInit(): void {
    this.mulaiHitungMundur();
    this.periksaSebelumTerbit();
  }

  ngOnDestroy(): void {
    // Penghitung dihentikan saat dialog ditutup; tanpa ini ia terus berjalan
    // setelah komponennya hilang.
    if (this.penghitung) clearInterval(this.penghitung);
  }

  /**
   * Menyatakan sudah membaca; hanya berarti pada mode pratinjau.
   */
  dibaca = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public input: {
      /** Membuka PO tersimpan; datanya diambil dari server. */
      id?: number;
      /**
       * Menampilkan data yang BELUM tersimpan — dipakai sebagai pratinjau
       * pada layar pembuatan PO. Bentuknya sama dengan jawaban server.
       */
      data?: any;
      /**
       * Menampilkan pernyataan "sudah membaca" dan tombol terbitkan.
       * Dialog menutup dengan `true` bila pembuatnya melanjutkan.
       */
      konfirmasi?: boolean;
      /**
       * Membuka dokumen TERSIMPAN untuk diperiksa.
       *
       * Berbeda dari `konfirmasi`, yang berlaku pada pratinjau sebelum
       * dokumen terbit. Mode ini dipakai pemeriksa atas dokumen yang sudah
       * ada, dan dialog menutup dengan `true` bila ia menandainya sudah
       * diperiksa.
       */
      periksa?: boolean;
    },
    private dialogRef: MatDialogRef<PurchaseOrderViewComponent>,
    private router: Router,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {
    /*
     * Lebar dialog disetel dari sini, bukan dari pemanggilnya.
     *
     * Tiga puluh tiga tempat membukanya dengan `maxWidth: '96vw'`, sementara
     * isinya sendiri dibatasi 620px. Di layar 1920px dialognya melebar
     * 1843px dengan isi tetap 620px — sisanya ruang kosong, dan kepala
     * dialog terlihat menggantung jauh dari isinya.
     *
     * Ditetapkan di komponen karena yang tahu selebar apa isinya adalah
     * komponen ini, bukan layar yang memanggilnya. Memperbaikinya di tiap
     * pemanggil berarti tiga puluh tiga tempat yang harus diingat setiap
     * kali lebar isinya berubah.
     *
     * `min()` dipakai agar pada layar sempit ia tetap mengikuti lebar
     * layar, bukan memaksa 660px lalu terpotong.
     */
    this.dialogRef.updateSize('min(660px, 96vw)');

    /*
     * Data yang diberikan langsung tidak diambil ulang dari server.
     *
     * Pada pratinjau, PO-nya memang belum ada di server — mengambilnya
     * hanya menghasilkan 404, dan dialognya tertutup sendiri sebelum
     * sempat terbaca.
     */
    if (this.input?.data) {
      this.data = this.input.data;
      this.isLoading = false;
    } else {
      this.fetch();
    }
  }

  /** Mode pratinjau: dokumen belum terbit. */
  /**
   * Dokumen ini dapat dibuatkan adendum.
   *
   * Syaratnya dua: sudah disetujui, dan bukan adendum itu sendiri.
   *
   * Yang belum disetujui masih boleh disunting biasa — membuat adendum
   * atasnya berarti dua dokumen padahal yang pertama belum pernah dipegang
   * vendor.
   *
   * Adendum tidak berlapis: adendum kedua menunjuk induk yang SAMA, bukan
   * adendum pertama. Bila berlapis, nomornya menjadi `ADD1-ADD2` dan
   * urutannya tidak lagi dapat dibaca.
   */
  get bolehAdendum(): boolean {
    if (this.isPratinjau || !this.data) return false;
    if (this.data.parentPurchaseOrderID) return false;
    /*
     * Memeriksa DUA bidang, bukan satu.
     *
     * Sebagian dokumen tersimpan dengan `status: "approved"` sementara
     * `isApproved` masih `false`. Memeriksa `isApproved` saja membuat
     * tombolnya tidak pernah muncul pada dokumen yang sudah disetujui — dan
     * tidak ada galat yang menjelaskan mengapa.
     */
    return !!this.data.isApproved || this.data.status === 'approved';
  }

  /**
   * Buka formulir adendum, terisi dari dokumen ini.
   *
   * Dialog ini ditutup lebih dulu dan hasilnya diteruskan ke pemanggilnya:
   * membuka formulir di dalam dialog membuat dialog di dalam dialog, yang
   * sudah terbukti membingungkan pada pemilih klien.
   */
  buatAdendum(): void {
    /*
     * Dialognya sendiri yang menavigasi, bukan mengembalikan hasil ke
     * pemanggilnya.
     *
     * Dialog ini dibuka dari TIGA tempat: daftar purchase order, daftar
     * pembelian, dan layar lihat pembelian. Bila hasilnya diserahkan ke
     * pemanggil, ketiganya harus menangani hal yang sama — dan dua di
     * antaranya tidak, sehingga tombolnya tampak berfungsi tetapi tidak
     * melakukan apa pun.
     *
     * Alamatnya MUTLAK, bukan relatif: pemanggilnya berada di cabang rute
     * yang berbeda-beda.
     */
    const segment = ADENDUM_ROUTES[this.data?.purchaseType];
    if (!segment) {
      this.snackBar.open(
        this.translate.instant('poView.adendumJenisBelumAda'),
        this.translate.instant('common.close'),
        { duration: 4000 },
      );
      return;
    }
    this.dialogRef.close();
    this.router.navigate(['/Purchase-order', 'Create', segment], {
      queryParams: { adendumDari: this.data.id },
    });
  }

  /**
   * Dokumen ini masih draf dan karena itu dapat diubah.
   *
   * Cap DRAFT pada cetakannya sudah menyatakan bahwa ia belum mengikat;
   * membetulkannya bukan pemalsuan melainkan gunanya tahap draf.
   */
  /**
   * Nomor revisi dokumen ini.
   *
   * Ditampilkan hanya bila lebih dari nol. Angka nol pada dokumen yang
   * memang belum pernah diubah bukan keterangan — ia hanya menambah satu
   * hal untuk dibaca pada kepala yang sudah padat.
   */
  get revisi(): number {
    const n = Number((this.data as any)?.revision);
    return isNaN(n) ? 0 : n;
  }

  private readonly akun = inject(AccountService, { optional: true });
  private readonly izin = inject(PermissionService, { optional: true });

  /** Level pengguna; nol bila belum terbaca, sehingga tidak memberi apa pun. */
  private get level(): number {
    return Number(this.izin?.level?.() ?? 0) || 0;
  }

  private get buatanSendiri(): boolean {
    const saya = this.akun?.userId;
    const pembuat = (this.data as any)?.createdBy;
    return saya != null && pembuat != null && Number(saya) === Number(pembuat);
  }

  private get sudahDiperiksa(): boolean {
    return !!(this.data as any)?.isChecked;
  }

  /**
   * Dokumen ini masih dapat diubah OLEH ORANG INI.
   *
   * Sebelumnya hanya "belum disetujui" yang diperiksa, sehingga tombolnya
   * muncul bagi semua orang — lalu server menolak sesudah ditekan. Penolakan
   * sesudah ditekan terbaca sebagai kerusakan, bukan sebagai aturan.
   *
   * Aturannya sama persis dengan yang berlaku di server
   * (`boleh_mengubah_purchase_order`): pembuatnya, level 4 ke atas, atau
   * manajer selama dokumennya BELUM DIPERIKSA. Tombol yang disembunyikan
   * bukan penjagaan — penjaganya tetap di sana.
   */
  get bolehUbah(): boolean {
    if (this.isPratinjau) return false;
    const d: any = this.data ?? {};
    const disetujui =
      !!d.isApproved || String(d.status ?? '').toLowerCase() === 'approved';
    if (disetujui) return false;

    if (this.level >= 4) return true;
    if (this.buatanSendiri) return true;
    return this.level >= 3 && !this.sudahDiperiksa;
  }

  /**
   * Tombol ubah hilang KARENA dokumennya sudah diperiksa.
   *
   * Dibedakan dari tidak berwenang sama sekali: yang ini keadaan yang dapat
   * ditindaklanjuti — cabut pemeriksaannya, atau mintakan kepada level 4 —
   * dan tanpa keterangannya, tombol yang tadi ada lalu hilang terbaca
   * sebagai kerusakan.
   */
  get ubahTerhalangPemeriksaan(): boolean {
    if (this.isPratinjau || this.bolehUbah) return false;
    const d: any = this.data ?? {};
    const disetujui =
      !!d.isApproved || String(d.status ?? '').toLowerCase() === 'approved';
    return !disetujui && this.sudahDiperiksa && this.level >= 3;
  }

  /**
   * Buka formulir untuk MENGUBAH dokumen ini.
   *
   * Memakai layar pembuatan yang sama, bukan layar tersendiri: bentuk
   * formulirnya identik, dan layar kedua berarti setiap perubahan bentuk
   * harus dikerjakan dua kali — lalu salah satunya tertinggal.
   *
   * Server tetap menolak bila dokumennya ternyata sudah disetujui; tombol
   * yang disembunyikan bukan penjagaan.
   */
  bukaUbah(): void {
    const segment = ADENDUM_ROUTES[this.data?.purchaseType];
    if (!segment) {
      this.snackBar.open(
        this.translate.instant('poView.adendumJenisBelumAda'),
        this.translate.instant('common.close'),
        { duration: 4000 },
      );
      return;
    }
    this.dialogRef.close();
    this.router.navigate(['/Purchase-order', 'Create', segment], {
      queryParams: { ubah: this.data.id },
    });
  }

  get isPratinjau(): boolean {
    return !!this.input?.data;
  }

  /**
   * Dokumen ini sedang DIPERIKSA.
   *
   * Sebelumnya pemeriksaan memakai dialog tersendiri berisi PDF hasil
   * rakitan. Dua hal salah di sana sekaligus: penampil PDF-nya melaporkan
   * nol halaman sehingga syarat "gulir sampai halaman terakhir" tidak pernah
   * dapat dipenuhi — tombolnya tidak akan pernah hidup — dan yang dibaca
   * pemeriksa menjadi berkas lain daripada yang dilihat semua orang di layar
   * ini.
   *
   * Sekarang yang diperiksa TAMPILAN YANG SAMA dengan yang dibuka
   * sehari-hari. Poin perjanjiannya dirakit dari sumber yang sama dengan
   * yang dicetak (`buildClauseLines`), sehingga apa yang dibaca di sini
   * memang yang akan tertulis di kertas.
   */
  get modePeriksa(): boolean {
    return !!this.input?.periksa && !this.isPratinjau;
  }

  /**
   * Isi dialog sudah tergulir sampai bawah.
   *
   * Bawaannya BENAR dan dikoreksi setelah isinya termuat: dokumen pendek
   * tidak dapat digulir sama sekali, dan syarat yang tidak mungkin dipenuhi
   * menghalangi pemeriksaan alih-alih menjaganya.
   */
  sudahSampaiBawah = true;

  /** Sisa yang belum terbaca, dalam piksel; hanya untuk keterangan. */
  sisaGulir = 0;

  @ViewChild('isi') private wadahIsi?: ElementRef<HTMLElement>;

  /**
   * Sudah diukur sekali setelah isinya termuat.
   *
   * Pengukurannya harus terjadi SESUDAH dokumen digambar — sebelum itu
   * tingginya nol, dan setiap dokumen akan dianggap tidak dapat digulir.
   * Diukur ulang setiap kali datanya berganti.
   */
  private _diukur = false;

  ngAfterViewChecked(): void {
    if (!this.modePeriksa || this._diukur || !this.data) return;
    const el = this.wadahIsi?.nativeElement;
    if (!el || el.scrollHeight === 0) return;
    this._diukur = true;
    this.hitungGulir(el);
  }

  /**
   * Dipanggil saat isi dialog digulir, dan sekali setelah isinya termuat.
   *
   * Ambang 24 piksel: `scrollHeight` dan `clientHeight` tidak pernah persis
   * sama pada zoom peramban selain 100%, sehingga perbandingan tepat membuat
   * sebagian orang tidak pernah dianggap sampai bawah.
   */
  padaGulir(el: HTMLElement | null): void {
    if (!el) return;
    const sisa = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.sisaGulir = Math.max(0, Math.round(sisa));
    if (sisa <= 24) this.sudahSampaiBawah = true;
  }

  /** Periksa apakah isinya memang dapat digulir; dipanggil setelah termuat. */
  hitungGulir(el: HTMLElement | null): void {
    if (!el) return;
    const dapatDigulir = el.scrollHeight - el.clientHeight > 24;
    this.sudahSampaiBawah = !dapatDigulir;
    this.padaGulir(el);
  }

  /**
   * Tombol "Tandai sudah diperiksa" boleh ditekan.
   *
   * Ketiganya harus benar sekaligus: waktu tunggu habis, isinya sudah
   * tergulir sampai bawah, dan pernyataannya dicentang.
   */
  get bolehTandaiPeriksa(): boolean {
    return !this.masihMenunggu && this.sudahSampaiBawah && this.dibaca;
  }

  /**
   * Dokumen ini ADENDUM, dan isinya memuat SELISIH.
   *
   * Dibaca sendirian ia tidak menyatakan volume yang berlaku. Disebutkan
   * terang-terangan pada mode pemeriksaan: yang memeriksanya perlu membuka
   * induknya sebelum menilai angka mana pun.
   */
  get adendumSelisih(): boolean {
    const d: any = this.data ?? {};
    return this.modePeriksa && !!d.parentPurchaseOrderID;
  }

  konfirmasiPeriksa(): void {
    // Penjaga kedua: tombolnya memang sudah dinonaktifkan, tetapi keadaan
    // tombol bukan tempat menaruh aturan.
    if (!this.bolehTandaiPeriksa) return;
    this.dialogRef.close(true);
  }

  tutup(): void {
    this.dialogRef.close(false);
  }

  lanjut(): void {
    // Penjaga kedua: tombolnya memang sudah dinonaktifkan, tetapi keadaan
    // tombol bukan tempat menaruh aturan.
    if (!this.dibaca) return;
    this.dialogRef.close(true);
  }

  private fetch() {
    this.isLoading = true;
    this.apiService
      .get(`purchase-orders/${this.input.id}`, {})
      .subscribe({
        next: (res: any) => {
          this.data = res;
        },
        error: (error: any) => {
          this.snackBar.open(
            this.serverMessage.terjemahkan(error, 'purchaseOrder.viewFailed'),
            'Close',
            { duration: 3000 },
          );
          this.dialogRef.close();
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  /**
   * Nama jenis PO, mengikuti bahasa aplikasi.
   *
   * `PURCHASE_TYPE_LABELS` berisi teks Inggris dan dipakai di tempat yang
   * memang berbahasa Inggris. Di layar ini ia membuat SPK berbahasa
   * Indonesia menampilkan "Project supporting equipment and supplies".
   *
   * Kunci i18n dipakai lebih dulu; konstanta hanya menjadi cadangan bila
   * kode jenisnya belum punya terjemahan.
   */
  typeLabel(code: string): string {
    if (!code) return '—';
    const kunci = purchaseTypeKey(code);
    const teks = this.translate.instant(kunci);
    // `instant` mengembalikan kuncinya sendiri bila tidak ditemukan.
    if (teks && teks !== kunci) return teks;
    return purchaseTypeLabel(this.translate, code);
  }

  get items(): any[] {
    return this.data?.items || [];
  }

  /**
   * Nama barang bisa datang dari katalog barang, alat sewa, atau diketik.
   *
   * `name` ikut dibaca karena baris hasil PEMEKARAN mobilisasi memakai
   * bidang itu — baris tersebut disusun di layar, bukan diambil dari basis
   * data, sehingga tidak punya `item_description` maupun `equipment_name`.
   *
   * Tanpa ini, mobilisasi dan demobilisasi tampil sebagai tanda hubung pada
   * pratinjau, dan yang memeriksa dokumen tidak dapat memastikan keduanya
   * benar sebelum menandatangani.
   */
  itemName(item: any): string {
    return (
      item?.item_description ||
      item?.equipment_name ||
      item?.name ||
      item?.task ||
      item?.sku ||
      '—'
    );
  }

  /**
   * Judul baris menurut JENIS dokumennya.
   *
   * Kolom `remarks_1..6` berbeda arti tiap varian, sehingga satu pembacaan
   * bersama tidak cukup. Pada PO-A `task` kebetulan berisi tanggal kirim —
   * dan tanpa pemetaan ini daftar barangnya hanya berupa tujuh tanggal,
   * tanpa satu pun keterangan tentang dari mana ke mana.
   */
  barisJudul(item: any): string {
    return barisTampil(this.data?.purchaseType, item).judul;
  }

  /** Baris kecil di bawah judul; kosong bila tidak ada yang perlu disebut. */
  barisRincian(item: any): string[] {
    return barisTampil(this.data?.purchaseType, item).rincian;
  }

  /**
   * Nilai pekerjaan bersifat BORONGAN, bukan volume kali harga satuan.
   *
   * PO-H menyimpan nilai borongan di `customData.lumpSumPrice`, sementara
   * baris pekerjaannya tersimpan dengan harga nol — barisnya di situ hanya
   * menyatakan URAIAN pekerjaannya, bukan harganya.
   *
   * Tanpa ini, dialog menampilkan Rp 0 untuk dokumen yang di daftar tertera
   * 512.500, dan yang membacanya menyangka datanya rusak.
   */
  private get borongan(): number | null {
    const c = this.data?.customData;
    if (!c) return null;
    if (String(c.rateType || '').toLowerCase() !== 'lumpsum') return null;
    const n = Number(c.lumpSumPrice);
    return isNaN(n) ? null : n;
  }

  /**
   * Mobilisasi dan demobilisasi, yang menumpang pada kolom keterangan.
   *
   * `purchase_order_items` tidak punya kolom tersendiri untuk keduanya,
   * sehingga PO-B menyimpannya di `remarks_4` dan `remarks_5`. Keduanya
   * nilai NYATA yang ditagihkan — pada `009-SPK-NVTM-B` jumlahnya
   * Rp 3.500.000 dari total Rp 11.000.000.
   */
  mobilisasiBaris(item: any): number {
    return this.mobilisasi(item);
  }

  private mobilisasi(item: any): number {
    /*
     * HANYA pada dokumen sewa alat (tipe B).
     *
     * `remarks_4` dipakai berbeda-beda antar jenis: pada PO-B ia nilai
     * mobilisasi, sedangkan pada PO-A ia nama supir atau nomor resi.
     * Menjumlahkannya tanpa memeriksa jenisnya membuat `Number("Budi")`
     * bernilai NaN — atau, lebih buruk, nomor resi berangka ikut tertambah
     * ke dalam nilai dokumen.
     */
    if (String(this.data?.purchaseType || '').toUpperCase() !== 'B') return 0;

    /*
     * NOL bila barisnya sudah DIPEKARKAN.
     *
     * `perluasItemMobilisasi` menyisipkan mobilisasi dan demobilisasi sebagai
     * baris pekerjaan tersendiri — dan baris alatnya TETAP membawa nilainya
     * di `remarks_4` dan `remarks_5`. Menjumlahkan keduanya membuat setiap
     * mobilisasi terhitung DUA KALI: sekali menempel pada alatnya, sekali
     * sebagai barisnya sendiri.
     *
     * Gejalanya: baris alat bernilai lebih besar daripada `volume x harga`
     * satuannya, dan subtotalnya melampaui yang tertera di layar pengisian.
     *
     * Pemekaran dikenali dari adanya baris yang menyebut alat ini — bukan
     * dari penanda tersendiri, karena baris hasil pemekaran tidak menyimpan
     * apa pun yang membedakannya selain namanya.
     */
    const dipekarkan = (this.data?.items || []).some((x: any) =>
      /^(Mobilisasi|Demobilisasi)\b/.test(String(x?.name || '')),
    );
    if (dipekarkan) return 0;

    return (Number(item?.remarks_4) || 0) + (Number(item?.remarks_5) || 0);
  }

  lineTotal(item: any): number {
    // Pada dokumen borongan, seluruh nilainya melekat pada satu-satunya
    // baris — bukan dibagi rata, karena memang tidak ada rinciannya.
    const b = this.borongan;
    if (b !== null && this.items.length === 1) return b;

    /*
     * Mobilisasi IKUT dihitung.
     *
     * Tanpa itu dialog menampilkan Rp 7.500.000 untuk dokumen yang `dpp`-nya
     * tersimpan Rp 11.000.000 — dan yang membacanya menyangka salah satunya
     * rusak, padahal yang salah hanya penjumlahan di layar ini.
     */
    return (
      (Number(item?.quantity) || 0) * (Number(item?.price) || 0) +
      this.mobilisasi(item)
    );
  }

  get subTotal(): number {
    const b = this.borongan;
    if (b !== null) return b;
    return this.items.reduce((acc, x) => acc + this.lineTotal(x), 0);
  }

  /**
   * Tarif PPN dokumen ini, dalam persen. Nol berarti tidak dikenakan.
   *
   * Dibaca dari kolomnya, bukan diasumsikan sebelas persen: dokumen lama
   * tersimpan dengan tarif yang berlaku saat itu, dan memaksakan tarif hari
   * ini membuat angkanya berbeda dari lembar yang sudah ditandatangani.
   */
  get ppnPersen(): number {
    return Number(this.data?.ppn) || 0;
  }

  get ppnNilai(): number {
    return (this.subTotal * this.ppnPersen) / 100;
  }

  /** Tarif PPh, dalam persen. Nol berarti tidak dipotong. */
  get pphPersen(): number {
    return Number(this.data?.pphPercentage) || 0;
  }

  /**
   * PPh dihitung dari DPP, BUKAN dari nilai setelah PPN.
   *
   * Aturan yang sama sudah dipakai slip pembayaran; dua cara menghitung
   * untuk pajak yang sama akan menghasilkan dua angka pada dokumen yang
   * merujuk transaksi yang sama.
   */
  get pphNilai(): number {
    return (this.subTotal * this.pphPersen) / 100;
  }

  /**
   * Nilai akhir setelah PPN ditambahkan dan PPh dipotong.
   *
   * Ditampilkan hanya bila ada salah satunya — pada dokumen tanpa pajak,
   * barisnya sama dengan subtotal dan hanya menambah baris tanpa isi.
   */
  /**
   * Nilai DI LUAR dasar pajak yang tetap dibayarkan.
   *
   * Pada SPK penutupan pertanggungan (6.4.2) inilah premi yang dititipkan
   * kepada broker untuk diteruskan kepada penanggung. Ia bukan objek PPN
   * maupun PPh — karena itu tidak masuk subtotal — tetapi ia berpindah
   * tangan, dan selama ia tidak tampak di layar ini yang membacanya hanya
   * melihat ongkos pembuatan polisnya.
   */
  get nilaiLain(): number {
    return Number(this.data?.otherValue) || 0;
  }

  get totalAkhir(): number {
    return this.subTotal + this.ppnNilai - this.pphNilai + this.nilaiLain;
  }

  /**
   * Dokumen ini pengadaan BARANG atau JASA.
   *
   * Dibaca dari NOMORNYA, bukan disimpulkan ulang dari isiannya.
   *
   * Nomor dokumen memuat `PO` untuk purchase order dan `SPK` untuk surat
   * perintah kerja, dan itulah yang tercetak pada lembar yang ditandatangani
   * vendor. Menyimpulkan ulang dari `purchaseType` dan `customData` berarti
   * menyalin aturan yang sudah ada di server — dan bila kelak aturannya
   * berubah di satu tempat saja, layar akan menyebut "Barang" pada lembar
   * berjudul SURAT PERINTAH KERJA.
   *
   * Nomor adendum tetap terbaca: `013-ADD1-PO-BPBP-F` memuat `-PO-`.
   *
   * `null` bila nomornya belum terbentuk, misalnya pada pratinjau.
   */
  get jenisPengadaan(): 'barang' | 'jasa' | null {
    const nama = String(this.data?.name || '').toUpperCase();
    if (!nama) return null;
    if (nama.includes('-SPK-')) return 'jasa';
    if (nama.includes('-PO-')) return 'barang';
    return null;
  }

  get adaPajak(): boolean {
    return this.ppnPersen > 0 || this.pphPersen > 0;
  }

  /**
   * Baris nilai akhir ditampilkan.
   *
   * BUKAN hanya ketika ada pajak. SPK penutupan pertanggungan lewat broker
   * sering tanpa PPN sama sekali, sehingga syarat lama menyembunyikan baris
   * satu-satunya yang memuat preminya — dan subtotal di atasnya hanya berisi
   * imbalan jasanya.
   */
  get adaNilaiAkhir(): boolean {
    return this.adaPajak || this.nilaiLain > 0;
  }

  /**
   * Poin perjanjian dirakit ulang dari template + data PO, bukan diambil
   * dari teks tersimpan — sama seperti saat dokumen dicetak.
   */
  /**
   * Poin perjanjian, terbagi seksi.
   *
   * Sebagian jenis PO merakit klausulnya lewat pembangun tersendiri yang
   * mengembalikan seksi, bukan lewat CLAUSE_TEMPLATES — PO-A, PO-D, dan
   * 6.4.1. Ketiganya tidak terdaftar di CLAUSE_TEMPLATES, sehingga
   * buildClauseLines mengembalikan daftar kosong dan poinnya tidak pernah
   * tampil di halaman ini.
   */
  /**
   * Jenis yang menentukan bentuk ketentuannya.
   *
   * Tidak selalu sama dengan kolom `purchaseType`: PO-B dapat diterbitkan
   * sebagai tipe A ketika alatnya dipakai mengangkut, dan yang tersimpan
   * adalah 'A'. Membaca kolom itu apa adanya membuat dokumen sewa alat
   * ditampilkan dengan ketentuan jasa transportasi — isian, tabel, dan
   * ketentuannya jadi tidak saling cocok.
   *
   * PO lama yang belum menyimpan penanda dikenali dari kolom yang hanya ada
   * pada formulir sewa.
   */
  get jenisEfektif(): string {
    // Disatukan ke `helpers/klausul-dokumen.helper.ts` bersama penyusun
    // klausulnya — dipakai layar ini DAN persetujuan dari ponsel.
    return jenisEfektifDokumen(this.data);
  }

  private susunKlausul(): ClauseSection[] {
    // Disatukan ke `helpers/klausul-dokumen.helper.ts`: layar ini dan
    // persetujuan dari ponsel menyusun perjanjian yang sama, sehingga yang
    // menandatangani dari mana pun membaca dokumen yang sama.
    return susunKlausulDokumen(this.data);
  }

  /**
   * Jenis dokumen yang benar-benar akan terbit, dalam kalimat penuh.
   *
   * Menyebut BENTUKNYA (Purchase Order / Surat Perintah Kerja) dan ISINYA
   * (jenis material atau jasa) sekaligus — keduanya diputuskan pada kartu
   * pilihan yang bedanya hanya warna latar tipis, dan salah klik di sana
   * tidak menghasilkan galat apa pun.
   *
   * Diambil dari `customData`, bukan dari isian layar: yang perlu
   * ditegaskan adalah apa yang AKAN TERSIMPAN, bukan apa yang tampak.
   */
  get jenisDokumenTegas(): string {
    const c = this.data?.customData || {};
    const jenis = String(c.materialType || '');

    const nama: Record<string, string> = {
      beton: 'Beton (ready mix)',
      besi: 'Besi',
      lain: 'Material lain',
      ujitekan: 'Uji tekan silinder beton',
      ujibesi: 'Uji tarik & tekuk besi',
      ujitanah: 'Uji tanah',
    };

    const uji = ['ujitekan', 'ujibesi', 'ujitanah'].includes(jenis);
    const bentuk = uji ? 'SURAT PERINTAH KERJA' : 'PURCHASE ORDER';

    // Jenis yang tidak dikenali tidak dikarang: lebih baik menyebut
    // bentuknya saja daripada menampilkan nama yang salah.
    return nama[jenis] ? `${bentuk} — ${nama[jenis]}` : bentuk;
  }

  isSubList(x: string | string[]): boolean {
    return Array.isArray(x);
  }
  asList(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }
  asText(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  get clauses(): (string | string[])[] {
    if (!this.data) return [];
    const custom = this.data.customData || {};
    return buildClauseLines(
      // Bukan kolom `purchaseType`: lihat keterangan pada `jenisEfektif`.
      this.jenisEfektif,
      {
        /*
         * Seluruh `customData` diteruskan, bukan daftar bidang pilihan.
         *
         * Sebelumnya hanya empat belas bidang yang disebut satu per satu,
         * sementara penyusun klausul membaca lebih dari seratus. Akibatnya
         * pratinjau menampilkan klausul yang berbeda dari dokumen yang
         * dicetak — pada PO-F, `materialType` tidak ikut, sehingga jasa
         * pengujian tampil sebagai pengadaan barang biasa.
         *
         * Daftar pilihan seperti itu harus diperbarui setiap kali ada varian
         * baru, dan bila terlupa tidak ada galat yang muncul: klausulnya
         * hanya diam-diam berbeda.
         */
        ...custom,
        // Beberapa nilai punya cadangan di kolom utama bila `customData`
        // belum memuatnya — dokumen lama tidak selalu menyimpan keduanya.
        paymentTerm: custom.paymentTerm ?? this.data.payment_term,
        paymentTermText: custom.paymentTerm ?? this.data.payment_term,
        projectName: custom.projectName ?? this.data.projectName,
      },
      this.data.templateVersion,
      custom.additionalClauses || [],
    );
  }

}
