/*
 * Seretan tetikus SUNGGUHAN (pointer event lewat Hammer), bukan `chart.pan()`.
 * Deret 30 titik dibuka di 12 terakhir; menyeret ke KANAN menampilkan titik
 * yang lebih awal. (Menyeret ke kiri di ujung terbaru memang tidak bergerak —
 * tidak ada data sesudahnya.)
 */
import { Chart } from 'chart.js';
import { pastikanChart } from './chart-dasar.helper';
pastikanChart();

describe('seret tetikus sungguhan', () => {
  it('menyeret ke kanan menggeser ke data yang lebih awal', async () => {
    const k = document.createElement('canvas');
    k.width = 600; k.height = 300; k.style.width = '600px'; k.style.height = '300px';
    document.body.appendChild(k);
    const c: any = new Chart(k, {
      type: 'line',
      data: { labels: Array.from({ length: 30 }, (_, i) => 'B' + i), datasets: [{ data: Array.from({ length: 30 }, (_, i) => i) }] },
      options: { animation: false, responsive: false },
    });
    try {
      const sebelum = c.scales.x.min;
      const r = k.getBoundingClientRect();
      const ev = (t: string, x: number) =>
        k.dispatchEvent(new PointerEvent(t, {
          bubbles: true, cancelable: true, clientX: r.left + x, clientY: r.top + 150,
          pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
          buttons: t === 'pointerup' ? 0 : 1,
        }));
      ev('pointerdown', 200);
      for (let x = 210; x <= 400; x += 20) {
        ev('pointermove', x);
        await new Promise((ok) => setTimeout(ok, 16));
      }
      ev('pointerup', 400);
      expect(c.scales.x.min).toBeLessThan(sebelum);
    } finally {
      c.destroy();
      k.remove();
    }
  });
});
