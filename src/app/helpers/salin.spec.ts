import { salinTeks } from './salin.helper';

/**
 * Menyalin ke papan klip.
 *
 * KENAPA INI PUNYA UJI SENDIRI
 *
 * Menyalin tidak mengubah apa pun di layar. Bila ia gagal diam-diam, yang
 * menekan tombolnya baru tahu saat menempel di tempat lain — dan yang muncul
 * isi papan klip sebelumnya, yang bisa saja mirip dan luput diperiksa.
 *
 * Yang dijaga di sini terutama JALUR YANG GAGAL, karena jalur berhasilnya
 * sudah pasti dicoba orang begitu tombolnya dipasang; yang tidak pernah
 * dicoba siapa pun adalah peramban tanpa `navigator.clipboard`.
 */
describe('salinTeks', () => {
  let asliClipboard: unknown;
  let asliExec: unknown;

  beforeEach(() => {
    asliClipboard = (navigator as any).clipboard;
    asliExec = (document as any).execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: asliClipboard,
      configurable: true,
    });
    (document as any).execCommand = asliExec;
  });

  function pasangClipboard(nilai: unknown) {
    Object.defineProperty(navigator, 'clipboard', {
      value: nilai,
      configurable: true,
    });
  }

  it('memakai navigator.clipboard bila tersedia', async () => {
    let ditulis = '';
    pasangClipboard({
      writeText: (t: string) => {
        ditulis = t;
        return Promise.resolve();
      },
    });

    expect(await salinTeks('PO-2026-0042')).toBeTrue();
    expect(ditulis).toBe('PO-2026-0042');
  });

  it('TANPA navigator.clipboard, jatuh ke cara lama', async () => {
    /*
     * Inilah keadaan yang paling mudah terlewat.
     *
     * `navigator.clipboard` hanya ada pada konteks aman — `https://` dan
     * `localhost`. Pada `http://` biasa ia `undefined`, dan memanggil
     * `.writeText` atasnya melempar `TypeError`. Daftar CORS di `main.py`
     * memuat alamat `http://`, jadi jalan masuk itu benar-benar ada.
     */
    pasangClipboard(undefined);
    let dipanggil = '';
    (document as any).execCommand = (perintah: string) => {
      dipanggil = perintah;
      return true;
    };

    expect(await salinTeks('PO-2026-0042')).toBeTrue();
    expect(dipanggil).toBe('copy');
  });

  it('clipboard yang MELEMPAR juga jatuh ke cara lama', async () => {
    // Izin ditolak, atau dokumennya sedang tidak fokus. Keduanya lumrah, dan
    // keduanya tidak berarti penyalinannya mustahil.
    pasangClipboard({ writeText: () => Promise.reject(new Error('ditolak')) });
    (document as any).execCommand = () => true;

    expect(await salinTeks('PO-2026-0042')).toBeTrue();
  });

  it('mengembalikan false bila KEDUA jalurnya gagal', async () => {
    /*
     * Yang memanggilnya memakai nilai ini untuk memilih pesan. Bila fungsi
     * ini mengembalikan `true` saat gagal, penggunanya diberi tahu "berhasil
     * disalin" untuk papan klip yang tidak berubah — lebih buruk daripada
     * tidak ada pesan sama sekali.
     */
    pasangClipboard(undefined);
    (document as any).execCommand = () => false;

    expect(await salinTeks('PO-2026-0042')).toBeFalse();
  });

  it('tidak meninggalkan sampah di DOM', async () => {
    /*
     * Jalur cadangannya menyisipkan `<textarea>` sementara. Bila
     * pembuangannya tidak di `finally`, setiap penekanan tombol menambah satu
     * elemen yang tidak pernah hilang.
     */
    pasangClipboard(undefined);
    (document as any).execCommand = () => {
      throw new Error('gagal di tengah');
    };

    const sebelum = document.querySelectorAll('textarea').length;
    await salinTeks('PO-2026-0042');
    expect(document.querySelectorAll('textarea').length).toBe(sebelum);
  });

  it('nilai kosong tidak menyentuh papan klip', async () => {
    /*
     * Menyalin teks kosong MENGHAPUS isi papan klip sebelumnya. Kalau
     * tombolnya sempat tertekan pada baris tanpa nomor, yang hilang adalah
     * sesuatu yang sedang dipegang penggunanya untuk keperluan lain.
     */
    let disentuh = false;
    pasangClipboard({
      writeText: () => {
        disentuh = true;
        return Promise.resolve();
      },
    });

    expect(await salinTeks('')).toBeFalse();
    expect(await salinTeks(null)).toBeFalse();
    expect(await salinTeks(undefined)).toBeFalse();
    expect(disentuh).withContext('papan klip tetap disentuh').toBeFalse();
  });

  it('angka dan nilai bukan teks tetap dapat disalin', async () => {
    let ditulis = '';
    pasangClipboard({
      writeText: (t: string) => {
        ditulis = t;
        return Promise.resolve();
      },
    });

    expect(await salinTeks(4200042)).toBeTrue();
    expect(ditulis).toBe('4200042');
  });
});
