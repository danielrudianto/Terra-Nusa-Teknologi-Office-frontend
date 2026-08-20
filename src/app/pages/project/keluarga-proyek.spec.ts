/**
 * Keluarga proyek: satu induk, beberapa anak.
 *
 * Sebagian pekerjaan dipecah menjadi beberapa kode — satu memegang
 * kontraknya, yang lain menampung biaya per paket. Dilihat sendiri-sendiri
 * keduanya tampak ganjil: ada penjualan tanpa pembelian, atau pembelian tanpa
 * penjualan sama sekali, dan margin masing-masing tidak berarti apa-apa.
 */

import { ProjectLookupService } from '../../services/project-lookup.service';

function proyek(id: number, code: string, parentProjectID: number | null = null): any {
  return {
    id,
    code,
    name: code,
    isActive: true,
    isCancelled: false,
    contractValue: 0,
    contractDpp: 0,
    contractCount: 0,
    parentProjectID,
  };
}

/** Layanan dengan daftar proyek yang sudah terisi. */
function lookup(daftar: any[]): any {
  const s: any = Object.create(ProjectLookupService.prototype);
  s._proyek = () => daftar;
  s.cari = (kode: string) =>
    daftar.find((p) => p.code.toUpperCase() === String(kode).toUpperCase());
  return s;
}

const INDUK = proyek(1, 'MICZ');
const ANAK_A = proyek(2, 'MICZA', 1);
const ANAK_B = proyek(3, 'MICZB', 1);
const SENDIRI = proyek(9, 'R501');
const SEMUA = [INDUK, ANAK_A, ANAK_B, SENDIRI];

describe('anak sebuah proyek', () => {
  it('ditemukan dari induknya', () => {
    expect(lookup(SEMUA).anakDari(1).map((p: any) => p.code)).toEqual([
      'MICZA',
      'MICZB',
    ]);
  });

  it('proyek tanpa anak menghasilkan daftar kosong', () => {
    expect(lookup(SEMUA).anakDari(9)).toEqual([]);
  });

  it('id yang kosong tidak menyapu seluruh daftar', () => {
    /*
     * Penjaga penting: `parentProjectID` proyek yang berdiri sendiri bernilai
     * null, sehingga pencocokan yang longgar akan menganggap SELURUH proyek
     * mandiri sebagai anak dari "tanpa induk".
     */
    for (const kosong of [null, undefined]) {
      expect(lookup(SEMUA).anakDari(kosong)).withContext(String(kosong)).toEqual([]);
    }
  });
});

describe('keluarga proyek', () => {
  it('dibuka dari INDUKNYA: induk lalu anak-anaknya', () => {
    expect(lookup(SEMUA).keluarga('MICZ').map((p: any) => p.code)).toEqual([
      'MICZ',
      'MICZA',
      'MICZB',
    ]);
  });

  it('dibuka dari ANAKNYA: keluarganya sama', () => {
    /*
     * Yang membuka laporan tidak selalu tahu mana induknya — dan kalau
     * membuka anak hanya menghasilkan anak itu sendiri, gabungannya
     * kehilangan kontrak yang justru dipegang induknya.
     */
    expect(lookup(SEMUA).keluarga('MICZA').map((p: any) => p.code)).toEqual([
      'MICZ',
      'MICZA',
      'MICZB',
    ]);
  });

  it('proyek mandiri berkeluarga sendirian', () => {
    expect(lookup(SEMUA).keluarga('R501').map((p: any) => p.code)).toEqual(['R501']);
  });

  it('kode yang tidak dikenal tidak menghasilkan apa pun', () => {
    expect(lookup(SEMUA).keluarga('NGAWUR')).toEqual([]);
  });

  it('anak yang induknya sudah terhapus tidak menggantung', () => {
    // Induknya tidak ada di daftar; yang tersisa harus tetap dirinya sendiri,
    // bukan larik kosong yang membuat laporannya hilang.
    const yatim = proyek(4, 'MICZC', 77);
    expect(lookup([yatim]).keluarga('MICZC').map((p: any) => p.code)).toEqual([
      'MICZC',
    ]);
  });
});

describe('layar menawarkan penggabungan', () => {
  it('hanya pada proyek yang memang punya keluarga', () => {
    const l = lookup(SEMUA);
    expect(l.punyaAnak('MICZ')).toBeTrue();
    expect(l.punyaAnak('MICZA')).toBeTrue();
    expect(l.punyaAnak('R501')).toBeFalse();
  });
});
