import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { DialogGeserDirective } from 'src/app/directives/dialog-geser.directive';

interface Baris {
  name: string;
  gender: string;
}

/**
 * Daftarkan beberapa pelamar sekaligus dan terbitkan tokennya.
 *
 * Yang diminta hanya nama dan jenis kelamin; sisanya diisi pelamar sendiri
 * lewat tautan.
 */
@Component({
  selector: 'app-hr-candidate-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatIconModule,
    TranslatePipe,
    DialogGeserDirective,
  ],
  templateUrl: './hr-candidate-form.component.html',
  styleUrl: './hr-candidate-form.component.scss',
})
export class HrCandidateFormComponent {
  private readonly apiService = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isSubmitting = false;
  ujian: any[] = [];

  testID: number | null = null;
  berlakuHari = 7;

  baris: Baris[] = [{ name: '', gender: '' }];

  /** Teks tempelan; dipecah menjadi baris saat diterapkan. */
  tempelan = '';
  modeTempel = false;

  constructor(
    private dialog: MatDialogRef<HrCandidateFormComponent>,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.ujian = data?.ujian ?? [];
    this.testID = data?.testID ?? null;
  }

  get jumlahTerisi(): number {
    return this.baris.filter((b) => b.name.trim()).length;
  }

  get bolehSimpan(): boolean {
    return !!this.testID && this.jumlahTerisi > 0 && !this.isSubmitting;
  }

  tambahBaris(): void {
    this.baris = [...this.baris, { name: '', gender: '' }];
  }

  hapusBaris(i: number): void {
    // Baris terakhir tidak dihapus, dikosongkan.
    //
    // Daftar tanpa satu pun baris membuat yang membukanya harus menekan
    // "Tambah" lebih dulu sebelum dapat mengetik apa pun.
    if (this.baris.length === 1) {
      this.baris = [{ name: '', gender: '' }];
      return;
    }
    this.baris = this.baris.filter((_, n) => n !== i);
  }

  /**
   * Pecah teks tempelan menjadi baris pelamar.
   *
   * Menerima "Nama" saja, atau "Nama<TAB>L" dan "Nama,L" — daftar nama
   * biasanya datang dari lembar kerja atau pesan, dan memaksa satu bentuk
   * berarti yang menempelnya merapikan dulu.
   */
  terapkanTempelan(): void {
    const hasil: Baris[] = [];

    for (const t of this.tempelan.split('\n')) {
      const teks = t.trim();
      if (!teks) continue;

      const bagian = teks.split(/[\t,;]/).map((x) => x.trim());
      const nama = bagian[0];
      if (!nama) continue;

      const jk = (bagian[1] || '').toUpperCase().charAt(0);
      hasil.push({ name: nama, gender: jk === 'L' || jk === 'P' ? jk : '' });
    }

    if (!hasil.length) return;
    this.baris = hasil;
    this.tempelan = '';
    this.modeTempel = false;
  }

  simpan(): void {
    if (!this.bolehSimpan) return;
    this.isSubmitting = true;

    const orang = this.baris
      .filter((b) => b.name.trim())
      .map((b) => ({ name: b.name.trim(), gender: b.gender || null }));

    this.apiService
      .post('hr/candidates', {
        testID: this.testID,
        orang,
        berlakuHari: this.berlakuHari,
      })
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(
            this.translate.instant('hrCandidate.berhasilDaftar', {
              n: res?.dibuat ?? orang.length,
            }),
            this.translate.instant('common.close'),
            { duration: 4000 },
          );
          this.dialog.close(true);
        },
        error: (err) =>
          this.snackBar.open(
            err?.error?.detail ||
              this.translate.instant('hrCandidate.gagalDaftar'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          ),
      })
      .add(() => (this.isSubmitting = false));
  }

  batal(): void {
    this.dialog.close();
  }
}
