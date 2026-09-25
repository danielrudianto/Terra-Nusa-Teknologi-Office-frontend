/**
 * Aplikasi mobile hanya untuk level 3 sampai 5.
 *
 * MENGAPA ADA BATASNYA
 *
 * Yang ada di sini menyetujui dan menghapus — tidak ada satu pun layar untuk
 * membuat atau mengubah dokumen. Bagi level di bawah 3 aplikasi ini kosong:
 * ia dapat masuk, melihat daftar, dan tidak dapat menekan apa pun. Layar
 * penuh tombol yang semuanya ditolak lebih buruk daripada pintu yang
 * tertutup dengan keterangan.
 *
 * PENJAGA INI BUKAN PENGAMANAN
 *
 * Yang menentukan tetap server: setiap persetujuan dan penghapusan diperiksa
 * ulang di sana, dengan aturan yang sama yang berlaku bagi desktop. Penjaga
 * ini hanya menghindarkan orang dari layar yang tidak dapat dipakainya.
 *
 * Menyalin aturannya ke sini — "level 3 boleh menyetujui A tetapi tidak B" —
 * adalah kekeliruan yang sedang dihindari seluruh berkas di folder ini.
 */

import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
} from '@angular/router';

import { PermissionService } from '../services/permission.service';

/** Level terendah yang punya sesuatu untuk dikerjakan di sini. */
export const LEVEL_MINIMUM_MOBILE = 3;

/**
 * Ambang yang berlaku bagi rute yang dituju.
 *
 * KENAPA ADA PENGECUALIAN SAMA SEKALI
 *
 * Ambang 3 benar selama aplikasi ini hanya menyetujui dan menghapus. Sejak
 * ada layar PENCATATAN VOLUME, itu tidak lagi benar: yang mencatat volume di
 * lapangan justru engineering level 1, dan menutupnya berarti layar yang
 * dibuat untuk lapangan tidak dapat dibuka oleh lapangan.
 *
 * Pengecualiannya DINYATAKAN DI RUTENYA (`data: { levelMinimum: 1 }`), bukan
 * sebagai daftar jalur di berkas ini. Rute berikutnya yang perlu dibuka cukup
 * menambah satu baris di tempat ia didefinisikan, dan tidak ada daftar
 * terpisah yang dapat tertinggal.
 *
 * Ini tetap BUKAN pengamanan. Yang menentukan tetap server: membuat CoP
 * diperiksa ulang di sana dengan aturan yang sama seperti desktop.
 */
function ambangUntuk(rute: ActivatedRouteSnapshot | null): number {
  let simpul = rute;
  let ambang = LEVEL_MINIMUM_MOBILE;
  while (simpul) {
    const n = Number(simpul.data?.['levelMinimum']);
    if (Number.isFinite(n) && n > 0) ambang = n;
    simpul = simpul.firstChild;
  }
  return ambang;
}

export const levelGuard: CanActivateFn = async (rute) => {
  const izin = inject(PermissionService);
  const router = inject(Router);

  /*
   * Izinnya DITUNGGU, tidak dibaca begitu saja.
   *
   * `level()` bernilai 1 sampai jawabannya datang dari server. Membacanya
   * tanpa menunggu menolak SETIAP pengguna pada pemuatan pertama — termasuk
   * pemilik — dan yang mengalaminya melihat "level tidak mencukupi" pada
   * aplikasi yang belum sempat menanyakan apa pun.
   */
  try {
    await izin.load();
  } catch {
    // Gagal memuat izin bukan berarti tidak berhak. Server tetap menolak
    // bila memang tidak berhak, dan pesannya lebih jelas daripada penolakan
    // di sini yang tidak menyebut sebabnya.
    return true;
  }

  if (izin.level() >= ambangUntuk(rute)) return true;

  router.navigate(['/TidakBerhak']);
  return false;
};

/**
 * Draf pembelian di mobile: level 5, atau level 3+ procurement.
 *
 * Lebih sempit dari izin servernya (`purchase_draft:create` mulai level 1)
 * atas permintaan: yang mengisi draf dari ponsel hanya pemilik dan
 * procurement senior. Server tetap memeriksa izinnya sendiri.
 */
export function bolehDrafPembelianMobile(izin: PermissionService): boolean {
  if (!izin.can('purchase_draft', 'create')) return false;
  const lv = izin.level();
  return lv >= 5 || (lv >= 3 && izin.inDepartment('procurement'));
}

export const drafPembelianGuard: CanActivateFn = async () => {
  const izin = inject(PermissionService);
  const router = inject(Router);
  try {
    await izin.load();
  } catch {
    return true;
  }
  if (bolehDrafPembelianMobile(izin)) return true;
  router.navigate(['/TidakBerhak']);
  return false;
};

