/*
 * PAPAN TANDA TANGAN — menulis dengan PENA (S-Pen, Apple Pencil, Wacom).
 *
 * Papannya satu komponen, dipakai penyunting PDF dan dialog "Tanda tangan
 * saya". Diuji di sini, bukan lewat salah satu pemakainya: yang diperiksa
 * perilaku papannya, dan menguji lewat dialog berarti membangun seluruh
 * dialog untuk memeriksa sebuah goresan.
 *
 * "gw pakai Samsung S series, artinya kan ada S-pen nya. mungkin ga ya untuk
 *  tanda tangan pakai itu?"
 *
 * Papannya sudah memakai Pointer Events sejak awal, jadi penanya memang sudah
 * menggambar. Yang diuji di sini adalah lima hal yang membedakan "bisa
 * dicoret-coret" dari "terasa seperti pulpen", dan EMPAT di antaranya gagal
 * dengan diam — tidak ada galat, hasilnya sekadar jelek atau kotor:
 *
 *   1. Tekanan menentukan tebal garis. Tanpa ini tanda tangan rata satu tebal.
 *   2. Telapak tangan DITOLAK selama pena dipakai. Tanpa ini setiap tanda
 *      tangan disertai satu coretan melintang yang tidak digambar siapa pun.
 *   3. Penunjuk DIKUNCI ke kanvas, supaya ekor goresan yang keluar sedikit
 *      dari kotaknya tidak terpotong rata.
 *   4. Cuplikan yang digabungkan peramban ikut dibaca. Tanpa ini tiga dari
 *      empat titik terbuang dan goresan cepat menjadi patah bersegi.
 *   5. `pointercancel` menutup goresan. Tanpa ini goresannya menggantung dan
 *      sentuhan berikutnya menyambung dari tempat yang salah.
 */

import { TestBed } from '@angular/core/testing';

import { PapanTtdComponent } from './papan-ttd.component';

function buat(): any {
  // `output()` hanya boleh dipanggil dalam konteks injeksi, jadi komponennya
  // dibuat di dalamnya — bukan dengan `new` telanjang.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.runInInjectionContext(() => new PapanTtdComponent()) as any;
}

/** Pasang kanvas ke komponennya, seperti yang dilakukan Angular. */
function pasang(c: any, k: HTMLCanvasElement): void {
  c.papanRef = { nativeElement: k };
}

/** Kanvas sungguhan; papannya menggambar ke sana. */
function kanvas(): HTMLCanvasElement {
  const k = document.createElement('canvas');
  k.width = 720;
  k.height = 240;
  // `getBoundingClientRect` pada elemen di luar dokumen mengembalikan nol,
  // dan pembagian dengan nol membuat setiap titik jadi NaN.
  k.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 720, height: 240 }) as DOMRect;
  (k as any).setPointerCapture = function (id: number) {
    (this as any)._terkunci = id;
  };
  (k as any).releasePointerCapture = function () {
    (this as any)._terkunci = null;
  };
  return k;
}

function ev(
  k: HTMLCanvasElement,
  x: number,
  y: number,
  opsi: Partial<{
    pointerType: string;
    pressure: number;
    pointerId: number;
    button: number;
    coalesced: { x: number; y: number; pressure: number }[];
  }> = {},
): any {
  const dasar = {
    currentTarget: k,
    clientX: x,
    clientY: y,
    button: opsi.button ?? 0,
    pointerId: opsi.pointerId ?? 1,
    pointerType: opsi.pointerType ?? 'pen',
    pressure: opsi.pressure ?? 0.5,
  };
  return {
    ...dasar,
    getCoalescedEvents: () =>
      (opsi.coalesced ?? []).map((c) => ({
        ...dasar,
        clientX: c.x,
        clientY: c.y,
        pressure: c.pressure,
      })),
  };
}

/** Jumlah titik pada goresan terakhir. */
function titikTerakhir(c: any): number {
  const j = c.jejak as any[][];
  return j.length ? j[j.length - 1].length : 0;
}

