import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from '../../services/api.service';
import { AccountService } from '../../services/account.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import {
  susunKlausulDokumen,
  klausulSubDaftar,
} from '../../helpers/klausul-dokumen.helper';
import { ClauseSection } from '../../constants/clause-templates';
import { purchaseTypeLabel } from '../../constants/purchase-type-label.constant';
import { barisTampil } from '../../constants/baris-tampil-po';
import { nilaiBaris } from '../../helpers/nilai-baris.helper';

/**
 * Menyetujui purchase order dari ponsel.
 *
 * ATURANNYA TIDAK DITULIS ULANG DI SINI
 *
 * Yang boleh menyetujui, dan dokumen mana yang boleh disetujui, ditentukan
 * server — sama persis dengan desktop. Layar ini hanya menghindarkan orang
 * dari tombol yang pasti ditolak, dan sebabnya disebut di tempat tombol itu
 * tadinya berada.
 *
 * Dua aturan yang ditampilkan ulang di sini, keduanya menyalin dari layar
 * desktop dan keduanya sengaja:
 *
 *   1. Pembuat dokumen tidak menyetujui dokumennya sendiri.
 *   2. Pemeriksa tidak menyetujui dokumen yang diperiksanya sendiri.
 *
 * DISETUJUI DARI RINCIAN, BUKAN DARI DAFTAR
 *
 * Satu ketukan pada baris daftar setinggi jari, di ponsel yang dipegang
 * sambil berjalan, adalah cara paling mudah menandatangani sesuatu yang
 * tidak dibaca. Karena itu daftar hanya membuka rincian; persetujuannya ada
 * di dalam, sesudah nomor, pemasok, nilai, dan siapa yang memeriksanya
 * terlihat.
 */
