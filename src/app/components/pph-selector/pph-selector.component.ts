import { CommonModule } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { availablePPhSearch, IPPh, availablePPh } from 'src/app/utils/pph';
import { usulanPPhUntuk } from 'src/app/constants/usulan-pph';
import { DialogGeserDirective } from '../../directives/dialog-geser.directive';

@Component({
  selector: 'app-pph-selector',
  imports: [
    CommonModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './pph-selector.component.html',
  styleUrls: ['./pph-selector.component.scss'],
  standalone: true,
})
export class PphSelectorComponent {
  constructor(
    private dialog: MatDialogRef<PphSelectorComponent>,
    @Inject(MAT_DIALOG_DATA) @Optional() public input: any,
  ) {}

  /**
   * Kode yang biasa dipakai untuk jenis PO ini.
   *
   * Ditampilkan terpisah di atas daftar, beserta ALASANNYA — yang memilihnya
   * di lapangan bukan orang perpajakan, dan kode saja tidak memberi tahu
   * apakah ia tepat.
   *
   * Bukan pembatasan: daftar lengkapnya tetap ada di bawahnya. Menutup
   * pilihan justru berbahaya — transaksi di luar kebiasaan pasti ada, dan
   * yang tidak menemukan kodenya akan memilih yang paling mirip.
   */
  get usulan(): Array<{ pph: IPPh; alasan: string }> {
    // Tidak ditampilkan saat mencari: yang sedang mengetik sudah tahu apa
    // yang dicarinya, dan usulan di atas hasil pencarian hanya mengganggu.
    if (String(this.pphSearchFormControl.value || '').trim()) return [];

    const hasil: Array<{ pph: IPPh; alasan: string }> = [];
    for (const u of usulanPPhUntuk(this.input?.purchaseType)) {
      const pph = availablePPh.find((x) => x.code === u.code);
      // Kode yang tidak ditemukan DILEWATI diam-diam.
      //
      // Daftar kode dapat berubah mengikuti peraturan; usulan yang menunjuk
      // kode terhapus tidak boleh menggagalkan seluruh pemilihnya.
      if (pph) hasil.push({ pph, alasan: u.alasan });
    }
    return hasil;
  }

  pphList: IPPh[] = [];
  pphSearchFormControl: FormControl = new FormControl('');
  SKBFormControl: FormControl = new FormControl(false);

  ngOnInit(): void {
    this.pphList = availablePPh;
    this.pphSearchFormControl.valueChanges.subscribe((value) => {
      this.pphList = availablePPhSearch.search(value);
    });
  }

  selectPph(pph: IPPh) {
    if (this.SKBFormControl.value == true) {
      this.dialog.close({
        ...pph,
        tariff: 0,
      });
    } else {
      this.dialog.close(pph);
    }
  }

  /**
   * Batal — menutup tanpa mengubah apa pun.
   *
   * Dipakai silang di pojok dan tombol Batal. Mengembalikan `undefined`,
   * yang oleh pemanggil dibaca sebagai "tidak jadi memilih".
   */
  onClose() {
    this.dialog.close();
  }

  /**
   * Tanpa PPh — MENGHAPUS pilihan yang sudah ada.
   *
   * Berbeda dari batal, dan itulah sebabnya ia mengembalikan nilai
   * tersendiri. Sebelumnya keduanya memanggil `close()` tanpa nilai,
   * sehingga pemanggil yang menulis `if (!data) return` memperlakukan
   * "tanpa PPh" persis seperti membatalkan — dan PPh yang sudah terlanjur
   * dipilih tidak pernah hilang.
   */
  tanpaPph() {
    this.dialog.close({ hapus: true });
  }
}
