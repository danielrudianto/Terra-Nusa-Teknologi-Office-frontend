/*
 * Geser & zoom grafik seperti grafik saham — berlaku untuk SEMUA grafik.
 *
 * Diuji dengan chart.js SUNGGUHAN di atas kanvas sungguhan, bukan dengan
 * membaca setelan: plugin yang terdaftar tetapi tidak aktif pada grafik
 * tetap lolos pemeriksaan setelan, dan yang terlihat hanya grafik yang
 * tidak bereaksi saat diseret.
 */

import { Chart } from 'chart.js';
import { pastikanChart } from './chart-dasar.helper';

pastikanChart();

function kanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 200;
  document.body.appendChild(c);
  return c;
}

describe('geser & zoom grafik', () => {
  const dibuat: Chart[] = [];
  afterEach(() => {
    while (dibuat.length) {
      const c = dibuat.pop()!;
      const el = c.canvas;
      c.destroy();
      el.remove();
    }
  });

  function garis(): Chart {
    const c = new Chart(kanvas(), {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        datasets: [{ data: [1, 2, 3, 4, 5, 6] }],
      },
      options: { animation: false, responsive: false },
    });
    dibuat.push(c);
    return c;
  }

  it('plugin zoom terdaftar', () => {
    expect(Chart.registry.plugins.get('zoom')).toBeTruthy();
  });

  it('grafik garis bisa digeser mendatar SAJA', () => {
    const z: any = (garis().options.plugins as any).zoom;
    expect(z.pan.enabled).toBeTrue();
    expect(z.pan.mode).toBe('x');
  });

  it('gulir TANPA Ctrl tidak memperbesar — halaman tetap bisa digulir', () => {
    const z: any = (garis().options.plugins as any).zoom;
    expect(z.zoom.wheel.enabled).toBeTrue();
    expect(z.zoom.wheel.modifierKey).toBe('ctrl');
  });

  it('tidak bisa digeser ke ruang kosong di luar data', () => {
    const z: any = (garis().options.plugins as any).zoom;
    expect(z.limits.x.min).toBe('original');
    expect(z.limits.x.max).toBe('original');
  });

  it('kursor tangan dan petunjuk cara pakai terpasang', () => {
    const c = garis();
    expect(c.canvas.style.cursor).toBe('grab');
    expect(c.canvas.title).toContain('Seret');
  });

  it('klik dua kali mengembalikan tampilan semula', () => {
    const c: any = garis();
    const reset = spyOn(c, 'resetZoom').and.callThrough();
    c.canvas.dispatchEvent(new MouseEvent('dblclick'));
    expect(reset).toHaveBeenCalled();
  });

  it('pendengar klik ganda DIBUANG saat grafik dihancurkan', () => {
    const c: any = garis();
    const el = c.canvas as HTMLCanvasElement;
    const buang = spyOn(el, 'removeEventListener').and.callThrough();
    dibuat.pop();
    c.destroy();
    el.remove();
    expect(buang).toHaveBeenCalledWith('dblclick', jasmine.any(Function));
  });

  it('grafik pai TIDAK diberi geser-zoom', () => {
    const c = new Chart(kanvas(), {
      type: 'pie',
      data: { labels: ['A', 'B'], datasets: [{ data: [1, 2] }] },
      options: { animation: false, responsive: false },
    });
    dibuat.push(c);
    const z: any = (c.options.plugins as any).zoom;
    expect(z.pan.enabled).toBeFalse();
    expect(c.canvas.style.cursor).not.toBe('grab');
  });

  it('grafik yang mematikan geser sendiri dihormati', () => {
    const c = new Chart(kanvas(), {
      type: 'bar',
      data: { labels: ['A'], datasets: [{ data: [1] }] },
      options: {
        animation: false,
        responsive: false,
        plugins: { zoom: { pan: { enabled: false } } } as any,
      },
    });
    dibuat.push(c);
    expect(c.canvas.style.cursor).not.toBe('grab');
  });
});

