/*
 * Bagian-bagian avatar.
 *
 * Berkas pendampingnya BUKAN komponen — tidak ada `@Component` di dalamnya,
 * hanya kumpulan bentuk SVG dan palet warna. Pengujian bawaan hasil
 * `ng generate` masih tertinggal di sini dan mencoba membuat
 * `AvatarPartsComponent` yang tidak pernah ada, sehingga SELURUH pengumpulan
 * berkas uji frontend gagal dikompilasi: satu berkas rusak membuat `npm test`
 * tidak menjalankan satu pun pengujian lain.
 *
 * Berkas `.html` dan `.scss` bawaan pembuatan komponen ("avatar-parts
 * works!") ikut dihapus; keduanya tidak pernah dirujuk siapa pun.
 *
 * Yang diuji sekarang hal yang memang dapat rusak diam-diam: setiap bagian
 * harus punya kunci terjemahan dan penggambarnya, dan setiap id harus unik —
 * id yang bertabrakan membuat avatar tersimpan menunjuk bentuk yang berbeda
 * dari yang dipilih orangnya.
 */
import {
  BACKGROUND_COLORS,
  DEFAULT_AVATAR,
  EYES,
  FACES,
  HAIRS,
  HAIR_COLORS,
  MOUTHS,
  SKIN_TONES,
  TOP_COLORS,
} from './avatar-parts.component';

/** Kumpulan bentuk: tiap entri punya label dan penggambarnya. */
const BENTUK: Record<string, Record<string, any>> = {
  FACES,
  HAIRS,
  EYES,
  MOUTHS,
};

/** Kumpulan warna: tiap entri punya label dan nilai warnanya. */
const WARNA: Record<string, Record<string, any>> = {
  SKIN_TONES,
  HAIR_COLORS,
  TOP_COLORS,
  BACKGROUND_COLORS,
};

describe('avatar-parts', () => {
  it('setiap bentuk punya kunci terjemahan dan penggambarnya', () => {
    for (const [nama, daftar] of Object.entries(BENTUK)) {
      const isi = Object.entries(daftar);
      expect(isi.length).toBeGreaterThan(0);

      for (const [id, bagian] of isi) {
        expect(typeof bagian.labelKey)
          .withContext(`${nama}.${id} tanpa labelKey`)
          .toBe('string');
        expect(bagian.labelKey.length)
          .withContext(`${nama}.${id} labelKey kosong`)
          .toBeGreaterThan(0);
        expect(typeof bagian.draw)
          .withContext(`${nama}.${id} tanpa penggambar`)
          .toBe('function');
      }
    }
  });

  it('setiap bentuk menggambar tanpa melempar galat', () => {
    // Penggambar menerima warnanya; nilainya tidak penting di sini, yang
    // diperiksa adalah bahwa bentuknya menghasilkan SVG dan tidak melempar.
    const warna = { fill: '#000000', shade: '#333333' };

    for (const [nama, daftar] of Object.entries(BENTUK)) {
      for (const [id, bagian] of Object.entries(daftar)) {
        const svg = bagian.draw(warna);
        expect(typeof svg)
          .withContext(`${nama}.${id} tidak mengembalikan teks`)
          .toBe('string');
      }
    }
  });

  it('hanya pilihan "tidak ada" yang boleh menggambar kosong', () => {
    /*
     * Bentuk kosong itu SAH untuk satu pilihan saja — "Tidak ada" pada
     * rambut. Selebihnya, penggambar yang mengembalikan teks kosong berarti
     * bagian itu hilang dari avatar tanpa galat apa pun, dan yang memilihnya
     * mengira pilihannya tidak berfungsi.
     */
    const warna = { fill: '#000000', shade: '#333333' };
    const kosong: string[] = [];

    for (const [nama, daftar] of Object.entries(BENTUK)) {
      for (const [id, bagian] of Object.entries(daftar)) {
        if (!bagian.draw(warna).trim()) kosong.push(`${nama}.${id}`);
      }
    }

    expect(kosong).toEqual(['HAIRS.hair-00']);
  });

  it('setiap warna punya kunci terjemahan', () => {
    for (const [nama, daftar] of Object.entries(WARNA)) {
      const isi = Object.entries(daftar);
      expect(isi.length).toBeGreaterThan(0);

      for (const [id, warna] of isi) {
        expect(typeof warna.labelKey)
          .withContext(`${nama}.${id} tanpa labelKey`)
          .toBe('string');
      }
    }
  });

  it('avatar bawaan menunjuk bagian yang benar-benar ada', () => {
    /*
     * Bawaan dipakai pengguna yang belum pernah menyusun avatarnya sendiri —
     * yaitu hampir semua orang. Id yang menunjuk bentuk yang sudah dihapus
     * membuat avatarnya kosong tanpa galat apa pun.
     */
    expect(FACES[DEFAULT_AVATAR.faceID]).toBeDefined();
    expect(HAIRS[DEFAULT_AVATAR.hairID]).toBeDefined();
    expect(EYES[DEFAULT_AVATAR.eyesID]).toBeDefined();
    expect(MOUTHS[DEFAULT_AVATAR.mouthID]).toBeDefined();
    expect(SKIN_TONES[DEFAULT_AVATAR.skinTone]).toBeDefined();
    expect(HAIR_COLORS[DEFAULT_AVATAR.hairColor]).toBeDefined();
  });

  it('kunci terjemahan tidak dipakai dua bagian berbeda', () => {
    /*
     * Dua bagian berlabel sama tidak dapat dibedakan pada pemilihnya, dan
     * yang memilih menganggap salah satunya tidak berfungsi.
     */
    const semua = [...Object.values(BENTUK), ...Object.values(WARNA)].flatMap(
      (daftar) => Object.values(daftar).map((x: any) => x.labelKey),
    );
    expect(new Set(semua).size).toBe(semua.length);
  });
});
