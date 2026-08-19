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
import { CanDirective } from 'src/app/directives/can.directive';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { HrCandidateFormComponent } from '../hr-candidate-form/hr-candidate-form.component';

interface Ujian {
  id: number;
  name: string;
  jumlahSoal: number;
  /** Durasi pengerjaan; disebut pada pesan undangan. */
  durationMinutes: number;
}

interface Pelamar {
  id: number;
  testID: number;
  name: string;
  gender: string | null;
  email: string | null;
  phoneNumber: string | null;
  token: string;
  expiresAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  status: string;
  createdAt: string;
  testName: string;
}

/**
 * Pelamar ujian rekrutmen.
 *
 * Didaftarkan hanya dengan nama dan jenis kelamin; sisanya diisi pelamar
 * sendiri lewat tautan bertoken. Mengumpulkan alamat dan kontak lebih dulu
 * justru pekerjaan yang hendak dihilangkan.
 */
@Component({
  selector: 'app-hr-candidate-list',
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
  templateUrl: './hr-candidate-list.component.html',
  styleUrl: './hr-candidate-list.component.scss',
})
export class HrCandidateListComponent implements OnInit {
  private readonly serverMessage = inject(ServerMessageService);

  private readonly apiService = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  isLoading = false;
  ujian: Ujian[] = [];
  pelamar: Pelamar[] = [];

  ujianTerpilih: number | null = null;

  /** Pelamar yang pratinjau pesannya sedang dibuka. */
  intip: number | null = null;
  statusTerpilih = '';

  readonly statusPilihan = ['baru', 'mengerjakan', 'selesai', 'diterima', 'ditolak'];

  ngOnInit(): void {
    this.muatUjian();
    this.muat();
  }

  private muatUjian(): void {
    this.apiService.get('hr/tests', {}).subscribe({
      next: (res: any) => (this.ujian = res || []),
      error: () => (this.ujian = []),
    });
  }

  muat(): void {
    this.isLoading = true;

    // Parameter kosong tidak dikirim: teks kosong bukan `None` bagi FastAPI,
    // dan ia menolak seluruh permintaan dengan 422 sebelum satu baris dibaca.
    const param: any = {};
    if (this.ujianTerpilih) param.testID = this.ujianTerpilih;
    if (this.statusTerpilih) param.status = this.statusTerpilih;

    this.apiService
      .get('hr/candidates', param)
      .subscribe({
        next: (res: any) => (this.pelamar = res || []),
        error: (err) =>
          this.snackBar.open(
            this.serverMessage.terjemahkan(err, 'hrCandidate.gagalMuat'),
            this.translate.instant('common.close'),
            { duration: 4000 },
          ),
      })
      .add(() => (this.isLoading = false));
  }

  /** Tautan pengerjaan untuk satu pelamar. */
  tautan(p: Pelamar): string {
    return `${window.location.origin}/exam/${p.token}`;
  }

  /**
   * Sisa waktu sebagai kalimat, bukan tanggal.
   *
   * "Berlaku sampai 24 Agu 2026, 14:32" menuntut yang membacanya menghitung
   * sendiri; "2 hari lagi" langsung memberi tahu seberapa mendesak.
   */
  sisaWaktu(p: Pelamar): string {
    const selisih = new Date(p.expiresAt).getTime() - Date.now();
    if (selisih <= 0) return this.translate.instant('hrCandidate.kedaluwarsa');

    const jam = Math.floor(selisih / 3_600_000);
    if (jam >= 24) {
      return this.translate.instant('hrCandidate.sisaHari', {
        n: Math.floor(jam / 24),
      });
    }
    return this.translate.instant('hrCandidate.sisaJam', { n: Math.max(jam, 1) });
  }

  kedaluwarsa(p: Pelamar): boolean {
    return new Date(p.expiresAt).getTime() <= Date.now();
  }

  salinTautan(p: Pelamar): void {
    navigator.clipboard?.writeText(this.tautan(p)).then(
      () =>
        this.snackBar.open(
          this.translate.instant('hrCandidate.tautanTersalin', {
            nama: p.name,
          }),
          this.translate.instant('common.close'),
          { duration: 3000 },
        ),
      () => {},
    );
  }

