/*
 * Enam ember pelamar di sisi LAYAR — yang dijaga di sini kekeliruan yang
 * tidak melempar apa pun.
 *
 * Tiga kelas, semuanya pernah terjadi di layar lain repo ini:
 *
 *   1. Lencana yang belum datang digambar sebagai "0". Nol menyatakan
 *      "tidak ada pelamar"; yang sebenarnya terjadi adalah ringkasannya
 *      belum tiba. Yang melihatnya tidak membuka embernya, dan pekerjaan
 *      yang menumpuk di sana tidak pernah ketahuan.
 *   2. Ember dikirim ke server sebagai teks kosong. FastAPI menolak seluruh
 *      permintaan dengan 422 sebelum satu baris dibaca, dan layarnya hanya
 *      menampilkan daftar kosong.
 *   3. Setiap aksara yang diketik mengirim satu permintaan. Jawaban yang
 *      datang tidak berurutan menimpa hasil yang benar dengan hasil yang
 *      lebih lama — daftar yang menampilkan pencarian dua huruf lalu.
 */

import { HrCandidateListComponent } from './hr-candidate-list.component';

const P = HrCandidateListComponent.prototype as any;

/** Dipanggil pada `this` buatan sendiri — komponennya tidak dinyalakan. */
const panggil = (nama: string, diri: any, ...arg: any[]) =>
  P[nama].call(diri, ...arg);

describe('lencana ember', () => {
  it('BELUM datang bukan nol', () => {
    expect(panggil('jumlahEmber', { ringkasan: null }, 'submit')).toBeNull();
  });

  it('nol yang sungguhan tetap nol', () => {
    const diri = { ringkasan: { terbit: 3, submit: 0 } };
    expect(panggil('jumlahEmber', diri, 'submit')).toBe(0);
  });

  it('nol sungguhan DIBEDAKAN dari belum datang', () => {
    const kosong = panggil('jumlahEmber', { ringkasan: null }, 'submit');
    const nol = panggil('jumlahEmber', { ringkasan: { submit: 0 } }, 'submit');
    expect(kosong).not.toBe(nol);
  });

  it('ember yang tidak disebut server dibaca nol, bukan undefined', () => {
    // `undefined` dicetak sebagai lencana kosong — kotak tanpa isi, yang
    // terbaca sebagai kerusakan tampilan alih-alih sebagai angka.
    const diri = { ringkasan: { terbit: 1 } };
    expect(panggil('jumlahEmber', diri, 'dihapus')).toBe(0);
  });

  it('angkanya dibaca per ember, bukan satu angka untuk semua', () => {
    const diri = { ringkasan: { terbit: 9, submit: 2, dihapus: 5 } };
    expect(panggil('jumlahEmber', diri, 'terbit')).toBe(9);
    expect(panggil('jumlahEmber', diri, 'submit')).toBe(2);
    expect(panggil('jumlahEmber', diri, 'dihapus')).toBe(5);
  });
});

describe('ikon ember', () => {
  it('tiap ember punya ikon sendiri', () => {
    const daftar = P.emberPilihan ?? [
      'terbit',
      'submit',
      'wawancara',
      'diterima',
      'ditolak',
      'dihapus',
    ];
    const ikon = daftar.map((e: string) => panggil('ikonEmber', {}, e));
    expect(new Set(ikon).size).toBe(daftar.length);
  });

  it('nama tak dikenal tidak mengembalikan kosong', () => {
    // Ikon kosong menghasilkan kotak putih di menu, bukan galat.
    expect(panggil('ikonEmber', {}, 'entah')).toBeTruthy();
  });
});

describe('memilih ember', () => {
  function diriUji() {
    return {
      emberTerpilih: 'terbit',
      muatDipanggil: 0,
      alamatDisimpan: 0,
      muat() {
        this.muatDipanggil++;
      },
      simpanKeAlamat() {
        this.alamatDisimpan++;
      },
    };
  }

  it('memilih ember lain memuat ulang daftarnya', () => {
    const d = diriUji();
    panggil('pilihEmber', d, 'submit');
    expect(d.emberTerpilih).toBe('submit');
    expect(d.muatDipanggil).toBe(1);
  });

  it('memilih ember yang SAMA tidak memuat ulang', () => {
    /*
     * Tanpa penjagaan ini, menekan ember yang sedang terbuka mengirim
     * permintaan baru setiap kali — dan daftarnya berkedip tanpa satu pun
     * barisnya berubah.
     */
    const d = diriUji();
    panggil('pilihEmber', d, 'terbit');
    expect(d.muatDipanggil).toBe(0);
    expect(d.alamatDisimpan).toBe(0);
  });

  it('pilihannya disimpan ke alamat, bukan hanya ke memori', () => {
    const d = diriUji();
    panggil('pilihEmber', d, 'ditolak');
    expect(d.alamatDisimpan).toBe(1);
  });
});