describe('grafik pai tidak merusak grafik lain', () => {
  it('SESUDAH grafik pai tampil, grafik garis TETAP bisa digeser', () => {
    /*
     * Versi pertama mematikan geser pada pai dengan menulis ke
     * `chart.options` — proksi yang menulis tembus ke `Chart.defaults`.
     * Satu pai mematikan geser seluruh aplikasi. Karma menjalankan uji
     * dengan urutan acak, dan itulah yang membongkarnya.
     */
    const k1 = kanvasLepas();
    const pai = new Chart(k1, {
      type: 'pie',
      data: { labels: ['A'], datasets: [{ data: [1] }] },
      options: { animation: false, responsive: false },
    });
    const k2 = kanvasLepas();
    const garis = new Chart(k2, {
      type: 'line',
      data: { labels: ['a', 'b'], datasets: [{ data: [1, 2] }] },
      options: { animation: false, responsive: false },
    });
    try {
      expect(((pai.options.plugins as any).zoom).pan.enabled).toBeFalse();
      expect(((garis.options.plugins as any).zoom).pan.enabled).toBeTrue();
      expect(((Chart.defaults.plugins as any).zoom).pan.enabled).toBeTrue();
    } finally {
      pai.destroy();
      garis.destroy();
      k1.remove();
      k2.remove();
    }
  });
});

function kanvasLepas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 150;
  document.body.appendChild(c);
  return c;
}

describe('geser sungguhan, bukan sekadar setelan', () => {
  it('setelah diperbesar, menggeser memindahkan jendela sumbu X', () => {
    const k = kanvasLepas();
    const c: any = new Chart(k, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `B${i + 1}`),
        datasets: [{ data: Array.from({ length: 24 }, (_, i) => i) }],
      },
      options: { animation: false, responsive: false },
    });
    try {
      c.zoom(3);
      const sebelum = c.scales.x.min;
      c.pan({ x: 200 }, undefined, 'none');
      expect(c.scales.x.min).not.toBe(sebelum);

      // Tidak bisa digeser melewati data pertama.
      c.pan({ x: 100000 }, undefined, 'none');
      expect(c.scales.x.min).toBe(0);

      c.resetZoom('none');
      expect(c.scales.x.min).toBe(0);
      expect(c.scales.x.max).toBe(23);
    } finally {
      c.destroy();
      k.remove();
    }
  });

  it('memperbesar tetap berpangkal di nol pada sumbu Y', () => {
    /*
     * Hanya zoom yang diuji di sini, bukan geser: `chart.pan()` yang dipanggil
     * dari kode mengabaikan `mode` dan menggeser semua sumbu — penangan
     * seretan tetikus yang membaca `mode: 'x'`. Menguji geser Y lewat
     * `chart.pan()` hanya menguji API-nya, bukan yang dialami pemakai;
     * `mode: 'x'` pada seretan dijaga uji "bisa digeser mendatar SAJA".
     */
    const k = kanvasLepas();
    const c: any = new Chart(k, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `B${i + 1}`),
        datasets: [{ data: Array.from({ length: 12 }, (_, i) => i * 10) }],
      },
      options: { animation: false, responsive: false },
    });
    try {
      const yMin = c.scales.y.min;
      c.zoom(2);
      // Pangkal NOL tetap: batang yang tidak berpangkal di nol membohongi
      // perbandingannya. Puncak sumbu Y memang boleh berubah — chart.js
      // menyesuaikannya dengan data yang tampil, seperti grafik saham.
      expect(yMin).toBe(0);
      expect(c.scales.y.min).toBe(0);
    } finally {
      c.destroy();
      k.remove();
    }
  });
});

describe('Hammer', () => {
  it('termuat — tanpanya roda tetap memperbesar tetapi SERETAN tidak bereaksi', () => {
    // Uji geser di atas memakai `chart.pan()` yang tidak butuh Hammer; yang
    // butuh Hammer adalah seretan tetikus/jari. Ini penjaganya.
    expect((window as any).Hammer).toBeDefined();
  });
});
