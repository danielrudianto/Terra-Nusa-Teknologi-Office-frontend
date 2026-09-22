import { Component, computed, effect, HostListener, inject, OnDestroy, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LencanaService } from '../../services/lencana.service';
import { JudulTabStrategy } from '../../services/judul-tab.strategy';
import { aksiDari, cariKotakPencarian, cariTombolBaru } from '../../services/pintasan';
import { PintasanDialogComponent } from '../../components/pintasan-dialog/pintasan-dialog.component';
import { CariGlobalComponent } from '../../components/cari-global/cari-global.component';
import { PermissionService } from '../../services/permission.service';
import { SideNavComponent } from '../../components/side-nav/side-nav.component';
import { PanduanPanelComponent } from '../../components/panduan/panduan-panel/panduan-panel.component';
import { PanduanFabComponent } from '../../components/panduan/panduan-fab/panduan-fab.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TopNavigationComponent } from '../../components/top-navigation/top-navigation.component';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { VersiService } from 'src/app/services/versi.service';
import { MatIconModule } from '@angular/material/icon';
import { TransisiHalamanDirective } from '../../animations/transisi-halaman.directive';
import { SettingsService } from '../../services/setting.service';
import {
  kunciTransisi,
  SimpulRute,
} from '../../animations/transisi-rute';

