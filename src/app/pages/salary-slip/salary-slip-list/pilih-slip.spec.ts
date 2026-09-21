/*
 * Memilih slip gaji yang dikirim.
 *
 * Surel slip gaji tidak dapat ditarik kembali. Yang dijaga di sini semua
 * kekeliruan yang berakhir dengan surel yang salah berangkat — dan tidak
 * satu pun melempar galat:
 *
 *   1. Slip yang DIHAPUS ikut terpilih. Karyawan menerima slip yang sudah
 *      dicabut. (Sebelumnya terjadi lewat "Kirim semua" di tampilan Semua.)
 *   2. Centang pada baris yang sudah TIDAK TAMPIL tetap menempel. Tombol
 *      "Kirim 3 slip" lalu mengirim slip yang tidak dilihat siapa pun.
 *   3. Yang sudah terkirim tetap tercentang. Menekan kirim lagi untuk
 *      mengulang yang gagal ikut mengirim ulang yang berhasil.
 *   4. `isDelete` datang sebagai 1/0 dari MySQL, dan pemeriksaan boolean
 *      meloloskannya.
 */

import { SalarySlipListComponent } from './salary-slip-list.component';

const P = SalarySlipListComponent.prototype as any;

function diri(data: any[], terpilih: number[] = []) {
  const d: any = { dataSource: data, terpilih: new Set(terpilih) };
  // Pengambil (getter) dan fungsi dari prototipe dipasang pada `this` buatan.
  for (const nama of [
    'bolehDikirim',
    'alasanTakTerkirim',
    'terhapus',
    'pilih',
    'pilihSemua',
    'rapikanPilihan',
    'lepasYangTerkirim',
  ]) {
    d[nama] = P[nama];
  }
  for (const nama of [
    'slipDapatDikirim',
    'jumlahTerpilih',
    'semuaTerpilih',
    'sebagianTerpilih',
  ]) {
    Object.defineProperty(d, nama, {
      get: Object.getOwnPropertyDescriptor(P, nama)!.get!.bind(d),
    });
  }
  return d;
}

const A = { id: 1, email: 'a@akn.id', isDelete: 0 };
const B = { id: 2, email: 'b@akn.id', isDelete: 0 };
const HAPUS = { id: 3, email: 'c@akn.id', isDelete: 1 };
const TANPA_SUREL = { id: 4, email: null, isDelete: 0 };

describe('slip yang dapat dikirim', () => {
  it('slip terhapus TIDAK dapat dikirim — termasuk isDelete = 1', () => {
    const d = diri([HAPUS]);
    expect(d.bolehDikirim(HAPUS)).toBeFalse();
    expect(d.bolehDikirim({ ...HAPUS, isDelete: true })).toBeFalse();
    expect(d.bolehDikirim({ ...HAPUS, isDelete: '1' })).toBeFalse();
  });

  it('isDelete = 0 dan "0" dibaca aktif', () => {
    const d = diri([]);
    expect(d.bolehDikirim({ ...A, isDelete: 0 })).toBeTrue();
    expect(d.bolehDikirim({ ...A, isDelete: '0' })).toBeTrue();
  });

  it('tanpa surel tidak dapat dikirim', () => {
    expect(diri([]).bolehDikirim(TANPA_SUREL)).toBeFalse();
  });

  it('kolom surel yang tidak dikirim server tidak mematikan centang', () => {
    expect(diri([]).bolehDikirim({ id: 9, isDelete: 0 })).toBeTrue();
  });

  it('sebab tidak dapat dicentang disebut', () => {
    const d = diri([]);
    expect(d.alasanTakTerkirim(HAPUS)).toBe('salarySlip.takTerkirimDihapus');
    expect(d.alasanTakTerkirim(TANPA_SUREL)).toBe('salarySlip.takTerkirimSurel');
    expect(d.alasanTakTerkirim(A)).toBe('');
  });
});

describe('mencentang', () => {
  it('slip terhapus tidak dapat dicentang satu per satu', () => {
    const d = diri([A, HAPUS]);
    d.pilih(HAPUS, true);
    expect(d.terpilih.has(3)).toBeFalse();
  });

  it('pilih semua HANYA memilih yang dapat dikirim', () => {
    const d = diri([A, B, HAPUS, TANPA_SUREL]);
    d.pilihSemua(true);
    expect([...d.terpilih].sort()).toEqual([1, 2]);
    expect(d.semuaTerpilih).toBeTrue();
    expect(d.sebagianTerpilih).toBeFalse();
  });

  it('sebagian terpilih ditandai setengah', () => {
    const d = diri([A, B], [1]);
    expect(d.sebagianTerpilih).toBeTrue();
    expect(d.semuaTerpilih).toBeFalse();
  });

  it('tidak ada yang dapat dipilih BUKAN "semua terpilih"', () => {
    // Tanpa penjagaan `length > 0`, `every` atas daftar kosong bernilai
    // true — kotak kepala tampil tercentang pada tabel tanpa satu pun
    // slip yang dapat dikirim.
    const d = diri([HAPUS, TANPA_SUREL]);
    expect(d.semuaTerpilih).toBeFalse();
  });

  it('melepas semua mengosongkan pilihan', () => {
    const d = diri([A, B], [1, 2]);
    d.pilihSemua(false);
    expect(d.jumlahTerpilih).toBe(0);
  });
});

describe('setelah daftar dimuat ulang', () => {
  it('centang pada baris yang tidak lagi tampil DILEPAS', () => {
    const d = diri([A], [1, 2]); // B terpilih di halaman lain, kini tak tampil
    d.rapikanPilihan();
    expect([...d.terpilih]).toEqual([1]);
  });

  it('centang pada baris yang masih tampil DIPERTAHANKAN', () => {
    const d = diri([A, B], [1, 2]);
    d.rapikanPilihan();
    expect(d.jumlahTerpilih).toBe(2);
  });

  it('slip yang kini terhapus ikut dilepas walau masih tampil', () => {
    const d = diri([A, { ...B, isDelete: 1 }], [1, 2]);
    d.rapikanPilihan();
    expect([...d.terpilih]).toEqual([1]);
  });
});

describe('sesudah dikirim', () => {
  it('yang berhasil dilepas, yang gagal tetap tercentang', () => {
    const d = diri([A, B], [1, 2]);
    d.lepasYangTerkirim([1]);
    expect([...d.terpilih]).toEqual([2]);
  });

  it('id berupa teks dari server tetap cocok', () => {
    const d = diri([A, B], [1, 2]);
    d.lepasYangTerkirim(['1', '2']);
    expect(d.jumlahTerpilih).toBe(0);
  });

  it('jawaban tanpa daftar id tidak mengubah pilihan', () => {
    const d = diri([A], [1]);
    d.lepasYangTerkirim(undefined);
    expect(d.jumlahTerpilih).toBe(1);
  });
});
