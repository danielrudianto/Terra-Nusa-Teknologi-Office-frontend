import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';

/**
 * Beranda mobile: berapa yang menunggu, dan jalan ke sana.
 *
 * Angkanya bukan hiasan. Yang membuka aplikasi ini biasanya sedang di luar
 * kantor dan ingin tahu satu hal — ada yang perlu diputuskan atau tidak.
 * Tanpa angkanya, ia harus membuka kedua layar bergantian untuk menemukan
 * bahwa keduanya kosong.
 */
@Component({
  selector: 'app-beranda',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './beranda.component.html',
  styleUrls: ['./beranda.component.scss'],
})
export class BerandaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  jumlahPo = 0;
  jumlahReimbursement = 0;
  sedangMemuat = false;

  ngOnInit(): void {
    this.muat();
  }

  muat(): void {
    this.sedangMemuat = true;
    forkJoin({
      po: this.api
        .get('purchase-orders', { status: 'pending', page: 1, page_size: 50 })
        .pipe(catchError(() => of(null))),
      reimbursement: this.api
        .get('reimbursements', {
          filter: 1,
          isPending: true,
          page: 1,
          pageSize: 50,
        })
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: (res: any) => {
        /*
         * Yang belum diperiksa TIDAK dihitung.
         *
         * Sama dengan saringan di layar persetujuannya: dokumen yang belum
         * diperiksa memang belum dapat disetujui, dan menghitungnya membuat
         * beranda menjanjikan pekerjaan yang tidak ada di layar berikutnya.
         */
        const po = res?.po?.data ?? res?.po?.items ?? [];
        this.jumlahPo = po.filter((x: any) => !!x?.isChecked).length;

        const rb =
          res?.reimbursement?.data ?? res?.reimbursement?.items ?? [];
        this.jumlahReimbursement = rb.length;
      },
      error: () => {},
    });
    this.sedangMemuat = false;
  }

  ke(jalur: string): void {
    this.router.navigate([jalur]);
  }
}
