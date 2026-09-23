/* ALAT SEMENTARA — lihat catatan di `tautan-pembelian.component.ts`. */
import { Injectable, inject } from '@angular/core';

import { ApiService } from '../../../services/api.service';

@Injectable({ providedIn: 'root' })
export class TautanPembelianService {
  private readonly api = inject(ApiService);
  private static readonly JALUR = 'tautan-pembelian';

  calon(copId: number, keyword: string) {
    return this.api.get(`${TautanPembelianService.JALUR}/${copId}/calon`, {
      keyword,
    });
  }

  tautkan(copId: number, purchaseId: number) {
    return this.api.post(`${TautanPembelianService.JALUR}/${copId}/tautkan`, {
      purchaseId,
    });
  }

  lepas(copId: number, purchaseId: number) {
    return this.api.post(`${TautanPembelianService.JALUR}/${copId}/lepas`, {
      purchaseId,
    });
  }
}
