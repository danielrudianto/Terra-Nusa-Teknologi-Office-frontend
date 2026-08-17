import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

/** Satu isian pada definisi formulir. */
interface Isian {
  key: string;
  label: string;
  type: string;
  hint?: string;
  options?: string[];
  columns?: Isian[];
}

interface Bagian {
  key: string;
  title: string;
  description?: string;
  fields: Isian[];
}

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    DialogGeserDirective,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './employee-form.component.html',
  styleUrl: './employee-form.component.scss',
})
export class EmployeeFormComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public input: { id: number; name?: string },
    private dialogRef: MatDialogRef<EmployeeFormComponent>,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private serverMessage: ServerMessageService,
    private translate: TranslateService,
  ) {}

  isLoading = true;
  isSubmitting = false;

  /*
   * Formulirnya disusun dari definisi versi, bukan ditulis di templat.
   *
   * Pertanyaannya berubah tiap periode. Bila ditulis tetap di templat, tiap
   * perubahan pertanyaan berarti mengubah kode — dan jawaban tahun lalu ikut
   * dibaca dengan pertanyaan tahun ini, yang artinya sudah bergeser.
   */
  versi: any = null;
  bagian: Bagian[] = [];
  terbuka = '';

  /** True bila karyawan ini belum pernah mengisi formulirnya. */
  baru = false;

  /**
   * Kapan data ini terakhir diperbarui; null bila belum pernah.
   *
   * Ditampilkan di kepala dialog karena itulah yang menentukan perlu tidaknya
   * dikonfirmasi ulang — lebih dari dua belas bulan, namanya muncul di
   * agenda.
   */
  terakhir: string | null = null;

  /** Berapa bulan sejak pembaruan terakhir; null bila belum pernah. */
  get bulanSejakTerakhir(): number | null {
    if (!this.terakhir) return null;
    const t = new Date(this.terakhir);
    if (isNaN(t.getTime())) return null;
    const kini = new Date();
    return (
      (kini.getFullYear() - t.getFullYear()) * 12 +
      (kini.getMonth() - t.getMonth())
    );
  }

  /** True bila sudah lewat dua belas bulan sejak pembaruan terakhir. */
  get perluKonfirmasi(): boolean {
    const b = this.bulanSejakTerakhir;
    return b === null || b >= 12;
  }

  formGroup: FormGroup = new FormGroup({});

  ngOnInit(): void {
    this.muat();
  }

  bukaBagian(kunci: string): void {
    this.terbuka = this.terbuka === kunci ? '' : kunci;
  }

  daftarDi(kunci: string): FormArray {
    return this.formGroup.get(kunci) as FormArray;
  }

  barisDaftar(kunci: string, i: number): FormGroup {
    return this.daftarDi(kunci).at(i) as FormGroup;
  }

  tambahBaris(isian: Isian): void {
    this.daftarDi(isian.key).push(this.buatBaris(isian));
  }

  hapusBaris(kunci: string, i: number): void {
    this.daftarDi(kunci).removeAt(i);
  }

  private buatBaris(isian: Isian, nilai: any = {}): FormGroup {
    const g: any = {};
    (isian.columns || []).forEach((k) => {
      g[k.key] = [nilai[k.key] ?? ''];
    });
    return this.formBuilder.group(g);
  }

  /**
   * Berapa isian pada satu bagian yang sudah terjawab.
   *
   * Ditampilkan di kepala bagian supaya yang belum terisi terlihat tanpa
   * perlu membukanya satu per satu — formulirnya diisi bertahap, dan tanpa
   * penanda ini orang tidak tahu sudah sampai mana.
   */
  terisi(b: Bagian): number {
    return b.fields.filter((f) => {
      if (f.type === 'daftar') return this.daftarTerisi(f.key) > 0;
      const v = this.formGroup.get(f.key)?.value;
      if (f.type === 'ya-tidak') return v === true;
      return (v ?? '').toString().trim() !== '';
    }).length;
  }

  private daftarTerisi(kunci: string): number {
    return (this.daftarDi(kunci)?.getRawValue() || []).filter((baris: any) =>
      Object.values(baris).some((x) => (x ?? '').toString().trim() !== ''),
    ).length;
  }

  private muat(): void {
    this.apiService.get('employee-forms/versions/active', {}).subscribe({
      next: (versi: any) => {
        this.versi = versi;
        if (!versi) {
          // Belum ada periode yang dibuat. Bukan galat: layarnya menawarkan
          // pembuatan periode, bukan menampilkan pesan gagal.
          this.isLoading = false;
          return;
        }
        this.susun(versi);
        this.muatJawaban(versi.id);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.beritahu(err);
      },
    });
  }

  /** Bangun FormGroup dari definisi versinya. */
  private susun(versi: any): void {
    const def =
      typeof versi.fields === 'string' ? JSON.parse(versi.fields) : versi.fields;
    this.bagian = (def?.sections || []) as Bagian[];
    this.terbuka = this.bagian[0]?.key ?? '';

    const g: any = {};
    this.bagian.forEach((b) =>
      b.fields.forEach((f) => {
        if (f.type === 'daftar') {
          g[f.key] = new FormArray([]);
        } else if (f.type === 'ya-tidak') {
          g[f.key] = new FormControl(false);
        } else if (f.type === 'angka') {
          g[f.key] = new FormControl<number | null>(null, Validators.min(0));
        } else {
          // Panjang dibatasi walau definisinya tidak menyebut: kolom
          // `answers` berupa JSON, tetapi isian tanpa batas membuat satu
          // orang dapat menyimpan berkilo-kilo teks tanpa disengaja.
          g[f.key] = new FormControl('', Validators.maxLength(1000));
        }
      }),
    );
    this.formGroup = new FormGroup(g);
  }

  private muatJawaban(versionId: number): void {
    this.apiService
      .get(`employee-forms/${this.input.id}/${versionId}`, {})
      .subscribe({
        next: (data: any) => {
          this.baru = !data;
          // Tanggal ini menentukan perlu tidaknya dikonfirmasi ulang.
          this.terakhir = data?.submittedAt ?? null;
          if (data) this.isiJawaban(data.answers);
          this.isLoading = false;
        },
        error: (err: any) => {
          this.isLoading = false;
          this.beritahu(err);
        },
      });
  }

  private isiJawaban(answers: any): void {
    /*
     * Jawaban dari server bisa berupa string atau objek.
     *
     * Driver MySQL mengembalikan kolom JSON sebagai teks pada sebagian
     * versi; menganggapnya selalu objek membuat seluruh jawaban kosong
     * tanpa galat, dan penggunanya mengira datanya hilang.
     */
    const j = typeof answers === 'string' ? JSON.parse(answers || '{}') : answers || {};

    this.bagian.forEach((b) =>
      b.fields.forEach((f) => {
        const nilai = j[f.key];
        if (f.type === 'daftar') {
          const arr = this.daftarDi(f.key);
          arr.clear();
          (Array.isArray(nilai) ? nilai : []).forEach((baris: any) =>
            arr.push(this.buatBaris(f, baris)),
          );
        } else if (f.type === 'ya-tidak') {
          this.formGroup.get(f.key)?.setValue(nilai === true);
        } else if (nilai !== undefined && nilai !== null) {
          this.formGroup.get(f.key)?.setValue(nilai);
        }
      }),
    );
  }

  /**
   * Tanggal disimpan sebagai teks `YYYY-MM-DD` waktu SETEMPAT.
   *
   * Datepicker Material mengembalikan objek `Date`, sedangkan jawaban lama
   * tersimpan sebagai teks. Tanpa penyeragaman, satu kolom memuat dua bentuk
   * sekaligus — teks bagi nilai yang tidak disentuh, objek bagi yang baru
   * dipilih — dan rekap yang membacanya harus menebak mana yang mana.
   *
   * `toISOString()` TIDAK dipakai: ia mengubah ke UTC lebih dulu, dan bagi
   * WIB itu memundurkan tanggalnya sehari. Yang memilih 1 Mei akan tersimpan
   * sebagai 30 April, tanpa galat apa pun.
   */
  private teksTanggal(nilai: any): string {
    if (!nilai) return '';
    const t = nilai instanceof Date ? nilai : new Date(nilai);
    if (isNaN(t.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  }

  /** Seragamkan seluruh kolom bertanggal pada satu baris daftar. */
  private seragamkanTanggal(baris: any, isian: any): any {
    const hasil = { ...baris };
    for (const k of isian?.columns ?? []) {
      if (k?.type === 'tanggal' && hasil[k.key]) {
        hasil[k.key] = this.teksTanggal(hasil[k.key]);
      }
    }
    return hasil;
  }

  simpan(): void {
    if (this.formGroup.invalid || this.isSubmitting || !this.versi) return;
    this.isSubmitting = true;

    const v = this.formGroup.getRawValue();
    const jawaban: any = {};

    this.bagian.forEach((b) =>
      b.fields.forEach((f) => {
        if (f.type === 'daftar') {
          // Baris kosong tidak ikut disimpan; orang kerap menambah baris
          // lalu berubah pikiran.
          jawaban[f.key] = (v[f.key] || [])
            .filter((baris: any) =>
              Object.values(baris).some(
                (x) => (x ?? '').toString().trim() !== '',
              ),
            )
            .map((baris: any) => this.seragamkanTanggal(baris, f));
        } else if (f.type === 'tanggal') {
          jawaban[f.key] = this.teksTanggal(v[f.key]) || null;
        } else if (f.type === 'ya-tidak') {
          jawaban[f.key] = v[f.key] === true;
        } else if (f.type === 'angka') {
          const n = Number(v[f.key]);
          jawaban[f.key] =
            v[f.key] === null || v[f.key] === '' || isNaN(n) ? null : n;
        } else {
          const teks = (v[f.key] ?? '').toString().trim();
          jawaban[f.key] = teks === '' ? null : teks;
        }
      }),
    );

    this.apiService
      .put(`employee-forms/${this.input.id}/${this.versi.id}`, {
        answers: jawaban,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('employeeForm.saved'),
            this.translate.instant('common.close'),
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this.beritahu(err);
        },
      });
  }

  private beritahu(err: any): void {
    this.snackBar.open(
      this.serverMessage.terjemahkan(err),
      this.translate.instant('common.close'),
      { duration: 5000 },
    );
  }

  tutup(): void {
    this.dialogRef.close(false);
  }
}