/**
 * MENYETUJUI CoP — BAP maupun tahap terakhirnya — mulai level 4.
 *
 * Angkanya sepasang dengan `LEVEL_COP_SETUJU_BAP` dan `LEVEL_COP_SETUJU` di
 * `utils/permission.py`; keduanya disamakan di sana dengan sengaja.
 *
 * Yang dipakai sebelumnya hanya `can('certificate_of_payment','approve')`,
 * dan matriks izinnya memberi aksi `approve` mulai level 3. Bedanya satu
 * tingkat, dan satu tingkat itulah yang dialami: manajer level 3 melihat tab
 * CoP, membuka dokumennya, mencentang konfirmasi, menekan "Setujui BAP" —
 * lalu 403 tanpa keterangan. Untuk SETIAP baris di tab itu. Layarnya terbaca
 * rusak, bukan terlarang.
 *
 * Izinnya TETAP diperiksa juga, tidak diganti oleh levelnya: akun
 * hanya-baca ditolak lewat `can()` (`_hanya_baca` di server), dan level saja
 * tidak menangkapnya.
 */
/**
 * MENYETUJUI DOKUMEN BUATAN SENDIRI — hanya pemilik usaha.
 *
 * Sepasang dengan `LEVEL_BOLEH_SETUJU_SENDIRI` di `utils/permission.py`.
 * Level 4 memang berwenang atas seluruh dokumen, tetapi menyetujui yang
 * dibuatnya sendiri menghapus satu-satunya pemeriksaan yang tersisa: tidak
 * ada mata kedua sama sekali pada dokumen itu, dari dibuat sampai terbit.
 *
 * Dipakai layar persetujuan pembayaran; angkanya sebelumnya ditulis ulang
 * di tiap layar yang memerlukannya.
 */
export const LEVEL_SETUJU_SENDIRI = 5;

export const LEVEL_COP_SETUJU = 4;

export function bolehMenyetujuiCop(izin: PermissionService): boolean {
  return (
    izin.can('certificate_of_payment', 'approve') &&
    izin.level() >= LEVEL_COP_SETUJU
  );
}

/**
 * MEMBUAT BAP/CoP: izinnya, DAN divisi engineering untuk di bawah level 4.
 *
 * Sepasang dengan `boleh_membuat_cop` di `utils/permission.py`. Aturan
 * divisinya sebelumnya hanya ada di server, dan itu bukan soal keamanan
 * melainkan soal urutan: layar ini satu-satunya di aplikasi ponsel yang
 * MEMBUAT dokumen, jadi penolakannya datang SESUDAH seluruh volume diketik
 * di lapangan. Diperiksa di depan, pintunya tertutup sebelum ada yang
 * mengetik.
 *
 * `can()` sendiri tidak cukup: pemeriksaan divisi di server dilewati ketika
 * daftar divisi penggunanya KOSONG (`is_allowed`), jadi akun tanpa divisi
 * lolos `can()` dan tetap ditolak `boleh_membuat_cop`.
 */
export const LEVEL_BAP_BEBAS_DIVISI = 4;
export const DIVISI_BAP = 'engineering';

export function bolehMembuatBapMobile(izin: PermissionService): boolean {
  if (!izin.can('certificate_of_payment', 'create')) return false;
  return (
    izin.level() >= LEVEL_BAP_BEBAS_DIVISI || izin.inDepartment(DIVISI_BAP)
  );
}

/**
 * Penjaga izin untuk rute ponsel — membaca `data.permission`, seperti
 * desktop, dan mengarahkan ke `/TidakBerhak` alih-alih ke beranda.
 *
 * Menyembunyikan tab saja tidak menutup apa pun: alamatnya dapat diketik,
 * tersimpan sebagai penanda buku, atau datang dari notifikasi dorong yang
 * sudah lama. Sebelum ini TIDAK ADA satu pun rute ponsel yang memakai
 * penjaga izin — hanya `levelGuard`, yang cuma membandingkan angka level dan
 * tidak pernah membaca peta izinnya sama sekali.
 */
export const izinGuard: CanActivateFn = async (rute) => {
  const izin = inject(PermissionService);
  const router = inject(Router);

  const aturan = rute.data?.['permission'] as string | string[] | undefined;
  if (!aturan) return true;

  try {
    await izin.load();
  } catch {
    // Gagal memuat izin bukan berarti tidak berhak — server tetap menolak
    // bila memang tidak berhak, dengan pesan yang lebih jelas.
    return true;
  }

  const daftar = Array.isArray(aturan) ? aturan : [aturan];
  const boleh = daftar.some((r) => {
    const [modul, aksi] = r.split(':');
    return izin.can(modul, (aksi || 'read').trim());
  });
  if (boleh) return true;

  router.navigate(['/TidakBerhak']);
  return false;
};
