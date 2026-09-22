/*
 * Invoice tenaga kerja dari CoP — menggantikan Generator Invoice.
 * Yang dijaga: total invoice = nilai bersih CoP (satu sumber dengan DPP
 * pembelian), label lembur dari SPK, dan nomor yang sama formatnya.
 */
import {
  adaInsentifBor,
  barisInvoiceDariCop,
  nomorInvoiceTenaga,
  periodeInvoice,
  spkTenagaKerja,
  totalBarisInvoice,
} from './invoice-tenaga.helper';

describe('invoice tenaga kerja dari CoP', () => {
  const po = [
    { id: 1, task: 'Tukang besi', remarks_3: 'Upah harian', unit: 'hari' },
    { id: 2, task: 'Tukang besi', remarks_3: 'Lembur', unit: 'jam' },
    { id: 3, task: 'Operator bor', remarks_3: 'Insentif Bor', unit: 'meter' },
  ];
  const cop = {
    netAmount: 1_000_000 + 60_000 + 100_000 - 50_000,
    items: [
      { purchaseOrderItemID: 1, task: 'Tukang besi', unit: 'hari', quantity: 5, price: 200_000 },
      { purchaseOrderItemID: 2, task: 'Tukang besi', unit: 'jam', quantity: 3, price: 20_000 },
      { purchaseOrderItemID: 3, task: 'Operator bor', unit: 'meter', quantity: 0, price: 5_000 },
    ],
    adjustments: [
      { kind: 'deduction' as const, category: 'uang_muka', amount: 50_000 },
      { kind: 'addition' as const, category: 'biaya_luar_kontrak', label: 'Bonus', amount: 100_000 },
    ],
  };

  it('label dari SPK (lembur terbedakan), volume nol dilewati, tambahan lalu potongan', () => {
    const b = barisInvoiceDariCop(cop, po, (k) => 'kat:' + k);
    expect(b.map((x) => x.name)).toEqual(['Upah harian', 'Lembur', 'Bonus', 'kat:uang_muka']);
    expect(b[3].price).toBe(-50_000);
  });

  it('total invoice = nilai bersih CoP', () => {
    const b = barisInvoiceDariCop(cop, po);
    expect(totalBarisInvoice(b)).toBe(cop.netAmount);
  });

  it('nomor berformat sama dengan Generator Invoice lama, (B) bila ada insentif bor', () => {
    const a = { potong: '2026-09-20', tanggal: new Date(2026, 8, 22), supplierID: 21, kodeProyek: 'r501' };
    expect(nomorInvoiceTenaga(a)).toBe('20-021-INV-R501-IX-2026');
    expect(nomorInvoiceTenaga({ ...a, bor: true })).toBe('20-021-INV-R501-IX-2026 (B)');
    expect(nomorInvoiceTenaga({ ...a, supplierID: null })).toBe('');
  });

  it('insentif bor terdeteksi hanya bila volumenya ada', () => {
    expect(adaInsentifBor([{ name: 'Insentif Bor', quantity: 12.5, unit: 'm', price: 1 }])).toBeTrue();
    expect(adaInsentifBor([{ name: 'Insentif Bor', quantity: 0, unit: 'm', price: 1 }])).toBeFalse();
    expect(adaInsentifBor([{ name: 'Upah borongan', quantity: 1, unit: 'ls', price: 1 }])).toBeFalse();
  });

  it('periode dari tanggal cut-off, tanpa geser zona', () => {
    expect(periodeInvoice('2026-09-20')).toBe('s.d. 20 September 2026');
  });

  it('SPK tenaga kerja dikenali dari nomornya', () => {
    expect(spkTenagaKerja('013-SPK-R501-D')).toBeTrue();
    expect(spkTenagaKerja('013-SPK-R501-B')).toBeFalse();
  });
});
