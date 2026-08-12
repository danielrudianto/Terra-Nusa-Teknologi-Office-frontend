import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';

interface Divisi {
  code: string;
  label: string;
  /** Jumlah modul khusus divisi ini, di luar yang dipakai semua orang. */
  moduleCount?: number;
}

interface Pengecualian {
  module: string;
  action: string;
  allowed: boolean;
  note?: string | null;
}

/**
 * Atur divisi dan izin khusus seorang pengguna.
 *
 * Dipisahkan dari formulir pembuatan/penyuntingan pengguna karena keduanya
 * menjawab pertanyaan yang berbeda: formulir mengurus siapa orangnya,
 * sedangkan halaman ini mengurus sejauh mana aksesnya.
 *
 * Dijadikan satu dialog untuk divisi DAN pengecualian karena keduanya
 * disimpan bersama dalam satu permintaan. Bila terpisah, menyimpan divisi
 * akan menghapus pengecualian yang sudah ada — dan sebaliknya.
 */
@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-access.component.html',
  styleUrl: './user-access.component.scss',
})
export class UserAccessComponent {
  private readonly translate = inject(TranslateService);
  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<UserAccessComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  isLoading = true;
  isSubmitting = false;

  modules: string[] = [];
  actions: string[] = [];
  departments: Divisi[] = [];

  dipilih: string[] = [];
  pengecualian: Pengecualian[] = [];

  get level(): number {
    return Number(this.data?.user?.authenticationLevel) || 1;
  }

  /**
   * Pemilik usaha tidak dibatasi divisi.
   *
   * Batas wilayah hanya berlaku bagi yang punya divisi, dan level 5 memang
   * perlu melihat seluruh sistem — memberinya divisi justru menyesatkan
   * karena tampak membatasi padahal tidak.
   */
  get tanpaDivisi(): boolean {
    return this.level >= 5;
  }

  ngOnInit(): void {
    this.apiService.get('user-access/meta', {}).subscribe({
      next: (m: any) => {
        this.modules = m?.modules ?? [];
        this.actions = m?.actions ?? [];
        this.departments = m?.departments ?? [];
        this.muat();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  private muat(): void {
    this.apiService.get(`user-access/${this.data?.user?.id}`, {}).subscribe({
      next: (r: any) => {
        this.dipilih = r?.departments ?? [];
        this.pengecualian = r?.permissions ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open(
      this.translate.instant('notify.loadFailed'), 'Close', {
          duration: 3000,
        });
      },
    });
  }

  /**
   * Divisi yang belum punya satu pun modul.
   *
   * Menempatkan orang di dalamnya justru mengunci: yang punya divisi
   * dibatasi wilayahnya, sehingga ia hanya akan melihat beranda dan
   * kalender. Ditandai di layar agar tidak dipilih tanpa disadari.
   */
  belumBerisi(d: Divisi): boolean {
    return (d.moduleCount ?? 1) === 0;
  }

  get adaDivisiKosongTerpilih(): boolean {
    return this.departments.some(
      (d) => this.belumBerisi(d) && this.dipilih.includes(d.code),
    );
  }

  punyaDivisi(kode: string): boolean {
    return this.dipilih.includes(kode);
  }

  toggleDivisi(kode: string, dicentang: boolean): void {
    this.dipilih = dicentang
      ? [...this.dipilih, kode]
      : this.dipilih.filter((x) => x !== kode);
  }

  tambahPengecualian(): void {
    this.pengecualian = [
      ...this.pengecualian,
      { module: '', action: 'read', allowed: true, note: '' },
    ];
  }

  hapusPengecualian(i: number): void {
    this.pengecualian = this.pengecualian.filter((_, idx) => idx !== i);
  }

  /** Baris yang belum lengkap tidak dikirim; server pun akan menolaknya. */
  get siapKirim(): Pengecualian[] {
    return this.pengecualian.filter((p) => p.module && p.action);
  }

  get adaBarisKosong(): boolean {
    return this.pengecualian.some((p) => !p.module);
  }

  simpan(): void {
    this.isSubmitting = true;
    this.apiService
      .put(`user-access/${this.data?.user?.id}`, {
        departments: this.tanpaDivisi ? [] : this.dipilih,
        permissions: this.siapKirim,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.accessUpdated'), 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (e) => {
          this.snackBar.open(
            e?.error?.detail || 'Gagal menyimpan akses pengguna',
            'Close',
            { duration: 4000 },
          );
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  batal(): void {
    this.dialogRef.close();
  }
}