@Component({
  selector: 'app-main',
  imports: [
    MatSidenavModule,
    TopNavigationComponent,
    SideNavComponent,
    RouterModule,
    PanduanPanelComponent,
    PanduanFabComponent,
    MatIconModule,
    TransisiHalamanDirective,
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  /*
   * TIDAK ada `animations: [...]`.
   *
   * Pemicu animasi Angular pada pembungkus outlet adalah INDUK komponen
   * halaman, dan mesin animasinya menunda pembuangan simpul anak selama
   * animasi induknya berjalan. Itulah dua halaman yang terlihat bertumpuk —
   * dan, karena komponennya tidak pernah dihancurkan, itu pula yang membuat
   * aplikasinya makin lambat setiap perpindahan.
   */
})
export class MainComponent implements OnDestroy {
  readonly versi = inject(VersiService);

  private readonly dialog = inject(MatDialog);
  private readonly lencana = inject(LencanaService);
  private readonly judulTab = inject(JudulTabStrategy);

  /*
   * Jumlah yang menunggu persetujuan ikut tampil di judul tab. Dikirim
   * dari sini — kerangka yang hanya ada saat sudah masuk — lihat
   * JudulTabStrategy tentang alasannya.
   */
  private readonly _judulMenunggu = effect(() => {
    const n = Object.values(this.lencana.semua()).reduce<number>(
      (a, x) => a + (typeof x === 'number' && x > 0 ? x : 0),
      0,
    );
    this.judulTab.setMenunggu(n);
  });

  ngOnDestroy(): void {
    this.judulTab.setMenunggu(0);
  }

  /** Pencarian global — Ctrl+K atau tombol "Cari…" di kepala halaman. */
  bukaCari(): void {
    const menu = this.sideNavItems().flatMap((g: any) =>
      (g.children || []).map((c: any) => ({ ...c, grup: g.name })),
    );
    this.dialog.open(CariGlobalComponent, {
      data: { menu },
      panelClass: 'akn-cari-global',
      position: { top: '12vh' },
      autoFocus: false,
      maxWidth: '94vw',
    });
  }

  /** Pintasan papan ketik — logikanya di `services/pintasan.ts`. */
  @HostListener('document:keydown', ['$event'])
  pintasan(ev: KeyboardEvent): void {
    // Ctrl+K / ⌘K berlaku DI MANA PUN, termasuk sambil mengetik di kotak
    // lain — itu memang gunanya — kecuali ada dialog terbuka.
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      if (!this.dialog.openDialogs.length) this.bukaCari();
      return;
    }
    const aksi = aksiDari(ev, this.dialog.openDialogs.length > 0);
    if (!aksi) return;
    if (aksi === 'bantuan') {
      ev.preventDefault();
      this.dialog.open(PintasanDialogComponent);
      return;
    }
    const isi = document.querySelector('.mat-drawer-content') ?? document;
    if (aksi === 'cari') {
      const kotak = cariKotakPencarian(isi);
      if (!kotak) return;
      ev.preventDefault();
      kotak.focus();
      kotak.select();
      return;
    }
    const tombol = cariTombolBaru(isi);
    if (!tombol) return;
    ev.preventDefault();
    tombol.click();
  }

  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  /**
   * Level akses pengguna.
   *
   * Dibaca dari `permissionService.level()` — SIGNAL yang diisi dari
   * `permissions/me` di server, sama seperti izin menu lainnya. Bukan dari
   * `localStorage` user: object itu bisa tertinggal versi lama (mis. login
   * dari sebelum field `authenticationLevel` ikut disimpan) sehingga level
   * terbaca 1 dan menu pemilik lenyap tanpa sebab. Karena signal, `computed`
   * `sideNavItems` ikut menghitung ulang begitu level dari server tiba.
   */
  private get level(): number {
    return this.permissionService.level();
  }

  /*
   * Ambang layar sempit.
   *
   * Di bawah ini, sidenav MENUTUPI isi halaman, bukan mendorongnya. Dengan
   * `mode="side"` yang tetap, sidenav memakan 250px dan padding halaman
   * 64px — pada ponsel 390px hanya tersisa 76px untuk seluruh isi.
   *
   * 900px dipilih karena di bawah itu tabel-tabel mulai perlu ruang penuh;
   * di atasnya sidenav yang selalu terbuka justru membantu.
   */
  private readonly AMBANG_SEMPIT = 900;

  /** `over` menutupi isi; `side` mendorongnya. */
  modeSidenav: 'side' | 'over' = 'side';

  isSidenavigationOpened: boolean = true;
  label: string = '';

  /*
   * Kunci yang menyalakan transisi halaman.
   *
   * Nilainya sendiri tidak berarti apa-apa — yang berarti adalah ia BERUBAH.
   * Dipakai URL-nya, bukan `routeConfig.path`: beberapa rute di aplikasi ini
   * ber-`path: ''`, jadi berpindah di antara keduanya menghasilkan kunci yang
   * sama dan animasinya diam-diam tidak pernah jalan.
   */
  readonly kunciRute = signal('');

  /*
   * Durasi dibaca SEKALI saat komponennya dibuat.
   *
   * Yang menyalakan "kurangi gerak" di tengah sesi jarang terjadi, dan
   * memasang pendengar `matchMedia` untuk itu berarti satu langganan lagi
   * yang harus dibersihkan demi hal yang praktis tidak pernah berubah.
   */
  /**
   * Parameter transisi yang berlaku di peramban ini.
   *
   * Saat "kurangi gerak" menyala di sistem operasi, yang dibuang GERAKANNYA —
   * perpindahan dan penskalaan menjadi nol — sementara pudar-menyalanya tetap
   * ada. Sebelumnya durasinya disetel 0, dan akibatnya tidak dapat dibedakan
   * dari animasi yang rusak: halamannya berganti begitu saja, tanpa apa pun
   * yang menjelaskan kenapa.
   */
  private readonly settings = inject(SettingsService);

  /** Parameter transisi yang BERLAKU; berubah seketika saat Pengaturan diubah. */
  readonly setelan = computed(() => this.settings.transisiParams());

  @HostListener('window:resize')
  sesuaikanLayar(): void {
    const sempit = window.innerWidth < this.AMBANG_SEMPIT;
    const modeBaru = sempit ? 'over' : 'side';
    if (modeBaru === this.modeSidenav) return;

    this.modeSidenav = modeBaru;
    // Saat menyempit sidenav ditutup; saat melebar dibuka kembali.
    this.isSidenavigationOpened = !sempit;
    this.tandaiSidenav();
  }

  /**
   * Tutup sidenav setelah menu dipilih — hanya pada mode menutupi.
   *
   * Tanpa ini, di ponsel halaman tujuan tertutup sidenav yang masih
   * terbuka, dan penggunanya harus menutupnya sendiri tiap kali berpindah.
   */
  tutupBilaMenutupi(): void {
    if (this.modeSidenav === 'over') {
      this.isSidenavigationOpened = false;
      this.tandaiSidenav();
    }
  }

  /**
   * Buka/tutup side navigation.
   *
   * Keadaannya ditulis sebagai atribut di <html> — sama polanya dengan
   * `data-theme` dan `data-density` — supaya stylesheet lain bisa
   * menyesuaikan diri. Panel panduan memakainya agar saat diperbesar
   * tepinya berhenti persis di sisi sidenav, dan memenuhi layar saat
   * sidenav ditutup.
   */
  ubahSidenav(): void {
    this.isSidenavigationOpened = !this.isSidenavigationOpened;
    this.tandaiSidenav();
  }

  /** Dipanggil saat sidenav ditutup lewat latar gelap, bukan lewat tombol. */
  tandaiTertutup(): void {
    this.isSidenavigationOpened = false;
    this.tandaiSidenav();
  }

  private tandaiSidenav(): void {
    document.documentElement.setAttribute(
      'data-sidenav',
      this.isSidenavigationOpened ? 'open' : 'closed',
    );
  }

  /**
   * Kunci transisi kerangka utama, dipotong di batas layout bersarang.
   *
   * Data Master memasang transisinya SENDIRI pada outlet di dalamnya. Tanpa
   * pemotongan ini, berpindah dari Pemasok ke Karyawan menyalakan keduanya —
   * dua animasi berlapis pada isi yang sama, yang terbaca sebagai dua halaman
   * yang dibalik berurutan.
   *
   * Aturannya di `animations/transisi-rute.ts`, bersama alasannya; ditaruh di
   * sana supaya dapat diuji tanpa membangun seluruh kerangka ini.
   */
  private hitungKunciTransisi(): string {
    return kunciTransisi(
      this.route.root as unknown as SimpulRute,
      this.router.url,
    );
  }

  ngOnInit(): void {
    this.versi.mulai();
    // Mode sidenav ditetapkan sebelum penanda dipasang, agar keadaan awal
    // pada ponsel sudah tertutup — bukan terbuka lalu menutup sendiri.
    this.sesuaikanLayar();
    this.tandaiSidenav();

    /*
     * Izin dimuat sekali di sini, terpisah dari langganan di bawah.
     *
     * Pada pemuatan ulang halaman, navigasi pertama sudah SELESAI sebelum
     * komponen ini sempat berlangganan `router.events`. Karena itu bukan
     * aliran yang mengulang kejadian lamanya, `NavigationEnd` pertama tidak
     * pernah diterima — dan izin tidak pernah diminta sama sekali.
     *
     * Gejalanya persis seperti izin ditolak: menu kosong. Bedanya, di tab
     * jaringan tidak ada permintaan apa pun ke `permissions/me`, sehingga
     * penyebabnya mudah tertukar dengan masalah token.
     */
    this.permissionService.load();

    /*
     * KUNCI RUTE dan LANGGANANNYA dipasang SEBELUM apa pun yang dapat
     * melempar.
     *
     * Barisnya dulu berbunyi `this.route.snapshot.firstChild!.data['title']`.
     * Tanda `!` itu janji kepada pemeriksa tipe, bukan jaminan saat berjalan:
     * bila `firstChild` ternyata `null` — rute yang belum selesai dialihkan,
     * atau anak yang belum teraktifkan saat komponen ini dibuat — barisnya
     * melempar `TypeError`, dan `ngOnInit` BERHENTI DI SITU.
     *
     * Akibatnya langganan `router.events` di bawahnya tidak pernah terpasang.
     * `kunciRute` lalu membeku pada nilai awalnya untuk seluruh sesi, pemicu
     * `* => *` tidak pernah melihat nilai yang berbeda, dan transisi
     * halamannya TIDAK PERNAH jalan lagi sesudah pemuatan pertama — persis
     * gejala "kok ganti halaman tidak ada transisinya".
     *
     * Satu galat di konsol saat halaman dibuka, lalu senyap. Judul halaman
     * pun ikut berhenti diperbarui, tetapi itu jauh lebih mudah dikira
     * kesengajaan daripada dikenali sebagai akibat.
     *
     * Karena itu urutannya dibalik: yang menyalakan transisi dipasang lebih
     * dulu, dan pembacaan judulnya dibuat tidak mungkin melempar.
     */
    this.kunciRute.set(this.hitungKunciTransisi());
    this.label = this.route.snapshot.firstChild?.data?.['title'] ?? this.label;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          /*
           * Izin dipastikan termuat pada tiap perpindahan halaman.
           *
           * `load()` mengabaikan panggilan berikutnya bila sudah berhasil,
           * sehingga ini tidak menembak server berulang — tetapi bila
           * pemuatan sebelumnya gagal (mis. token kedaluwarsa setelah lama
           * menganggur), perpindahan halaman berikutnya menjadi kesempatan
           * untuk mencobanya lagi tanpa perlu memuat ulang halaman.
           */
          this.permissionService.load();

          // Get the activated route
          let child = this.route.firstChild;
          while (child) {
            if (child.firstChild) {
              child = child.firstChild;
            } else {
              return child;
            }
          }
          return child || this.route;
        }),
      )
      .subscribe((route: ActivatedRoute) => {
        /*
         * Kunci transisi disetel LEBIH DULU, dan judulnya dibaca dengan
         * pengaman.
         *
         * Alasan yang sama seperti di atas: `route.snapshot.data['title']`
         * pada rute tanpa `title` menghasilkan `undefined` — itu tidak apa —
         * tetapi `snapshot` yang tidak ada akan melempar, dan pelemparan di
         * dalam `subscribe` MEMATIKAN LANGGANANNYA. Sesudah itu tidak ada
         * satu pun perpindahan halaman yang menyalakan transisi lagi, dan
         * tidak ada apa pun di layar yang menunjukkannya.
         */
        this.kunciRute.set(this.hitungKunciTransisi());
        this.label = route?.snapshot?.data?.['title'] ?? '';
      });
  }

  /*
   * URUTAN MENU MENGIKUTI ALIRAN UANG, bukan urutan modul dibangun.
   *
   * Susunan sebelumnya menyisakan tiga nama kelompok yang tidak menyebut
   * isinya: "Menu" (tidak berarti apa pun — semuanya menu), "Implementasi"
   * (tidak ada yang tahu apa yang ada di dalamnya tanpa membukanya), dan
   * "Administrator" (yang justru memuat dua laporan keuangan). Nama yang
   * tidak menyebut isinya memaksa setiap orang membuka semua kelompok untuk
   * menemukan satu halaman — dan itu dilakukan setiap hari.
   *
   * Satu lagi yang diperbaiki: PEMBELIAN dulu terpecah di dua kelompok.
   * Draf Pembelian dan Purchase Order di "Menu", faktur Pembelian di
   * "Implementasi" — tiga tahap dari satu pekerjaan yang sama, di dua tempat
   * yang berjauhan. Sekarang ketiganya berurutan di satu kelompok.
   *
   * Kelompoknya sekarang menyebut PEKERJAANNYA:
   *   1. Penjualan     - uang masuk, dari tender sampai tertagih
   *   2. Pengadaan     - uang keluar untuk pekerjaan, dari draf sampai faktur
   *   3. Kas & Bank    - pergerakan uangnya sendiri
   *   4. Beban & Gaji  - biaya yang bukan pengadaan proyek
   *   5. Laporan       - angka jadi (dulu terselip di "Administrator")
   *   6. Master        - data yang jarang berubah
   *   7. HRD
   *   8. Administrasi  - pajak dan pengguna
   *   9. Umum          - HARUS TERAKHIR; `bottomGroup` mengambil yang paling
   *                     bawah dan menempelkannya di kaki menu.
   */
  private readonly allSideNavItems = [
    {
      /*
       * PENJUALAN — urut sesuai jalannya pekerjaan, bukan sesuai abjad:
       * tender dimenangkan, progresnya disertifikasi (CoP), difakturkan,
       * lalu uangnya masuk. Dibaca dari atas ke bawah, urutan ini
       * menceritakan satu siklus utuh.
       */
      name: 'nav.penjualan',
      children: [
        {
          // `price.svg`: tender pada dasarnya membandingkan harga; tidak ada
          // ikon yang lebih tepat di antara yang tersedia.
          name: 'nav.tender',
          icon: 'price.svg',
          route: '/Tender',
        },
        {
          // Lambang DOKUMEN bercentang, bukan keranjang belanja.
          //
          // Keranjang dipinjam dari faktur pembelian saat menu ini baru
          // ditambahkan. CoP bukan pembelian: ia berita acara yang dibaca,
          // diperiksa, dan ditandatangani — dan lambang keranjang membuatnya
          // dicari di kelompok pembelian oleh yang membuka menu.
          name: 'nav.certificateOfPayment',
          icon: 'certificate-of-payment.svg',
          route: '/Certificate-of-payment',
        },
        {
          name: 'nav.salesInvoice',
          icon: 'sales-invoice.svg',
          route: '/Sales-invoice',
        },
        {
          name: 'nav.income',
          icon: 'income.svg',
          route: '/Income',
        },
      ],
    },
    {
      /*
       * PENGADAAN — ketiga tahap satu pekerjaan, berurutan dan berdekatan:
       * draf disusun, SPK/PO terbit, fakturnya masuk.
       */
      name: 'nav.pengadaan',
      children: [
        {
          name: 'nav.purchaseDraft',
          icon: 'purchase-invoice.svg',
          route: '/Purchase-draft',
        },
        {
          name: 'nav.purchaseOrder',
          icon: 'purchase-order.svg',
          route: '/Purchase-order',
        },
        {
          name: 'nav.purchase',
          icon: 'purchase-invoice.svg',
          route: '/Purchase',
        },
      ],
    },
    {
      /* KAS & BANK — pergerakan uangnya sendiri: yang direncanakan
         (kalender), tempatnya (bank), dan yang benar-benar dibayarkan. */
      name: 'nav.kasBank',
      children: [
        {
          name: 'nav.calendar',
          icon: 'calendar.svg',
          route: '/Calendar',
        },
        {
          name: 'nav.bank',
          // Gedung bank, bukan kartu: kartu tetap milik Pembayaran, dan dua
          // menu bersebelahan dengan ikon yang sama harus dibaca labelnya.
          icon: 'bank.svg',
          route: '/Bank',
        },
        {
          name: 'nav.payment',
          icon: 'payment-method.svg',
          route: '/Payment',
        },
        {
          name: 'nav.interPayment',
          icon: 'transfer.svg',
          route: '/Interpayment',
        },
        {
          name: 'nav.loans',
          icon: 'loan.svg',
          route: '/Loans',
        },
      ],
    },
    {
      /* BEBAN & GAJI — biaya yang BUKAN pengadaan proyek. Dipisahkan dari
         Pengadaan justru karena perbedaan itulah yang memisahkan HPP dari
         beban usaha di laba rugi. */
      name: 'nav.bebanGaji',
      children: [
        {
          name: 'nav.expense',
          icon: 'expense.svg',
          route: '/Expense',
        },
        {
          name: 'nav.reimbursement',
          icon: 'reimbursement.svg',
          route: '/Reimbursement',
        },
        {
          name: 'nav.salarySlip',
          icon: 'salary-slip.svg',
          route: '/Salary-slip',
        },
      ],
    },
    {
      /*
       * LAPORAN — kelompok tersendiri.
       *
       * Keduanya dulu di "Administrator", di antara Pinjaman, Perpajakan,
       * dan Pengguna. Laporan keuangan bukan pekerjaan administrasi, dan
       * menaruhnya di sana membuat halaman yang paling sering dicari
       * pemilik justru paling sulit ditemukan.
       */
      name: 'nav.laporan',
      children: [
        {
          /*
           * SATU pintu untuk seluruh status keuangan.
           *
           * Dulu tiga entri terpisah — Posisi Keuangan, KPI, dan Laba Rugi —
           * dan ketiganya menjawab pertanyaan yang sama dari sudut berbeda.
           * Tiga entri membuat yang membuka menu harus memutuskan lebih dulu
           * laporan mana yang memuat angka yang ia cari, padahal justru itu
           * yang ingin ia ketahui.
           *
           * KPI kini dua panel di dalam halaman ini; laba rugi jadi kartu
           * tautan di dalamnya, yang hanya muncul untuk level 5 — sama
           * dengan `minLevel` yang dulu dipasang di sini.
           *
           * Tidak ber-`minLevel`: penyaringnya membaca `data.permission`
           * dari konfigurasi rute (`finance_status:read`), sehingga ambang
           * levelnya hanya disebut sekali — di matriks izin server.
           */
          name: 'nav.statusKeuangan',
          icon: 'income.svg',
          route: '/Laporan/Status-keuangan',
        },
      ],
    },
    {
      name: 'nav.master',
      children: [
        {
          /*
           * Satu pintu ke proyek. "Laporan Proyek" DULU entri menu terpisah
           * di sebelah ini, dan keduanya kerap tertukar karena namanya mirip.
           * Sekarang laporannya sakelar di dalam halaman Proyek (?mode=laporan),
           * jadi cukup satu entri.
           */
          name: 'nav.project',
          icon: 'company.svg',
          route: '/Project',
        },
        {
          name: 'nav.masterData',
          icon: 'package.svg',
          route: '/Master',
        },
        {
          name: 'nav.asset',
          icon: 'asset.svg',
          route: '/Asset',
        },
      ],
    },
    {
      /*
       * HRD berdiri sebagai grup tersendiri, bukan kartu di Data Master.
       *
       * Modulnya hanya terbuka bagi divisi HRD dan pemilik, dan isinya akan
       * bertambah — penilaian jawaban dan rekap hasil menyusul. Tiga entri
       * berserakan di antara Pemasok dan Klien lebih sulit ditemukan
       * daripada satu grup yang jelas namanya.
       *
       * Bagi yang tidak berhak, seluruh grup ini tidak tergambar sama
       * sekali: `izinRute` membaca izin dari konfigurasi rutenya.
       */
      name: 'nav.hrd',
      children: [
        {
          name: 'nav.hrCandidate',
          icon: 'user.svg',
          route: '/HrCandidate',
        },
        {
          // `type.svg`, bukan `document.svg`.
          //
          // Ikon menu samping diambil dari `assets/vector/`, sedangkan
          // `document.svg` hanya ada di `assets/images/` — menunjuk berkas
          // yang tidak ada di sana menghasilkan ikon kosong tanpa galat
          // apa pun.
          name: 'nav.hrQuestion',
          icon: 'type.svg',
          route: '/HrQuestion',
        },
      ],
    },
    {
      /* ADMINISTRASI — yang memang pekerjaan administrasi. */
      name: 'nav.administrasi',
      children: [
        {
          name: 'nav.taxing',
          icon: 'tax.svg',
          route: '/Taxing',
        },
        {
          name: 'nav.user',
          icon: 'user.svg',
          route: '/User',
        },
      ],
    },
    {
      /*
       * UMUM HARUS TETAP PALING BAWAH.
       *
       * `bottomGroup` di side-nav memilih kelompok TERAKHIR dan
       * menempelkannya di kaki menu. Menyelipkan kelompok baru sesudah ini
       * memindahkan kelompok itu ke kaki menu, dan "Keluar" naik ke tengah
       * daftar — tanpa galat apa pun.
       */
      name: 'nav.general',
      children: [
        {
          name: 'nav.settings',
          icon: 'setting.svg',
          route: '/Settings',
        },
        {
          name: 'nav.activity',
          icon: 'activity.svg',
          route: '/Activity',
        },
        {
          name: 'nav.logout',
          icon: 'logout.svg',
          click: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            // `user` ikut dihapus.
            //
            // Kunci itu disimpan saat masuk dan dibaca AuthService; tanpa
            // menghapusnya, keluar lewat sidenav meninggalkan nama dan surel
            // pengguna sebelumnya di peramban — sementara keluar lewat menu
            // akun di atas sudah membersihkannya.
            localStorage.removeItem('user');

            this.router.navigate(['/Login']);
          },
          routerLinkOptions: {
            exact: true,
          },
        },
      ],
    },
  ];

  /**
   * Menu yang boleh dilihat pengguna.
   *
   * Izin tiap butir dibaca dari definisi rutenya sendiri (`data.permission`),
   * bukan ditulis ulang di sini. Menuliskannya dua kali berarti suatu saat
   * menu dan rute tidak lagi sepakat — dan yang tampak akan menyesatkan.
   *
   * Butir tanpa izin pada rutenya dianggap terbuka, sehingga menu yang belum
   * sempat dipetakan tidak hilang diam-diam.
   */
  /*
   * Dihitung sebagai signal, bukan getter biasa.
   *
   * Getter menghasilkan array dan objek BARU pada setiap siklus deteksi
   * perubahan. Karena nilainya terikat ke @Input, Angular menganggap
   * masukannya berubah terus, merender ulang, lalu memicu siklus berikutnya —
   * layar berputar tanpa henti. `computed` menyimpan hasilnya dan hanya
   * menghitung ulang ketika peta izin benar-benar berubah.
   */
  readonly sideNavItems = computed(() => {
    const izinRute = (route: string): string | undefined => {
      const path = String(route || '').replace(/^\//, '');
      const cari = (routes: any[]): any => {
        for (const r of routes || []) {
          if (r.path === path) return r;
          const dalam = r.children && cari(r.children);
          if (dalam) return dalam;
        }
        return null;
      };
      return cari(this.router.config)?.data?.permission;
    };

    const boleh = (aturan?: string) => {
      if (!aturan) return true;
      const [modul, aksi] = aturan.split(':');
      return this.permissionService.can(modul, (aksi || 'read').trim());
    };

    return (
      this.allSideNavItems
        .map((grup: any) => ({
          ...grup,
          children: (grup.children || []).filter(
            (butir: any) =>
              boleh(izinRute(butir.route)) &&
              // Butir ber-`minLevel` hanya untuk level itu ke atas (mis. laba
              // rugi: hanya pemilik usaha level 5).
              (!butir.minLevel || this.level >= butir.minLevel),
          ),
        }))
        // Kelompok yang seluruh isinya tersembunyi ikut dibuang agar tidak
        // menyisakan judul kelompok tanpa isi.
        .filter((grup: any) => (grup.children || []).length > 0)
    );
  });
}