describe('pencarian', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  function diriCari() {
    return {
      cari: '',
      jedaCari: null as any,
      muatDipanggil: 0,
      muat() {
        this.muatDipanggil++;
      },
      simpanKeAlamat() {},
    };
  }

  it('mengetik cepat hanya menghasilkan SATU permintaan', () => {
    const d = diriCari();
    for (const c of 'daniel') {
      d.cari += c;
      panggil('ketikCari', d);
      jasmine.clock().tick(50);
    }
    expect(d.muatDipanggil).toBe(0);
    jasmine.clock().tick(300);
    expect(d.muatDipanggil).toBe(1);
  });

  it('berhenti mengetik memicu permintaan', () => {
    const d = diriCari();
    d.cari = 'budi';
    panggil('ketikCari', d);
    jasmine.clock().tick(299);
    expect(d.muatDipanggil).toBe(0);
    jasmine.clock().tick(1);
    expect(d.muatDipanggil).toBe(1);
  });

  it('tombol bersih mengosongkan DAN memuat ulang', () => {
    // `hapusCari` memanggil `ketikCari`, jadi `this` buatan ini harus
    // membawanya — kalau tidak, yang diuji cuma pengosongan medannya.
    const d: any = diriCari();
    d.ketikCari = (HrCandidateListComponent.prototype as any).ketikCari;
    d.cari = 'budi';
    panggil('hapusCari', d);
    expect(d.cari).toBe('');
    jasmine.clock().tick(300);
    expect(d.muatDipanggil).toBe(1);
  });
});

describe('baris terhapus', () => {
  /*
   * MySQL mengirim `isDelete` sebagai 0/1, bukan true/false. Pemeriksaan
   * `=== true` selalu salah untuk angka, dan menu baris terhapus lalu
   * menawarkan tombol status yang pasti ditolak server.
   */
  it('1 dari MySQL dibaca terhapus', () => {
    expect(panggil('terhapus', {}, { isDelete: 1 })).toBeTrue();
  });

  it('0 dari MySQL dibaca aktif', () => {
    expect(panggil('terhapus', {}, { isDelete: 0 })).toBeFalse();
  });

  it('boolean tetap dibaca benar', () => {
    expect(panggil('terhapus', {}, { isDelete: true })).toBeTrue();
    expect(panggil('terhapus', {}, { isDelete: false })).toBeFalse();
  });

  it('tanpa medannya dibaca aktif, bukan terhapus', () => {
    // Daftar lama tidak mengirim `isDelete`; barisnya jelas aktif.
    expect(panggil('terhapus', {}, {})).toBeFalse();
  });

  it('teks "0" dibaca aktif', () => {
    // `!!"0"` bernilai true — jebakan yang dihindari lewat Number().
    expect(panggil('terhapus', {}, { isDelete: '0' })).toBeFalse();
  });
});

describe('jawaban daftar yang datang tidak berurutan', () => {
  /*
   * Klik "Sudah mengirim" lalu "Ditolak" dengan cepat. Bila jawaban yang
   * pertama lebih lambat, ia tiba TERAKHIR — dan tanpa pembatalan menimpa
   * daftar dengan isi kelompok yang sudah ditinggalkan. Menu menyorot
   * "Ditolak", daftarnya berisi yang sudah mengirim. Tidak ada galat.
   */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Subject } = require('rxjs');

  function diriMuat() {
    const antre: any[] = [];
    return {
      antre,
      isLoading: false,
      pelamar: [] as any[],
      kunciDaftar: '',
      emberTerpilih: 'submit',
      ujianTerpilih: null,
      cari: '',
      muatBerjalan: null as any,
      apiService: {
        get: () => {
          const s = new Subject();
          antre.push(s);
          return s;
        },
      },
      snackBar: { open() {} },
      serverMessage: { terjemahkan: () => '' },
      translate: { instant: (k: string) => k },
    };
  }

  it('hanya jawaban TERAKHIR yang ditampilkan', () => {
    const d = diriMuat();
    panggil('muat', d); // "submit"
    d.emberTerpilih = 'ditolak';
    panggil('muat', d); // "ditolak"

    // Yang kedua tiba lebih dulu, yang pertama menyusul.
    d.antre[1].next([{ id: 2, nama: 'ditolak' }]);
    d.antre[1].complete();
    d.antre[0].next([{ id: 1, nama: 'submit' }]);
    d.antre[0].complete();

    expect(d.pelamar).toEqual([{ id: 2, nama: 'ditolak' }]);
    expect(d.kunciDaftar).toBe('ditolak');
  });

  it('memuat selesai hanya setelah permintaan terakhir tiba', () => {
    const d = diriMuat();
    panggil('muat', d);
    panggil('muat', d);
    expect(d.isLoading).toBeTrue();
    d.antre[1].next([]);
    d.antre[1].complete();
    expect(d.isLoading).toBeFalse();
  });

  it('kunci transisi disetel saat jawaban TIBA, bukan saat diklik', () => {
    const d = diriMuat();
    d.emberTerpilih = 'wawancara';
    panggil('muat', d);
    expect(d.kunciDaftar).toBe(''); // belum tiba — daftar lama belum bergerak
    d.antre[0].next([]);
    expect(d.kunciDaftar).toBe('wawancara');
  });
});
