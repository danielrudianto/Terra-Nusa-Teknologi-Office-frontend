import { Type } from '@angular/core';

/**
 * Satu blok pada dashboard.
 *
 * Izin ditulis bersama bloknya, bukan sebagai atribut di markup. Bedanya
 * bukan kerapian: blok yang ditambahkan tanpa penjaga akan tampak berfungsi
 * sampai ada orang yang tidak berhak membukanya — dan hal itu tidak terlihat
 * sebagai kesalahan pada siapa pun yang memang berhak.
 *
 * Dengan bentuk ini, `permission` adalah bagian dari pendaftarannya; sebuah
 * blok tidak dapat masuk dashboard tanpa menyebut siapa yang boleh melihat.
 */
export interface DashboardBlock {
  /** Pengenal singkat, dipakai untuk penelusuran dan pengujian. */
  id: string;

  /** Komponen yang dirender. */
  component: () => Promise<Type<unknown>>;

  /**
   * Izin yang diperlukan, bentuk `modul:aksi`.
   *
   * Ditentukan oleh ISI bloknya, bukan halaman yang menampilkannya. Posisi
   * kas memuat nomor rekening, sehingga izinnya `bank:read` — bukan
   * `dashboard:read` hanya karena letaknya di dashboard.
   */
  permission: string;

  /**
   * Blok utama tampil lebih besar dan diletakkan paling atas.
   *
   * Paling banyak satu yang lolos untuk seorang pengguna; bila lebih dari
   * satu memenuhi syarat, yang pertama pada daftar ini yang dipakai.
   */
  primary?: boolean;

  /** Lebar dalam petak 12 kolom; bawaannya setengah lebar. */
  span?: 6 | 12;
}

/**
 * Blok yang tersedia, berurutan.
 *
 * Urutannya menentukan tata letak: yang lebih dulu tampil lebih dulu. Yang
 * tidak lolos izin tidak dirender sama sekali — komponennya pun tidak dimuat,
 * sehingga permintaannya ke server tidak pernah dikirim.
 */
export const DASHBOARD_BLOCKS: DashboardBlock[] = [
  {
    id: 'cash-position',
    permission: 'bank:read',
    primary: true,
    span: 12,
    component: () =>
      import('./cash-position/cash-position.component').then(
        (m) => m.CashPositionComponent,
      ),
  },
  {
    id: 'today-payment',
    permission: 'payment_outgoing:read',
    span: 6,
    component: () =>
      import('./today-payment/today-payment/today-payment.component').then(
        (m) => m.TodayPaymentComponent,
      ),
  },
  {
    /*
     * Ikhtisar margin proyek.
     *
     * Izinnya `project:read` — ditentukan oleh ISI bloknya: nilai kontrak
     * dan biaya per proyek, bukan oleh letaknya di dashboard.
     *
     * Selebar penuh karena kartunya bergulir mendatar; setengah lebar hanya
     * memuat dua proyek sekaligus dan memaksa menggulir sejak awal.
     */
    id: 'project-margin',
    permission: 'project:read',
    span: 12,
    component: () =>
      import('./project-margin/project-margin.component').then(
        (m) => m.ProjectMarginComponent,
      ),
  },
  {
    id: 'reimbursement',
    permission: 'reimbursement:read',
    span: 6,
    component: () =>
      import('./dashboard-reimbursement/dashboard-reimbursement.component').then(
        (m) => m.DashboardReimbursementComponent,
      ),
  },
];
