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

function komponen(saring: string[] = ['berjalan']): any {
  const c: any = Object.create(ProjectListComponent.prototype);
  c.saring = saring;
  c.dimuat = 0;
  c.fetch = () => (c.dimuat += 1);
  return c;
}

describe('keadaan yang ditampilkan', () => {
  it('bawaannya yang berjalan saja', () => {
    /*
     * Proyek selesai dan batal tidak pernah dihapus — biayanya tetap harus
     * dapat ditinjau — sehingga daftarnya terus memanjang setiap tahun.
     */
    expect(komponen().keadaanDiminta).toBe('berjalan');
  });

  it('SATU keadaan saja boleh, termasuk tanpa yang berjalan', () => {
    /*
     * Inilah yang bentuk sebelumnya tidak dapat menjawab: ia menjadikan
     * "berjalan" dasar yang selalu ikut, sehingga daftar berisi proyek masa
     * retensi SAJA tidak pernah dapat diminta — padahal itu pertanyaan yang
     * wajar ketika yang dikejar BAST 2.
     */
    expect(komponen(['retensi']).keadaanDiminta).toBe('retensi');
    expect(komponen(['selesai']).keadaanDiminta).toBe('selesai');
    expect(komponen(['batal']).keadaanDiminta).toBe('batal');
  });

  it('beberapa keadaan sekaligus', () => {
    expect(komponen(['berjalan', 'retensi']).keadaanDiminta).toBe(
      'berjalan,retensi',
    );
  });

  it('urutannya tetap, tidak mengikuti urutan penekanan', () => {
    // Alamat dan penyimpanan lain membandingkan untai ini apa adanya.
    expect(komponen(['batal', 'berjalan']).keadaanDiminta).toBe('berjalan,batal');
  });

  it('KOSONG berarti yang berjalan, bukan tidak ada', () => {
    /*
     * Daftar yang tidak menampilkan apa-apa bukan jawaban atas pertanyaan
     * siapa pun — dan keadaan itu paling mudah terjadi tanpa sengaja, dengan
     * mematikan keping terakhir.
     */
    expect(komponen([]).keadaanDiminta).toBe('berjalan');
  });

  it('keempatnya sekaligus', () => {
    const c = komponen(['berjalan', 'retensi', 'selesai', 'batal']);
    expect(c.keadaanDiminta).toBe('berjalan,retensi,selesai,batal');
  });
});

describe('menekan keping', () => {
  it('mengganti pilihan dan memuat sekali', () => {
    const c = komponen();
    c.ubahKeadaan(['retensi']);
    expect(c.saring).toEqual(['retensi']);
    expect(c.dimuat).toBe(1);
  });

  it('pilihan yang SAMA tidak memuat ulang apa pun', () => {
    /*
     * Penjaga terhadap kedipan. Peristiwa yang menyala sendiri saat layar
     * dibuka membawa pilihan yang sama dengan keadaan sekarang; menanggapinya
     * dengan pemuatan ulang adalah awal dari tembakan tanpa henti.
     */
    const c = komponen(['selesai']);
    c.ubahKeadaan(['selesai']);
    expect(c.dimuat).toBe(0);
  });

  it('urutan yang berbeda tetap dianggap sama', () => {
    const c = komponen(['berjalan', 'retensi']);
    c.ubahKeadaan(['retensi', 'berjalan']);
    expect(c.dimuat).toBe(0);
  });

  it('mematikan seluruhnya DIBIARKAN, tetapi yang dikirim tetap berjalan', () => {
    const c = komponen(['berjalan']);
    c.ubahKeadaan([]);
    expect(c.saring).toEqual([]);
    expect(c.keadaanDiminta).toBe('berjalan');
    expect(c.dimuat).toBe(1);
  });

  it('nilai kosong tidak melemparkan apa pun', () => {
    const c = komponen(['selesai']);
    c.ubahKeadaan(null);
    expect(c.saring).toEqual([]);
  });

  it('keadaan yang tidak dikenal diabaikan', () => {
    // Bukan diteruskan ke server: nama asing di sana hanya menghasilkan
    // daftar kosong tanpa sebab yang terbaca.
    const c = komponen([]);
    c.ubahKeadaan(['ngawur', 'selesai']);
    expect(c.saring).toEqual(['selesai']);
  });
});
