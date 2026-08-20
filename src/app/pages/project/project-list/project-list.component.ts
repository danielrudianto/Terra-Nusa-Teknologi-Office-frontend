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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
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

/**
 * Keadaan yang dapat DITAMBAHKAN ke daftar, di luar yang berjalan.
 *
 * Di tingkat modul, bukan milik instans: urutannya menentukan urutan untai
 * yang dikirim ke server, dan itu bagian dari kesepakatan dengan server —
 * bukan keadaan sebuah layar.
 */
const TAMBAHAN = ['retensi', 'selesai', 'batal'] as const;

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
    MatSnackBarModule,
    TranslatePipe,
    HeaderTitleComponent,
    CanDirective,
    RefreshButtonComponent,
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
   * Keadaan yang IKUT ditampilkan, di luar yang berjalan.
   *
   * Bentuk sebelumnya satu pilihan yang saling meniadakan: memilih "Selesai"
   * MENGGANTI daftarnya, bukan menambahnya. Yang ingin melihat proyek
   * berjalan berikut yang menunggu retensi karena itu harus membukanya
   * bergantian dan menjumlahkan sendiri di kepala.
   *
   * Yang berjalan SELALU tampil — itulah dasarnya; kepingnya menambahkan.
   */
  /*
   * Disimpan sebagai LARIK, bukan himpunan.
   *
   * `[value]` pada daftar kepingnya membandingkan rujukan; himpunan yang
   * harus disalin menjadi larik pada setiap penggambaran menghasilkan
   * rujukan baru terus-menerus, dan kepingnya disetel ulang tanpa henti.
   */
  tambahan: string[] = [];

  readonly TAMBAHAN = TAMBAHAN;

  ikut(keadaan: string): boolean {
    return this.tambahan.includes(keadaan);
  }

  /**
   * Keadaan yang dikirim ke server: yang berjalan, berikut yang dicentang.
   *
   * Dirakit di satu tempat supaya daftar dan penghitungnya tidak dapat
   * berbeda.
   */
  private get keadaanDiminta(): string {
    return ['berjalan', ...TAMBAHAN.filter((k) => this.ikut(k))].join(',');
  }

  displayedColumns = [
    'code',
    'name',
    'contractValue',
    'contractCount',
    'state',
    'action',
  ];

  ngOnInit(): void {
    this.fetch();
    this.searchControl.valueChanges
      .pipe(debounceTime(400))
      .subscribe(() => this.fetch(0));
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
  }

  /**
   * Keping "termasuk …" ditekan.
   *
   * Nilainya dipakai apa adanya dari peristiwa daftar kepingnya — bukan
   * dibalik dari keadaan sekarang. Membalik dari keadaan sekarang adalah
   * yang dahulu membuat daftar ini berkedip tanpa henti: `[selected]`
   * menyalakan peristiwanya sendiri saat layar dibuka, penanganya
   * membatalkannya, dan keduanya saling menyalakan.
   */
  ubahTambahan(terpilih: string[] | null | undefined): void {
    const sah = (TAMBAHAN as readonly string[]).filter((k) =>
      (terpilih ?? []).includes(k),
    );

    // Tidak ada yang berubah: tidak ada pula yang perlu dimuat ulang.
    if (
      sah.length === this.tambahan.length &&
      sah.every((k) => this.ikut(k))
    ) {
      return;
    }

    this.tambahan = sah;
    this.fetch(0);
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
