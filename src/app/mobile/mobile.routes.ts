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
        path: 'Persetujuan',
        loadComponent: () =>
          import('./persetujuan-po/persetujuan-po.component').then(
            (m) => m.PersetujuanPoComponent,
          ),
      },
      {
        /*
         * Pemeriksaan — tahap SEBELUM persetujuan, untuk procurement level 3
         * (dan level 4 ke atas). Servernya yang menolak yang tak berwenang;
         * penjaga level yang sama seperti layar lain sudah memadai di sini.
         */
        path: 'Pemeriksaan',
        loadComponent: () =>
          import('./pemeriksaan-po/pemeriksaan-po.component').then(
            (m) => m.PemeriksaanPoComponent,
          ),
      },
      {
        path: 'Reimbursement',
        loadComponent: () =>
          import('./persetujuan-reimbursement/persetujuan-reimbursement.component').then(
            (m) => m.PersetujuanReimbursementComponent,
          ),
      },
      {
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
    ],
  },
  { path: '**', redirectTo: '' },
];
