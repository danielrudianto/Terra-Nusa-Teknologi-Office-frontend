import {
  mingguPekan,
  seninPekan,
  tambahHari,
  titikProyeksi,
} from './proyeksi-kas.component';

/**
 * Proyeksi kas tiga bulan.
 *
 * ------------------------------------------------------------------
 * YANG MEMULAI BERKAS INI
 * ------------------------------------------------------------------
 *
 * Kalender menyebut saldo akhir 14 September 788 juta. Titik proyeksi
 * berlabel "14 Sep" menyebut 777 juta. Kedua angkanya benar; yang salah
 * LABELNYA — titik itu memuat kas HARI INI (15 September) dengan seluruh
 * rencana pekan 14–20 September sudah ikut dikurangkan, lalu diberi nama
 * tanggal Senin awal pekannya.
 *
 * Tiga tanggal berbeda dalam satu titik. Tidak ada galat, tidak ada angka
 * yang tampak ganjil, garisnya mulus — ia cuma tidak menjawab pertanyaan
 * yang tertulis di sumbunya. Itulah kelas kekeliruan yang dijaga di sini:
 * bukan perhitungan yang meledak, melainkan angka benar yang diberi nama
 * salah.
 *
 * ------------------------------------------------------------------
 * EMPAT HAL YANG DIJAGA
 * ------------------------------------------------------------------
 *
 *   * label tiap titik = TANGGAL saldonya berlaku, bukan awal pekannya;
 *   * titik pertama = kas hari ini APA ADANYA, supaya dapat dicocokkan ke
 *     rekening dan ke kalender;
 *   * rencana TERLEWAT tidak dibuang, tetapi juga tidak mengurangi titik
 *     jangkar;
 *   * pekan kosong tetap digambar — dilewati, kemiringan garis di antara dua
 *     titik berbohong tentang berapa lama jaraknya.
 */
