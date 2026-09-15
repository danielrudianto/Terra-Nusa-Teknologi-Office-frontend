import { seninPekan, titikProyeksi } from './proyeksi-kas.component';

/**
 * Proyeksi kas tiga bulan, per pekan.
 *
 * Yang diuji bentuk datanya, bukan gambarnya. Tiga hal yang paling mudah
 * salah, dan tidak satu pun menghasilkan galat:
 *
 *   * rencana TERLEWAT dibuang — proyeksinya terbaca lebih sehat daripada
 *     keadaannya, tepat pada bulan yang paling perlu diwaspadai;
 *   * pekan kosong dilewati — kemiringan garis di antara dua titik berbohong
 *     tentang berapa lama jarak waktunya;
 *   * saldo dimulai dari nol alih-alih dari kas sungguhan — seluruh garisnya
 *     bergeser sebanyak selisih itu, dan bentuknya tetap tampak masuk akal.
 */
describe('Proyeksi kas', () => {
  const R = (date: string, amount: number, planType = 'keluar', status = 'rencana') => ({
    date,
    amount,
    planType,
    status,
  });

  // 2026-09-15 adalah Selasa; Senin pekannya 2026-09-14.
  const HARI_INI = '2026-09-15';
  const SENIN = '2026-09-14';

  it('seninPekan mundur ke Senin, dan Senin tetap di tempatnya', () => {
    expect(seninPekan('2026-09-15')).toBe(SENIN); // Selasa
    expect(seninPekan('2026-09-14')).toBe(SENIN); // Senin
    expect(seninPekan('2026-09-20')).toBe(SENIN); // Minggu
    expect(seninPekan('2026-09-21')).toBe('2026-09-21'); // Senin berikutnya
  });

  it('selalu menghasilkan tepat sebanyak pekan yang diminta', () => {
    // Pekan kosong TETAP digambar. Dilewati, kemiringan garis di antara dua
    // titik berbohong tentang jarak waktunya.
    const t = titikProyeksi([], 1000, HARI_INI, 13);
    expect(t.length).toBe(13);
    expect(t[0].mulai).toBe(SENIN);
    expect(t.every((x) => x.saldo === 1000)).toBeTrue();
  });

  it('saldo berjalan kumulatif dari kas hari ini', () => {
    const t = titikProyeksi(
      [R('2026-09-16', 300), R('2026-09-23', 200, 'masuk')],
      1000,
      HARI_INI,
      3,
    );
    expect(t.map((x) => x.saldo)).toEqual([700, 900, 900]);
    expect(t[0].keluar).toBe(300);
    expect(t[1].masuk).toBe(200);
  });

  it('rencana TERLEWAT masuk ke pekan pertama, bukan dibuang', () => {
    /*
     * Uangnya belum bergerak dan kewajibannya belum hilang. Dibuang, ia
     * membuat proyeksinya terbaca lebih sehat daripada keadaannya.
     */
    const t = titikProyeksi([R('2026-08-03', 500)], 1000, HARI_INI, 4);
    expect(t[0].keluar).toBe(500);
    expect(t[0].saldo).toBe(500);
  });

  it('rencana di luar jangkauan tidak menggeser saldo', () => {
    // Dilewati di garisnya; jumlahnya dilaporkan terpisah oleh komponennya
    // supaya tidak hilang diam-diam.
    const t = titikProyeksi([R('2027-06-01', 9999)], 1000, HARI_INI, 4);
    expect(t.every((x) => x.saldo === 1000)).toBeTrue();
  });

  it('hanya status `rencana` yang dihitung', () => {
    // Yang sudah `terpakai` uangnya sudah bergerak dan sudah ada di saldo
    // hari ini — menghitungnya lagi berarti satu pembayaran mengurangi kas
    // dua kali.
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
    expect(t[0].keluar).toBe(50);
  });

  it('nominal negatif dibaca sebagai besarannya', () => {
    // Dibiarkan apa adanya, rencana keluar bertanda negatif justru MENAMBAH
    // saldo — arah yang berlawanan, dan tanpa galat.
    const t = titikProyeksi([R('2026-09-16', -300)], 1000, HARI_INI, 2);
    expect(t[0].keluar).toBe(300);
    expect(t[0].saldo).toBe(700);
  });

  it('tanggal yang tidak terbaca diabaikan, bukan menjatuhkan seluruhnya', () => {
    const t = titikProyeksi(
      [R('', 900), R(null as any, 900), R('2026-09-16', 50)],
      1000,
      HARI_INI,
      2,
    );
    expect(t[0].keluar).toBe(50);
  });

  it('melewati pergantian tahun tanpa melompat', () => {
    const t = titikProyeksi([], 0, '2026-12-28', 4);
    expect(t.map((x) => x.mulai)).toEqual([
      '2026-12-28',
      '2027-01-04',
      '2027-01-11',
      '2027-01-18',
    ]);
  });
});
