import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  BarisPagu,
  CertificateOfPaymentService,
  SpkKandidat,
} from '../../services/certificate-of-payment.service';
import { PermissionService } from '../../services/permission.service';
import { bolehMembuatBapMobile } from '../penjaga-level';
import { ServerMessageService } from '../../services/server-message.service';
import { tanggalLokal } from '../../utils/tanggal';

/**
 * Berita acara progres — PENCATATAN VOLUME DI LAPANGAN.
 *
 * KENAPA LAYAR INI ADA, PADAHAL DESKTOP SUDAH PUNYA
 *
 * `mobile.routes.ts` dulu menyebutkan alasannya sendiri: "pengisiannya tetap
 * di desktop (kantor lapangan punya komputer): tabel pagu berkolom banyak
 * tidak dapat diisi dengan benar sambil berjalan."
 *
 * Alasan itu benar untuk SPK borongan, yang barisnya berpuluh dan kolomnya
 * berisi pagu, terpakai, sisa, harga satuan, dan jumlah. Ia TIDAK benar untuk
 * SPK tenaga kerja: barisnya satu atau dua — "Operator Bor 2000 m'",
 * "Lembur 200 jam.orang" — dan yang perlu diketik cuma angka volume periode
 * ini. Itu muat di satu layar ponsel, dan memang di situlah angkanya
 * diketahui.
 *
 * Sebelum ini, yang terjadi di lapangan: berita acaranya dibuat di Excel,
 * lengkap dengan kolom akumulasi, lalu diketik ulang di kantor. Dua salinan
 * angka yang sama, dan yang menyalin bukan yang mengukurnya.
 *
 * YANG TIDAK ADA DI SINI, DAN ITU DISENGAJA
 *
 * Tidak satu pun angka rupiah. Server membuang seluruh kolom nilai untuk
 * level yang belum berhak (`saring_nilai`), dan layar ini tidak pernah
 * memintanya. Harga dan potongan diisi pada tahap berikutnya, di desktop.
 *
 * WEWENANGNYA TETAP DITENTUKAN SERVER. Layar ini hanya menghindarkan orang
 * dari tombol yang pasti ditolak.
 */
@Component({
  selector: 'app-bap-buat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxMaskDirective,
    TranslatePipe,
  ],
  // Direktifnya saja tidak cukup: tanpa penyedianya di injektor komponen,
  // atribut `mask` diam-diam menjadi teks yang diabaikan Angular — tanpa
  // galat, tanpa peringatan. Pola yang sama dipakai layar CoP desktop, dan
  // `scripts/pemeriksa/maskcek.py` menegakkannya.
  providers: [provideNgxMask()],
  templateUrl: './bap-buat.component.html',
  styleUrls: ['./bap-buat.component.scss'],
})
export class BapBuatComponent implements OnInit {
  private readonly izin = inject(PermissionService);

