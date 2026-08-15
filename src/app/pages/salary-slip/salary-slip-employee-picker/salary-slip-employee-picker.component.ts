import { CommonModule } from '@angular/common';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
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
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';

/** Paling banyak lima saran ditampilkan sekaligus. */
const MAKS_SARAN = 5;

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
    DialogGeserDirective,
  ],
  templateUrl: './salary-slip-employee-picker.component.html',
  styleUrl: './salary-slip-employee-picker.component.scss',
})
export class SalarySlipEmployeePickerComponent {
  private readonly serverMessage = inject(ServerMessageService);
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

  /*
   * Bulan punya DUA sebutan, dan keduanya diperlukan.
   *
   * `key`  — untuk yang tampil di layar; ikut bahasa aplikasi.
   * `nama` — nama Indonesia tetap, dipakai pada dokumen yang dicetak.
   *
   * Slip gaji seluruhnya berbahasa Indonesia ("SLIP GAJI", "Periode"),
   * sehingga bulannya harus Indonesia berapa pun bahasa aplikasinya.
   */
  readonly months: { value: number; key: string; nama: string }[] = [
    { value: 0, key: 'common.january', nama: 'Januari' },
    { value: 1, key: 'common.february', nama: 'Februari' },
    { value: 2, key: 'common.march', nama: 'Maret' },
    { value: 3, key: 'common.april', nama: 'April' },
    { value: 4, key: 'common.may', nama: 'Mei' },
    { value: 5, key: 'common.june', nama: 'Juni' },
    { value: 6, key: 'common.july', nama: 'Juli' },
    { value: 7, key: 'common.august', nama: 'Agustus' },
    { value: 8, key: 'common.september', nama: 'September' },
    { value: 9, key: 'common.october', nama: 'Oktober' },
    { value: 10, key: 'common.november', nama: 'November' },
    { value: 11, key: 'common.december', nama: 'Desember' },
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
    /*
     * Ditunda 500 ms.
     *
     * Menyaring pada setiap ketukan berarti daftar disusun ulang belasan
     * kali untuk satu nama. Jeda ini menunggu sampai pengetikan berhenti
     * sejenak — dan `distinctUntilChanged` mencegah penyusunan ulang ketika
     * teksnya sebenarnya tidak berubah.
     */
    this.formGroup.controls.employee.valueChanges
      .pipe(
        map((v) => (typeof v === 'string' ? v : '')),
        debounceTime(500),
        distinctUntilChanged(),
      )
      .subscribe((kata) => this.saring(kata));
  }

  /** Yang tampil di kolom setelah dipilih. */
  displayKaryawan(k: KaryawanRingkas | string | null): string {
    return typeof k === 'string' ? k : (k?.name ?? '');
  }

  /** Terisi bila daftar berhasil dimuat tetapi tidak ada satu pun isinya. */
  kosong = false;

  private muatKaryawan(): void {
    /*
     * `status=active` sengaja TIDAK dipakai.
     *
     * Di server, nilai itu berarti `endDate IS NULL` — sedangkan karyawan
     * AKN umumnya punya tanggal berakhir kontrak yang terisi meski masih
     * bekerja. Memakainya menyaring habis seluruh daftar.
     *
     * Keaktifan ditentukan di sini: belum dihapus, dan tanggal berakhirnya
     * belum lewat.
     */
    this.api
      .get('employees', { page: 1, pageSize: 500 })
      .subscribe({
        next: (r: any) => {
          // Bentuk balikan diterima apa adanya: {data: []}, {employees: []},
          // atau larik langsung — supaya perubahan di server tidak diam-diam
          // membuat daftarnya kosong.
          const data: any[] = Array.isArray(r)
            ? r
            : (r?.data ?? r?.employees ?? []);

          const hariIni = new Date();
          hariIni.setHours(0, 0, 0, 0);
          const masihBekerja = (e: any): boolean => {
            if (e?.isDelete || e?.isDeleted) return false;
            if (!e?.endDate) return true;
            const akhir = new Date(e.endDate);
            return isNaN(akhir.getTime()) ? true : akhir >= hariIni;
          };

          this.karyawan = data
            .filter(masihBekerja)
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              nik: e.nik ?? null,
              position: e.position ?? null,
            }));
          this.tersaring = this.karyawan.slice(0, MAKS_SARAN);
          this.kosong = this.karyawan.length === 0;
        },
        error: () => {
          this.karyawan = [];
          this.tersaring = [];
          this.kosong = true;
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
      this.tersaring = this.karyawan.slice(0, MAKS_SARAN);
      return;
    }

    this.tersaring = this.karyawan
      .filter((k) => {
        const sasaran = `${k.name} ${k.nik ?? ''}`.toLowerCase();
        return kataKunci.every((q) => sasaran.includes(q));
      })
      // Paling banyak lima. Daftar panjang di dalam kotak kecil tidak
      // membantu: yang dicari hampir selalu ada di baris teratas, dan
      // sisanya hanya menambah yang harus dibaca.
      .slice(0, MAKS_SARAN);
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
            this.serverMessage.terjemahkan(e, 'notify.createFailed'),
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