@Component({
  selector: 'app-persetujuan-po',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './persetujuan-po.component.html',
  styleUrls: ['./persetujuan-po.component.scss'],
})
export class PersetujuanPoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  /** Disematkan di tab gabungan PO — judulnya disembunyikan. */
  @Input() sematkan = false;

  daftar: any[] = [];
  sedangMemuat = false;
  sedangKirim = false;
  dipilih: any = null;

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.sedangMemuat = true;
    this.api
      .get('purchase-orders', {
        // Hanya yang MENUNGGU persetujuan. Daftar lengkap di ponsel hanya
        // memperbesar peluang membuka dokumen yang tidak sedang ditunggu.
        status: 'pending',
        page: 1,
        page_size: 50,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          const isi = res?.data ?? res?.items ?? [];
          /*
           * Yang belum DIPERIKSA tidak ikut ditampilkan.
           *
           * Urutannya bukan formalitas: pemeriksa membaca harga dan
           * volumenya, penyetuju memutuskan dokumen itu boleh terbit. Server
           * menolak persetujuan atas dokumen yang belum diperiksa, dan
           * menampilkannya di sini hanya menghasilkan penolakan yang terbaca
           * sebagai kerusakan.
           */
          this.daftar = isi.filter((x: any) => !!x?.isChecked);
        },
        error: () => this.gagal('notify.loadFailed'),
      })
      .add(() => (this.sedangMemuat = false));
  }

  /** Bagian klausul dokumen yang sedang dibuka; kosong sampai termuat. */
  klausul: ClauseSection[] = [];
  memuatRincian = false;
  sudahBaca = false;

  klausulSubDaftar = klausulSubDaftar;

  /** Daftar barang dibuka atau tertutup; tertutup saat panel dibuka. */
  barangTerbuka = false;

  /**
   * Baris barang dokumen ini, dalam bentuk siap tampil.
   *
   * Memakai `barisTampil()` yang SAMA dengan layar desktop: kolom
   * `remarks_1..6` berarti berbeda tiap varian PO, dan menerjemahkannya
   * sendiri di sini akan menampilkan nomor polisi sebagai nama barang pada
   * satu varian dan sebaliknya pada varian lain.
   */
  get barang(): { judul: string; rincian: string[]; qty: string; nilai: number }[] {
    const items = this.dipilih?.items ?? [];
    return items.map((x: any) => {
      const t = barisTampil(this.dipilih?.purchaseType, x, (k, p) => this.translate.instant(k, p));
      const q = Number(x?.quantity) || 0;
      const satuan = (x?.unit ?? '').toString().trim();
      return {
        judul: t.judul,
        rincian: t.rincian,
        // "10 sak", "1 Ls" — kosong bila volumenya tak berarti.
        qty: q ? `${q}${satuan ? ' ' + satuan : ''}` : satuan,
        nilai: nilaiBaris(x),
      };
    });
  }

  get jumlahBarang(): number {
    return this.dipilih?.items?.length ?? 0;
  }

  /**
   * Membuka rincian MENGAMBIL dokumen lengkapnya lebih dulu.
   *
   * Daftar purchase order hanya mengembalikan kolom dokumennya — nomor,
   * pemasok, nilai — TANPA `customData`, dan klausul dibangun dari situ.
   * Menyusun klausul dari baris daftar menghasilkan perjanjian kosong, dan
   * "sudah membaca" ditandatangani atas dokumen yang isinya tidak pernah
   * termuat.
   */
  buka(po: any): void {
    this.dipilih = po;
    this.klausul = [];
    this.sudahBaca = false;
    this.barangTerbuka = false;
    this.memuatRincian = true;
    this.api.get(`purchase-orders/${po.id}`, {}).subscribe({
      next: (rinci: any) => {
        // Rincian menimpa baris daftar: yang ini memuat customData dan items.
        this.dipilih = { ...po, ...(rinci ?? {}) };
        this.klausul = susunKlausulDokumen(this.dipilih);
        // Dokumen tanpa klausul (mis. sebagian pembelian material sederhana)
        // tidak menahan persetujuan — tidak ada yang perlu dibaca.
        if (!this.klausul.length) this.sudahBaca = true;
      },
      error: () => {
        // Gagal memuat rincian: klausulnya tidak terlihat, jadi persetujuan
        // TIDAK dibuka. Menyetujui yang isinya tak termuat adalah persis yang
        // dihindari layar ini.
        this.klausul = [];
        this.sudahBaca = false;
      },
    }).add(() => (this.memuatRincian = false));
  }

  tutup(): void {
    this.dipilih = null;
    this.klausul = [];
    this.sudahBaca = false;
  }

  isiKlausul(x: string | string[]): string {
    return Array.isArray(x) ? '' : String(x ?? '');
  }

  subKlausul(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [];
  }

  /**
   * Ditandai sudah dibaca oleh yang menyetujui.
   *
   * Bukan pengaman — server tetap memutuskan — melainkan penghenti langkah:
   * tombol setuju baru hidup setelah ini ditandai, supaya persetujuan bukan
   * satu ketukan refleks di ponsel yang dipegang sambil berjalan. Dokumen
   * tanpa klausul tidak menuntutnya; tidak ada yang perlu dibaca.
   */
  tandaiBaca(dicentang: boolean): void {
    // Boleh dibatalkan lagi: yang tak sengaja mencentang harus punya jalan
    // menariknya, dan mencabut centang mengunci kembali tombol setujunya —
    // tanda "sudah membaca" tidak boleh tertinggal benar padahal ditarik.
    this.sudahBaca = dicentang;
  }

  /** Dokumen ini dibuat oleh saya sendiri. */
  buatanSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.createdBy) === saya;
  }

  /** Dokumen ini diperiksa oleh saya sendiri. */
  diperiksaSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.checkedBy) === saya;
  }

  /** Pemilik usaha boleh menyetujui dokumen yang diperiksanya sendiri. */
  private get pemilikUsaha(): boolean {
    return this.izin.level() >= 5;
  }

  /**
   * Sebab dokumen ini tidak dapat disetujui olehnya — atau `null` bila boleh.
   *
   * Disebutkan, bukan sekadar mematikan tombolnya: tombol kelabu tanpa
   * keterangan terbaca sebagai kerusakan, dan yang mengalaminya menelepon
   * orang lain untuk menanyakan aplikasi yang sedang berfungsi normal.
   */
  sebabTerhalang(po: any): string | null {
    if (!po) return null;
    if (this.diperiksaSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.diperiksaSendiri';
    }
    if (this.buatanSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.buatanSendiri';
    }
    return null;
  }

  bolehSetujui(po: any): boolean {
    return this.sebabTerhalang(po) === null;
  }

  nilai(po: any): number {
    const dpp = Number(po?.dpp) || 0;
    const ppn = (Number(po?.ppn) || 0) * dpp / 100;
    const lain = Number(po?.otherValue) || 0;
    return dpp + ppn + lain;
  }

  /** Nama jenis dokumen, mis. "Pengadaan barang". */
  jenis(po: any): string {
    return purchaseTypeLabel(this.translate, po?.purchaseType);
  }

  /**
   * Ikon menurut BENTUK dokumen.
   *
   * SPK (surat perintah kerja) dan PO (purchase order) dibedakan dari nomor
   * dokumennya — bentuk itu yang menentukan apakah ini pekerjaan jasa atau
   * pengadaan barang, dan ikon yang berbeda membuat keduanya dapat dipilah
   * sekilas tanpa membaca nomornya.
   */
  ikon(po: any): string {
    const nomor = String(po?.name ?? '');
    if (/-SPK-/i.test(nomor)) return 'engineering';
    if (/-PKS-/i.test(nomor)) return 'handshake';
    return 'inventory_2';
  }

  /** Tombol setuju hidup: berhak, dan klausulnya sudah ditandai dibaca. */
  bolehTekanSetuju(po: any): boolean {
    return this.bolehSetujui(po) && this.sudahBaca && !this.memuatRincian;
  }

  setujui(po: any): void {
    if (!this.bolehTekanSetuju(po)) return;
    this.kirimStatus(po, 'approved', 'mobile.po.disetujui');
  }

  tolak(po: any): void {
    this.kirimStatus(po, 'rejected', 'mobile.po.ditolak');
  }

  private kirimStatus(po: any, status: string, kunciSukses: string): void {
    this.sedangKirim = true;
    this.api
      .patch(`purchase-orders/${po.id}/status?status=${status}`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant(kunciSukses, { nomor: po.name }),
            'Close',
            { duration: 2500 },
          );
          this.tutup();
          this.muat();
        },
        error: (err) => {
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Close', {
            duration: 5000,
          });
        },
      })
      .add(() => (this.sedangKirim = false));
  }

  private gagal(kunci: string): void {
    this.snackBar.open(this.translate.instant(kunci), 'Close', {
      duration: 3000,
    });
  }
}
