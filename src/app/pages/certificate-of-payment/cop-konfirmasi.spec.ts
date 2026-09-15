import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AksiCop,
  nomorCop,
  pesanBerhasilCop,
  teksKonfirmasiCop,
} from './cop-konfirmasi';

/*
 * Konfirmasi dan pesan berhasil pada CoP.
 *
 * Sebelumnya keempat tindakan menentukan — hapus, setujui CoP, setujui BAP,
 * dan tandai diperiksa — langsung memanggil server begitu ditekan, lalu
 * memuat ulang daftarnya. Tidak ada yang menahan, dan pada keberhasilan tidak
 * ada yang mengabarkan.
 *
 * Dua akibatnya sama-sama buruk: dokumen keuangan terhapus oleh satu kali
 * salah tekan, dan yang ragu apakah tindakannya jadi akan menekannya SEKALI
 * LAGI — pada tombol yang menyetujui tagihan.
 *
 * Yang dijaga di sini BUKAN bahwa dialognya muncul, melainkan hal-hal yang
 * diam-diam salah bila teksnya disusun ulang di layar kedua.
 */

/*
 * Dua pemeriksaan lain sengaja TIDAK di sini: kelengkapan kunci di ketiga
 * berkas terjemahan, dan bentuk pemanggilan `konfirmasi()` di kedua layar.
 *
 * Keduanya menuntut membaca berkas SUMBER, dan karma tidak menyajikannya —
 * `fetch` menjawab 404, penjaganya melewatkan diam-diam, dan ujinya HIJAU
 * tanpa memeriksa apa pun. Itu justru kelas bug yang paling ingin dihindari
 * berkas ini.
 *
 * Rumahnya `scripts/pemeriksa/copkonfirmasicek.py`, yang membaca berkasnya
 * langsung dari disk.
 */

function terjemahan(): TranslateService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
  const t = TestBed.inject(TranslateService);
  t.setTranslation('id', {
    cop: {
      konfirmHapusJudul: 'Hapus certificate of payment?',
      konfirmHapus:
        'CoP {{nomor}} akan dihapus. Volume yang sudah disertifikasi di ' +
        'dalamnya kembali tersedia untuk CoP berikutnya.',
      konfirmSetujuiJudul: 'Setujui CoP ini?',
      konfirmSetujui:
        'CoP {{nomor}} menjadi siap ditagih. Persetujuan CoP tidak dapat ' +
        'dicabut dari layar ini.',
      konfirmSetujuiBapJudul: 'Setujui BAP ini?',
      konfirmSetujuiBap:
        'Volume pada BAP {{nomor}} dikunci dan pengisian harga terbuka.',
      berhasilHapus: 'CoP {{nomor}} dihapus.',
      berhasilSetujui: 'CoP {{nomor}} disetujui — siap ditagih.',
      berhasilSetujuiBap: 'BAP {{nomor}} disetujui. Harga sudah boleh diisi.',
      berhasilPeriksa: 'CoP {{nomor}} ditandai sudah diperiksa.',
      berhasilCabutPeriksa: 'Pemeriksaan CoP {{nomor}} dicabut.',
    },
  });
  t.use('id');
  return t;
}

describe('konfirmasi tindakan CoP', () => {
  it('menyebut NOMOR dokumennya, bukan sekadar bertanya "yakin?"', () => {
    const t = terjemahan();
    const teks = teksKonfirmasiCop(t, 'hapus', '002-042-R501-2026');

    // Tanpa nomornya, yang menekan tidak dapat memastikan ia menghapus
    // dokumen yang benar — dan justru itulah satu-satunya pekerjaan
    // kalimat tersebut.
    expect(teks.prompt).toContain('002-042-R501-2026');
  });

  it('hanya HAPUS yang ditandai merusak', () => {
    const t = terjemahan();

    expect(teksKonfirmasiCop(t, 'hapus', 'X').destructive).toBeTrue();
    // Persetujuan mengikat, tetapi tidak menghilangkan apa pun. Menandainya
    // merah menyamakan "keputusan yang mengikat" dengan "data yang lenyap",
    // dan yang membaca berhenti membedakan keduanya.
    expect(teksKonfirmasiCop(t, 'setujui', 'X').destructive).toBeFalse();
    expect(teksKonfirmasiCop(t, 'setujuiBap', 'X').destructive).toBeFalse();
  });

  it('memberitahu AKIBATNYA, bukan cuma nama tindakannya', () => {
    const t = terjemahan();

    // Persetujuan CoP memang tidak dapat dicabut: rutenya
    // `PATCH /{id}/approve` tidak menerima parameter pembatalan, berbeda
    // dengan `approve-bap` yang menerima `approve=false`.
    expect(teksKonfirmasiCop(t, 'setujui', 'X').prompt).toContain(
      'tidak dapat dicabut',
    );
    expect(teksKonfirmasiCop(t, 'hapus', 'X').prompt).toContain(
      'kembali tersedia',
    );
  });

  it('membedakan menandai diperiksa dari mencabutnya', () => {
    const t = terjemahan();

    // Satu sakelar, dua arah. Pesan yang sama untuk keduanya membuat yang
    // tidak sengaja mencabut pemeriksaan membaca "berhasil" dan mengira
    // tandanya justru terpasang.
    const pasang = pesanBerhasilCop(t, 'periksa', 'X');
    const cabut = pesanBerhasilCop(t, 'cabutPeriksa', 'X');
    expect(pasang).not.toEqual(cabut);
    expect(cabut).toContain('dicabut');
  });

  it('setiap tindakan punya pesan berhasil — tidak ada yang diam', () => {
    const t = terjemahan();
    const semua: AksiCop[] = [
      'hapus',
      'setujui',
      'setujuiBap',
      'periksa',
      'cabutPeriksa',
    ];

    for (const aksi of semua) {
      const pesan = pesanBerhasilCop(t, aksi, '002-042-R501-2026');
      // Kunci yang belum diterjemahkan dikembalikan APA ADANYA oleh
      // ngx-translate — "cop.berhasilHapus" muncul mentah di layar, dan itu
      // tidak menimbulkan galat apa pun.
      expect(pesan)
        .withContext(`pesan berhasil untuk "${aksi}" belum ada`)
        .not.toContain('cop.');
      expect(pesan).toContain('002-042-R501-2026');
    }
  });

  it('memakai nomor yang SAMA dengan yang tertera di layar', () => {
    // `name` nomor lengkapnya; `number` cuma urutan di dalam rantai
    // vendor+proyek. Menyebut "2" pada konfirmasi sementara layar menampilkan
    // "002-042-R501-2026" membuat keduanya tidak dapat dicocokkan.
    expect(nomorCop({ name: '002-042-R501-2026', number: 2 })).toBe(
      '002-042-R501-2026',
    );
    expect(nomorCop({ name: '', number: 2 })).toBe('2');
    expect(nomorCop({ name: null, number: null })).toBe('');
  });

});
