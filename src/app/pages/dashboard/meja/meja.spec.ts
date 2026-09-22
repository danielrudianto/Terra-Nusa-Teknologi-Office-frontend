import { RUTE_TAHAP, DIVISI, kelompokkan, ringkasAntrean, tingkatUmur } from './meja';

describe('meja kerja dasbor', () => {
  const tahap = [
    { kode: 'copBap', jumlah: 2, tertuaHari: 3, ember: { '0-2': 1, '3-7': 1, '8-14': 0, '15+': 0 } },
    { kode: 'poPeriksa', jumlah: 4, tertuaHari: 18, ember: { '0-2': 1, '3-7': 1, '8-14': 0, '15+': 2 } },
    { kode: 'tahapBaru', jumlah: 1, tertuaHari: 1 },
  ];

  it('dikelompokkan per divisi; divisi sendiri didahulukan; tahap tak dikenal tidak dibuang', () => {
    const s = kelompokkan(tahap, ['ENGINEERING']);
    expect(s.kelompok.map((k) => k.kode)).toEqual(['engineering', 'procurement']);
    expect(s.kelompok[0].milikSaya).toBeTrue();
    expect(s.kelompok[1].jumlah).toBe(4);
    expect(s.kelompok[1].tertuaHari).toBe(18);
    expect(s.lainnya.map((t) => t.kode)).toEqual(['tahapBaru']);
  });

  it('divisi tanpa tahap yang boleh dilihat tidak muncul', () => {
    expect(kelompokkan([{ kode: 'hrNilai', jumlah: 0, tertuaHari: 0 }]).kelompok.map((k) => k.kode)).toEqual(['hrd']);
  });

  it('ringkasan: jumlah menunggu, yang tertahan ≥15 hari, dan yang tertua', () => {
    expect(ringkasAntrean(tahap)).toEqual({ menunggu: 7, tertahan: 2, tertuaHari: 18 });
  });

  it('tahap gagal (jumlah null) tidak terhitung sebagai nol yang menenangkan di baris, tapi tidak merusak ringkasan', () => {
    expect(ringkasAntrean([{ kode: 'x', jumlah: null, tertuaHari: null }]).menunggu).toBe(0);
  });

  it('tingkat umur', () => {
    expect(tingkatUmur(3)).toBe('aman');
    expect(tingkatUmur(8)).toBe('waspada');
    expect(tingkatUmur(15)).toBe('tertahan');
  });

  it('setiap tahap yang dikelompokkan punya halaman tujuan', () => {
    for (const d of DIVISI) for (const k of d.tahap) expect(RUTE_TAHAP[k]).withContext(k).toBeTruthy();
  });
});
