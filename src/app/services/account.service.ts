import { Injectable } from '@angular/core';

export interface AppUser {
  id?: number;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly USER_KEY = 'user';

  get user(): AppUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  /**
   * Id pengguna yang sedang masuk.
   *
   * Dipakai untuk mengenali "saya" — menyembunyikan tombol setujui pada
   * dokumen buatan sendiri, dan menyaring diri sendiri dari daftar orang
   * yang dapat ditandai.
   *
   * Mengembalikan `null` bila tidak ada, bukan 0: nol adalah id yang sah
   * secara bentuk, sehingga perbandingannya bisa lolos tanpa disengaja.
   * Yang memanggil harus memutuskan apa yang dilakukan bila tidak diketahui.
   */
  get userId(): number | null {
    const n = Number(this.user?.['id']);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /** Nama tampilan terbaik yang tersedia. */
  get displayName(): string {
    const u = this.user;
    if (!u) return 'Guest';
    return u.name || u.fullName || u.email || 'User';
  }

  /** Email (untuk baris kedua di menu account). */
  get email(): string {
    return this.user?.email || '';
  }

  /** Inisial untuk avatar (mis. "Daniel Rudianto" -> "DR"). */
  get initials(): string {
    const name = this.displayName.trim();
    if (!name || name === 'Guest') return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
}
