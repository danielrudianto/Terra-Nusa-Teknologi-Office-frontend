import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs/operators';

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
import { TarikSegarkanDirective } from '../tarik-segarkan.directive';
import { ScrollBawahDirective } from '../scroll-bawah.directive';
import { GeserTutupDirective } from '../geser-tutup.directive';

type Mode = 'periksa' | 'setujui';

/**
 * Daftar purchase order untuk DIPERIKSA atau DISETUJUI — satu komponen, dua
 * mode, dipilih lewat `@Input() mode`.
 *
 * MENGAPA SATU KOMPONEN
 *
 * Keduanya menampilkan dokumen yang sama, membaca klausul yang sama, dan
 * menuntut "sudah membaca" yang sama sebelum bertindak. Dua komponen berarti
 * dua tempat memperbaiki daftar, pencarian, gulir-tak-hingga, dan panel
 * rinciannya — dan yang terlupa diam-diam berbeda. Yang benar-benar berbeda
 * hanya SATU hal: aksinya (menandai diperiksa vs menyetujui) dan siapa yang
 * terhalang melakukannya. Itu dicabang lewat `mode`.
 *
 * Aturan wewenang tetap ditegakkan SERVER; layar ini hanya menyembunyikan
 * tombol yang pasti ditolak, dengan sebab yang disebutkan.
 */
