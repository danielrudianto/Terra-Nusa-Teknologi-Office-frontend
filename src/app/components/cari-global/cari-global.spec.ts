import { cocokkanMenu, tujuanHasil } from './cari-global';

describe('cari-global', () => {
  const menu = [
    { name: 'nav.tagihan', route: '/Payment' },
    { name: 'nav.pembelian', route: '/Purchase' },
    { name: 'nav.klien', route: '/Master/Client' },
  ];
  const t: Record<string, string> = {
    'nav.tagihan': 'Tagihan Pembayaran',
    'nav.pembelian': 'Pembelian',
    'nav.klien': 'Klien',
  };
  const terjemah = (k: string) => t[k];

  it('menu dicocokkan pada teks tampilan; awalan didahulukan', () => {
    expect(cocokkanMenu(menu, 'pem', terjemah).map((m) => m.route)).toEqual([
      '/Purchase',
      '/Payment',
    ]);
    expect(cocokkanMenu(menu, 'KLI', terjemah).map((m) => m.route)).toEqual(['/Master/Client']);
    expect(cocokkanMenu(menu, '  ', terjemah)).toEqual([]);
  });

  it('tujuan: rinci untuk proyek/tender, ?open untuk PO, ?search untuk daftar', () => {
    expect(tujuanHasil('proyek', { id: 7, judul: 'R501 · Gedung' })).toEqual({ perintah: ['/Project', 7] });
    expect(tujuanHasil('purchase_order', { id: 3, judul: '027-PO' })).toEqual({
      perintah: ['/Purchase-order'],
      queryParams: { open: 3 },
    });
    expect(tujuanHasil('klien', { id: 1, judul: 'PT Maju', kunci: 'Maju' })).toEqual({
      perintah: ['/Master/Client'],
      queryParams: { search: 'Maju' },
    });
    expect(tujuanHasil('tidak-dikenal', { id: 1, judul: 'x' })).toBeNull();
  });
});