  /**
   * Salin seluruh tautan yang tampil sekaligus.
   *
   * Mengirimnya satu per satu lewat WhatsApp menuntut membuka dialog ini
   * berkali-kali; satu tempelan berisi seluruh daftar jauh lebih cepat.
   */
  salinSemua(): void {
    const teks = this.pelamar
      .filter((p) => !this.kedaluwarsa(p))
      .map((p) => `${p.name}\n${this.tautan(p)}`)
      .join('\n\n');

    if (!teks) return;
    navigator.clipboard?.writeText(teks).then(
      () =>
        this.snackBar.open(
          this.translate.instant('hrCandidate.semuaTersalin', {
            n: this.pelamar.filter((p) => !this.kedaluwarsa(p)).length,
          }),
          this.translate.instant('common.close'),
          { duration: 3000 },
        ),
      () => {},
    );
  }

  /**
   * Sapaan sesuai jenis kelamin.
   *
   * Kosong bila tidak diketahui — menebaknya dari nama lebih buruk daripada
   * menyapa tanpa sebutan, dan salah sapa pada surat resmi pertama sulit
   * diperbaiki kesannya.
   */
  private sapaan(p: Pelamar): string {
    if (p.gender === 'L') return 'Bapak';
    if (p.gender === 'P') return 'Ibu';
    return 'Bapak/Ibu';
  }

  private durasiUjian(p: Pelamar): number {
    return this.ujian.find((u) => u.id === p.testID)?.durationMinutes ?? 60;
  }

  /**
   * Sisa berlaku dalam JAM, untuk pesan undangan.
   *
   * Disebut dalam jam karena itu yang tertulis pada pesan yang sudah biasa
   * dikirim — "kedaluwarsa 48 jam" lebih tegas daripada "2 hari", dan yang
   * membacanya tidak perlu menebak dihitung dari kapan.
   */
  private jamBerlaku(p: Pelamar): number {
    const selisih = new Date(p.expiresAt).getTime() - Date.now();
    return Math.max(1, Math.round(selisih / 3_600_000));
  }

  /**
   * Susun pesan undangan ujian, siap ditempel ke WhatsApp.
   *
   * Angka durasi dan masa berlaku diambil dari DATA, bukan ditulis keras:
   * paket ujian boleh punya durasi berbeda, dan masa berlaku ditentukan saat
   * tokennya diterbitkan. Menuliskannya tetap berarti pesan menjanjikan hal
   * yang tidak sesuai dengan yang sungguh berlaku.
   */
  pesanUndangan(p: Pelamar): string {
    const sapa = this.sapaan(p);
    return [
      `Terima kasih untuk konfirmasi yang ${sapa} berikan.`,
      '',
      `Ujian akan dilakukan secara online dan dapat diakses melalui tautan berikut:`,
      this.tautan(p),
      '',
      `Ujian akan terbagi dalam 3 (tiga) bagian, yaitu: a.) Civil Engineering Test; b.) Geotechnical Test; dan c.) Drawing Test.`,
      '',
      'Catatan:',
      `1. Waktu ujian adalah ${this.durasiUjian(p)} menit. Timer akan berjalan setelah tautan dibuka. Timer tidak akan berhenti bila sudah mulai berjalan. Bilamana peserta tidak submit jawaban setelah timer berakhir, ujian dianggap gagal.`,
      '2. Mohon isikan biodata sesuai instruksi dalam ujian. Isi dengan data-data yang sebenar-benarnya.',
      '3. Mohon siapkan device untuk membuat gambar dalam format CAD dan PDF.',
      `4. Tautan akan kedaluwarsa ${this.jamBerlaku(p)} jam dari sekarang.`,
    ].join('\n');
  }

  salinPesan(p: Pelamar): void {
    navigator.clipboard?.writeText(this.pesanUndangan(p)).then(
      () =>
        this.snackBar.open(
          this.translate.instant('hrCandidate.pesanTersalin', {
            nama: p.name,
          }),
          this.translate.instant('common.close'),
          { duration: 3000 },
        ),
      () => {},
    );
  }

  daftarkan(): void {
    this.dialog
      .open(HrCandidateFormComponent, {
        width: '760px',
        maxWidth: '96vw',
        autoFocus: false,
        data: { ujian: this.ujian, testID: this.ujianTerpilih },
      })
      .afterClosed()
      .subscribe((hasil) => {
        if (hasil) this.muat();
      });
  }
}
