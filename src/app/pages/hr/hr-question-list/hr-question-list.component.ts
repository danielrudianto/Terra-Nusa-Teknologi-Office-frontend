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
    this.muatUjian();
    this.muatSoal();
  }

  private muatUjian(): void {
    this.apiService.get('hr/tests', {}).subscribe({
      next: (res: any) => (this.ujian = res || []),
      error: () => (this.ujian = []),
    });
  }

  muatSoal(): void {
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
            err?.error?.detail ||
              this.translate.instant('hrQuestion.gagalMuat'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          ),
      })
      .add(() => (this.isLoading = false));
  }

  /**
   * Soal dikelompokkan per paket ujian.
   *
   * Daftar rata sepanjang tujuh puluh lima baris tidak memberi tahu soal itu
   * milik ujian yang mana, dan yang mencarinya harus membaca kolom nama
   * berulang kali.
   */
  get kelompok(): { nama: string; soal: Soal[] }[] {
    const peta = new Map<string, Soal[]>();
    for (const s of this.soal) {
      const k = s.testName || '—';
      if (!peta.has(k)) peta.set(k, []);
      peta.get(k)!.push(s);
    }
    return [...peta.entries()].map(([nama, soal]) => ({ nama, soal }));
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
              err?.error?.detail ||
                this.translate.instant('hrQuestion.gagalHapus'),
              this.translate.instant('common.close'),
              { duration: 4000 },
            ),
        });
      });
  }
}
