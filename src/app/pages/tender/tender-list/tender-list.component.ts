import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { MINIMAL_PENAWARAN, TenderService } from 'src/app/services/tender.service';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import { RefreshButtonComponent } from 'src/app/components/refresh-button/refresh-button.component';
import { SettingsService } from 'src/app/services/setting.service';
import { KerangkaTabelDirective } from '../../../directives/kerangka-tabel.directive';

@Component({
  selector: 'app-tender-list',
  standalone: true,
  imports: [
    KerangkaTabelDirective,
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    TranslateModule,
    HeaderTitleComponent,
    RefreshButtonComponent,
  ],
  templateUrl: './tender-list.component.html',
  styleUrl: './tender-list.component.scss',
})
export class TenderListComponent implements OnInit {
  private readonly service = inject(TenderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  @ViewChild(MatTable) table?: MatTable<any>;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly MINIMAL = MINIMAL_PENAWARAN;

  tenders: any[] = [];
  count = 0;
  isLoading = false;

  /** Halaman berjalan, 1-berbasis — sama seperti daftar Pembelian. */
  page = 1;

  /**
   * Banyak baris per halaman, mengikuti PENGATURAN pengguna.
   *
   * Sebelumnya dipatok sepuluh. Yang menyetel daftar lain menjadi lima puluh
   * baris mendapati daftar ini tetap sepuluh, tanpa sebab yang terlihat.
   */
  pageSize: number = this.settings.pageSize;

  /*
   * Pengurutan. Bawaannya sama dengan urutan yang berlaku sebelum kolomnya
   * dapat ditekan — terbaru di atas — sehingga daftarnya tidak berubah
   * susunan bagi yang tidak menyentuh apa pun.
   */
  sortBy = 'createdAt';
  sortByDirection: 'asc' | 'desc' = 'desc';

  pencarian = new FormControl('');

  /*
   * Bawaannya BERJALAN, bukan semua.
   *
   * Tender selesai dan batal tidak pernah dihapus — riwayat pengadaan harus
   * tetap dapat ditinjau — sehingga daftarnya terus memanjang. Yang dibuka
   * sehari-hari adalah yang masih menunggu balasan.
   */
  /**
   * Saringan status. Bawaannya AKTIF — draf DAN berjalan.
   *
   * Dulu `'berjalan'` saja, dan itu menyembunyikan justru yang paling mudah
   * terlupakan. Sejak draf menahan penawaran, draf yang tidak disetujui
   * berarti pemasok tidak pernah diminta harga — dan tidak ada satu pun galat
   * yang memberi tahu, karena secara sistem tidak ada yang gagal.
   *
   * Nilainya dikirim apa adanya ke server, yang memecahnya pada koma. Tautan
   * lama berisi `?status=berjalan` tetap berarti sama.
   */
  saring: string = 'draft,berjalan';

  /*
   * Kolom `action` DIBUANG.
   *
   * Isinya hanya satu tombol panah yang memanggil `buka(t.id)` — dan seluruh
   * BARISNYA sudah memanggil hal yang sama lewat `(click)` di `matRowDef`.
   * Jadi ia satu kolom penuh yang tidak menambah satu pun kemampuan, sambil
   * memakan lebar yang dibutuhkan kolom tanggal di sebelahnya.
   *
   * `dueDate` ditaruh tepat SEBELUM status, bukan di sebelah `date`. Yang
   * dicari orang saat membuka daftar ini adalah "mana yang perlu dikerjakan",
   * dan itu dijawab oleh batas penawaran bersama keadaannya — dua angka yang
   * dibaca bersamaan sebaiknya bersebelahan.
   */
  readonly kolom = [
    'number',
    'date',
    'name',
    'projectName',
    'tenderType',
    'quoteCount',
    'dueDate',
    'status',
  ];

  /**
   * Batas penawaran sudah LEWAT sementara tendernya masih menunggu.
   *
   * Hanya ditandai pada `draft` dan `berjalan`. Tender yang sudah `selesai`
   * atau `batal` melewati batasnya adalah hal yang biasa — menandainya merah
   * membuat sebagian besar daftar menyala tanpa ada yang perlu dikerjakan,
   * dan penanda yang selalu menyala berhenti dibaca.
   */
  lewatBatas(t: any): boolean {
    const batas = this.keTanggal(t?.dueDate);
    if (!batas) return false;
    if (t?.status !== 'draft' && t?.status !== 'berjalan') return false;

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    return batas.getTime() < hariIni.getTime();
  }

  /**
   * `2026-09-12` -> `Date` LOKAL.
   *
   * Diurai sebagai teks, bukan lewat `new Date('2026-09-12')`. Bentuk itu
   * adalah tengah malam UTC; di zona di sebelah barat UTC ia mundur menjadi
   * 11 September, sehingga batas yang jatuh HARI INI sudah dilaporkan lewat.
   * Kekeliruan yang sama sudah dua kali muncul di sistem ini.
   */
  private keTanggal(nilai: unknown): Date | null {
    if (!nilai) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(nilai));
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(nilai as any);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Warna keping keadaan.
   *
   * Dirangkai di sini, bukan di papan tampilan: `'tl-chip--' + t.status`
   * menghasilkan nama kelas yang tidak ada bila keadaannya di luar keempat
   * ini, dan kepingnya lalu tampil tanpa latar sama sekali — terbaca sebagai
   * kolom yang rusak, bukan sebagai keadaan yang belum dikenal.
   */
  private readonly WARNA_STATUS: Record<string, string> = {
    draft: 'tl-chip--draft',
    berjalan: 'tl-chip--berjalan',
    selesai: 'tl-chip--selesai',
    batal: 'tl-chip--batal',
  };

  warnaStatus(status: string): string {
    return this.WARNA_STATUS[status] ?? 'tl-chip--netral';
  }

  ngOnInit(): void {
    /*
     * Keadaan daftar dibaca dari ALAMATNYA lebih dulu.
     *
     * Halaman, urutan, saringan, dan pencariannya ikut tersimpan di sana —
     * sama seperti daftar Pembelian dan Reimbursement. Tanpa itu, menekan
     * segarkan atau membagikan tautannya mengembalikan daftar ke halaman
     * pertama tanpa saringan, dan yang membukanya melihat sesuatu yang lain
     * dari yang dimaksud pengirimnya.
     */
    const p = this.route.snapshot.queryParams;
    if (p['page']) this.page = +p['page'];
    if (p['pageSize']) this.pageSize = +p['pageSize'];
    if (p['sortBy']) this.sortBy = p['sortBy'];
    if (p['sortByDirection']) this.sortByDirection = p['sortByDirection'];
    if (p['status'] !== undefined) this.saring = p['status'];
    if (p['cari']) this.pencarian.setValue(p['cari'], { emitEvent: false });

    this.muat();
    this.pencarian.valueChanges
      .pipe(debounceTime(500))
      .subscribe(() => this.muat(1));
  }

  /** Tulis keadaan daftar ke alamatnya, tanpa menambah riwayat peramban. */
  private simpanKeAlamat(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        status: this.saring || null,
        cari: this.pencarian.value || null,
      },
      // Menambah riwayat tiap kali kolom ditekan membuat tombol kembali
      // menelusuri ulang setiap pengurutan, bukan kembali ke layar
      // sebelumnya.
      replaceUrl: true,
    });
  }

  /**
   * Urutkan menurut kolom yang ditekan.
   *
   * Kolom yang sama ditekan dua kali membalik arahnya; kolom lain dimulai
   * menaik. Sama persis dengan daftar Pembelian dan Reimbursement.
   */
  urutkan(kolom: string): void {
    if (this.sortBy === kolom) {
      this.sortByDirection = this.sortByDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = kolom;
      this.sortByDirection = 'asc';
    }
    this.muat(1);
  }

  /**
   * Halaman atau banyak barisnya berubah.
   *
   * Mengubah banyak baris mengembalikan ke halaman pertama: halaman ketiga
   * dari sepuluh baris tidak ada padanannya pada lima puluh baris, dan yang
   * tampil sesudahnya baris yang sama sekali lain.
   */
  gantiHalaman(e: any): void {
    if (e.pageSize !== this.pageSize) {
      this.pageSize = e.pageSize;
      this.muat(1);
      return;
    }
    this.muat(e.pageIndex + 1);
  }

  muat(halaman = 0): void {
    if (halaman) this.page = halaman;
    this.isLoading = true;
    this.simpanKeAlamat();
    this.service
      .daftar({
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortByDirection: this.sortByDirection,
        ...(this.saring ? { status: this.saring } : {}),
        ...(this.pencarian.value ? { cari: this.pencarian.value } : {}),
      })
      .subscribe({
        next: (res: any) => {
          this.tenders = res?.data ?? [];
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
      .add(() => (this.isLoading = false));
  }

  pilihSaring(nilai: typeof this.saring): void {
    if (this.saring === nilai) return;
    this.saring = nilai;
    this.muat(1);
  }

  buat(): void {
    this.router.navigate(['/Tender/Create']);
  }

  buka(id: number): void {
    this.router.navigate(['/Tender', id]);
  }

  /**
   * Tender yang penawarannya belum cukup untuk memutuskan.
   *
   * Ditandai di daftar supaya yang membukanya tahu mana yang masih menunggu
   * tanpa perlu masuk satu per satu.
   */
  belumCukup(t: any): boolean {
    return t?.status === 'berjalan' && (t?.quoteCount ?? 0) < this.MINIMAL;
  }
}
