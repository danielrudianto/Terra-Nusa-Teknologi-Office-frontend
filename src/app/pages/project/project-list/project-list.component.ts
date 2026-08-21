import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ProjectLookupService } from '../../../services/project-lookup.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { SettingsService } from '../../../services/setting.service';
import { HeaderTitleComponent } from '../../../components/header-title/header-title.component';
import { CanDirective } from '../../../directives/can.directive';
import { DeleteConfirmationComponent } from '../../../components/delete-confirmation/delete-confirmation.component';
import { ProjectCreateComponent } from '../project-create/project-create.component';
import { ProjectUpdateComponent } from '../project-update/project-update.component';
import { Project, keadaanProyek } from '../project.model';
import { RefreshButtonComponent } from '../../../components/refresh-button/refresh-button.component';
import { ProjectMarginListComponent } from '../project-margin-list/project-margin-list.component';

/** Dua wajah satu halaman: daftar proyek biasa, atau daftar marginnya. */
type ModeProyek = 'proyek' | 'laporan';

/**
 * Keadaan yang dapat DITAMBAHKAN ke daftar, di luar yang berjalan.
 *
 * Di tingkat modul, bukan milik instans: urutannya menentukan urutan untai
 * yang dikirim ke server, dan itu bagian dari kesepakatan dengan server —
 * bukan keadaan sebuah layar.
 */
const KEADAAN = ['berjalan', 'retensi', 'selesai', 'batal'] as const;

/**
 * Yang berlaku ketika tidak ada satu pun keping terpilih.
 *
 * Daftar yang tidak menampilkan apa-apa bukan jawaban atas pertanyaan siapa
 * pun — dan keadaan itu paling mudah terjadi tanpa sengaja, dengan mematikan
 * keping terakhir.
 */
const BAWAAN = 'berjalan';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    CanDirective,
    RefreshButtonComponent,
    ProjectMarginListComponent,
  ],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss',
})
export class ProjectListComponent implements OnInit {
  private readonly lookup = inject(ProjectLookupService);
  constructor(
    public settings: SettingsService,
    private apiService: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private router: Router,
  ) {}

  @ViewChild('table') table: MatTable<any> | undefined;

  /**
   * Halaman ini DUA muka, dipilih lewat satu sakelar di atas saringannya:
   *
   *   'proyek'  -> daftar proyek biasa (nama, kode, keadaan) — layar ini.
   *   'laporan' -> daftar margin/nominal (kontrak, tertagih, biaya, untung).
   *
   * Sebelumnya keduanya halaman terpisah di menu — "Proyek" dan "Laporan
   * Proyek" — dan sering tertukar karena namanya mirip dan isinya sama-sama
   * daftar proyek. Disatukan menjadi satu halaman: yang berbeda hanya
   * "sedang melihat proyeknya, atau angkanya".
   *
   * Modenya ikut ke ALAMAT (`?mode=laporan`) supaya menyegarkan atau
   * membagikan tautannya tetap membuka muka yang sama.
   */
  mode: ModeProyek = 'proyek';

  searchControl = new FormControl('');
  projects: Project[] = [];
  count = 0;
  page = 0;
  pageSize: number = this.settings.pageSize;
  isLoading = false;
  sortBy = 'code';
  sortByDirection: 'asc' | 'desc' = 'asc';

  /**
   * Penyaring keadaan. `null` berarti semua.
   *
   * Disimpan sebagai satu nilai, bukan dua sakelar boolean: kombinasi
   * "aktif sekaligus batal" tidak punya arti, dan menyediakan dua sakelar
   * membuat kombinasi itu bisa dipilih.
   */
  /**
   * Keadaan yang ditampilkan.
   *
   * Seluruhnya PILIHAN, termasuk yang berjalan — daftar berisi proyek masa
   * retensi saja adalah pertanyaan yang sah, dan bentuk sebelumnya tidak
   * dapat menjawabnya karena yang berjalan selalu ikut.
   *
   * Bawaannya yang berjalan saja: proyek selesai dan batal tidak pernah
   * dihapus — biayanya tetap harus dapat ditinjau — sehingga daftarnya terus
   * memanjang setiap tahun.
   *
   * Disimpan sebagai LARIK, bukan himpunan: `[value]` pada daftar kepingnya
   * membandingkan rujukan, dan himpunan yang harus disalin pada setiap
   * penggambaran menghasilkan rujukan baru terus-menerus.
   */
  readonly KEADAAN = KEADAAN;

  /*
   * Dinamai `saring`, bukan `keadaan`.
   *
   * `keadaan(p)` sudah ada sebagai pembaca keadaan SEBUAH BARIS, dipakai
   * papan tampilan untuk mewarnai kepingnya. Dua hal berbeda dengan satu nama
   * membuat salah satunya diam-diam menimpa yang lain.
   */
  saring: string[] = [BAWAAN];

