import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { namaPemasokBaris } from 'src/app/helpers/purchase-order-shared.helper';

export interface PoRingkas {
  id: number | null;
  name: string;
  projectName: string;
  supplierName: string;
  /**
   * Dari mana nilai ini berasal.
   *
   * `daftar`  dipilih dari hasil pencarian — proyeknya sah dan boleh dipakai.
   * `semula`  ketikannya kembali persis seperti nomor semula — tidak ada yang
   *           berubah, dan `projectName` di sini KOSONG, bukan "proyeknya
   *           dikosongkan".
   *
   * Dibedakan dengan nama, bukan disimpulkan dari `id` yang kebetulan null:
   * yang menyimpulkan sendiri akan menuliskan proyek kosong ke dokumen pada
   * hari pertama seseorang mengetik ulang nomor yang sama.
   */
  asal: 'daftar' | 'semula';
}

/**
 * Cari purchase order dari nomornya, lalu KEMBALIKAN dokumennya.
 *
 * Berbeda dari `app-pic-autocomplete`, yang mengetik bebas tetap sah di sana.
 * Di sini tidak: nomor PO pada pembelian disimpan sebagai TEKS, bukan tautan,
 * sehingga nomor yang salah ketik tersimpan tanpa penolakan dari mana pun dan
 * baru ketahuan ketika ada yang mencari dokumennya — sering kali setahun
 * kemudian, saat rekonsiliasi.
 *
 * Karena itu komponen ini hanya mengeluarkan dokumen yang BENAR-BENAR dipilih
 * dari daftar. Ketikan yang belum cocok mengeluarkan `null`, dan pemanggil
 * memperlakukannya sebagai "belum sah" — bukan sebagai nomor baru.
 *
 * Proyek dan pemasoknya ikut dibawa keluar. Pembelian menyimpan nama
 * proyeknya sendiri, dan keduanya harus bergerak bersama; membiarkan
 * pemanggil mengambilnya dari tempat lain adalah cara termudah membuat
 * keduanya berselisih.
 */
@Component({
  selector: 'app-purchase-order-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <mat-form-field appearance="outline" class="poa">
      <mat-label>{{ label || ('purchaseMeta.nomorPo' | translate) }}</mat-label>

      <input
        matInput
        autocomplete="off"
        type="search"
        [matAutocomplete]="auto"
        [ngModel]="teks"
        (ngModelChange)="onKetik($event)"
        [disabled]="disabled"
        [placeholder]="'purchaseMeta.cariPo' | translate"
      />

      @if (memuat) {
        <mat-spinner matSuffix diameter="18"></mat-spinner>
      } @else if (terpilih) {
        <mat-icon matSuffix class="poa__ok">check_circle</mat-icon>
      }

      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="pilih($event.option.value)"
      >
        @for (po of saran; track po.id) {
          <mat-option [value]="po">
            <span class="poa__nomor">{{ po.name }}</span>
            <span class="poa__rinci">
              {{ po.supplierName || '—' }} · {{ po.projectName || '—' }}
            </span>
          </mat-option>
        }
        @if (!memuat && !saran.length && teks) {
          <mat-option [disabled]="true">
            {{ 'purchaseMeta.poTidakKetemu' | translate }}
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .poa {
        width: 100%;
      }

      .poa__ok {
        color: var(--ok-fg, #1b7f4d);
      }

      .poa__nomor {
        font-weight: 500;
      }

      /* Pemasok dan proyek membedakan dua nomor yang mirip. */
      .poa__rinci {
        margin-left: 0.5rem;
        font-size: 0.78rem;
        color: var(--muted, #8a90a0);
      }
    `,
  ],
})
export class PurchaseOrderAutocompleteComponent {
  private readonly api = inject(ApiService);

  @Input() label = '';
  @Input() disabled = false;

  /** Nomor yang sedang dipakai dokumen; ditampilkan sebagai titik awal. */
  @Input() set nomorAwal(v: string | null | undefined) {
    this.teks = (v ?? '').toString();
    this.awal = this.teks;
    this.terpilih = null;
  }

  /**
   * Dokumen yang dipilih, atau `null` selama ketikannya belum cocok.
   *
   * `null` bukan "tidak berubah" melainkan "belum sah" — pemanggil harus
   * menahan penyimpanan sampai ada yang dipilih, atau sampai ketikannya
   * kembali persis seperti nomor semula.
   */
  @Output() dipilih = new EventEmitter<PoRingkas | null>();

  teks = '';
  saran: PoRingkas[] = [];
  memuat = false;
  terpilih: PoRingkas | null = null;

  private awal = '';
  private readonly ketikan = new Subject<string>();

  constructor() {
    /*
     * Ditunda 250 ms.
     *
     * Tanpa ini setiap ketukan huruf mengirim satu permintaan; mengetik
     * sepuluh huruf berarti sepuluh permintaan yang sembilan di antaranya
     * sudah usang sebelum jawabannya tiba.
     */
    this.ketikan
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((q) => this.muat(q));
  }

  private muat(keyword: string): void {
    const q = (keyword || '').trim();
    if (!q) {
      this.saran = [];
      return;
    }

    this.memuat = true;
    this.api
      .get('purchase-orders/', {
        keyword: q,
        page: 1,
        // `page_size`, bukan `pageSize`. FastAPI mencocokkan nama persis dan
        // membuang yang tidak dikenal tanpa galat — nilainya diam-diam jatuh
        // ke bawaan, sehingga mengubah angka di sini tidak berpengaruh.
        page_size: 8,
      })
      .subscribe({
        next: (res: any) => {
          this.saran = (res?.data ?? []).map((po: any) => ({
            id: po?.id ?? null,
            name: po?.name ?? '',
            projectName: po?.projectName ?? '',
            supplierName: this.pemasok(po),
            asal: 'daftar' as const,
          }));
        },
        // Gagal memuat mengosongkan daftar, bukan membiarkan daftar lama —
        // memilih dari daftar basi menyimpan nomor yang tidak dicari.
        error: () => (this.saran = []),
      })
      .add(() => (this.memuat = false));
  }

  private pemasok(po: any): string {
    const hasil = namaPemasokBaris(po);
    return hasil === '-' ? '' : hasil;
  }

  onKetik(v: string): void {
    this.teks = v ?? '';
    this.terpilih = null;
    this.ketikan.next(this.teks);

    /*
     * Kembali ke nomor semula = kembali ke keadaan awal, bukan "belum sah".
     *
     * Tanpa ini, menghapus satu huruf lalu mengetikkannya lagi membuat
     * formulir terkunci pada nomor yang sebenarnya tidak diubah sama sekali,
     * dan yang mengetiknya tidak punya cara keluar selain menutup dialog.
     */
    if (this.teks === this.awal) {
      this.dipilih.emit({
        id: null,
        name: this.awal,
        projectName: '',
        supplierName: '',
        asal: 'semula',
      });
      return;
    }

    this.dipilih.emit(null);
  }

  pilih(po: PoRingkas): void {
    this.teks = po.name;
    this.terpilih = po;
    this.dipilih.emit(po);
  }
}
