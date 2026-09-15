import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { ApiService } from './api.service';

/**
 * Hitungan "menunggu SAYA" untuk lencana menu samping.
 *
 * MENGAPA "MENUNGGU SAYA", BUKAN "SEMUA YANG TERTUNDA"
 *
 * Hitungan global tidak pernah nol pada perusahaan yang jalan. Dalam dua
 * minggu setiap orang berhenti melihat titik merahnya — kelas kegagalan yang
 * sama seperti pemeriksa yang selalu merah: keluaran yang selalu memuat
 * sesuatu yang selalu boleh diabaikan mengajari pembacanya mengabaikan
 * seluruhnya.
 *
 * Lencana yang BISA nol adalah lencana yang dilihat orang.
 *
 * NOL BERBEDA DARI TIDAK TAHU
 *
 * Server mengembalikan `null` untuk hitungan yang GAGAL dihitung, dan angka
 * untuk yang berhasil. Keduanya tidak boleh disamakan: nol berarti "tidak ada
 * yang menunggu Anda" — pernyataan yang membuat orang berhenti memeriksa.
 * Menampilkan nol pada hitungan yang sebenarnya gagal adalah berbohong ke
 * arah yang paling merugikan.
 *
 * Karena itu keduanya sama-sama TIDAK menampilkan lencana, tetapi lewat jalan
 * yang berbeda: nol tidak digambar karena memang kosong, `null` tidak digambar
 * karena tidak diketahui.
 */

export interface HitunganLencana {
  purchase_order: number | null;
  tender: number | null;
  reimbursement: number | null;
  certificate_of_payment: number | null;
  payment_plan: number | null;
}

/**
 * Rute menu -> kunci hitungan.
 *
 * SATU tempat. Menaruhnya di template berarti empat tempat yang harus tetap
 * sepakat, dan yang tertinggal saat rutenya berubah tidak menimbulkan galat —
 * lencananya hanya diam-diam berhenti muncul di satu menu.
 */
export const RUTE_LENCANA: Readonly<Record<string, keyof HitunganLencana>> = {
  '/Tender': 'tender',
  '/Purchase-order': 'purchase_order',
  '/Reimbursement': 'reimbursement',
  '/Certificate-of-payment': 'certificate_of_payment',
  '/Calendar': 'payment_plan',
};

@Injectable({ providedIn: 'root' })
export class LencanaService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly hitungan = signal<Partial<HitunganLencana>>({});
  readonly semua = computed(() => this.hitungan());

  /** Mencegah dua permintaan bertumpang tindih saat berpindah cepat. */
  private sedangMuat = false;

  constructor() {
    /*
     * Disegarkan pada tiap perpindahan halaman, BUKAN dengan polling.
     *
     * Polling membebani server terus-menerus demi angka yang berubah beberapa
     * kali sehari. Perpindahan halaman adalah saat yang tepat: orang baru saja
     * menyelesaikan sesuatu, dan angkanya memang perlu turun.
     *
     * Yang menyetujui dari layar daftar juga memanggil `segarkan()` sendiri —
     * di situ tidak ada perpindahan halaman, dan tanpa panggilan itu lencananya
     * tetap menunjukkan angka lama sampai halaman berikutnya dibuka.
     */
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.segarkan());

    /*
     * DAN sekali saat dibuat. Ini yang semula tertinggal.
     *
     * Layanan ini baru lahir ketika menu samping dirender pertama kali — dan
     * pada pemuatan halaman langsung (mengetik alamatnya, atau menyegarkan
     * dengan F5) `NavigationEnd` yang pertama SUDAH LEWAT saat itu. Tanpa
     * panggilan ini, lencananya tidak pernah mengambil apa pun sampai
     * pengguna berpindah menu — dan yang membuka aplikasi lalu berhenti di
     * halaman pertamanya tidak melihat lencana sama sekali.
     *
     * Gejalanya menipu karena berpindah menu SEKALI membuat semuanya muncul,
     * sehingga saat diperiksa ulang ia tampak bekerja.
     */
    this.segarkan();
  }

  segarkan(): void {
    if (this.sedangMuat) return;
    this.sedangMuat = true;

    this.api.get('dashboard/lencana', {}).subscribe({
      next: (h: any) => {
        this.sedangMuat = false;
        this.hitungan.set(h || {});
      },
      error: () => {
        this.sedangMuat = false;
        /*
         * Hitungan LAMA dipertahankan, bukan dikosongkan.
         *
         * Satu permintaan gagal — jaringan putus sebentar — tidak berarti
         * pekerjaannya selesai. Mengosongkannya membuat lencana berkedip
         * hilang setiap kali koneksi tersendat, dan yang melihatnya
         * menyimpulkan lencananya tidak dapat dipercaya.
         */
      },
    });
  }

  /**
   * Angka untuk sebuah rute menu; `null` berarti tidak ada lencana.
   *
   * Nol dikembalikan sebagai `null` juga — tidak ada yang menunggu berarti
   * tidak ada yang perlu digambar. Lencana "0" hanya menambah keramaian pada
   * menu yang justru sedang bersih.
   */
  untukRute(rute?: string | null): number | null {
    const kunci = rute ? RUTE_LENCANA[rute] : undefined;
    if (!kunci) return null;
    const n = this.hitungan()[kunci];
    return typeof n === 'number' && n > 0 ? n : null;
  }
}
