import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';
import { LabaRugiComponent } from '../laba-rugi.component';

/**
 * Laba rugi di dalam dialog, dibuka dari Status Keuangan.
 *
 * KENAPA DIALOG, BUKAN HALAMAN. Sebelumnya kartu "Laba rugi" di Status
 * Keuangan berpindah ke rute `/Laporan/Laba-rugi`. Kembali dari sana
 * memuat ulang seluruh Status Keuangan — rasio, grafik, panel KPI — hanya
 * untuk melihat lagi halaman yang baru saja ditinggalkan. Dialog membiarkan
 * halaman di belakangnya tetap utuh.
 *
 * Isinya komponen laba rugi YANG SAMA dengan halamannya, dalam
 * `modeDialog`. Bukan salinan: dua layar laba rugi yang disusun terpisah
 * cepat atau lambat menyebut dua angka untuk bulan yang sama.
 *
 * Rutenya tetap ada untuk tautan yang sudah tersimpan.
 */
@Component({
  selector: 'app-laba-rugi-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    TranslateModule,
    DialogGeserDirective,
    LabaRugiComponent,
  ],
  templateUrl: './laba-rugi-dialog.component.html',
  styleUrl: './laba-rugi-dialog.component.scss',
})
export class LabaRugiDialogComponent {}
