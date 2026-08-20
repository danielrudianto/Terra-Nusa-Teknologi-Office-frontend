/**
 * Penyaring keadaan pada daftar proyek.
 *
 * Kerusakan yang mendorongnya: sejak saringan bawaannya menjadi "Berjalan",
 * daftarnya berkedip tanpa henti dan menembak server beratus kali — "Gagal
 * memuat data" beruntun.
 *
 * Sebabnya sepasang ikatan yang saling menyalakan. Tiap keping memasangkan
 * `[selected]="saring === 'x'"` dengan `(selectionChange)="pilihSaring('x')"`.
 * Selama tidak ada keping yang terpilih sejak awal, itu tidak pernah
 * bermasalah. Begitu ada, kepingnya terpilih saat layar dibuka,
 * `selectionChange` menyala TANPA ada yang menekannya, penanganya
 * menganggapnya penekanan kedua lalu membatalkan pilihan — `[selected]`
 * berubah, peristiwanya menyala lagi, dan seterusnya.
 *
 * Yang diuji di sini penanganya: nilai yang sama tidak boleh membatalkan
 * apa pun, dan tidak boleh memuat ulang.
 */

import { ProjectListComponent } from './project-list/project-list.component';

function komponen(tambahan: string[] = []): any {
  const c: any = Object.create(ProjectListComponent.prototype);
  c.tambahan = tambahan;
  c.dimuat = 0;
  c.fetch = () => (c.dimuat += 1);
  return c;
}

describe('keadaan yang ikut ditampilkan', () => {
  it('bawaannya HANYA yang berjalan', () => {
    /*
     * Proyek selesai dan batal tidak pernah dihapus — biayanya tetap harus
     * dapat ditinjau — sehingga daftarnya terus memanjang setiap tahun.
     */
    const c = komponen();
    expect(c.keadaanDiminta).toBe('berjalan');
  });

  it('yang berjalan SELALU ikut, apa pun yang dicentang', () => {
    // Kepingnya menambah, bukan mengganti. Bentuk sebelumnya mengganti —
    // yang ingin melihat keduanya harus membukanya bergantian.
    expect(komponen(['selesai']).keadaanDiminta).toBe('berjalan,selesai');
    expect(komponen(['batal']).keadaanDiminta).toBe('berjalan,batal');
  });

  it('urutannya tetap, tidak mengikuti urutan penekanan', () => {
    // Alamat dan penyimpanan lain membandingkan untai ini apa adanya.
    const c = komponen(['batal', 'retensi']);
    expect(c.keadaanDiminta).toBe('berjalan,retensi,batal');
  });

  it('ketiganya sekaligus', () => {
    expect(komponen(['retensi', 'selesai', 'batal']).keadaanDiminta).toBe(
      'berjalan,retensi,selesai,batal',
    );
  });
});

describe('menekan keping', () => {
  it('menyalakan satu keadaan dan memuat sekali', () => {
    const c = komponen();
    c.ubahTambahan(['retensi']);
    expect(c.tambahan).toEqual(['retensi']);
    expect(c.dimuat).toBe(1);
  });

  it('pilihan yang SAMA tidak memuat ulang apa pun', () => {
    /*
     * Penjaga terhadap kedipan. Peristiwa yang menyala sendiri saat layar
     * dibuka membawa pilihan yang sama dengan keadaan sekarang; menanggapinya
     * dengan pemuatan ulang adalah awal dari tembakan tanpa henti.
     */
    const c = komponen(['selesai']);
    c.ubahTambahan(['selesai']);
    expect(c.dimuat).toBe(0);
  });

  it('urutan yang berbeda tetap dianggap sama', () => {
    const c = komponen(['retensi', 'selesai']);
    c.ubahTambahan(['selesai', 'retensi']);
    expect(c.dimuat).toBe(0);
  });

  it('mengosongkan pilihan kembali ke yang berjalan saja', () => {
    const c = komponen(['selesai']);
    c.ubahTambahan([]);
    expect(c.tambahan).toEqual([]);
    expect(c.keadaanDiminta).toBe('berjalan');
    expect(c.dimuat).toBe(1);
  });

  it('nilai kosong tidak melemparkan apa pun', () => {
    const c = komponen(['selesai']);
    c.ubahTambahan(null);
    expect(c.tambahan).toEqual([]);
  });

  it('keadaan yang tidak dikenal diabaikan', () => {
    // Bukan diteruskan ke server: nama asing di sana hanya menghasilkan
    // daftar kosong tanpa sebab yang terbaca.
    const c = komponen();
    c.ubahTambahan(['ngawur', 'selesai']);
    expect(c.tambahan).toEqual(['selesai']);
  });
});
