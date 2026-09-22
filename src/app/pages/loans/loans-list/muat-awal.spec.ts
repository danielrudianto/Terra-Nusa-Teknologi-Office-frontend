import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { LoansListComponent } from './loans-list.component';
import { PurchaseDraftListComponent } from '../../purchase-draft/purchase-draft-list/purchase-draft-list.component';

/*
 * Daftar Pinjaman & Draf Pembelian HARUS memuat data saat dibuka.
 * Dulu keduanya bergantung pada pancaran palsu chip `[selected]`; begitu
 * pancaran itu disaring, halamannya kosong sampai disegarkan.
 */
function siapkan(qp: Record<string, string> = {}) {
  const panggil: any[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LoansListComponent, PurchaseDraftListComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      {
        provide: ApiService,
        useValue: {
          get: (j: string, p: any) => {
            panggil.push({ j, p });
            return of({ data: [], count: 0 });
          },
          post: (j: string, p: any) => {
            panggil.push({ j, p });
            return of({ data: [], count: 0 });
          },
        },
      },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
      { provide: Router, useValue: { navigate: () => {} } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(qp), queryParams: qp }, queryParams: of(qp) } },
    ],
  });
  return panggil;
}

describe('muat awal daftar', () => {
  it('Pinjaman memuat data tanpa perlu disegarkan', () => {
    const panggil = siapkan();
    TestBed.createComponent(LoansListComponent).detectChanges();
    expect(panggil.length).toBeGreaterThan(0);
  });

  it('Pinjaman membaca pencarian dari alamat', () => {
    siapkan({ search: 'orix' });
    const f = TestBed.createComponent(LoansListComponent);
    f.detectChanges();
    expect(f.componentInstance.searchControl.value).toBe('orix');
  });

  it('Draf Pembelian memuat data tanpa perlu disegarkan', () => {
    const panggil = siapkan();
    TestBed.createComponent(PurchaseDraftListComponent).detectChanges();
    expect(panggil.length).toBeGreaterThan(0);
  });
});
