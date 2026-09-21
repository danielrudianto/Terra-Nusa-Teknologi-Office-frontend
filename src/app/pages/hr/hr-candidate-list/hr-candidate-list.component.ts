import { ServerMessageService } from 'src/app/services/server-message.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ApiService } from 'src/app/services/api.service';
import { PermissionService } from 'src/app/services/permission.service';
import { DeleteConfirmationComponent } from 'src/app/components/delete-confirmation/delete-confirmation.component';
import { HrNilaiDialogComponent } from '../hr-nilai-dialog/hr-nilai-dialog.component';
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
  /** Baris yang hasilnya sudah dihapus; hanya muncul di ember `dihapus`. */
  isDelete?: boolean | number;
  createdAt: string;
  testName: string;
}

/** Jumlah pelamar per ember, untuk lencana di menu samping. */
interface Ringkasan {
  terbit: number;
  submit: number;
  wawancara: number;
  diterima: number;
  ditolak: number;
  dihapus: number;
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
    MatDividerModule,
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
  /**
   * Buka lembar jawaban untuk dinilai.
   *
   * Dialog, bukan halaman: yang memeriksa berpindah antar-pelamar berkali-
   * kali, dan halaman tersendiri berarti daftar ini dimuat ulang setiap kali
   * ia kembali — termasuk penyaring yang sudah ia setel.
   */
  bukaNilai(p: any): void {
    this.dialog
      .open(HrNilaiDialogComponent, {
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
        data: { id: p.id, name: p.name },
      })
      .afterClosed()
      .subscribe(() => this.muat());
  }

  private readonly serverMessage = inject(ServerMessageService);

  private readonly apiService = inject(ApiService);
  private readonly izin = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isLoading = false;
  ujian: Ujian[] = [];
  pelamar: Pelamar[] = [];

  ujianTerpilih: number | null = null;

  /** Pelamar yang pratinjau pesannya sedang dibuka. */
  intip: number | null = null;
  /*
   * Penyaring status yang lama DIBUANG, bukan disembunyikan.
   *
   * Ia menawarkan tujuh anak tangga sebagai daftar turun — bentuk yang
   * menuntut dibuka dulu sebelum memberi tahu apa pun, dan tidak pernah
   * menyebut BERAPA isinya. Enam ember di menu samping menjawab keduanya
   * sekaligus, dan menyisakan dua penyaring untuk hal yang sama hanya
   * membuat dua jalan menuju layar yang sama dengan hasil berbeda.
   *
   * Servernya TETAP menerima `status`; hanya layar ini yang berhenti
   * mengirimnya.
   */

  /**
   * Status yang boleh DISETEL dari layar ini.
   *
   * Sisanya disimpulkan server dari keadaan dokumennya — `dinilai` naik
   * sendiri begitu soal terakhir bernilai, dan mundur lagi bila ada nilai
   * yang dicabut. Menawarkannya sebagai tombol berarti daftar dapat
   * menyatakan "sudah dinilai" atas lembar yang belum disentuh siapa pun.
   */
  readonly statusManual = ['diwawancara', 'diterima', 'ditolak'];

  /**
   * ENAM EMBER di menu samping — urut perjalanan lamaran, bukan abjad.
   *
   * Larik harfiah berisi KODE saja, bukan objek berisi ikon dan label.
   * `kuncirangkaicek.py` melacak `"hrCandidate.ember_" + e` ke larik ini
   * dan memastikan keenam kuncinya ada di ketiga bahasa; larik berisi objek
   * membuatnya ikut membaca nama ikon sebagai kode ember, dan penjagaannya
   * berubah jadi temuan keliru.
   */
  readonly emberPilihan = [
    'terbit',
    'submit',
    'wawancara',
    'diterima',
    'ditolak',
    'dihapus',
  ];

  emberTerpilih = 'terbit';

  ringkasan: Ringkasan | null = null;

  /** Kata pencarian; dikirim ke server, bukan disaring di sini. */
  cari = '';

  /**
   * Penunda ketikan.
   *
   * Tanpa ini setiap aksara mengirim satu permintaan: mengetik satu nama
   * berarti belasan permintaan yang seluruhnya kecuali yang terakhir sudah
   * tidak diperlukan — dan jawaban yang datang tidak berurutan dapat
   * menimpa hasil yang benar dengan hasil yang lebih lama.
   */
  private jedaCari: any = null;

  private static readonly IKON: Record<string, string> = {
    terbit: 'send',
    submit: 'assignment_turned_in',
    wawancara: 'record_voice_over',
    diterima: 'task_alt',
    ditolak: 'cancel',
    dihapus: 'delete_outline',
  };