describe('lebarGores — tekanan menentukan tebal', () => {
  it('tekanan lebih besar menghasilkan garis lebih tebal', () => {
    const ringan = PapanTtdComponent.lebarGores(4, 0.1);
    const sedang = PapanTtdComponent.lebarGores(4, 0.5);
    const berat = PapanTtdComponent.lebarGores(4, 1);

    expect(sedang).toBeGreaterThan(ringan);
    expect(berat).toBeGreaterThan(sedang);
  });

  it('tidak pernah nol, dan tidak pernah lebih dari dua kali tebal dasar', () => {
    // Nol berarti awal goresan hilang; terlalu tebal berarti tanda tangan
    // berubah jadi noda saat orang menekan keras.
    for (const t of [-5, 0, 0.001, 0.5, 1, 9, NaN]) {
      const l = PapanTtdComponent.lebarGores(4, t as number);
      expect(l).toBeGreaterThan(0);
      expect(l).toBeLessThanOrEqual(8);
    }
  });

  it('naik lebih cepat di tekanan rendah daripada di tekanan tinggi', () => {
    // Tekanan yang dilaporkan pena menumpuk di bawah 0,4. Pemetaan lurus
    // membuat hampir seluruh tanda tangan setipis mungkin.
    const a = PapanTtdComponent.lebarGores(4, 0.2)
            - PapanTtdComponent.lebarGores(4, 0.05);
    const b = PapanTtdComponent.lebarGores(4, 0.95)
            - PapanTtdComponent.lebarGores(4, 0.8);
    expect(a).toBeGreaterThan(b);
  });
});

describe('tekanan — nilai pengganti', () => {
  it('tetikus dan jari (tanpa tekanan) memakai 0,5', () => {
    expect(PapanTtdComponent.tekanan({ pressure: 0 })).toBe(0.5);
    expect(PapanTtdComponent.tekanan({} as any)).toBe(0.5);
  });

  it('tekanan pena dipakai apa adanya, dipotong di 1', () => {
    expect(PapanTtdComponent.tekanan({ pressure: 0.17 })).toBeCloseTo(0.17);
    expect(PapanTtdComponent.tekanan({ pressure: 3 })).toBe(1);
  });
});