  private readonly layanan = inject(CertificateOfPaymentService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly terjemah = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  /**
   * Pencarian dimulai setelah TIGA huruf.
   *
   * Sama dengan layar desktop. Di bawah itu, jawabannya ratusan SPK yang
   * tidak dapat dibedakan satu sama lain — dan di ponsel, daftar sepanjang
   * itu berarti menggulir alih-alih memilih.
   */
  static readonly MINIMAL_HURUF = 3;

  readonly cari = new FormControl<string>('');
  readonly daftar = signal<SpkKandidat[]>([]);
  readonly mencari = signal(false);
  readonly sudahMencari = signal(false);

  readonly spk = signal<SpkKandidat | null>(null);
  readonly baris = signal<BarisPagu[]>([]);
  readonly memuat = signal(false);
  readonly menyimpan = signal(false);

  /** Volume yang diketik, per `purchaseOrderItemID`. */
  readonly isian = signal<Record<number, string>>({});

  /*
   * KOTAK VOLUME MEMAKAI FormControl + ngx-mask, sama seperti layar CoP
   * desktop — bukan `[value]` + `(input)` seperti sebelumnya.
   *
   * KENAPA. Di lapangan, volume diketik di papan tik angka ponsel, dan
   * sebagian papan tik tidak menawarkan pemisah desimal sama sekali. Yang
   * mengukur 720,404 meter mengetik "720404", dan tanpa pemisah ribuan
   * angka itu terbaca persis seperti angka yang benar. Itu yang terjadi
   * pada tiga berita acara 007-SPK-R501-D: 720404 m' x Rp 3.000 =
   * Rp 2.161.212.000 untuk dua minggu kerja satu operator.
   *
   * Dengan mask, yang sama tampil "720 404" — enam digit yang terlihat
   * SEBAGAI enam digit. Itu tidak menghalangi siapa pun, tetapi ia
   * satu-satunya hal di layar ini yang membuat besarannya terbaca.
   *
   * `[value]` TIDAK BISA dipakai bersama ngx-mask: pustaka itu memformat
   * lewat ControlValueAccessor, dan `[value]` yang dipasang ulang tiap
   * deteksi perubahan menimpa hasilnya seketika — mask terpasang tetapi
   * tidak pernah terlihat bekerja. Catatan yang sama sudah ada di layar
   * CoP desktop.
   *
   * `isian` TETAP menjadi sumber kebenarannya: `adaIsian` dan `bolehSimpan`
   * adalah computed atas sinyal itu, dan peta FormControl tidak
   * membangunkan sinyal. Kontrolnya menulis ke sana lewat langganan.
   */
  private readonly kontrol = new Map<number, FormControl<string | null>>();

  kontrolVol(barisId: number): FormControl<string | null> {
    let c = this.kontrol.get(barisId);
    if (!c) {
      c = new FormControl<string | null>(this.volume(barisId));
      c.valueChanges.subscribe((v) => this.ubahVolume(barisId, v ?? ''));
      this.kontrol.set(barisId, c);
    }
    return c;
  }

  /**
   * Kosongkan isian BERIKUT kotak-kotaknya.
   *
   * `isian.set({})` saja tidak cukup sejak kotaknya punya FormControl
   * sendiri: sinyalnya kosong sementara yang tertulis di layar tetap ada,
   * dan yang berpindah SPK melihat volume milik SPK sebelumnya di baris
   * SPK yang baru.
   */
  private kosongkanIsian(): void {
    this.isian.set({});
    for (const c of this.kontrol.values()) {
      c.setValue('', { emitEvent: false });
    }
    this.kontrol.clear();
  }

  readonly periodeAwal = new FormControl<string>('');
  readonly periodeAkhir = new FormControl<string>('');

  /**
   * SPK ini sudah pernah ditagih lewat pembuat faktur tenaga kerja.
   *
   * Sama seperti di desktop, dan sama-sama TAMBALAN: kedua jalur belum
   * membaca pagu yang sama. Yang dapat dilakukan hanya mengatakannya.
   */
  readonly tagihanFaktur = signal<number>(0);

  ngOnInit(): void {
    this.cari.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((v) => void this.cariSpk(String(v ?? '')));
  }

  kurangHuruf(): boolean {
    const t = String(this.cari.value ?? '').trim();
    return !this.spk() && t.length < BapBuatComponent.MINIMAL_HURUF;
  }

  private async cariSpk(kata: string): Promise<void> {
    const t = kata.trim();
    if (t.length < BapBuatComponent.MINIMAL_HURUF) {
      this.daftar.set([]);
      this.sudahMencari.set(false);
      return;
    }
    this.mencari.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.layanan.daftarSpk(undefined, t),
      )) as SpkKandidat[];
      this.daftar.set(hasil || []);
    } catch (e) {
      this.daftar.set([]);
      this.pesan(e);
    } finally {
      this.sudahMencari.set(true);
      this.mencari.set(false);
    }
  }

  async pilih(s: SpkKandidat): Promise<void> {
    this.spk.set(s);
    this.kosongkanIsian();
    this.daftar.set([]);
    this.tagihanFaktur.set(0);

    this.memuat.set(true);
    try {
      const hasil = (await firstValueFrom(
        this.layanan.pagu(s.id),
      )) as BarisPagu[];
      this.baris.set(hasil || []);
    } catch (e) {
      this.baris.set([]);
      this.pesan(e);
    } finally {
      this.memuat.set(false);
    }

    /*
     * Peringatan dimuat TERPISAH, dan kegagalannya ditelan.
     *
     * Yang hilang saat ia gagal hanyalah keterangan. Menggagalkan pemilihan
     * SPK karena peringatan tidak terbaca berarti sebuah tambalan
     * menjatuhkan layar yang seharusnya ditambalnya.
     */
    try {
      const p = (await firstValueFrom(
        this.layanan.peringatanFaktur(s.id),
      )) as { jumlah?: number };
      this.tagihanFaktur.set(Number(p?.jumlah) || 0);
    } catch {
      this.tagihanFaktur.set(0);
    }
  }

  lepas(): void {
    this.spk.set(null);
    this.baris.set([]);
    this.kosongkanIsian();
    this.tagihanFaktur.set(0);
    this.cari.setValue('');
    this.sudahMencari.set(false);
  }

  ubahVolume(barisId: number, nilai: string): void {
    this.isian.update((x) => ({ ...x, [barisId]: nilai }));
  }

  volume(barisId: number): string {
    return this.isian()[barisId] ?? '';
  }

  /**
   * Teks -> angka, untuk bentuk yang benar-benar diketik orang.
   *
   * Yang LAMA: `Number(String(v).replace(',', '.'))` — satu koma saja.
   * Benar untuk "1,5", dan diam-diam salah untuk bentuk Indonesia yang
   * lengkap: "1.234,5" menjadi "1.234.5", yang bukan bilangan, sehingga
   * hasilnya NOL.
   *
   * Nol itu tidak terlihat sebagai galat — ia terlihat seperti baris yang
   * memang tidak diisi. Berita acaranya terbit tanpa baris itu, dan upah
   * seminggu hilang dari dokumen yang ditandatangani.
   *
   * ATURANNYA, berurutan:
   *   1. spasi dibuang — itu pemisah ribuan yang dipasang mask;
   *   2. bila ada titik DAN koma, yang TERAKHIR muncul adalah pemisah
   *      desimalnya dan yang lain pemisah ribuan ("1.234,5" -> 1234.5;
   *      "1,234.5" -> 1234.5);
   *   3. bila hanya ada satu jenis, ia pemisah desimal — sejalan dengan
   *      mask yang memakai titik sebagai desimal dan spasi sebagai ribuan.
   *
   * Yang tidak dapat diurai tetap mengembalikan 0; bedanya, sekarang yang
   * mengembalikan nol hanya yang memang bukan angka.
   */
  private angka(v: unknown): number {
    let t = String(v ?? '').trim().replace(/\s/g, '');
    if (!t) return 0;

    const titik = t.lastIndexOf('.');
    const koma = t.lastIndexOf(',');
    if (titik >= 0 && koma >= 0) {
      const desimal = Math.max(titik, koma);
      const ribuan = desimal === titik ? ',' : '.';
      t = t.split(ribuan).join('');
      t = t.replace(',', '.');
    } else if (koma >= 0) {
      t = t.replace(',', '.');
    }

    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }

  /** Volume melebihi sisa pagunya — ditandai di layar, ditolak server. */
  lebih(b: BarisPagu): boolean {
    // SPK D harga satuan tidak berplafon: `sisa`-nya nol, dan tanpa
    // pemeriksaan ini SETIAP volume yang diketik di lapangan ditandai merah
    // lalu tombol simpannya mati — padahal servernya menerima.
    if (b.tanpaPagu) return false;
    return this.angka(this.volume(b.purchaseOrderItemID)) > Number(b.sisa ?? 0);
  }

  readonly adaIsian = computed(() =>
    Object.values(this.isian()).some((v) => this.angka(v) > 0),
  );

  get periodeSah(): boolean {
    const a = this.periodeAwal.value;
    const b = this.periodeAkhir.value;
    return !!a && !!b && a <= b;
  }

  /**
   * Berwenang MEMBUAT BAP — izinnya, dan divisi engineering di bawah level 4.
   *
   * Diperiksa DI DEPAN, bukan pada saat menyimpan. Layar ini satu-satunya di
   * aplikasi ponsel yang membuat dokumen, dan sebelumnya tidak memeriksa
   * izin sama sekali (`PermissionService` tidak disuntik). Aturan divisinya
   * hanya ada di server (`boleh_membuat_cop`), jadi penolakannya datang
   * SESUDAH seluruh volume diketik di lapangan — pekerjaan yang hilang, dan
   * pesan 403 yang menyebut divisi kepada orang yang tidak dapat mengubah
   * divisinya sendiri.
   */
  get bolehMembuat(): boolean {
    return bolehMembuatBapMobile(this.izin);
  }

  get bolehSimpan(): boolean {
    return (
      this.bolehMembuat &&
      !!this.spk() &&
      this.periodeSah &&
      this.adaIsian() &&
      !this.baris().some((b) => this.lebih(b)) &&
      !this.menyimpan()
    );
  }

  async simpan(): Promise<void> {
    const s = this.spk();
    if (!s || !this.bolehSimpan) return;

    const items = this.baris()
      .map((b) => ({
        purchaseOrderItemID: b.purchaseOrderItemID,
        quantity: this.angka(this.volume(b.purchaseOrderItemID)),
      }))
      .filter((x) => x.quantity > 0);

    this.menyimpan.set(true);
    try {
      await firstValueFrom(
        this.layanan.buat({
          purchaseOrderID: s.id,
          /*
           * Tanggal dokumen = HARI INI, tidak ditanyakan.
           *
           * Satu isian lagi di lapangan untuk nilai yang praktis selalu hari
           * ini. Yang benar-benar menentukan isinya adalah PERIODE, dan itu
           * memang ditanyakan.
           */
          date: tanggalLokal(new Date()) ?? "",
          periodStart: this.periodeAwal.value || null,
          periodEnd: this.periodeAkhir.value || null,
          projectName: s.projectName ?? null,
          items,
        }),
      );
      this.snackBar.open(
        this.terjemah.instant('mobile.bap.tersimpan'),
        this.terjemah.instant('common.close'),
        { duration: 4000 },
      );
      this.lepas();
      this.periodeAwal.setValue('');
      this.periodeAkhir.setValue('');
    } catch (e) {
      this.pesan(e);
    } finally {
      this.menyimpan.set(false);
    }
  }

  private pesan(e: unknown): void {
    this.snackBar.open(
      this.pesanServer.terjemahkan(e),
      this.terjemah.instant('common.close'),
      { duration: 6000 },
    );
  }
}