@Component({
  selector: 'app-po-daftar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    TarikSegarkanDirective,
    ScrollBawahDirective,
    GeserTutupDirective,
  ],
  templateUrl: './po-daftar.component.html',
  styleUrls: [
    // Pakai ulang kelas `mpo-*` dari layar persetujuan supaya tampilannya sama
    // persis tanpa menyalin CSS.
    '../persetujuan-po/persetujuan-po.component.scss',
    './po-daftar.component.scss',
  ],
})
export class PoDaftarComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly akun = inject(AccountService);
  private readonly izin = inject(PermissionService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly pesanServer = inject(ServerMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Input() mode: Mode = 'setujui';

  daftar: any[] = [];
  sedangMemuat = false; // muat pertama / ganti pencarian
  sedangSegar = false; // tarik-untuk-menyegarkan
  sedangMuatLagi = false; // gulir-tak-hingga
  habis = false;
  private page = 1;
  private readonly pageSize = 20;

  cariCtrl = new FormControl('');
  sedangKirim = false;

  dipilih: any = null;
  klausul: ClauseSection[] = [];
  memuatRincian = false;
  sudahBaca = false;
  barangTerbuka = false;
  klausulSubDaftar = klausulSubDaftar;

  ngOnInit(): void {
    this.muat(true);

    this.cariCtrl.valueChanges
      .pipe(debounceTime(350))
      .subscribe(() => this.muat(true));

    // Deep link dari notifikasi: `?open=<id>` membuka dokumennya langsung.
    const buka = this.route.snapshot.queryParamMap.get('open');
    const id = Number(buka);
    if (buka && id) {
      this.buka({ id });
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { open: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /**
   * Muat daftar. `reset` mengulang dari halaman satu (pemuatan pertama, ganti
   * pencarian, atau tarik-segarkan); selain itu menambah halaman berikutnya.
   *
   * Penyaringan tahap (periksa/setujui) dilakukan SERVER lewat `checked`, bukan
   * di sini. Sebelumnya disaring per-halaman di layar — dan dokumen yang cocok
   * tetapi berada di halaman berikutnya tidak pernah tampil, sehingga daftarnya
   * terlihat KOSONG saat dibuka padahal berandanya menghitung ada.
   */
  muat(reset: boolean): void {
    if (reset) {
      this.page = 1;
      this.habis = false;
      if (!this.sedangSegar) this.sedangMemuat = true;
    } else {
      if (this.habis || this.sedangMuatLagi || this.sedangMemuat) return;
      this.sedangMuatLagi = true;
    }

    const kata = (this.cariCtrl.value || '').trim();
    this.api
      .get('purchase-orders', {
        // Hanya draf (belum disetujui), disaring per tahap di server.
        status: 'draft',
        checked: this.mode === 'periksa' ? false : true,
        keyword: kata || undefined,
        page: this.page,
        page_size: this.pageSize,
        sortBy: 'date',
        sortByDirection: 'desc',
      })
      .subscribe({
        next: (res: any) => {
          const mentah: any[] = res?.data ?? res?.items ?? [];
          // Halaman penuh berarti mungkin masih ada; kurang dari itu = habis.
          if (mentah.length < this.pageSize) this.habis = true;
          this.daftar = reset ? mentah : [...this.daftar, ...mentah];
        },
        error: () => {
          if (reset) this.gagal('notify.loadFailed');
        },
      })
      .add(() => {
        this.sedangMemuat = false;
        this.sedangMuatLagi = false;
        this.sedangSegar = false;
      });
  }

  muatLagi(): void {
    if (this.habis || this.sedangMuatLagi || this.sedangMemuat) return;
    this.page += 1;
    this.muat(false);
  }

  segarkan(): void {
    this.sedangSegar = true;
    this.muat(true);
  }

  // ---- rincian & barang (sama dengan sebelumnya) ----

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

  // ---- wewenang ----

  buatanSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.createdBy) === saya;
  }
  diperiksaSendiri(po: any): boolean {
    const saya = this.akun.userId;
    if (saya === null) return false;
    return Number(po?.checkedBy) === saya;
  }
  private get pemilikUsaha(): boolean {
    return this.izin.level() >= 5;
  }
  bolehMemeriksa(): boolean {
    const lv = this.izin.level();
    if (lv >= 4) return true;
    if (lv < 3) return false;
    return this.izin.inDepartment('procurement');
  }
  bisaSetujui(): boolean {
    return this.izin.can('purchase_order', 'approve');
  }

  /** Sebab dokumen ini tak dapat ditindak olehnya — atau null bila boleh. */
  sebabTerhalang(po: any): string | null {
    if (!po) return null;
    if (this.mode === 'periksa') {
      if (!this.bolehMemeriksa()) return 'mobile.periksa.takBerwenang';
      if (this.buatanSendiri(po)) return 'mobile.periksa.buatanSendiri';
      return null;
    }
    // setujui
    if (!this.bisaSetujui()) return 'mobile.po.takBerwenang';
    if (this.diperiksaSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.diperiksaSendiri';
    }
    if (this.buatanSendiri(po) && !this.pemilikUsaha) {
      return 'mobile.po.buatanSendiri';
    }
    return null;
  }

  bolehTindak(po: any): boolean {
    return this.sebabTerhalang(po) === null;
  }
  bolehTekanTindak(po: any): boolean {
    return this.bolehTindak(po) && this.sudahBaca && !this.memuatRincian;
  }

  // ---- tampilan ----

  nilai(po: any): number {
    const dpp = Number(po?.dpp) || 0;
    const ppn = ((Number(po?.ppn) || 0) * dpp) / 100;
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

  // ---- aksi (bercabang menurut mode) ----

  tindak(po: any): void {
    if (!this.bolehTekanTindak(po)) return;
    if (this.mode === 'periksa') {
      this.kirim(
        this.api.patch(`purchase-orders/${po.id}/checked?checked=true`, {}),
        this.translate.instant('mobile.periksa.selesai', { nomor: po.name }),
      );
    } else {
      this.kirimStatus(po, 'approved', 'mobile.po.disetujui');
    }
  }

  tolak(po: any): void {
    // Hanya pada mode setujui.
    this.kirimStatus(po, 'rejected', 'mobile.po.ditolak');
  }

  private kirimStatus(po: any, status: string, kunciSukses: string): void {
    this.kirim(
      this.api.patch(`purchase-orders/${po.id}/status?status=${status}`, {}),
      this.translate.instant(kunciSukses, { nomor: po.name }),
    );
  }

  private kirim(obs: any, pesanSukses: string): void {
    this.sedangKirim = true;
    obs
      .subscribe({
        next: () => {
          this.snackBar.open(pesanSukses, 'Tutup', { duration: 2500 });
          this.tutup();
          this.muat(true);
        },
        error: (err: any) => {
          this.snackBar.open(this.pesanServer.terjemahkan(err), 'Tutup', {
            duration: 5000,
          });
        },
      })
      .add(() => (this.sedangKirim = false));
  }

  private gagal(kunci: string): void {
    this.snackBar.open(this.translate.instant(kunci), 'Tutup', {
      duration: 3000,
    });
  }
}
