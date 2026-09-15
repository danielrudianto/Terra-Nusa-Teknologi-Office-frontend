import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { ReimbursementListComponent } from './reimbursement-list.component';

/**
 * Saringan status bawaan pada daftar reimbursement.
 *
 * Reimbursement yang DITOLAK tidak menuntut tindakan apa pun — ia sudah
 * selesai, dan selesainya dengan tidak terjadi. Menampilkannya secara bawaan
 * membuat daftar yang dibuka untuk MENGERJAKAN sesuatu berisi baris yang
 * justru tidak dapat dikerjakan, dan pada bulan yang ramai baris itulah yang
 * paling banyak.
 *
 * Yang dijaga di sini bukan cuma "bawaannya benar", melainkan bahwa bawaan
 * itu TIDAK menimpa pilihan yang sudah dibuat orangnya.
 *
 * ---
 *
 * Berkas ini sebelumnya scaffold bawaan `ng generate`:
 *
 *     TestBed.configureTestingModule({ declarations: [ReimbursementListComponent] })
 *
 * Komponennya standalone, jadi `declarations` MELEMPAR — dan spec-nya sudah
 * merah sejak lama tanpa pernah menguji apa pun. Diganti dengan `imports`
 * plus tiruan seperlunya.
 */
describe('ReimbursementListComponent — saringan bawaan', () => {
  let queryParams: BehaviorSubject<Record<string, string>>;

  function buat(params: Record<string, string> = {}) {
    queryParams = new BehaviorSubject<Record<string, string>>(params);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ReimbursementListComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ApiService,
          useValue: { get: () => of({ data: [], count: 0 }), post: () => of({}) },
        },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
        { provide: Router, useValue: { navigate: () => {}, url: '/Reimbursement' } },
        {
          provide: ActivatedRoute,
          useValue: { queryParams, snapshot: { queryParams: params } },
        },
      ],
    });

    const f: ComponentFixture<ReimbursementListComponent> =
      TestBed.createComponent(ReimbursementListComponent);
    f.componentInstance.ngOnInit();
    return f;
  }

  it('tanpa parameter URL: disetujui + menunggu, tanpa yang ditolak', () => {
    const c = buat().componentInstance;
    const v = c.filterFormGroup.value;

    expect(v.isApprove).toBeTrue();
    expect(v.isPending).toBeTrue();
    expect(v.isDelete).toBeFalse();

    // Chip di layar harus setuju dengan saringan yang dikirim. Cabang
    // "tidak ada di URL" dulu hanya menyetel chipnya dan tidak menyentuh
    // form controlnya, jadi keduanya bisa berbeda tanpa satu pun galat.
    expect(c.chipSelections['isApprove']).toBeTrue();
    expect(c.chipSelections['isPending']).toBeTrue();
    expect(c.chipSelections['isDelete']).toBeFalse();
  });

  it('pembayaran TIDAK ikut disaring secara bawaan', () => {
    // `isPaid`/`isUnpaid` kelompok OR tersendiri di server; menyalakannya
    // ikut akan mempersempit daftarnya dua kali.
    const v = buat().componentInstance.filterFormGroup.value;
    expect(v.isPaid).toBeFalse();
    expect(v.isUnpaid).toBeFalse();
  });

  it('URL yang menyebut saringan MENANG atas bawaan', () => {
    const c = buat({
      isApprove: 'false',
      isPending: 'false',
      isDelete: 'true',
      isPaid: 'false',
      isUnpaid: 'false',
    }).componentInstance;

    expect(c.filterFormGroup.value.isDelete).toBeTrue();
    expect(c.filterFormGroup.value.isApprove).toBeFalse();
  });

  it('mengosongkan semua chip TIDAK dinyalakan ulang oleh bawaan', () => {
    /*
     * Begitu seseorang menyentuh satu chip, URL memuat SELURUH kunci —
     * termasuk yang bernilai `false`. Kalau bawaan tetap dipaksakan di situ,
     * chip yang baru saja dimatikan akan menyala lagi, dan halamannya terbaca
     * sebagai menolak diatur.
     */
    const c = buat({
      isApprove: 'false',
      isPending: 'false',
      isDelete: 'false',
      isPaid: 'false',
      isUnpaid: 'false',
    }).componentInstance;

    expect(
      Object.values(c.filterFormGroup.value).every((v) => v === false),
    ).toBeTrue();
  });
});
