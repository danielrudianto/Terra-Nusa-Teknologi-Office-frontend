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
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { debounceTime } from 'rxjs';

import { CanDirective } from 'src/app/directives/can.directive';
import { MINIMAL_PENAWARAN, TenderService } from 'src/app/services/tender.service';

@Component({
  selector: 'app-tender-list',
  standalone: true,
  imports: [
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
    CanDirective,
  ],
  templateUrl: './tender-list.component.html',
  styleUrl: './tender-list.component.scss',
})
export class TenderListComponent implements OnInit {
  private readonly service = inject(TenderService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  @ViewChild(MatTable) table?: MatTable<any>;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly MINIMAL = MINIMAL_PENAWARAN;

  tenders: any[] = [];
  count = 0;
  isLoading = false;

  pencarian = new FormControl('');

  /*
   * Bawaannya BERJALAN, bukan semua.
   *
   * Tender selesai dan batal tidak pernah dihapus — riwayat pengadaan harus
   * tetap dapat ditinjau — sehingga daftarnya terus memanjang. Yang dibuka
   * sehari-hari adalah yang masih menunggu balasan.
   */
  saring: '' | 'draft' | 'berjalan' | 'selesai' | 'batal' = 'berjalan';

  readonly kolom = [
    'number',
    'name',
    'projectName',
    'tenderType',
    'quoteCount',
    'status',
    'action',
  ];

  ngOnInit(): void {
    this.muat();
    this.pencarian.valueChanges
      .pipe(debounceTime(500))
      .subscribe(() => this.muat(1));
  }

  muat(halaman = 0): void {
    this.isLoading = true;
    this.service
      .daftar({
        page: halaman || (this.paginator ? this.paginator.pageIndex + 1 : 1),
        pageSize: this.paginator?.pageSize ?? 10,
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