  ikut(k: string): boolean {
    return this.saring.includes(k);
  }

  /**
   * Keadaan yang dikirim ke server.
   *
   * Kosong berarti yang berjalan — bukan berarti tidak ada. Dirakit di satu
   * tempat supaya daftar dan penghitungnya tidak dapat berbeda.
   */
  private get keadaanDiminta(): string {
    const dipilih = KEADAAN.filter((k) => this.ikut(k));
    return (dipilih.length ? dipilih : [BAWAAN]).join(',');
  }

  displayedColumns = [
    'code',
    'name',
    'contractValue',
    'contractCount',
    'state',
    'action',
  ];

  /**
   * Diambil lewat `inject`, bukan lewat konstruktor.
   *
   * Menambah parameter konstruktor mematahkan setiap pengujian yang membangun
   * komponen ini sendiri — dan yang gagal bukan hal yang sedang diubah,
   * sehingga sebabnya sulit dikenali oleh yang membaca hasilnya.
   *
   * `optional` karena pengujian menjalankan komponen ini di luar router.
   */
  private readonly route = inject(ActivatedRoute, { optional: true });

  ngOnInit(): void {
    this.bacaAlamat();
    // Muka 'laporan' memuat datanya sendiri lewat komponen marginnya; daftar
    // proyek hanya perlu diambil bila memang muka itu yang tampil.
    if (this.mode === 'proyek') this.fetch();
    this.searchControl.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => this.fetch(0));
  }

  /**
   * Keadaan daftar dibaca dari ALAMATNYA lebih dulu.
   *
   * Sama seperti daftar Tender dan Pembelian. Tanpa ini, menekan segarkan
   * atau membagikan tautannya mengembalikan daftar ke halaman pertama tanpa
   * saringan — dan yang membukanya melihat sesuatu yang lain dari yang
   * dimaksud pengirimnya, tanpa tahu bahwa yang dilihatnya berbeda.
   */
  private bacaAlamat(): void {
    const p = this.route?.snapshot?.queryParams ?? {};
    if (p['mode'] === 'laporan') this.mode = 'laporan';
    if (p['page']) this.page = Math.max(0, +p['page'] - 1);
    if (p['pageSize']) this.pageSize = +p['pageSize'];
    if (p['sortBy']) this.sortBy = p['sortBy'];
    if (p['sortByDirection'] === 'asc' || p['sortByDirection'] === 'desc') {
      this.sortByDirection = p['sortByDirection'];
    }
    if (p['cari']) this.searchControl.setValue(p['cari'], { emitEvent: false });

    /*
     * Keadaan disaring terhadap yang DIKENAL.
     *
     * Alamatnya dapat diketik siapa saja. Nama keadaan yang tidak dikenal
     * diteruskan ke server sebagai saringan yang tidak cocok dengan apa pun,
     * dan daftarnya kosong tanpa satu pun keterangan mengapa.
     *
     * Kosong sesudah disaring berarti kembali ke bawaannya — sama seperti
     * mematikan seluruh kepingnya dari layar.
     */
    if (p['keadaan']) {
      const diminta = String(p['keadaan']).split(',');
      const sah = (KEADAAN as readonly string[]).filter((k) =>
        diminta.includes(k),
      );
      this.saring = sah.length ? sah : [BAWAAN];
    }
  }

  /** Tulis keadaan daftar ke alamatnya, tanpa menambah riwayat peramban. */
  private simpanKeAlamat(): void {
    if (!this.route) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mode: this.mode === 'laporan' ? 'laporan' : null,
        page: this.page + 1,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        keadaan: this.keadaanDiminta,
        cari: (this.searchControl.value ?? '').trim() || null,
      },
      /*
       * Riwayat peramban TIDAK ditambah.
       *
       * Menambahnya tiap kali kolom ditekan membuat tombol kembali
       * menelusuri ulang setiap pengurutan, bukan kembali ke layar
       * sebelumnya — dan pada daftar yang kerap diurutkan, tombol itu
       * menjadi tidak dapat dipakai sama sekali.
       */
      replaceUrl: true,
    });
  }

  fetch(targetPage: number = this.page): void {
    this.isLoading = true;
    this.page = targetPage;

    const params: Record<string, any> = {
      page: targetPage + 1,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortByDirection: this.sortByDirection,
    };
    const kata = (this.searchControl.value ?? '').trim();
    if (kata) params['keyword'] = kata;

    // Dikirim hanya bila memang menyaring. `isActive=false` adalah
    // penyaringan yang sah, jadi tidak boleh diputuskan lewat kebenaran nilai.
    /*
     * Keadaan dikirim sebagai DAFTAR, bukan tiga penanda boolean.
     *
     * "Berjalan ATAU tunggu retensi" tidak dapat dinyatakan oleh penanda yang
     * saling DAN — `isRetention=false` dan `isRetention=true` sekaligus tidak
     * berarti apa-apa.
     */
    params['keadaan'] = this.keadaanDiminta;

    this.apiService
      .get('projects', params)
      .subscribe({
        next: (res: any) => {
          this.projects = res?.data ?? [];
          this.count = res?.count ?? 0;
          this.table?.renderRows();
        },
        error: () => {
          this.snackBar.open(
            this.translate.instant('notify.loadFailed'),
            'Close',
            { duration: 3000 },
          );
        },
      })
      .add(() => {
        this.isLoading = false;
      });

    // Sesudah permintaannya berangkat, bukan sebelum: alamatnya menggambarkan
    // apa yang sedang dimuat, dan tidak menunggu jawabannya.
    this.simpanKeAlamat();
  }

  /**
   * Keping keadaan ditekan.
   *
   * Nilainya dipakai apa adanya dari peristiwa daftar kepingnya — bukan
   * dibalik dari keadaan sekarang. Membalik dari keadaan sekarang adalah yang
   * dahulu membuat daftar ini berkedip tanpa henti: `[selected]` menyalakan
   * peristiwanya sendiri saat layar dibuka, penanganya membatalkannya, dan
   * keduanya saling menyalakan.
   *
   * Mematikan SELURUHNYA dibiarkan — kepingnya memang boleh kosong — tetapi
   * yang dikirim ke server tetap "berjalan". Daftar yang tidak menampilkan
   * apa-apa bukan jawaban atas pertanyaan siapa pun.
   */
  ubahKeadaan(terpilih: string[] | null | undefined): void {
    const sah = (KEADAAN as readonly string[]).filter((k) =>
      (terpilih ?? []).includes(k),
    );

    // Tidak ada yang berubah: tidak ada pula yang perlu dimuat ulang.
    if (sah.length === this.saring.length && sah.every((k) => this.ikut(k))) {
      return;
    }

    this.saring = sah;
    this.fetch(0);
  }

  /**
   * Pindah muka: daftar proyek <-> daftar margin.
   *
   * Nilainya dari sakelarnya dipakai apa adanya; bila tidak berubah, tidak
   * ada yang dikerjakan. Pindah ke 'proyek' memuat ulang daftarnya (muka itu
   * memang ditarik di sini); pindah ke 'laporan' cukup menulis alamatnya —
   * komponen marginnya menarik datanya sendiri saat muncul.
   */
  gantiMode(m: ModeProyek | null | undefined): void {
    if (!m || m === this.mode) return;
    this.mode = m;
    if (m === 'proyek') {
      this.fetch(this.page);
      return;
    }
    // Muka laporan: tak lewat fetch(), jadi alamatnya ditulis di sini.
    if (this.route) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { mode: 'laporan' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  changeSortBy(kolom: string): void {
    if (this.sortBy === kolom) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = kolom;
      this.sortByDirection = 'asc';
    }
    this.fetch(0);
  }

  changePage(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.fetch(e.pageIndex);
  }

  keadaan(p: Project): string {
    return keadaanProyek(p);
  }

  buatProyek(): void {
    this.dialog
      .open(ProjectCreateComponent, { autoFocus: false })
      .afterClosed()
      .subscribe((berhasil) => {
        if (berhasil) {
          // Daftar pemilih proyek dimuat sekali per sesi; tanpa ditandai
          // usang, proyek yang baru ditambahkan tidak akan muncul di
          // formulir mana pun sampai halaman dimuat ulang.
          this.lookup.segarkan();
          this.fetch(0);
        }
      });
  }

  ubahProyek(p: Project, ev?: Event): void {
    ev?.stopPropagation();
    this.dialog
      .open(ProjectUpdateComponent, { data: p, autoFocus: false })
      .afterClosed()
      .subscribe((berhasil) => {
        if (berhasil) {
          // Kode proyek tidak dapat diubah, tetapi keadaannya bisa —
          // dan pemilih menandai proyek yang selesai atau batal.
          this.lookup.segarkan();
          this.fetch();
        }
      });
  }

  lihatProyek(p: Project): void {
    this.router.navigate(['/Project', p.id]);
  }

  hapusProyek(p: Project, ev?: Event): void {
    ev?.stopPropagation();
    this.dialog
      .open(DeleteConfirmationComponent, {
        data: {
          title: this.translate.instant('confirm.deleteTitle'),
          prompt: this.translate.instant('confirm.deletePrompt'),
        },
      })
      .afterClosed()
      .subscribe((setuju) => {
        if (!setuju) return;
        this.apiService.delete(`projects/${p.id}`).subscribe({
          next: () => {
            this.snackBar.open(
              this.translate.instant('project.deleted'),
              'Close',
              { duration: 3000 },
            );
            this.lookup.segarkan();
            this.fetch();
          },
          error: () => {
            this.snackBar.open(
              this.translate.instant('notify.deleteFailed'),
              'Close',
              { duration: 4000 },
            );
          },
        });
      });
  }
}
