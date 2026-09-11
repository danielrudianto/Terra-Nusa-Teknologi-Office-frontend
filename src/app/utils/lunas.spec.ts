import { FORMAT_RUPIAH, TOLERANSI_LUNAS, sudahLunas } from './lunas';

/*
 * Dokumen bernilai Rp 0,11 tidak dapat dibayar sama sekali.
 *
 * Tombol "Bayar expense" mati, dan di atasnya tertulis "Dokumen ini sudah
 * lunas" — padahal belum sepeser pun keluar. Sebabnya dua, dan keduanya di
 * layar, bukan di server:
 *
 *   1. Empat dialog pembayaran menyimpan salinan aturan "sudah lunas"
 *      masing-masing, dan keempatnya memakai ambang LIMA RUPIAH — disalin
 *      dari toleransi pembulatan pajak di server, tempat ia memang benar.
 *      Di sini ia keliru: setiap dokumen yang nilainya sendiri di bawah lima
 *      rupiah dianggap lunas sejak lahir.
 *
 *   2. Angkanya ditampilkan dengan `1.0-0` — dibulatkan ke rupiah penuh.
 *      Rp 0,11 tampil sebagai "Rp 0" di SETIAP baris: DPP, total tagihan,
 *      sisa, riwayat pembayaran. Yang membacanya melihat dokumen bernilai
 *      nol yang tidak dapat dibayar, dan tidak ada apa pun di layar yang
 *      menjelaskan dari mana angka nol itu datang.
 */

describe('ambang "sudah lunas"', () => {
  it('sama dengan ambang di server', () => {
    /*
     * `TOLERANSI_LUNAS` di `controllers/payment_outgoing_controller.py`.
     * Server dan layar yang berbeda pendapat menghasilkan kegagalan yang
     * paling membingungkan: tombol mati padahal servernya menerima, atau
     * tombol hidup lalu permintaannya ditolak.
     */
    expect(TOLERANSI_LUNAS).toBe(0.01);
  });

  it('tidak menganggap dokumen Rp 0,11 sudah lunas', () => {
    expect(sudahLunas(0.11))
      .withContext(
        'inilah yang membuat tombol bayarnya mati selamanya, tanpa satu pun ' +
          'pesan yang menjelaskan mengapa',
      )
      .toBe(false);
  });

  it('tidak menutup sisa pembulatan di bawah satu rupiah', () => {
    /*
     * Justru sisa itulah yang dicatat sebagai pembayaran pembulatan — selisih
     * perhitungan antara pembukuan AKN dan pembukuan pihak lain.
     */
    expect(sudahLunas(0.83)).toBe(false);
    expect(sudahLunas(4.99)).toBe(false);
  });

  it('menutup pintu hanya ketika sisanya benar-benar nol', () => {
    expect(sudahLunas(0)).toBe(true);
    expect(sudahLunas(0.01)).toBe(true);
    expect(sudahLunas(-3)).toBe(true);
  });

  it('memperlakukan nilai yang belum termuat sebagai nol', () => {
    /*
     * Dialognya digambar sebelum datanya tiba. Nilai `null` yang menjadi NaN
     * membuat perbandingannya selalu salah, dan tombolnya hidup pada dokumen
     * yang belum diketahui isinya.
     */
    expect(sudahLunas(null)).toBe(true);
    expect(sudahLunas(undefined)).toBe(true);
  });
});

describe('format rupiah', () => {
  it('menampilkan sen, bukan membulatkannya hilang', () => {
    expect(FORMAT_RUPIAH)
      .withContext('`1.0-0` membuat Rp 0,11 tampil sebagai "Rp 0"')
      .toBe('1.0-2');
  });
});

/*
 * Dialog yang benar-benar dipakai Daniel, dijalankan.
 *
 * Uji di atas menjaga aturannya; yang ini menjaga bahwa dialognya memang
 * MEMAKAI aturan itu. Keduanya perlu: aturan yang benar di berkas yang tidak
 * dipanggil siapa pun tidak menyalakan satu tombol pun.
 */
describe('dialog pembayaran beban', () => {
  it('tidak menganggap beban Rp 0,11 sudah lunas', async () => {
    const { ExpensePaymentCreateComponent } = await import(
      '../components/payment-create/expense-payment-create/expense-payment-create.component'
    );

    // Prototipe dipakai langsung: `sudahLunas` hanya membaca `totalAmount`,
    // dan membangun komponennya utuh menyeret seluruh Angular Material tanpa
    // menambah apa pun pada yang diuji.
    const proto = ExpensePaymentCreateComponent.prototype as any;
    const uji = Object.create(proto);

    uji.totalAmount = 0.11;
    expect(uji.sudahLunas)
      .withContext('tombol "Bayar expense" mati pada beban yang belum dibayar')
      .toBe(false);

    uji.totalAmount = 0;
    expect(uji.sudahLunas).toBe(true);
  });
});