describe('papan tanda tangan — pena', () => {
  it('pena menggambar, dan tekanannya ikut tersimpan', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pressure: 0.2 }));
    c.gores(ev(k, 20, 20, { pressure: 0.8 }));

    const goresan = c.jejak[0];
    expect(goresan.length).toBe(2);
    expect(goresan[0].t).toBeCloseTo(0.2);
    expect(goresan[1].t).toBeCloseTo(0.8);
  });

  it('TELAPAK TANGAN ditolak selama penanya dipakai', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pointerType: 'pen' }));
    c.selesaiGores(ev(k, 10, 10, { pointerType: 'pen' }));

    const sebelum = c.jejak.length;
    c.mulaiGores(ev(k, 300, 200, { pointerType: 'touch', pointerId: 2 }));
    c.gores(ev(k, 320, 210, { pointerType: 'touch', pointerId: 2 }));

    expect(c.jejak.length).withContext('telapak ikut menggambar').toBe(sebelum);
  });

  it('jari TETAP menggambar di perangkat yang tidak pernah memakai pena', () => {
    // Penolakan telapak tidak boleh berubah menjadi "ponsel tanpa pena
    // tidak bisa tanda tangan sama sekali".
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pointerType: 'touch' }));
    c.gores(ev(k, 30, 30, { pointerType: 'touch' }));

    expect(c.jejak.length).toBe(1);
    expect(titikTerakhir(c)).toBe(2);
  });

  it('alat lain yang menyentuh DI TENGAH goresan tidak menyisip', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pointerType: 'pen' }));
    c.gores(ev(k, 20, 20, { pointerType: 'pen' }));
    const sebelum = titikTerakhir(c);
    c.gores(ev(k, 500, 200, { pointerType: 'touch', pointerId: 2 }));

    expect(titikTerakhir(c)).toBe(sebelum);
  });

  it('penunjuknya DIKUNCI ke kanvas saat goresan dimulai', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pointerId: 7 }));

    expect((k as any)._terkunci).toBe(7);
  });

  it('kanvas tanpa setPointerCapture tidak menggagalkan goresan', () => {
    // Sebagian lingkungan uji dan peramban lama tidak memilikinya.
    const c = buat();
    const k = kanvas();
    (k as any).setPointerCapture = undefined;
    c.mulaiGores(ev(k, 10, 10));
    c.gores(ev(k, 20, 20));

    expect(titikTerakhir(c)).toBe(2);
  });

  it('cuplikan yang digabungkan peramban IKUT terbaca', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10));
    c.gores(
      ev(k, 40, 40, {
        coalesced: [
          { x: 20, y: 20, pressure: 0.3 },
          { x: 30, y: 30, pressure: 0.4 },
          { x: 40, y: 40, pressure: 0.5 },
        ],
      }),
    );

    // 1 dari mulaiGores + 3 cuplikan. Tanpa membaca cuplikannya: 2.
    expect(titikTerakhir(c)).toBe(4);
  });

  it('tanpa getCoalescedEvents, kejadiannya sendiri yang dipakai', () => {
    const c = buat();
    const k = kanvas();
    const a: any = ev(k, 10, 10);
    a.getCoalescedEvents = undefined;
    const b: any = ev(k, 20, 20);
    b.getCoalescedEvents = undefined;
    c.mulaiGores(a);
    c.gores(b);

    expect(titikTerakhir(c)).toBe(2);
  });

  it('daftar cuplikan KOSONG jatuh ke kejadiannya sendiri', () => {
    // Peramban mengirim daftar kosong bila tidak ada cuplikan antara.
    // Tanpa jalur cadangan, titiknya hilang sama sekali.
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { coalesced: [] }));
    c.gores(ev(k, 20, 20, { coalesced: [] }));

    expect(titikTerakhir(c)).toBe(2);
  });

  it('pointercancel menutup goresannya dan melepas kuncinya', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { pointerId: 3 }));
    c.selesaiGores(ev(k, 10, 10, { pointerId: 3 }));

    expect(c.sedangGores).toBeFalse();
    expect((k as any)._terkunci).toBeNull();

    // Gerakan sesudahnya tidak menyambung.
    const sebelum = titikTerakhir(c);
    c.gores(ev(k, 400, 200));
    expect(titikTerakhir(c)).toBe(sebelum);
  });

  it('selesaiGores tanpa kejadian tetap aman', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10));
    expect(() => c.selesaiGores()).not.toThrow();
    expect(c.sedangGores).toBeFalse();
  });

  it('tombol kanan tidak menggambar', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 10, 10, { button: 2, pointerType: 'mouse' }));

    expect(c.jejak.length).toBe(0);
  });

  it('satu titik tetap tergambar sebagai titik, bukan hilang', () => {
    const c = buat();
    const k = kanvas();
    c.mulaiGores(ev(k, 100, 100, { pressure: 0.9 }));

    const ctx = k.getContext('2d')!;
    const piksel = ctx.getImageData(98, 98, 6, 6).data;
    let adaTinta = false;
    for (let i = 3; i < piksel.length; i += 4) if (piksel[i] > 0) adaTinta = true;
    expect(adaTinta).withContext('titik tunggal tidak tergambar').toBeTrue();
  });

  it('goresan bertekanan berat meninggalkan tinta LEBIH BANYAK daripada yang ringan', () => {
    // Uji tebalnya di piksel, bukan di angka: yang dijaga adalah gambarnya,
    // dan `lineWidth` yang dihitung benar tetapi tidak dipasang ke konteks
    // tidak akan tertangkap pemeriksaan angka mana pun.
    function tinta(tekanan: number): number {
      const c = buat();
      const k = kanvas();
      c.mulaiGores(ev(k, 100, 120, { pressure: tekanan }));
      c.gores(ev(k, 300, 120, { pressure: tekanan }));
      c.gores(ev(k, 500, 120, { pressure: tekanan }));
      const d = k.getContext('2d')!.getImageData(0, 0, 720, 240).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      return n;
    }

    expect(tinta(1)).toBeGreaterThan(tinta(0.05));
  });
});
