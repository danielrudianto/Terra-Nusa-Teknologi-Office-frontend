/**
 * Rute aplikasi mobile — `m.terrabot.alphakonstruksi.id`.
 *
 * SATU REPO, DUA SASARAN BUILD
 *
 * Berkas ini hidup di dalam aplikasi yang sama, bukan di proyek tersendiri.
 * Yang dipakainya juga sama: `ApiService`, interceptor autentikasi,
 * `PermissionService`, terjemahan, dan — untuk laporan proyek — komponen
 * yang sama persis dengan yang dipakai layar desktop.
 *
 * Aplikasi kedua yang berdiri sendiri berarti aturan persetujuan, batas
 * level, dan logika pemeriksaan ditulis ULANG di tempat kedua. Cepat atau
 * lambat salah satunya diubah sendirian, dan bedanya tidak akan ketahuan
 * sampai ada dokumen yang disetujui dari ponsel padahal di desktop ditolak.
 *
 * YANG ADA DI SINI HANYA EMPAT
 *
 * Menyetujui purchase order, menyetujui reimbursement, menghapus pembelian,
 * dan membaca laporan proyek. Bukan versi kecil dari seluruh aplikasi:
 * layar yang jarang dipakai di ponsel hanya menambah tempat untuk salah
 * tekan pada jari yang sedang berjalan.
 */

import { Routes } from '@angular/router';

import { authGuard } from '../guards/auth.guard';
import { levelGuard } from './penjaga-level';

export const MOBILE_ROUTES: Routes = [
  {
    // Masuk versi mobile — tampilan senada dengan aplikasi, bukan login
    // desktop yang kartunya besar. Alur masuknya sama persis.
    path: 'Login',
    loadComponent: () =>
      import('./masuk/masuk.component').then((m) => m.MasukComponent),
  },
  {
    path: '',
    /*
     * Dua penjaga, dan urutannya berarti.
     *
     * `authGuard` lebih dulu: yang belum masuk diarahkan ke halaman masuk,
     * bukan diberi tahu bahwa levelnya kurang. `levelGuard` sesudahnya,
     * sebab level baru dapat diketahui setelah izinnya termuat.
     */
    canActivate: [authGuard, levelGuard],
    loadComponent: () =>
      import('./kerangka/kerangka.component').then((m) => m.KerangkaComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./beranda/beranda.component').then((m) => m.BerandaComponent),
        pathMatch: 'full',
      },
      {
        /*
         * Purchase Order — SATU tab, memeriksa DAN menyetujui, dipilih lewat
         * sakelar di dalamnya menurut wewenang. `?mode=periksa|setujui` dan
         * `?open=<id>` (deep link dari notifikasi) dibaca komponennya.
         */
        path: 'Purchase-order',
        loadComponent: () =>
          import('./purchase-order/purchase-order.component').then(
            (m) => m.PurchaseOrderComponent,
          ),
      },
      // Rute lama diarahkan ke tab gabungan supaya tautan/notifikasi lama
      // tetap sampai.
      { path: 'Persetujuan', redirectTo: 'Purchase-order', pathMatch: 'full' },
      { path: 'Pemeriksaan', redirectTo: 'Purchase-order', pathMatch: 'full' },
      {
        path: 'Reimbursement',
        loadComponent: () =>
          import('./persetujuan-reimbursement/persetujuan-reimbursement.component').then(
            (m) => m.PersetujuanReimbursementComponent,
          ),
      },
      {
        path: 'Pengaturan',
        loadComponent: () =>
          import('./pengaturan/pengaturan.component').then(
            (m) => m.PengaturanComponent,
          ),
      },
      {
        // Disembunyikan dari navigasi (tidak mendesak), tetapi rutenya tetap
        // ada agar tautan lama tidak menjadi 404.
        path: 'Pembelian',
        loadComponent: () =>
          import('./hapus-pembelian/hapus-pembelian.component').then(
            (m) => m.HapusPembelianComponent,
          ),
      },
      /*
       * Laporan proyek memakai KOMPONEN YANG SAMA dengan desktop.
       *
       * Bukan salinan yang diperkecil: rumus margin, dasar biaya, dan
       * susunan kategorinya justru bagian yang paling mahal bila berbeda —
       * dua layar yang menyebut angka berbeda untuk proyek yang sama.
       * Tampilannya sudah menyesuaikan lebar layar.
       */
      {
        path: 'Proyek',
        loadComponent: () =>
          import(
            '../pages/project/project-margin-list/project-margin-list.component'
          ).then((m) => m.ProjectMarginListComponent),
      },
      {
        path: 'Proyek/:code',
        loadComponent: () =>
          import(
            '../pages/project/project-report/project-report.component'
          ).then((m) => m.ProjectReportComponent),
      },
      {
        /*
         * ALIAS. Daftar margin (komponen desktop yang dipakai bersama)
         * menavigasi ke `/Project/Report/:code` — jalur DESKTOP. Tanpa rute
         * ini, di mobile ia jatuh ke `**` lalu balik ke beranda: itulah sebab
         * "klik proyek malah kembali ke halaman awal". Dipetakan ke laporan
         * yang sama.
         */
        path: 'Project/Report/:code',
        loadComponent: () =>
          import(
            '../pages/project/project-report/project-report.component'
          ).then((m) => m.ProjectReportComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
