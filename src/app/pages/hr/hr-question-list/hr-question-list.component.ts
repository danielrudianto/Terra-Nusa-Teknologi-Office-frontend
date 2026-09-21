import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { HrPaketDialogComponent } from '../hr-paket-dialog/hr-paket-dialog.component';
import { CanDirective } from 'src/app/directives/can.directive';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { HrQuestionFormComponent } from '../hr-question-form/hr-question-form.component';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';

interface Ujian {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  jumlahSoal: number;
}

interface Soal {
  id: number;
  testID: number;
  sortOrder: number;
  question: string;
  notes: string | null;
  attachment: string | null;
  category: string;
  maxScore: number;
  allowsUpload: boolean;
  testName: string;
}

/**
 * Bank soal ujian rekrutmen.
 *
 * Soalnya esai dan dinilai orang; tidak ada kunci jawaban yang disimpan di
 * sini. Yang ditampilkan pertanyaan, catatan, kategori, dan nilai maksimalnya.
 */
@Component({
  selector: 'app-hr-question-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TranslatePipe,
    CanDirective,
    HeaderTitleComponent,
  ],
  templateUrl: './hr-question-list.component.html',
  styleUrl: './hr-question-list.component.scss',
})
export class HrQuestionListComponent implements OnInit {
  /** Paket yang sedang dipilih di penyaring; untuk tombol Ubah. */
  paketTerpilih(): any {
    return this.ujian.find((u: any) => u.id === this.ujianTerpilih) ?? null;
  }

  /**
   * Buat atau ubah paket ujian.
   *
   * Daftar paket DIMUAT ULANG setelahnya, bukan diubah di tempat: jumlah
   * soalnya dihitung server, dan menyusunnya sendiri di layar berarti dua
   * tempat yang harus sepakat tentang soal mana yang terhapus.
   */
  bukaPaket(paket?: any): void {
    this.dialog
      .open(HrPaketDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        autoFocus: false,
        data: { paket },
      })
      .afterClosed()
      .subscribe((berubah) => {
        if (berubah) this.muatUjian();
      });
  }

  private readonly serverMessage = inject(ServerMessageService);

  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isLoading = false;
  ujian: Ujian[] = [];
  soal: Soal[] = [];

  ujianTerpilih: number | null = null;
  cari = '';

  ngOnInit(): void {
    // Soal TIDAK dimuat di sini. Satu paket harus terpilih lebih dulu, dan
    // paketnya baru diketahui setelah daftarnya datang — lihat `muatUjian`.
    this.muatUjian();
  }

  /**
   * Daftar paket, lalu PILIH SATU.
   *
   * Sebelumnya pemilihnya punya pilihan "Semua" dan bermula tanpa pilihan.
   * Hasilnya membingungkan: kotaknya tampak kosong seolah belum memilih apa
   * pun, sementara daftar di bawahnya menampilkan judul paket sebagai
   * kepala kelompok — dan judul itu terbaca sebagai pilihan yang sedang
   * berlaku. Yang melihatnya tidak dapat menyimpulkan apakah ia sedang
   * melihat satu paket atau seluruhnya.
   *
   * Sekarang TEPAT SATU paket, dan PADA MULANYA TIDAK ADA — layarnya
   * meminta memilih dulu, seperti Master Data. Dua alasannya:
   *
   *   1. Tidak ada yang dapat salah dibaca. Kotak kosong berarti belum
   *      memilih, dan daftarnya pun kosong; keduanya menyatakan hal yang
   *      sama, bukan dua hal yang bertentangan.
   *   2. Membukanya tidak lagi menarik tujuh puluh lima soal yang belum
   *      tentu dilihat siapa pun.
   *
   * Paket yang sudah dipilih DIPERTAHANKAN selama masih ada — misalnya
   * setelah menambah atau mengubah paket. Yang hilang dilepas, bukan
   * diganti dengan paket lain diam-diam.
   */
  muatUjian(): void {
    this.apiService.get('hr/tests', {}).subscribe({
      next: (res: any) => {
        this.ujian = res || [];
        if (
          this.ujianTerpilih &&
          !this.ujian.some((u) => u.id === this.ujianTerpilih)
        ) {
          this.ujianTerpilih = null;
        }
        this.muatSoal();
      },
      error: () => {
        this.ujian = [];
        this.ujianTerpilih = null;
        this.soal = [];
      },
    });
  }

  muatSoal(): void {
    /*
     * Tanpa paket terpilih tidak ada yang dapat ditampilkan.
     *
     * Meminta seluruh soal di sini akan mengembalikan daftar tujuh puluh
     * lima baris dari paket yang berbeda-beda — persis keadaan yang
     * membingungkan itu, hanya tanpa pemilih yang menjelaskannya.
     */
    if (!this.ujianTerpilih) {
      this.soal = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    /*
     * Parameter kosong TIDAK dikirim sama sekali.
     *
     * `?testID=` mengirim teks kosong, dan teks kosong bukan `None` bagi
     * FastAPI: ia mencoba mengubahnya menjadi angka, gagal, lalu menolak
     * seluruh permintaan dengan 422 — sebelum satu baris pun dibaca.
     */
    const param: any = {};
    if (this.ujianTerpilih) param.testID = this.ujianTerpilih;
    if (this.cari?.trim()) param.keyword = this.cari.trim();

    this.apiService
      .get('hr/questions', param)
      .subscribe({
        next: (res: any) => (this.soal = res || []),
        error: (err) =>
          this.snackBar.open(
            this.serverMessage.terjemahkan(err, 'hrQuestion.gagalMuat'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          ),
      })
      .add(() => (this.isLoading = false));
  }


  /** Berapa soal yang sedang tampil; dipakai pada kepala halaman. */
  get jumlahTampil(): number {
    return this.soal.length;
  }

  buatSoal(): void {
    this.dialog
      .open(HrQuestionFormComponent, {
        width: '720px',
        maxWidth: '96vw',
        autoFocus: false,
        data: { ujian: this.ujian, testID: this.ujianTerpilih },
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (hasil) {
          this.muatSoal();
          this.muatUjian();
        }
      });
  }

  ubahSoal(s: Soal): void {
    this.dialog
      .open(HrQuestionFormComponent, {
        width: '720px',
        maxWidth: '96vw',
        autoFocus: false,
        data: { ujian: this.ujian, soal: s },
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (hasil) this.muatSoal();
      });
  }

  hapusSoal(s: Soal): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('hrQuestion.hapusJudul'),
          // Potongan pertanyaannya ikut disebut.
          //
          // "Hapus soal ini?" tanpa isinya membuat yang menekannya tidak
          // dapat memastikan ia sedang menghapus yang mana.
          prompt: this.translate.instant('hrQuestion.hapusPesan', {
            soal: s.question.slice(0, 80),
          }),
        },
      })
      .afterClosed()
      .subscribe((ya) => {
        if (!ya) return;
        this.apiService.delete(`hr/questions/${s.id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('hrQuestion.terhapus'),
              this.translate.instant('common.close'),
              { duration: 3000 },
            );
            this.muatSoal();
            this.muatUjian();
          },
          error: (err) =>
            this.snackBar.open(
              this.serverMessage.terjemahkan(err, 'hrQuestion.gagalHapus'),
              this.translate.instant('common.close'),
              { duration: 4000 },
            ),
        });
      });
  }
}
