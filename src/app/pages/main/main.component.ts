import { Component, computed, HostListener, inject } from '@angular/core';
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
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
})
export class MainComponent {
  readonly versi = inject(VersiService);

  constructor(
    private permissionService: PermissionService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

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

    this.label = this.route.snapshot.firstChild!.data['title'];
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
        this.label = route.snapshot.data['title'];
      });
  }

  private readonly allSideNavItems = [
    {
      name: 'nav.menu',
      children: [
        {
          /*
           * Tender ditaruh SEBELUM draf pembelian.
           *
           * Urutan menu mengikuti urutan pekerjaannya: mencari pemasok lebih
           * dulu, baru mencatat pembeliannya.
           *
           * `price.svg` dipakai karena tender pada dasarnya membandingkan
           * harga; tidak ada ikon yang lebih tepat di antara yang tersedia.
           */
          name: 'nav.tender',
          icon: 'price.svg',
          route: '/Tender',
        },
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
          /*
           * Certificate of Payment ditaruh SESUDAH purchase order.
           *
           * Urutan menu mengikuti urutan pekerjaannya: SPK terbit lebih
           * dulu, progresnya disertifikasi sesudahnya.
           */
          name: 'nav.certificateOfPayment',
          // Lambang DOKUMEN bercentang, bukan keranjang belanja.
          //
          // Keranjang dipinjam dari faktur pembelian saat menu ini baru
          // ditambahkan. CoP bukan pembelian: ia berita acara yang dibaca,
          // diperiksa, dan ditandatangani — dan lambang keranjang membuatnya
          // dicari di kelompok pembelian oleh yang membuka menu.
          icon: 'certificate-of-payment.svg',
          route: '/Certificate-of-payment',
        },
        {
          name: 'nav.income',
          icon: 'income.svg',
          route: '/Income',
        },
        {
          name: 'nav.salesInvoice',
          icon: 'sales-invoice.svg',
          route: '/Sales-invoice',
        },
        {
          name: 'nav.interPayment',
          icon: 'transfer.svg',
          route: '/Interpayment',
        },
        {
          name: 'nav.salarySlip',
          icon: 'salary-slip.svg',
          route: '/Salary-slip',
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
      name: 'nav.administrator',
      children: [
        {
          name: 'nav.loans',
          icon: 'loan.svg',
          route: '/Loans',
        },
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
      name: 'nav.implementations',
      children: [
        {
          name: 'nav.bank',
          icon: 'payment-method.svg',
          route: '/Bank',
        },
        {
          name: 'nav.calendar',
          icon: 'calendar.svg',
          route: '/Calendar',
        },
        {
          name: 'nav.payment',
          icon: 'payment-method.svg',
          route: '/Payment',
        },
        {
          name: 'nav.purchase',
          icon: 'purchase-invoice.svg',
          route: '/Purchase',
        },
        {
          name: 'nav.reimbursement',
          icon: 'reimbursement.svg',
          route: '/Reimbursement',
        },
        {
          name: 'nav.expense',
          icon: 'expense.svg',
          route: '/Expense',
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
          children: (grup.children || []).filter((butir: any) =>
            boleh(izinRute(butir.route)),
          ),
        }))
        // Kelompok yang seluruh isinya tersembunyi ikut dibuang agar tidak
        // menyisakan judul kelompok tanpa isi.
        .filter((grup: any) => (grup.children || []).length > 0)
    );
  });
}
