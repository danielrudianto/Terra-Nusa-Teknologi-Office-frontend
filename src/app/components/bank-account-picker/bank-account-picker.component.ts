import { CommonModule } from '@angular/common';
import { Component, Inject, Optional, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

import { DialogGeserDirective } from '../../directives/dialog-geser.directive';
import {
  BankLookupService,
  RekeningRingkas,
} from '../../services/bank-lookup.service';

export interface HasilPemilihRekening {
  /** Rekening yang dipilih; tidak ada bila pilihannya justru dikosongkan. */
  rekening?: RekeningRingkas;
  /** Mengosongkan pilihan — BERBEDA dari membatalkan. */
  hapus?: boolean;
}

/**
 * Pemilih rekening bank, berbentuk DIALOG.
 *
 * MENGGANTIKAN AUTOCOMPLETE, dan itu disengaja.
 *
 * Keterangan satu rekening sudah tidak muat dalam satu baris saran:
 * nomornya, nama pemiliknya, dan nama banknya bertiga menjadi satu baris
 * panjang yang terpotong justru di bagian yang membedakan. Daftar saran
 * juga hanya muncul selama kolomnya disorot, sehingga membandingkan dua
 * rekening berarti mengetik ulang.
 *
 * Bentuk dialog memberi tiap rekening barisnya sendiri, dengan nomor yang
 * dapat dibaca utuh — dan pencariannya tetap ada di dalamnya.
 *
 * REKENING TERHAPUS TIDAK PERNAH DITAWARKAN. `BankLookupService.saring()`
 * sudah menyaringnya; yang dipilih di sini pasti rekening yang masih hidup.
 */
@Component({
  selector: 'app-bank-account-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './bank-account-picker.component.html',
  styleUrls: ['./bank-account-picker.component.scss'],
})
export class BankAccountPickerComponent {
  private readonly lookup = inject(BankLookupService);
  private readonly dialog =
    inject<MatDialogRef<BankAccountPickerComponent>>(MatDialogRef);

  readonly kata = signal('');

  /** Id yang sedang terpilih, supaya barisnya dapat ditandai. */
  readonly terpilihID: number | null;

  /** Boleh dikosongkan — kolom yang tidak wajib menyediakannya. */
  readonly bolehKosong: boolean;

  readonly hasil = computed<RekeningRingkas[]>(() =>
    this.lookup.saring(this.kata()),
  );

  readonly memuat = computed(() => !this.lookup.dimuat());

  constructor(@Inject(MAT_DIALOG_DATA) @Optional() data: any) {
    this.terpilihID =
      data?.terpilihID === null || data?.terpilihID === undefined
        ? null
        : Number(data.terpilihID);
    this.bolehKosong = data?.bolehKosong !== false;
    void this.lookup.muat();
  }

  onKetik(ev: Event): void {
    this.kata.set((ev.target as HTMLInputElement).value ?? '');
  }

  pilih(r: RekeningRingkas): void {
    this.dialog.close({ rekening: r } as HasilPemilihRekening);
  }

  /**
   * Kosongkan pilihan — BERBEDA dari membatalkan.
   *
   * Keduanya sempat sama-sama menutup tanpa nilai pada pemilih PPh, dan
   * akibatnya pilihan yang sudah terlanjur ada tidak pernah dapat dihapus.
   * Pemisahannya dibuat sejak awal di sini.
   */
  kosongkan(): void {
    this.dialog.close({ hapus: true } as HasilPemilihRekening);
  }

  /** Batal — menutup tanpa mengubah apa pun. */
  tutup(): void {
    this.dialog.close();
  }
}
