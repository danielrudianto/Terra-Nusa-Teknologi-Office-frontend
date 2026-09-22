import { panelSamping } from './panel-samping';

describe('panelSamping', () => {
  it('menempel di kanan, setinggi layar, lebar bawaan 560px', () => {
    const c = panelSamping({ data: { id: 1 } });
    expect(c.position).toEqual({ top: '0', right: '0' });
    expect(c.height).toBe('100vh');
    expect(c.width).toBe('560px');
    expect(c.data).toEqual({ id: 1 });
    expect(c.panelClass).toEqual(['akn-panel-samping']);
  });

  it('lebar dan kelas dari pemanggil dipertahankan', () => {
    const c = panelSamping({ width: '640px', panelClass: 'x' });
    expect(c.width).toBe('640px');
    expect(c.panelClass).toEqual(['x', 'akn-panel-samping']);
  });
});
