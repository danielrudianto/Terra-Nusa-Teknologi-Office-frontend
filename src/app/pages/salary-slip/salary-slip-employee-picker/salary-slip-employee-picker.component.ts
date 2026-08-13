import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { DataTransferService } from 'src/app/services/data-transfer.service';

interface KaryawanRingkas {
  id: number;
  name: string;
  nik: string | null;
  position: string | null;
}

/**
 * Buat slip gaji langsung dari daftar slip gaji.
 *
 * Sebelumnya slip hanya dapat dibuat lewat Data Master → Karyawan → pilih
 * orang → buat slip: tiga langkah, dua di antaranya di modul yang berbeda
 * dari tempat pekerjaannya.
 *
 * Bulan dan tahun sengaja diisi BULAN LALU. Gaji dibayarkan tanggal 10
 * sementara datanya disiapkan tanggal 5, sehingga yang hampir selalu
 * dimaksud adalah periode sebelumnya. Tetap dapat diubah.
 */
@Component({
  selector: 'app-salary-slip-employee-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './salary-slip-employee-picker.component.html',
  styleUrl: './salary-slip-employee-picker.component.scss',
})
export class SalarySlipEmployeePickerComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly transfer = inject(DataTransferService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  constructor(
    private dialogRef: MatDialogRef<SalarySlipEmployeePickerComponent>,
  ) {}

  isLoading = true;
  isSubmitting = false;

  karyawan: KaryawanRingkas[] = [];
  tersaring: KaryawanRingkas[] = [];

  readonly months = [
    { value: 0, label: 'Januari' },
    { value: 1, label: 'Februari' },
    { value: 2, label: 'Maret' },
    { value: 3, label: 'April' },
    { value: 4, label: 'Mei' },
    { value: 5, label: 'Juni' },
    { value: 6, label: 'Juli' },
    { value: 7, label: 'Agustus' },
    { value: 8, label: 'September' },
    { value: 9, label: 'Oktober' },
    { value: 10, label: 'November' },
    { value: 11, label: 'Desember' },
  ];

  /** Tahun ini dan empat tahun ke belakang. */
  readonly years: number[] = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  /*
   * Satu kontrol untuk karyawan, bukan dua.
   *
   * Nilainya objek karyawan; yang ditampilkan diambil `displayWith`.
   * Menyimpan teks pencarian pada kontrol terpisah membuat dua sumber
   * kebenaran yang harus dijaga tetap selaras — dan itu tidak perlu.
   */
  formGroup = new FormGroup({
    employee: new FormControl<KaryawanRingkas | null>(null, Validators.required),
    month: new FormControl<number | null>(null, Validators.required),
    year: new FormControl<number | null>(null, Validators.required),
  });

  ngOnInit(): void {
    /*
     * Bulan lalu sebagai bawaan.
     *
     * Tanggalnya disetel ke 1 lebih dulu: pada tanggal 31, mengurangi satu
     * bulan dari objek Date dapat melompat ke bulan berikutnya karena
     * bulan tujuannya tidak punya tanggal 31.
     */
    const lalu = new Date();
    lalu.setDate(1);
    lalu.setMonth(lalu.getMonth() - 1);

    this.formGroup.patchValue({
      month: lalu.getMonth(),
      year: lalu.getFullYear(),
    });

    this.muatKaryawan();

    // Selama yang diketik masih berupa teks, daftar disaring. Begitu sebuah
    // opsi dipilih, nilainya menjadi objek dan daftar dikembalikan utuh.
    this.formGroup.controls.employee.valueChanges.subscribe((v) =>
      this.saring(typeof v === 'string' ? v : ''),
    );
  }

  /** Yang tampil di kolom setelah dipilih. */
  displayKaryawan(k: KaryawanRingkas | string | null): string {
    return typeof k === 'string' ? k : (k?.name ?? '');
  }

  private muatKaryawan(): void {
    /*
     * Hanya karyawan yang masih bekerja.
     *
     * Tabel karyawan tidak punya kolom `isActive`; keaktifan ditentukan dua
     * hal: belum dihapus, dan tanggal berakhirnya belum lewat. Karyawan
     * yang sudah resign tidak pernah dibuatkan slip, dan menampilkannya
     * hanya memperpanjang daftar yang harus dibaca.
     */
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    const masihBekerja = (e: any): boolean => {
      if (e?.isDelete || e?.isDeleted) return false;
      if (!e?.endDate) return true;
      const akhir = new Date(e.endDate);
      return isNaN(akhir.getTime()) ? true : akhir >= hariIni;
    };

    this.api
      .get('employees', { page: 1, pageSize: 500 })
      .subscribe({
        next: (r: any) => {
          const data = r?.data ?? r ?? [];
          this.karyawan = data
            .filter(masihBekerja)
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              nik: e.nik ?? null,
              position: e.position ?? null,
            }));
          this.tersaring = this.karyawan;
        },
        error: () => {
          this.karyawan = [];
          this.tersaring = [];
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => (this.isLoading = false));
  }

  /**
   * Saring daftar karyawan.
   *
   * Dicocokkan PER KATA, bukan sebagai satu potongan utuh: mengetik
   * "Ade R" menemukan "Ade Ryanti", dan "Ryanti Ade" pun tetap menemukannya.
   * Pencocokan utuh menuntut urutan dan jarak yang persis — dan yang
   * mengetik nama orang jarang seteliti itu.
   */
  private saring(kata: string): void {
    const kataKunci = kata
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (!kataKunci.length) {
      this.tersaring = this.karyawan;
      return;
    }

    this.tersaring = this.karyawan.filter((k) => {
      const sasaran = `${k.name} ${k.nik ?? ''}`.toLowerCase();
      return kataKunci.every((q) => sasaran.includes(q));
    });
  }

  onSubmit(): void {
    if (this.formGroup.invalid) return;
    this.isSubmitting = true;

    const v = this.formGroup.getRawValue();

    /*
     * Diperiksa lebih dulu ke server.
     *
     * Slip untuk orang dan periode yang sama tidak boleh dibuat dua kali;
     * memeriksanya di sini berarti penggunanya tahu sebelum mengisi seluruh
     * rincian gaji, bukan setelah menekan simpan.
     */
    this.api
      .post('salary-slips/check', {
        userID: v.employee?.id,
        month: (v.month ?? 0) + 1,
        year: v.year,
      })
      .subscribe({
        next: () => {
          this.transfer.setData({
            userID: v.employee?.id,
            month: v.month,
            year: v.year,
          });
          this.dialog.closeAll();
          this.router.navigate(['/Salary-slip/Create']);
        },
        error: (e) => {
          this.isSubmitting = false;
          this.snackBar.open(
            e?.error?.detail ||
              e?.error?.message ||
              this.translate.instant('notify.createFailed'),
            'Close',
            { duration: 4000 },
          );
        },
      });
  }

  batal(): void {
    this.dialogRef.close();
  }
}