describe('Proyeksi kas', () => {
  const R = (date: string, amount: number, planType = 'keluar', status = 'rencana') => ({
    date,
    amount,
    planType,
    status,
  });

  // 2026-09-15 Selasa. Senin pekannya 14 Sep, Minggu pekannya 20 Sep.
  const HARI_INI = '2026-09-15';
  const SENIN = '2026-09-14';
  const MINGGU = '2026-09-20';

  // ------------------------------------------------------------------
  // Pembantu tanggal
  // ------------------------------------------------------------------

  it('seninPekan mundur ke Senin, dan Senin tetap di tempatnya', () => {
    expect(seninPekan('2026-09-15')).toBe(SENIN); // Selasa
    expect(seninPekan('2026-09-14')).toBe(SENIN); // Senin
    expect(seninPekan('2026-09-20')).toBe(SENIN); // Minggu
    expect(seninPekan('2026-09-21')).toBe('2026-09-21'); // Senin berikutnya
  });

  it('mingguPekan maju ke Minggu, dan Minggu tetap di tempatnya', () => {
    expect(mingguPekan('2026-09-14')).toBe(MINGGU); // Senin
    expect(mingguPekan('2026-09-15')).toBe(MINGGU); // Selasa
    expect(mingguPekan('2026-09-20')).toBe(MINGGU); // Minggu
  });

  it('tambahHari melintasi bulan dan tahun', () => {
    expect(tambahHari('2026-09-30', 1)).toBe('2026-10-01');
    expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01');
    expect(tambahHari('2028-02-28', 1)).toBe('2028-02-29'); // kabisat
  });

  // ------------------------------------------------------------------
  // Titik jangkar — inti laporannya
  // ------------------------------------------------------------------

  it('titik PERTAMA bertanggal hari ini, bukan Senin pekannya', () => {
    /*
     * Penjaga langsung atas keluhannya. Dulu titik pertama bertanggal
     * `2026-09-14` — Senin — sehingga pembacanya membandingkannya dengan
     * saldo 14 September di kalender, dan dua angka yang memang berbeda
     * terbaca sebagai sistem yang salah hitung.
     */
    const t = titikProyeksi([], 1000, HARI_INI, 13);
    expect(t[0].tanggal).toBe(HARI_INI);
    expect(t[0].sekarang).toBeTrue();
    expect(t[0].label).toBe('15 Sep');
  });

  it('titik jangkar TIDAK dikurangi rencana apa pun', () => {
    /*
     * Kas hari ini adalah angka yang dapat dicocokkan ke rekening.
     * Menguranginya — oleh rencana pekan ini, atau oleh yang terlewat —
     * membuat jangkarnya berhenti dapat dicocokkan, dan seluruh garis di
     * atasnya kehilangan satu-satunya titik yang dapat diperiksa.
     */
    const t = titikProyeksi(
      [
        R('2026-09-16', 300), // pekan ini, belum jatuh tempo
        R('2026-09-14', 500), // kemarin, terlewat
        R(HARI_INI, 700), // hari ini
      ],
      1000,
      HARI_INI,
      4,
    );
    expect(t[0].saldo).toBe(1000);
    expect(t[0].masuk).toBe(0);
    expect(t[0].keluar).toBe(0);
  });

  // ------------------------------------------------------------------
  // Label = tanggal saldonya berlaku
  // ------------------------------------------------------------------

  it('titik pekanan bertanggal MINGGU, hari terakhir pekannya', () => {
    const t = titikProyeksi([], 1000, HARI_INI, 3);
    expect(t.map((x) => x.tanggal)).toEqual([
      HARI_INI,
      '2026-09-20',
      '2026-09-27',
      '2026-10-04',
    ]);
  });

  it('saldo satu titik sudah memuat SELURUH rencana sampai tanggal itu', () => {
    const t = titikProyeksi(
      [R('2026-09-16', 300), R('2026-09-20', 200)],
      1000,
      HARI_INI,
      2,
    );
    // 20 Sep: kedua rencana sudah jatuh tempo pada atau sebelum tanggal itu.
    expect(t[1].tanggal).toBe('2026-09-20');
    expect(t[1].keluar).toBe(500);
    expect(t[1].saldo).toBe(500);
  });

  it('rencana tepat pada hari batas masuk ke titik itu, bukan titik sesudahnya', () => {
    // Batas yang meleset satu hari memindahkan rencana ke pekan berikutnya,
    // dan pekan yang seharusnya minus terbaca aman.
    const t = titikProyeksi([R('2026-09-20', 400)], 1000, HARI_INI, 3);
    expect(t[1].keluar).toBe(400);
    expect(t[2].keluar).toBe(0);
  });

  it('hari ini TIDAK muncul dua kali saat hari ini jatuh Minggu', () => {
    /*
     * 20 September 2026 adalah Minggu. Tanpa penyaring, batasnya menjadi
     * ['2026-09-20', '2026-09-20', ...] — dua titik bertanggal sama dengan
     * saldo berbeda, yang terbaca sebagai kekeliruan sistem.
     */
    const t = titikProyeksi([], 1000, '2026-09-20', 3);
    const tanggal = t.map((x) => x.tanggal);
    expect(new Set(tanggal).size).toBe(tanggal.length);
    expect(tanggal[0]).toBe('2026-09-20');
    expect(tanggal[1]).toBe('2026-09-27');
  });

  // ------------------------------------------------------------------
  // Rencana terlewat
  // ------------------------------------------------------------------

  it('rencana TERLEWAT masuk ke titik pertama SESUDAH hari ini', () => {
    /*
     * Uangnya belum bergerak dan kewajibannya belum hilang. Dibuang, ia
     * membuat proyeksinya terbaca lebih sehat daripada keadaannya — tepat
     * pada pekan yang paling perlu diwaspadai.
     */
    const t = titikProyeksi([R('2026-08-03', 500)], 1000, HARI_INI, 4);
    expect(t[0].saldo).toBe(1000); // jangkarnya utuh
    expect(t[1].keluar).toBe(500);
    expect(t[1].saldo).toBe(500);
  });

  it('rencana bertanggal HARI INI diperlakukan seperti terlewat', () => {
    // Uangnya belum bergerak — kalau sudah, statusnya bukan `rencana` lagi.
    const t = titikProyeksi([R(HARI_INI, 250)], 1000, HARI_INI, 4);
    expect(t[0].saldo).toBe(1000);
    expect(t[1].keluar).toBe(250);
  });

  // ------------------------------------------------------------------
  // Bentuk garis
  // ------------------------------------------------------------------

  it('pekan kosong TETAP digambar', () => {
    // Dilewati, kemiringan garis di antara dua titik berbohong tentang
    // berapa lama jarak waktunya.
    const t = titikProyeksi([], 1000, HARI_INI, 13);
    expect(t.length).toBe(14); // jangkar + 13 pekan
    expect(t.every((x) => x.saldo === 1000)).toBeTrue();
  });

  it('saldo berjalan kumulatif dari kas hari ini', () => {
    const t = titikProyeksi(
      [R('2026-09-16', 300), R('2026-09-23', 200, 'masuk')],
      1000,
      HARI_INI,
      3,
    );
    expect(t.map((x) => x.saldo)).toEqual([1000, 700, 900, 900]);
  });

  it('rencana di luar jangkauan tidak menggeser saldo', () => {
    const t = titikProyeksi([R('2027-06-01', 9999)], 1000, HARI_INI, 4);
    expect(t.every((x) => x.saldo === 1000)).toBeTrue();
  });

  it('hanya status `rencana` yang dihitung', () => {
    // Yang sudah `terpakai` uangnya sudah bergerak dan sudah ada di kas hari
    // ini — menghitungnya lagi berarti satu pembayaran mengurangi kas dua kali.
    const t = titikProyeksi(
      [
        R('2026-09-16', 300, 'keluar', 'terpakai'),
        R('2026-09-16', 100, 'keluar', 'batal'),
        R('2026-09-16', 50),
      ],
      1000,
      HARI_INI,
      2,
    );
    expect(t[1].keluar).toBe(50);
  });

  it('nominal negatif dibaca sebagai besarannya', () => {
    // Dibiarkan apa adanya, rencana keluar bertanda negatif justru MENAMBAH
    // saldo — arah yang berlawanan, dan tanpa galat.
    const t = titikProyeksi([R('2026-09-16', -300)], 1000, HARI_INI, 2);
    expect(t[1].keluar).toBe(300);
    expect(t[1].saldo).toBe(700);
  });

  it('tanggal yang tidak terbaca diabaikan, bukan menjatuhkan seluruhnya', () => {
    const t = titikProyeksi(
      [R('', 900), R(null as any, 900), R('2026-09-16', 50)],
      1000,
      HARI_INI,
      2,
    );
    expect(t[1].keluar).toBe(50);
  });

  it('tanggal mulai yang tidak terbaca menghasilkan kosong', () => {
    expect(titikProyeksi([], 1000, 'bukan tanggal', 13)).toEqual([]);
  });

  it('melewati pergantian tahun tanpa melompat', () => {
    const t = titikProyeksi([], 0, '2026-12-28', 3);
    expect(t.map((x) => x.tanggal)).toEqual([
      '2026-12-28',
      '2027-01-03',
      '2027-01-10',
      '2027-01-17',
    ]);
  });

  // ------------------------------------------------------------------
  // Penjaga menyeluruh
  // ------------------------------------------------------------------

  it('setiap rencana dalam jangkauan terhitung TEPAT SEKALI', () => {
    /*
     * Penjaga yang sebenarnya atas pengemberan. Rencana yang terhitung dua
     * kali atau hilang tidak menghasilkan galat — garisnya tetap mulus, dan
     * yang membacanya menyimpulkan kasnya lebih sehat atau lebih parah
     * daripada keadaannya.
     */
    const rencana = [
      R('2026-08-01', 11), // terlewat
      R(HARI_INI, 13), // hari ini
      R('2026-09-16', 17),
      R('2026-09-20', 19), // tepat di batas
      R('2026-09-21', 23), // hari pertama pekan berikutnya
      R('2026-10-04', 29),
      R('2026-11-30', 31),
    ];
    const t = titikProyeksi(rencana, 0, HARI_INI, 13);
    const jumlah = t.reduce((a, x) => a + x.keluar, 0);
    expect(jumlah).toBe(11 + 13 + 17 + 19 + 23 + 29 + 31);
    // Dan saldo akhirnya sama dengan jangkar dikurangi seluruhnya.
    expect(t[t.length - 1].saldo).toBe(-jumlah);
  });

  it('tanggal titiknya selalu menaik', () => {
    const t = titikProyeksi([], 0, HARI_INI, 13);
    for (let i = 1; i < t.length; i++) {
      expect(t[i].tanggal > t[i - 1].tanggal)
        .withContext(`${t[i - 1].tanggal} -> ${t[i].tanggal}`)
        .toBeTrue();
    }
  });
});
