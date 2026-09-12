import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { DataRekap } from 'src/app/helpers/tender-rekap.helper';
import {
  HasilKeputusan,
  MINIMAL_ALASAN,
  TenderKeputusanDialogComponent,
} from './tender-keputusan-dialog.component';

/*
 * Keputusan akhir tender.
 *
 * Yang dijaga di sini bukan tampilannya, melainkan tiga hal yang menentukan
 * apakah keputusannya dapat ditinjau kembali setahun lagi:
 *
 *   * alasan WAJIB, dan sependek dua kata tidak menerangkan apa pun;
 *   * menutup tanpa pemenang TIDAK menuntut memilih pemasok — dan itulah
 *     bedanya dari menetapkan pemenang;
 *   * yang termurah DITANDAI, tidak dipilihkan. Waktu kirim, garansi, dan
 *     riwayat pemasok ikut menentukan, dan memilih otomatis membuat
 *     keputusannya tampak sudah diambil sistem.
 */

const REKAP: DataRekap = {
  nomor: 12,
  nama: 'Sewa crawler crane',
  proyek: 'R501',
  jenis: 'jasa',
  tanggal: '2026-09-01',
  items: [{ id: 1, name: 'Sewa crane + operator', quantity: 1, unit: 'bulan' }],
  quotes: [
    {
      id: 1,
      supplierName: 'Recon Indonesia',
      supplierPrefix: 'PT',
      quotationNumber: '045/QT/IX/2026',
      otherCost: 40_000_000,
      items: [{ tenderItemID: 1, price: 119_000_000 }],
    },
    {
      id: 2,
      supplierName: 'Sumber Rejeki Group',
      supplierPrefix: 'CV',
      otherCost: 60_000_000,
      items: [{ tenderItemID: 1, price: 79_000_000 }],
    },
    {
      id: 3,
      supplierName: 'Sentra Jasa',
      supplierPrefix: 'PT',
      otherCost: 0,
      // Tidak menawar sama sekali — penawarannya tidak lengkap.
      items: [],
    },
  ],
};

let ditutup: HasilKeputusan | undefined | null;

function susun(mode: 'pemenang' | 'tutup') {
  ditutup = null;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TenderKeputusanDialogComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      {
        provide: MatDialogRef,
        useValue: {
          close: (v: HasilKeputusan | undefined) => (ditutup = v),
        },
      },
      { provide: MAT_DIALOG_DATA, useValue: { mode, rekap: REKAP } },
    ],
  });
  const f = TestBed.createComponent(TenderKeputusanDialogComponent);
  f.detectChanges();
  return f;
}

describe('dialog keputusan tender', () => {
  it('alasan wajib, dan yang terlalu pendek ditolak', () => {
    const k = susun('tutup').componentInstance;

    k.formGroup.patchValue({ reason: '' });
    k.simpan();
    expect(ditutup)
      .withContext('dialog tertutup tanpa alasan tertulis')
      .toBeNull();

    k.formGroup.patchValue({ reason: 'mahal' });
    k.simpan();
    expect(ditutup).toBeNull();

    k.formGroup.patchValue({
      reason: 'Seluruh penawaran melampaui pagu proyek.',
    });
    k.simpan();
    expect(ditutup).toBeTruthy();
  });

  it('panjang minimum alasannya sama dengan yang dituntut server', () => {
    // Server menolak di bawah 10 aksara; layar yang lebih longgar membuat
    // permintaannya ditolak setelah dikirim, dan yang menulis alasannya
    // harus mengetiknya ulang.
    expect(MINIMAL_ALASAN).toBe(10);
  });

  it('menutup tanpa pemenang tidak menuntut memilih pemasok', () => {
    const k = susun('tutup').componentInstance;
    expect(k.isPemenang).toBeFalse();

    k.formGroup.patchValue({
      reason: 'Pekerjaan dialihkan ke tim sendiri.',
    });
    k.simpan();

    expect(ditutup).toEqual({
      mode: 'tutup',
      winnerQuoteID: null,
      reason: 'Pekerjaan dialihkan ke tim sendiri.',
    });
  });

  it('menetapkan pemenang menuntut memilih pemasok', () => {
    const k = susun('pemenang').componentInstance;

    k.formGroup.patchValue({ reason: 'Unitnya tahun 2024 dan siap pekan ini.' });
    k.simpan();
    expect(ditutup)
      .withContext('pemenang ditetapkan tanpa memilih siapa pun')
      .toBeNull();

    k.formGroup.patchValue({ winnerQuoteID: 2 });
    k.simpan();
    expect(ditutup?.winnerQuoteID).toBe(2);
    expect(ditutup?.mode).toBe('pemenang');
  });

  it('yang termurah ditandai, tetapi tidak dipilihkan', () => {
    const k = susun('pemenang').componentInstance;

    // 79jt + 60jt = 139jt, lebih murah daripada 119jt + 40jt = 159jt.
    expect(k.biaya(REKAP.quotes[1])).toBe(139_000_000);
    expect(k.isTerendah(REKAP.quotes[1])).toBeTrue();
    expect(k.isTerendah(REKAP.quotes[0])).toBeFalse();

    // Penawaran yang tidak lengkap TIDAK ikut dibandingkan: penawaran atas
    // sebagian baris selalu tampak lebih murah.
    expect(k.sebagian(REKAP.quotes[2])).toBeTrue();
    expect(k.isTerendah(REKAP.quotes[2])).toBeFalse();

    expect(k.formGroup.get('winnerQuoteID')?.value)
      .withContext('pemenangnya dipilihkan sistem')
      .toBeNull();
  });

  it('alasan dirapikan sebelum dikirim', () => {
    const k = susun('tutup').componentInstance;
    k.formGroup.patchValue({ reason: '   Penawaran terlalu mahal semua.   ' });
    k.simpan();
    expect(ditutup?.reason).toBe('Penawaran terlalu mahal semua.');
  });
});
