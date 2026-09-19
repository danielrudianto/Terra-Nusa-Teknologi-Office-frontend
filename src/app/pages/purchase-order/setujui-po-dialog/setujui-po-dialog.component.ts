import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { uangDokumen } from 'src/app/helpers/uang.helper';

/** Yang harus terbaca sebelum sebuah SPK disahkan. */
export interface DataSetujuiPo {
  nomor: string;
  jenis: string;
  pemasok: string;
  proyek: string;
  tanggal: any;
  total: number;
  diperiksaOleh: string;
  /** Sudah pernah ada adendum? Yang disetujui mungkin bukan induknya. */
  adendum: boolean;
}

/**
 * Konfirmasi sebelum SPK disahkan.
 *
 * KENAPA DIALOG, BUKAN LANGSUNG JADI
 *
 * Menyetujui adalah satu-satunya tindakan di daftar ini yang MENGIKAT
 * perusahaan kepada pihak luar, dan ia sebelumnya terjadi dari satu klik di
 * dalam menu titik tiga — tanpa satu pun angka terlihat pada saat memutuskan.
 * Menu itu juga berganti menampilkan "Setujui" tepat di tempat "Periksa"
 * barusan ditekan, jadi dua tindakan yang berbeda berada di bawah kursor
 * yang sama.
 *
 * Yang dipasang di sini bukan sekadar "yakin?". Pertanyaan itu dijawab "ya"
 * oleh refleks. Yang dipasang adalah ANGKANYA: nomor, pemasok, proyek, dan
 * nilai yang akan mengikat — supaya yang menekan tombolnya setidaknya sempat
 * melihat jumlahnya, dan supaya SPK yang salah pemasok atau salah proyek
 * punya satu kesempatan untuk ketahuan.
 *
 * Kotak centang menahan tombolnya. Ia tidak membuktikan dokumennya dibaca —
 * tidak ada yang bisa — tetapi ia mengubah satu klik refleks menjadi dua
 * tindakan sadar, dan itu perbedaan yang nyata pada tindakan yang tidak
 * dapat dibatalkan lewat layar ini.
 *
 * "Buka dokumen" ada di sini justru karena itu: yang benar-benar ingin
 * membaca tidak boleh disuruh menutup dialognya dulu.
 */
@Component({
  selector: 'app-setujui-po-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatCheckboxModule,
    TranslateModule,
    DialogGeserDirective,
  ],
  templateUrl: './setujui-po-dialog.component.html',
  styleUrl: './setujui-po-dialog.component.scss',
})
export class SetujuiPoDialogComponent {
  readonly sudahBaca = new FormControl(false);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DataSetujuiPo,
    private readonly dialogRef: MatDialogRef<SetujuiPoDialogComponent>,
  ) {}

  uang(n: unknown): string {
    // Spasi TAK-PUTUS: lihat `uangDokumenRp`.
    return 'Rp ' + uangDokumen(n);
  }

  /**
   * Tutup dengan permintaan MEMBUKA DOKUMEN, bukan menyetujui.
   *
   * Dipisah sebagai hasil tersendiri supaya pemanggil tidak dapat keliru
   * membaca "buka dokumen" sebagai persetujuan — keduanya menutup dialog
   * yang sama.
   */
  bukaDokumen(): void {
    this.dialogRef.close({ aksi: 'buka' });
  }

  setujui(): void {
    if (!this.sudahBaca.value) return;
    this.dialogRef.close({ aksi: 'setujui' });
  }
}
