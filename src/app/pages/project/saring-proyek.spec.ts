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

/**
 * Saringan tersimpan di ALAMAT halamannya.
 *
 * Tanpa ini, menekan segarkan atau membagikan tautannya mengembalikan daftar
 * ke halaman pertama tanpa saringan — dan yang membukanya melihat sesuatu
 * yang lain dari yang dimaksud pengirimnya, tanpa tahu bahwa yang dilihatnya
 * berbeda. Daftar Tender sudah begitu sejak awal; yang ini menyusul.
 */
function komponenBeralamat(params: Record<string, any>): any {
  const c: any = Object.create(ProjectListComponent.prototype);
  c.saring = ['berjalan'];
  c.page = 0;
  c.pageSize = 10;
  c.sortBy = 'code';
  c.sortByDirection = 'asc';
  c.searchControl = { value: '', setValue: (v: any) => (c.searchControl.value = v) };
  c.route = { snapshot: { queryParams: params } };
  c.ditulis = null;
  c.router = { navigate: (_: any, opts: any) => (c.ditulis = opts) };
  return c;
}

describe('saringan proyek tersimpan di alamatnya', () => {
  it('keadaan dibaca dari alamat', () => {
    const c = komponenBeralamat({ keadaan: 'retensi,selesai' });
    c.bacaAlamat();
    expect(c.saring).toEqual(['retensi', 'selesai']);
  });

  it('urutan pada alamat tidak menentukan urutan tersimpan', () => {
    // Yang menentukan urutan KEADAAN, supaya untainya dapat dibandingkan.
    const c = komponenBeralamat({ keadaan: 'batal,berjalan' });
    c.bacaAlamat();
    expect(c.keadaanDiminta).toBe('berjalan,batal');
  });

  it('keadaan asing pada alamat diabaikan, bukan diteruskan', () => {
    /*
     * Alamatnya dapat diketik siapa saja. Nama yang tidak dikenal
     * menghasilkan saringan yang tidak cocok dengan apa pun, dan daftarnya
     * kosong tanpa satu pun keterangan mengapa.
     */
    const c = komponenBeralamat({ keadaan: 'ngawur,retensi' });
    c.bacaAlamat();
    expect(c.saring).toEqual(['retensi']);
  });

  it('seluruhnya asing kembali ke bawaannya', () => {
    const c = komponenBeralamat({ keadaan: 'ngawur,ngaco' });
    c.bacaAlamat();
    expect(c.saring).toEqual(['berjalan']);
  });

  it('halaman pada alamat dihitung dari satu, di dalam dari nol', () => {
    // Alamat yang menyebut "halaman 0" tidak berarti apa pun bagi yang
    // membacanya; paginator-nya sendiri menghitung dari nol.
    const c = komponenBeralamat({ page: '3' });
    c.bacaAlamat();
    expect(c.page).toBe(2);
  });

  it('halaman tidak pernah menjadi negatif', () => {
    const c = komponenBeralamat({ page: '0' });
    c.bacaAlamat();
    expect(c.page).toBe(0);
  });

  it('arah urutan yang tidak dikenal diabaikan', () => {
    const c = komponenBeralamat({ sortByDirection: 'menyamping' });
    c.bacaAlamat();
    expect(c.sortByDirection).toBe('asc');
  });

  it('alamat kosong tidak mengubah apa pun', () => {
    const c = komponenBeralamat({});
    c.bacaAlamat();
    expect(c.saring).toEqual(['berjalan']);
    expect(c.page).toBe(0);
    expect(c.sortBy).toBe('code');
  });

  it('keadaan ditulis kembali ke alamat', () => {
    const c = komponenBeralamat({});
    c.saring = ['retensi'];
    c.simpanKeAlamat();
    expect(c.ditulis.queryParams.keadaan).toBe('retensi');
    expect(c.ditulis.queryParams.page).toBe(1);
  });

  it('penulisannya tidak menambah riwayat peramban', () => {
    /*
     * Menambahnya tiap kali kolom ditekan membuat tombol kembali menelusuri
     * ulang setiap pengurutan — pada daftar yang kerap diurutkan, tombol itu
     * menjadi tidak dapat dipakai sama sekali.
     */
    const c = komponenBeralamat({});
    c.simpanKeAlamat();
    expect(c.ditulis.replaceUrl).toBeTrue();
  });

  it('pencarian kosong tidak meninggalkan sisa pada alamat', () => {
    const c = komponenBeralamat({});
    c.searchControl.value = '   ';
    c.simpanKeAlamat();
    expect(c.ditulis.queryParams.cari).toBeNull();
  });

  it('di luar router, tidak ada yang dibaca maupun ditulis', () => {
    // Komponen ini dibangun langsung oleh sebagian pengujian, tanpa router.
    const c = komponenBeralamat({});
    c.route = null;
    expect(() => c.bacaAlamat()).not.toThrow();
    c.simpanKeAlamat();
    expect(c.ditulis).toBeNull();
  });
});
