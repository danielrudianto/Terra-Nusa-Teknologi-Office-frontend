import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AvatarConfig,
  DEFAULT_AVATAR,
} from '../components/avatar/avatar-parts/avatar-parts.component';

/**
 * Keadaan avatar seorang pengguna.
 *
 * `null` berarti **belum ada jawabannya** — entah karena permintaannya belum
 * kembali, gagal, atau karena orangnya memang belum pernah menyetel avatar.
 * Yang membedakan ketiganya bukan urusan komponen penampil; yang penting
 * baginya cuma satu: pada keadaan ini ia TIDAK BOLEH menggambar wajah.
 *
 * Sebelumnya keadaan ini diwakili `DEFAULT_AVATAR`, dan itulah sumber
 * persoalannya — lihat keterangan di bawah.
 */
export type KeadaanAvatar = AvatarConfig | null;

/** Berapa kali satu id boleh diminta ulang setelah gagal. */
const BATAS_PERCOBAAN = 3;

/**
 * Mengambil konfigurasi avatar dan menyimpannya di memori.
 *
 * Tampilan daftar meminta banyak avatar sekaligus, jadi alih-alih satu
 * permintaan per baris, id yang diminta dalam satu tick dikumpulkan dan
 * dikirim sebagai satu panggilan `/user-avatars/batch`. Hasilnya di-cache,
 * sehingga menggambar ulang daftar (atau membuka dialog untuk orang yang
 * sama) tidak berbiaya apa pun.
 *
 * ------------------------------------------------------------------
 * KENAPA `null`, BUKAN `DEFAULT_AVATAR`
 * ------------------------------------------------------------------
 *
 * Versi sebelumnya memancarkan `DEFAULT_AVATAR` seketika, lalu menimpanya
 * bila jawabannya datang. Terdengar aman, dan justru itu yang membuat orang
 * yang sama tampil dengan wajah berbeda-beda dari dokumen ke dokumen:
 *
 *   * `DEFAULT_AVATAR` adalah SATU wajah tertentu — `face-01`, kulit
 *     `tone-03`, baju biru. Semua orang yang belum menyetel avatar tampil
 *     dengan wajah yang sama persis. Jadi "belum punya avatar" tidak terbaca
 *     sebagai "belum punya"; ia terbaca sebagai "wajahnya memang begitu".
 *
 *   * Kalau permintaan batch-nya GAGAL, penanganan galatnya membiarkan
 *     wajah bawaan itu terpasang — dan subject-nya tetap tersimpan di cache.
 *     `get()` berikutnya menemukan subject itu dan tidak pernah meminta
 *     ulang. Sisa sesi itu orangnya berwajah bawaan di SELURUH halaman, dan
 *     setelah muat ulang halaman kembali normal. Tidak ada galat di layar,
 *     tidak ada galat di konsol.
 *
 *   * Akibatnya `AvatarComponent` tidak pernah sempat memakai inisial:
 *     `svg` sudah terisi sejak pancaran pertama, sehingga cabang inisialnya
 *     menjadi kode mati. Padahal inisial itulah yang membedakan orang.
 *
 * Sekarang: jawaban yang menyebut `isDefault` dipancarkan sebagai `null`,
 * galat TIDAK menandai id-nya selesai sehingga tampilan berikutnya mencoba
 * lagi (dibatasi `BATAS_PERCOBAAN` supaya tidak berputar), dan komponennya
 * menggambar INISIAL — yang berbeda untuk tiap orang — alih-alih satu wajah
 * generik yang dipakai bersama.
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  constructor(private apiService: ApiService) {}

  /** userID -> aliran keadaan avatar */
  private cache = new Map<number, BehaviorSubject<KeadaanAvatar>>();
  /** id yang sudah punya jawaban pasti dari server. */
  private terjawab = new Set<number>();
  /** Berapa kali tiap id sudah diminta; menahan perulangan saat server menolak. */
  private percobaan = new Map<number, number>();
  /** id yang menunggu dikirim pada batch berikutnya */
  private pending = new Set<number>();
  private flushScheduled = false;

  /**
   * Ambil avatar sebagai aliran.
   *
   * Memancarkan `null` seketika — bukan wajah bawaan — lalu konfigurasi
   * sungguhannya begitu tiba. Selama `null`, penampilnya menggambar inisial.
   */
  get(userId: number | null | undefined): Observable<KeadaanAvatar> {
    if (userId == null) {
      return new BehaviorSubject<KeadaanAvatar>(null).asObservable();
    }

    let subject = this.cache.get(userId);
    if (!subject) {
      subject = new BehaviorSubject<KeadaanAvatar>(null);
      this.cache.set(userId, subject);
    }

    /*
     * Diminta ulang selama BELUM ADA JAWABAN, bukan hanya saat subject-nya
     * baru dibuat.
     *
     * Inilah perbaikan intinya. Dulu syaratnya "subject belum ada", sehingga
     * satu permintaan yang gagal mengunci id itu pada keadaan awalnya untuk
     * sisa sesi — tidak ada apa pun yang memicunya mencoba lagi.
     */
    if (!this.terjawab.has(userId)) this.queue(userId);

    return subject.asObservable();
  }

  /** Masukkan id ke penyangga dan jadwalkan pengirimannya pada tick berikutnya. */
  private queue(userId: number): void {
    const sudah = this.percobaan.get(userId) ?? 0;
    // Server yang menolak permanen (mis. divisinya tidak memegang
    // `user_avatar`) tidak boleh membuat setiap baris daftar menembakkan
    // satu permintaan lagi. Inisialnya tetap tampil, dan itu memadai.
    if (sudah >= BATAS_PERCOBAAN) return;

    this.pending.add(userId);
    if (this.flushScheduled) return;

    this.flushScheduled = true;
    // queueMicrotask akan menyala sebelum baris-baris sebelahnya tergambar;
    // timeout 0ms memberi kesempatan seluruh daftar mendaftar lebih dulu,
    // sehingga yang terkirim benar-benar satu permintaan.
    setTimeout(() => this.flush(), 0);
  }

  private flush(): void {
    this.flushScheduled = false;
    const ids = Array.from(this.pending);
    this.pending.clear();
    if (ids.length === 0) return;

    for (const id of ids) {
      this.percobaan.set(id, (this.percobaan.get(id) ?? 0) + 1);
    }

    this.apiService.get('user-avatars/batch', { ids }).subscribe({
      next: (rows: any) => {
        if (!Array.isArray(rows)) return;

        for (const row of rows) {
          const id = Number(row?.userID);
          if (!Number.isFinite(id)) continue;

          this.terjawab.add(id);
          const subject = this.cache.get(id);
          if (!subject) continue;

          /*
           * `isDefault` dari server DIPAKAI, tidak dibuang.
           *
           * Server sudah membedakan "punya avatar" dari "tidak punya"; versi
           * sebelumnya membuang keterangan itu dan menggambar wajah bawaan
           * untuk keduanya. Di situlah dua orang yang berbeda berhenti dapat
           * dibedakan.
           */
          if (row.isDefault) {
            subject.next(null);
          } else {
            subject.next({ ...DEFAULT_AVATAR, ...row });
          }
        }

        /*
         * Id yang DIMINTA tetapi tidak ada di jawabannya tetap dianggap
         * terjawab — kalau tidak, ia akan diminta lagi pada setiap penggambaran
         * dan tidak pernah berhenti.
         */
        for (const id of ids) this.terjawab.add(id);
      },
      error: () => {
        /*
         * Id-nya TIDAK ditandai terjawab, sehingga tampilan berikutnya
         * mencobanya lagi — sampai `BATAS_PERCOBAAN`.
         *
         * Avatar memang tidak pantas memunculkan pesan galat. Tetapi "tidak
         * menampilkan galat" bukan hal yang sama dengan "menganggapnya
         * berhasil": yang kedua itulah yang membuat orangnya berwajah bawaan
         * selama sisa sesi, dan tidak ada satu pun cara untuk menyadarinya.
         */
      },
    });
  }

  /**
   * Ganti avatar yang di-cache (dipanggil setelah menyimpan di perancangnya)
   * supaya setiap tampilan yang memuat orang ini ikut berubah tanpa muat ulang.
   */
  update(userId: number, config: Partial<AvatarConfig>): void {
    const next = { ...DEFAULT_AVATAR, ...config } as AvatarConfig;
    this.terjawab.add(userId);
    this.percobaan.set(userId, 0);

    const subject = this.cache.get(userId);
    if (subject) {
      subject.next(next);
    } else {
      this.cache.set(userId, new BehaviorSubject<KeadaanAvatar>(next));
    }
  }

  /** Simpan avatar seorang pengguna. */
  save(userId: number, config: Partial<AvatarConfig>) {
    return this.apiService.put('user-avatars/' + userId, config);
  }

  /** Buang semuanya (mis. saat keluar). */
  clear(): void {
    this.cache.clear();
    this.terjawab.clear();
    this.percobaan.clear();
    this.pending.clear();
  }
}
