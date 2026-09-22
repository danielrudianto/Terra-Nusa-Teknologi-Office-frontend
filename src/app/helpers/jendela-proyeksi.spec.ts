/*
 * Proyeksi: jendela awal di AWAL deret (hari ini), dan seretan sungguhan
 * — DENGAN animasi bawaan menyala, seperti di halaman — menggeser ke
 * tanggal sesudahnya.
 */
import { Chart } from 'chart.js';
import { pastikanChart, rentangJendela } from './chart-dasar.helper';
pastikanChart();

describe('jendela proyeksi', () => {
  it('rentangJendela: awal/akhir, dan deret pendek tampil utuh', () => {
    expect(rentangJendela(91, { posisi: 'awal', titik: 31 })).toEqual({ min: 0, max: 30 });
    expect(rentangJendela(30, true)).toEqual({ min: 18, max: 29 });
    expect(rentangJendela(10, true)).toBeNull();
  });

  it('dibuka di hari ini, diseret ke kiri menampilkan tanggal berikutnya', async () => {
    const k = document.createElement('canvas');
    k.width = 600; k.height = 300; k.style.width = '600px'; k.style.height = '300px';
    document.body.appendChild(k);
    const n = 91;
    const c: any = new Chart(k, {
      type: 'line',
      data: { labels: Array.from({ length: n }, (_, i) => 'H' + i), datasets: [{ data: Array.from({ length: n }, (_, i) => i) }] },
      options: {
        responsive: false,
        plugins: { geserZoomAkn: { jendelaAwal: { posisi: 'awal', titik: 31 } } } as any,
      },
    });
    try {
      await new Promise((ok) => setTimeout(ok, 50));
      expect(c.scales.x.min).toBe(0);
      expect(c.scales.x.max).toBe(30);
      const r = k.getBoundingClientRect();
      const ev = (t: string, x: number) =>
        k.dispatchEvent(new PointerEvent(t, {
          bubbles: true, cancelable: true, clientX: r.left + x, clientY: r.top + 150,
          pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
          buttons: t === 'pointerup' ? 0 : 1,
        }));
      ev('pointerdown', 400);
      for (let x = 390; x >= 200; x -= 20) {
        ev('pointermove', x);
        await new Promise((ok) => setTimeout(ok, 16));
      }
      ev('pointerup', 200);
      await new Promise((ok) => setTimeout(ok, 50));
      expect(c.scales.x.min).toBeGreaterThan(0);
    } finally {
      c.destroy();
      k.remove();
    }
  });
});
