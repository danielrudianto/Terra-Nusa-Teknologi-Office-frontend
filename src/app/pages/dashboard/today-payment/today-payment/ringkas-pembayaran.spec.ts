import { ringkasPembayaran } from './ringkas-pembayaran';

const baris = (o: any) => ({
  id: 1, type: 'purchase', typeLabel: 'Pembelian', color: '#154dec',
  title: 't', subtitle: '', bankLabel: 'BRI · AKN', amount: 0, isApprove: true, ...o,
});

describe('ringkasPembayaran', () => {
  it('memisah disetujui dan menunggu, dan jumlahnya sama dengan total', () => {
    const r = ringkasPembayaran([
      baris({ amount: 100.1 }),
      baris({ amount: 0.2, isApprove: false }),
      baris({ amount: 50, isApprove: false, type: 'expense', typeLabel: 'Beban', bankLabel: 'Mandiri · AKN' }),
    ]);
    expect(r.total).toBe(150.3);
    expect(r.disetujui).toBe(100.1);
    expect(r.menunggu).toBe(50.2);
    expect(r.jumlahMenunggu).toBe(2);
  });

  it('mengelompokkan per jenis dan per rekening, terbesar dulu', () => {
    const r = ringkasPembayaran([
      baris({ amount: 10 }),
      baris({ amount: 30, type: 'salary', typeLabel: 'Gaji', bankLabel: 'Mandiri · AKN' }),
      baris({ amount: 5 }),
    ]);
    expect(r.perJenis.map((b) => [b.kunci, b.nilai, b.jumlah])).toEqual([
      ['salary', 30, 1],
      ['purchase', 15, 2],
    ]);
    expect(r.perRekening[0].label).toBe('Mandiri · AKN');
    const persen = r.perJenis.reduce((a, b) => a + b.persen, 0);
    expect(Math.round(persen)).toBe(100);
  });

  it('daftar kosong tidak membagi dengan nol', () => {
    const r = ringkasPembayaran([]);
    expect(r.total).toBe(0);
    expect(r.perJenis).toEqual([]);
  });
});