  /** Ikon satu ember. Fungsi, bukan medan larik — lihat `emberPilihan`. */
  ikonEmber(e: string): string {
    return HrCandidateListComponent.IKON[e] || 'folder';
  }

  /** Lencana satu ember; `null` selama ringkasannya belum datang. */
  jumlahEmber(e: string): number | null {
    const r = this.ringkasan as any;
    return r ? (r[e] ?? 0) : null;
  }

  pilihEmber(e: string): void {
    if (this.emberTerpilih === e) return;
    this.emberTerpilih = e;
    this.simpanKeAlamat();
    this.muat();
  }

  ketikCari(): void {
    if (this.jedaCari) clearTimeout(this.jedaCari);
    this.jedaCari = setTimeout(() => {
      this.simpanKeAlamat();
      this.muat();
    }, 300);
  }

  hapusCari(): void {
    this.cari = '';
    this.ketikCari();
  }

  /**
   * Ember dan kata pencarian disimpan di ALAMAT, bukan hanya di memori.
   *
   * Yang menyegarkan halaman sesudah menilai seseorang kembali ke ember yang
   * sama, bukan ke awal; dan alamatnya dapat dikirim ke orang lain apa
   * adanya. `replaceUrl` supaya tombol kembali tidak menelusuri setiap
   * ketikan satu per satu.
   */
  private simpanKeAlamat(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        kelompok: this.emberTerpilih === 'terbit' ? null : this.emberTerpilih,
        cari: this.cari.trim() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Hapus hasil hanya untuk level 5 — lihat `hr_recruitment:delete`. */
  bolehHapusHasil(): boolean {
    return this.izin.can('hr_recruitment', 'delete');
  }

  ubahStatus(p: any, status: string): void {
    this.apiService.put(`hr/candidates/${p.id}/status`, { status }).subscribe({
      next: () => {
        this.snackBar.open(
          this.translate.instant('hrCandidate.statusDiubah'),
          'Close',
          { duration: 2500 },
        );
        // Lencananya ikut berubah: satu pelamar baru saja pindah ember.
        // Tanpa ini angkanya basi persis pada saat orang melihatnya.
        this.muatRingkasan();
        this.muat();
      },
      error: (err) =>
        this.snackBar.open(this.serverMessage.terjemahkan(err), 'Close', {
          duration: 5000,
        }),
    });
  }

  /**
   * Hapus hasil ujian dan kembalikan pelamarnya ke awal.
   *
   * Dikonfirmasi lebih dulu: jawabannya dibuang dan TIDAK dapat
   * dikembalikan. Tautannya sendiri tidak berubah, jadi ujiannya dapat
   * dikerjakan lagi — itu gunanya.
   */
  hapusHasil(p: any): void {
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('hrCandidate.hapusHasilJudul'),
          prompt: this.translate.instant('hrCandidate.hapusHasilPrompt', {
            nama: p.name,
          }),
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (!setuju) return;
        this.apiService
          .delete(`hr/candidates/${p.id}/hasil`)
          .subscribe({
            next: () => {
              this.snackBar.open(
                this.translate.instant('hrCandidate.hasilDihapus'),
                'Close',
                { duration: 2500 },
              );
              this.muatRingkasan();
              this.muat();
            },
            error: (err) =>
              this.snackBar.open(this.serverMessage.terjemahkan(err), 'Close', {
                duration: 5000,
              }),
          });
      });
  }


  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const k = (q.get('kelompok') || '').trim();
    if (this.emberPilihan.includes(k)) this.emberTerpilih = k;
    this.cari = (q.get('cari') || '').trim();

    this.muatUjian();
    this.muatRingkasan();
    this.muat();
  }

  /**
   * Lencana dimuat TERPISAH dari daftarnya.
   *
   * Angkanya harus tetap benar untuk ember yang sedang tidak dibuka —
   * menghitungnya dari `pelamar` hanya akan menampilkan jumlah baris yang
   * kebetulan sedang tampil, dan lima lencana lainnya menjadi nol.
   */
  muatRingkasan(): void {
    const param: any = {};
    if (this.ujianTerpilih) param.testID = this.ujianTerpilih;
    this.apiService.get('hr/candidates/ringkasan', param).subscribe({
      next: (res: any) => (this.ringkasan = res || null),
      error: () => (this.ringkasan = null),
    });
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
    if (this.emberTerpilih) param.ember = this.emberTerpilih;
    if (this.cari.trim()) param.cari = this.cari.trim();

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
        if (hasil) {
          this.muatRingkasan();
          this.muat();
        }
      });
  }
}
