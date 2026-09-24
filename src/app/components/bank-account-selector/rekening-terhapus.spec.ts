import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { BankLookupService } from 'src/app/services/bank-lookup.service';
import { BankAccountSelectorComponent } from './bank-account-selector.component';

/*
 * REKENING TERHAPUS TIDAK BOLEH DITAWARKAN — TETAPI TETAP HARUS TERBACA.
 *
 * Dua tuntutan yang berlawanan, dan keduanya nyata:
 *
 *   - Menawarkannya pada pemilih berarti uang dapat dikirim ke rekening
 *     yang sudah ditutup, dan namanya di daftar pilihan terbaca seperti
 *     rekening yang masih hidup.
 *   - Menyembunyikannya sama sekali membuat dokumen lama yang menunjuk
 *     rekening itu tampil dengan kolom KOSONG — seolah tidak pernah ada
 *     rekening sama sekali, padahal uangnya sudah berpindah.
 *
 * Karena itu `saring()` menyaring, sementara `cari()` tidak.
 */
const REKENING = [
  { id: 1, bankName: 'BCA', bankAccountName: 'PT AKN', bankAccountNumber: '1234567890', isDelete: false },
  { id: 2, bankName: 'Mandiri', bankAccountName: 'PT AKN', bankAccountNumber: '9876543210', isDelete: true },
  { id: 3, bankName: 'BRI', bankAccountName: 'PT AKN Proyek', bankAccountNumber: '5550001111', isDelete: false },
];

function siapkan(dialogPalsu?: any) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: ApiService, useValue: { get: () => of(REKENING) } },
      ...(dialogPalsu ? [{ provide: MatDialog, useValue: dialogPalsu }] : []),
    ],
  });
}

describe('daftar rekening: yang terhapus disaring', () => {
  it('saring() tidak pernah memuat rekening terhapus', async () => {
    siapkan();
    const lookup = TestBed.inject(BankLookupService);
    await lookup.muat();

    expect(lookup.saring('').map((r) => r.id)).toEqual([1, 3]);
    expect(lookup.aktif().length).toBe(2);
  });

  it('pencarian yang persis mengenai rekening terhapus pun kosong', () => {
    // Justru inilah bentuk kegagalan yang paling meyakinkan: mengetik nomor
    // rekening lama dan menemukannya, lalu mengira ia masih hidup.
    siapkan();
    const lookup = TestBed.inject(BankLookupService);
    return lookup.muat().then(() => {
      expect(lookup.saring('9876543210')).toEqual([]);
      expect(lookup.saring('Mandiri')).toEqual([]);
    });
  });

  it('cari() TETAP menemukannya — dokumen lama harus tetap terbaca', async () => {
    siapkan();
    const lookup = TestBed.inject(BankLookupService);
    await lookup.muat();

    const r = lookup.cari(2);
    expect(r).toBeTruthy();
    expect(r!.bankAccountNumber).toBe('9876543210');
    expect(r!.isDelete).toBeTrue();
  });

  it('kolom menampilkan rekening terhapus, ditandai', async () => {
    siapkan();
    const f = TestBed.createComponent(BankAccountSelectorComponent);
    const c = f.componentInstance;
    await TestBed.inject(BankLookupService).muat();

    c.writeValue(2);
    expect(c.teks()).toContain('9876543210');
    expect(c.terpilih()?.isDelete).toBeTrue();
  });
});

describe('pemilih rekening: dialog', () => {
  function dialogYangMengembalikan(hasil: any) {
    const dibuka: any[] = [];
    return {
      palsu: {
        open: (_k: any, opsi: any) => {
          dibuka.push(opsi);
          return { afterClosed: () => of(hasil) };
        },
      },
      dibuka,
    };
  }

  it('memilih rekening menulis id-nya ke formulir', async () => {
    const { palsu } = dialogYangMengembalikan({ rekening: REKENING[2] });
    siapkan(palsu);
    const c = TestBed.createComponent(BankAccountSelectorComponent).componentInstance;
    await TestBed.inject(BankLookupService).muat();

    let nilai: number | null = -1;
    c.registerOnChange((v) => (nilai = v));
    c.buka();

    expect(nilai).toBe(3);
    expect(c.teks()).toContain('5550001111');
  });

  it('menutup tanpa memilih TIDAK mengubah apa pun', async () => {
    const { palsu } = dialogYangMengembalikan(undefined);
    siapkan(palsu);
    const c = TestBed.createComponent(BankAccountSelectorComponent).componentInstance;
    await TestBed.inject(BankLookupService).muat();

    c.writeValue(1);
    let dipanggil = 0;
    c.registerOnChange(() => dipanggil++);
    c.buka();

    expect(dipanggil).toBe(0);
    expect(c.teks()).toContain('1234567890');
  });

  it('"kosongkan pilihan" BERBEDA dari membatalkan', async () => {
    const { palsu } = dialogYangMengembalikan({ hapus: true });
    siapkan(palsu);
    const c = TestBed.createComponent(BankAccountSelectorComponent).componentInstance;
    await TestBed.inject(BankLookupService).muat();

    c.writeValue(1);
    let nilai: number | null = -1;
    c.registerOnChange((v) => (nilai = v));
    c.buka();

    expect(nilai).toBeNull();
    expect(c.teks()).toBe('');
  });

  it('kolom nonaktif tidak membuka dialog', async () => {
    const { palsu, dibuka } = dialogYangMengembalikan({ rekening: REKENING[0] });
    siapkan(palsu);
    const c = TestBed.createComponent(BankAccountSelectorComponent).componentInstance;
    await TestBed.inject(BankLookupService).muat();

    c.setDisabledState(true);
    c.buka();
    expect(dibuka.length).toBe(0);
  });

  it('id yang sedang terpilih dikirim ke dialog', async () => {
    const { palsu, dibuka } = dialogYangMengembalikan(undefined);
    siapkan(palsu);
    const c = TestBed.createComponent(BankAccountSelectorComponent).componentInstance;
    await TestBed.inject(BankLookupService).muat();

    c.writeValue(3);
    c.buka();
    expect(dibuka[0].data.terpilihID).toBe(3);
  });
});
