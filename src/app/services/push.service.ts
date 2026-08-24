import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service';

/**
 * Web Push dari sisi peramban.
 *
 * ALUR
 *
 *   1. Daftarkan service worker (`/sw-push.js`) — ia yang menampilkan
 *      notifikasi saat aplikasi tertutup.
 *   2. Minta izin notifikasi ke pengguna.
 *   3. Berlangganan ke PushManager dengan kunci publik VAPID dari server.
 *   4. Kirim langganannya ke server (`POST /push/subscribe`).
 *
 * BATASAN JUJUR
 *
 *   - iOS baru mendukung ini bila aplikasinya DITAMBAHKAN KE LAYAR UTAMA
 *     (PWA), bukan di tab Safari biasa — batasan Apple, bukan bug kita.
 *   - Peramban lama tanpa PushManager: `didukung()` mengembalikan false, dan
 *     tombolnya tidak ditawarkan alih-alih menampilkan galat.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly api = inject(ApiService);

  /** Status untuk UI: apakah perangkat ini sedang berlangganan. */
  readonly berlangganan = signal<boolean>(false);
  readonly sedangProses = signal<boolean>(false);

  private registration: ServiceWorkerRegistration | null = null;

  /** Peramban ini mendukung Web Push sama sekali? */
  didukung(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /** iOS di luar mode PWA tidak dapat menerima push — dipakai untuk pesan. */
  iosTanpaPwa(): boolean {
    const ua = navigator.userAgent || '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone =
      (window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone === true;
    return ios && !standalone;
  }

  /** Daftarkan SW & segarkan status langganan saat aplikasi dibuka. */
  async init(): Promise<void> {
    if (!this.didukung()) return;
    try {
      this.registration =
        (await navigator.serviceWorker.getRegistration('/sw-push.js')) ||
        (await navigator.serviceWorker.register('/sw-push.js'));
      const sub = await this.registration.pushManager.getSubscription();
      this.berlangganan.set(!!sub);
    } catch (e) {
      // Gagal mendaftarkan SW bukan alasan menahan aplikasi.
      console.warn('Service worker push gagal didaftarkan', e);
    }
  }

  /**
   * Nyalakan notifikasi di perangkat ini.
   * Mengembalikan pesan galat untuk ditampilkan, atau null bila berhasil.
   */
  async aktifkan(): Promise<string | null> {
    if (!this.didukung()) {
      return this.iosTanpaPwa()
        ? 'Di iPhone, tambahkan dulu ke Layar Utama (Share → Add to Home Screen), baru notifikasi bisa dinyalakan.'
        : 'Peramban ini belum mendukung notifikasi.';
    }
    this.sedangProses.set(true);
    try {
      // Pop-up izin HANYA muncul selama statusnya masih `default` (belum
      // pernah dijawab). Begitu ditolak atau pop-upnya ditutup berulang kali,
      // peramban membungkamnya permanen dan TIDAK ADA cara memunculkannya
      // lagi dari kode — satu-satunya jalan membukanya dari ikon gembok.
      // Karena itu tiap keadaan diberi pesan yang menyebut jalan keluarnya,
      // bukan sekadar "gagal".
      const izin = await Notification.requestPermission();
      if (izin === 'denied') {
        return (
          'Notifikasi DIBLOKIR oleh peramban untuk situs ini. ' +
          'Buka: ketuk ikon gembok di samping alamat situs → Izin → ' +
          'Notifikasi → Izinkan, lalu muat ulang halaman ini.'
        );
      }
      if (izin !== 'granted') {
        return (
          'Pop-up izin tertutup tanpa dijawab. Coba sekali lagi dan pilih ' +
          '"Izinkan" saat peramban bertanya. Bila pop-up tidak muncul, cek ' +
          'ikon lonceng/gembok di samping alamat situs.'
        );
      }

      if (!this.registration) {
        this.registration =
          (await navigator.serviceWorker.getRegistration('/sw-push.js')) ||
          (await navigator.serviceWorker.register('/sw-push.js'));
      }
      await navigator.serviceWorker.ready;

      const resp = (await firstValueFrom(
        this.api.get('push/vapid-public-key', {}),
      )) as { publicKey?: string; enabled?: boolean };
      const publicKey = resp?.publicKey;
      const enabled = resp?.enabled;
      if (!enabled || !publicKey) {
        return 'Notifikasi belum diaktifkan di server.';
      }

      // Tahap langganan dipisah try-nya: kegagalan di sini datang dari
      // LAYANAN PUSH peramban/perangkat (bukan dari server kita), dan pesan
      // "coba lagi" untuk kegagalan semacam itu hanya membuang waktu orang.
      let sub: PushSubscription | null = null;
      try {
        sub = await this.registration.pushManager.getSubscription();
        if (!sub) {
          sub = await this.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(publicKey),
          });
        }
      } catch (e: any) {
        console.warn('Langganan push ditolak peramban', e);
        return (
          'Peramban gagal membuat langganan push' +
          (e?.name ? ` (${e.name})` : '') +
          '. Biasanya karena layanan push perangkat sedang tidak tersedia — ' +
          'coba dari jaringan lain, atau pastikan peramban versi terbaru.'
        );
      }

      const raw = sub.toJSON() as any;
      try {
        await firstValueFrom(
          this.api.post('push/subscribe', {
            endpoint: raw.endpoint,
            keys: { p256dh: raw.keys?.p256dh, auth: raw.keys?.auth },
            userAgent: navigator.userAgent,
          }),
        );
      } catch (e: any) {
        console.warn('Pendaftaran langganan ke server gagal', e);
        return (
          'Perangkat ini berhasil siap menerima notifikasi, tetapi gagal ' +
          'didaftarkan ke server. Periksa koneksi lalu coba lagi.'
        );
      }
      this.berlangganan.set(true);
      return null;
    } catch (e: any) {
      console.warn('Gagal menyalakan notifikasi', e);
      return 'Gagal menyalakan notifikasi. Coba lagi.';
    } finally {
      this.sedangProses.set(false);
    }
  }

  /** Matikan notifikasi di perangkat ini. */
  async matikan(): Promise<void> {
    if (!this.didukung()) return;
    this.sedangProses.set(true);
    try {
      const reg =
        this.registration ||
        (await navigator.serviceWorker.getRegistration('/sw-push.js'));
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        try {
          await firstValueFrom(this.api.post('push/unsubscribe', { endpoint }));
        } catch (_) {
          /* server bisa membersihkan sendiri lewat 410 nanti */
        }
      }
      this.berlangganan.set(false);
    } finally {
      this.sedangProses.set(false);
    }
  }

  /** base64url (kunci VAPID) -> Uint8Array untuk applicationServerKey. */
  private urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
}
