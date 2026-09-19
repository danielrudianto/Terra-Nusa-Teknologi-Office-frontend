/*
 * DIALOG RINCIAN RASIO.
 *
 * Isi dialog inilah satu-satunya tempat sebuah rasio dijelaskan: artinya,
 * risikonya bila terlalu rendah atau terlalu tinggi, dan hitungan yang
 * menghasilkannya. Petak di halamannya hanya angka dan sebuah chip.
 *
 * Karena itu kegagalan di sini tidak tampak sebagai galat — yang terbuka
 * adalah kotak berisi angka tanpa penjelasan, persis keadaan yang dialog ini
 * dibuat untuk memperbaikinya.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { RasioDialogComponent } from './rasio-dialog.component';

function dialog(data: any, terjemahan: Record<string, string> = {}): any {
  TestBed.configureTestingModule({
    providers: [
      { provide: MatDialogRef, useValue: { close: () => {} } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      {
        provide: TranslateService,
        useValue: { instant: (k: string) => terjemahan[k] ?? k },
      },
    ],
  });
  return TestBed.runInInjectionContext(
    () =>
      new (RasioDialogComponent as any)(
        TestBed.inject(MatDialogRef),
        TestBed.inject(TranslateService),
        data,
      ),
  );
}

afterEach(() => TestBed.resetTestingModule());

const CONTOH = {
  kode: 'rasioOverhead',
  teks: '18,5%',
  posisi: 'diatas',
  baik: false,
  pitaTeks: 'maks 15,0%',
  acuan: 'CFMA',
  arti: 'posisiKeuangan.arti.rasioOverhead.diatas',
  hitungan: {
    pembilang: {
      label: 'bebanUsaha',
      nilai: 185_000_000,
      rincian: [
        { kategori: 'gaji', label: 'Gaji', nilai: 120_000_000 },
        { kategori: 'sewa', label: 'Sewa kantor', nilai: 65_000_000 },
      ],
    },
    penyebut: { label: 'pendapatan', nilai: 1_000_000_000 },
  },
};

describe('rincian penyusun rasio', () => {
  it('pembilang yang dirinci terbaca seluruhnya', () => {
    const c = dialog(CONTOH);
    expect(c.rincian(c.data.hitungan.pembilang).length).toBe(2);
  });

  it('sisi TANPA rincian mengembalikan daftar kosong, bukan meledak', () => {
    /*
     * Tidak semua rasio dirinci. `undefined.map` akan menjatuhkan dialognya —
     * dan dialog yang mati jauh lebih buruk daripada satu baris rincian yang
     * memang tidak ada.
     */
    const c = dialog(CONTOH);
    expect(c.rincian(c.data.hitungan.penyebut)).toEqual([]);
    expect(c.rincian(undefined)).toEqual([]);
    expect(c.rincian(null)).toEqual([]);
    expect(c.rincian({ rincian: 'bukan array' })).toEqual([]);
  });
});

describe('label komponen', () => {
  it('memakai terjemahan bila kategorinya dikenali', () => {
    const c = dialog(CONTOH, {
      'posisiKeuangan.komponen.gaji': 'Gaji & tunjangan',
    });
    expect(c.labelKomponen({ kategori: 'gaji', label: 'Gaji' })).toBe(
      'Gaji & tunjangan',
    );
  });

  it('kategori TANPA terjemahan memakai labelnya, bukan kunci mentah', () => {
    /*
     * Kategori beban datang dari DATA, bukan dari daftar tetap. Yang belum
     * punya terjemahan akan tercetak sebagai "posisiKeuangan.komponen.sewa"
     * di layar yang dibaca stakeholder — bukan galat, hanya memalukan dan
     * tidak terbaca.
     */
    const c = dialog(CONTOH);
    expect(c.labelKomponen({ kategori: 'entah', label: 'Sewa kantor' })).toBe(
      'Sewa kantor',
    );
  });

  it('tanpa kategori maupun label, dicetak tanda pisah', () => {
    const c = dialog(CONTOH);
    expect(c.labelKomponen({})).toBe('—');
  });
});

describe('angka rupiah', () => {
  it('"Rp" tidak boleh terpisah barisnya dari angkanya', () => {
    /*
     * Spasi biasa membuat peramban memutus barisnya persis di antara "Rp"
     * dan angkanya, dan pada kolom sempit yang terlihat adalah "Rp"
     * menggantung sendirian di satu baris — sempat terbaca sebagai kolom
     * yang kosong.
     */
    const c = dialog(CONTOH);
    const teks = c.uang(185_000_000);
    expect(teks).toContain(' ');
    expect(teks).not.toContain('Rp ');
  });
});
