import { Component, OnInit, inject } from '@angular/core';
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
 * MEMERIKSA purchase order dari ponsel — tahap SEBELUM persetujuan.
 *
 * MENGAPA ADA DI PONSEL
 *
 * Aplikasi ini terbuka untuk level 3, dan pemeriksa purchase order justru
 * berada di level itu (procurement). Tanpa layar ini, mereka dapat membuka
 * aplikasinya tetapi tidak dapat mengerjakan satu-satunya hal yang menjadi
 * tugasnya — dokumen menumpuk menunggu tahap pemeriksaan sampai seseorang
 * kembali ke depan komputer.
 *
 * ATURANNYA TIDAK DITULIS ULANG DI SINI
 *
 * Siapa yang boleh memeriksa, dan dokumen mana, tetap diputuskan server —
 * sama persis dengan desktop (`PATCH /purchase-orders/{id}/checked`). Layar
 * ini hanya menghindarkan orang dari tombol yang pasti ditolak, dan sebabnya
 * disebut di tempat tombol itu tadinya berada.
 *
 * Dua aturan yang ditampilkan ulang di sini, keduanya menyalin dari server
 * dan keduanya sengaja:
 *
 *   1. Pembuat dokumen tidak memeriksa dokumennya sendiri — TERMASUK pemilik.
 *      Pemeriksaan justru ada untuk menghadirkan mata kedua.
 *   2. Hanya procurement level 3, atau level 4 ke atas, yang boleh memeriksa.
 *
 * DIPERIKSA DARI RINCIAN, BUKAN DARI DAFTAR
 *
 * Memeriksa berarti membaca harga, volume, dan spesifikasinya — bukan satu
 * ketukan pada baris daftar. Karena itu daftar hanya membuka rincian;
 * pemeriksaannya ada di dalam, sesudah nilai, barang, dan klausulnya terlihat.
 */
@Component({
  selector: 'app-pemeriksaan-po',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './pemeriksaan-po.component.html',
  styleUrls: [
    // Tampilan SAMA dengan layar persetujuan: kelas `mpo-*` disusun dari
    // mixin bersama, dan memakainya kembali di sini menjaga keduanya tidak
    // berbeda tanpa menyalin satu baris CSS pun.
    '../persetujuan-po/persetujuan-po.component.scss',
    './pemeriksaan-po.component.scss',
  ],
})
export class PemeriksaanPoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);

  daftar: any[] = [];
  sedangMemuat = false;
  sedangKirim = false;
  dipilih: any = null;

  klausul: ClauseSection[] = [];
  memuatRincian = false;
  sudahBaca = false;
  klausulSubDaftar = klausulSubDaftar;
  barangTerbuka = false;

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.sedangMemuat = true;
    this.api
      .get('purchase-orders', {
        // Hanya yang MENUNGGU keputusan; dari situ disaring yang belum
        // diperiksa.
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
           * Yang SUDAH diperiksa tidak ikut — kebalikan dari layar
           * persetujuan. Dokumen yang sudah diperiksa menunggu penyetuju,
           * bukan pemeriksa; menampilkannya di sini hanya memancing
           * pemeriksaan kedua yang tidak diminta.
           */
          this.daftar = isi.filter((x: any) => !x?.isChecked);
        },
        error: () => this.gagal('notify.loadFailed'),
      })
      .add(() => (this.sedangMemuat = false));
  }

  /**
   * Baris barang dokumen ini, siap tampil — memakai `barisTampil()` dan
   * `nilaiBaris()` yang SAMA dengan layar desktop dan persetujuan.
   */
  get barang(): { judul: string; rincian: string[]; qty: string; nilai: number }[] {
    const items = this.dipilih?.items ?? [];
    return items.map((x: any) => {
      const t = barisTampil(this.dipilih?.purchaseType, x);
      const q = Number(x?.quantity) || 0;
      const satuan = (x?.unit ?? '').toString().trim();
      return {
        judul: t.judul,
        rincian: t.rincian,
        qty: q ? `${q}${satuan ? ' ' + satuan : ''}` : satuan,
        nilai: nilaiBaris(x),
      };
    });
  }

  get jumlahBarang(): number {
    return this.dipilih?.items?.length ?? 0;
  }

  buka(po: any): void {
    this.dipilih = po;
    this.klausul = [];
    this.sudahBaca = false;
    this.barangTerbuka = false;
    this.memuatRincian = true;
    this.api.get(`purchase-orders/${po.id}`, {}).subscribe({
      next: (rinci: any) => {
        this.dipilih = { ...po, ...(rinci ?? {}) };
        this.klausul = susunKlausulDokumen(this.dipilih);
        // Dokumen tanpa klausul tidak menahan pemeriksaan — tidak ada yang
        // perlu dibaca; nilainya dan barangnya tetap terlihat di atas.
        if (!this.klausul.length) this.sudahBaca = true;
      },
      error: () => {
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

  tandaiBaca(dicentang: boolean): void {
    this.sudahBaca = dicentang;
  }

  /** Dokumen ini dibuat oleh saya sendiri. */
  buatanSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.createdBy) === saya;
  }

  /**
   * Pengguna ini berwenang memeriksa sama sekali — cerminan `boleh_memeriksa`
   * di server: level 4 ke atas selalu boleh; level 3 hanya bila procurement.
   */
  bolehMemeriksa(): boolean {
    const lv = this.izin.level();
    if (lv >= 4) return true;
    if (lv < 3) return false;
    return this.izin.inDepartment('procurement');
  }

  /**
   * Sebab dokumen ini tidak dapat diperiksa olehnya — atau `null` bila boleh.
   *
   * Disebutkan, bukan sekadar mematikan tombolnya: tombol kelabu tanpa
   * keterangan terbaca sebagai kerusakan.
   */
  sebabTerhalang(po: any): string | null {
    if (!po) return null;
    if (!this.bolehMemeriksa()) return 'mobile.periksa.takBerwenang';
    // Tidak ada pengecualian pemilik: server menolak pembuat memeriksa
    // dokumennya sendiri untuk SIAPA PUN.
    if (this.buatanSendiri(po)) return 'mobile.periksa.buatanSendiri';
    return null;
  }

  bolehTandai(po: any): boolean {
    return this.sebabTerhalang(po) === null;
  }

  /** Tombol tandai-diperiksa hidup: berhak, dan isinya sudah ditandai dibaca. */
  bolehTekanTandai(po: any): boolean {
    return this.bolehTandai(po) && this.sudahBaca && !this.memuatRincian;
  }

  nilai(po: any): number {
    const dpp = Number(po?.dpp) || 0;
    const ppn = (Number(po?.ppn) || 0) * dpp / 100;
    const lain = Number(po?.otherValue) || 0;
    return dpp + ppn + lain;
  }

  jenis(po: any): string {
    return purchaseTypeLabel(this.translate, po?.purchaseType);
  }

  ikon(po: any): string {
    const nomor = String(po?.name ?? '');
    if (/-SPK-/i.test(nomor)) return 'engineering';
    if (/-PKS-/i.test(nomor)) return 'handshake';
    return 'inventory_2';
  }

  tandai(po: any): void {
    if (!this.bolehTekanTandai(po)) return;
    this.sedangKirim = true;
    this.api
      .patch(`purchase-orders/${po.id}/checked?checked=true`, {})
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('mobile.periksa.selesai', { nomor: po.name }),
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
