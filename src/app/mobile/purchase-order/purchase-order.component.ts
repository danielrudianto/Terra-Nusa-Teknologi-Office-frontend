import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { PermissionService } from '../../services/permission.service';
import { PoDaftarComponent } from '../po-daftar/po-daftar.component';

type Mode = 'periksa' | 'setujui';

/**
 * Tab Purchase Order — satu tempat untuk MEMERIKSA dan MENYETUJUI.
 *
 * MENGAPA DISATUKAN
 *
 * Dulu keduanya tab terpisah. Tetapi keduanya tentang dokumen yang sama pada
 * dua tahap berurutan, dan memisahkannya membuat bilah bawah penuh sesak. Di
 * sini keduanya satu tab dengan SAKELAR di atas.
 *
 * SAKELAR MENGIKUTI WEWENANG
 *
 * Level 3 (procurement) hanya MEMERIKSA — ia tidak berhak menyetujui, jadi
 * pilihan "Setujui" tidak ditawarkan sama sekali (bukan ditampilkan lalu
 * ditolak). Level 4 ke atas yang berhak menyetujui melihat kedua pilihan.
 * Bila hanya satu yang boleh, sakelarnya tidak muncul — tak ada yang perlu
 * dipilih.
 */
@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe, PoDaftarComponent],
  templateUrl: './purchase-order.component.html',
  styleUrls: ['./purchase-order.component.scss'],
})
export class PurchaseOrderComponent implements OnInit {
  private readonly izin = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  mode: Mode = 'setujui';

  bisaPeriksa(): boolean {
    const lv = this.izin.level();
    if (lv >= 4) return true;
    if (lv < 3) return false;
    return this.izin.inDepartment('procurement');
  }
  bisaSetujui(): boolean {
    return this.izin.can('purchase_order', 'approve');
  }

  /** Kedua pilihan tersedia → tampilkan sakelar. */
  get adaSakelar(): boolean {
    return this.bisaPeriksa() && this.bisaSetujui();
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('mode') as Mode | null;
    if ((q === 'periksa' || q === 'setujui') && this.bolehMode(q)) {
      this.mode = q;
    } else {
      // Bawaan: penyetuju mendarat di "Setujui"; pemeriksa-saja di "Periksa".
      this.mode = this.bisaSetujui() ? 'setujui' : 'periksa';
    }
  }

  private bolehMode(m: Mode): boolean {
    return m === 'periksa' ? this.bisaPeriksa() : this.bisaSetujui();
  }

  pilih(m: Mode): void {
    if (this.mode === m || !this.bolehMode(m)) return;
    this.mode = m;
    // Tanggalkan ?open lama supaya ganti mode tidak membuka ulang dokumen.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: m, open: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
