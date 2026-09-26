/*
 * TANDA TANGAN PADA HALAMAN PDF.
 *
 * Tiga hal yang masing-masing pernah membuat fitur semacam ini tampak
 * "kadang jalan, kadang tidak", dan ketiganya diuji di sini:
 *
 *   1. GAMBARNYA IKUT TERUNDUH. Coretan disimpan pada `PageData`, bukan
 *      pada berkasnya; kalau satu jalur unduhan lupa menggambarnya, tanda
 *      tangan hilang TANPA galat apa pun. Ketiga tombolnya diuji.
 *
 *   2. LETAK DAN ARAHNYA pada halaman ber-`/Rotate`. Kotaknya sudah lama
 *      dipetakan benar, tetapi ISI kotaknya digambar pada ruang halaman
 *      asli — sehingga pada scan yang berputar, tanda tangan tampil rebah
 *      dan tergencet. Hitungannya diuji murni, tanpa membuat PDF.
 *
 *   3. SATU GAMBAR DISEMATKAN SEKALI. Tanda tangan yang sama kerap dipakai
 *      di banyak halaman; menyematkannya ulang menyalin bita PNG-nya
 *      sebanyak itu pula.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PDFDocument, rgb } from 'pdf-lib';

import { PdfMainComponent } from './pdf-main.component';
import { SuntingHalamanComponent } from './sunting-halaman/sunting-halaman.component';

/** PNG sungguhan — tanda tangan palsu, tetapi bitanya asli. */
function pngUji(warna = '#111827'): string {
  const k = document.createElement('canvas');
  k.width = 120;
  k.height = 40;
  const ctx = k.getContext('2d')!;
  ctx.strokeStyle = warna;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, 30);
  ctx.bezierCurveTo(30, 4, 60, 38, 112, 10);
  ctx.stroke();
  return k.toDataURL('image/png');
}

async function halamanBase64(): Promise<string> {
  const doc = await PDFDocument.create();
  const hal = doc.addPage([595, 842]);
  hal.drawRectangle({ x: 60, y: 90, width: 300, height: 1, color: rgb(0, 0, 0) });
  return doc.saveAsBase64({ dataUri: false });
}

function komponen(): any {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: MatSnackBar, useValue: { open: () => {} } },
      {
        provide: MatDialog,
        useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) },
      },
    ],
  });
  return TestBed.createComponent(PdfMainComponent).componentInstance as any;
}

async function unduh(c: any, jalankan: () => Promise<void>): Promise<Uint8Array> {
  const asliBuat = URL.createObjectURL;
  const asliLepas = URL.revokeObjectURL;
  let blob: Blob | null = null;
  (URL as any).createObjectURL = (b: Blob) => {
    blob = b;
    return 'blob:uji';
  };
  (URL as any).revokeObjectURL = () => {};
  try {
    await jalankan();
  } finally {
    (URL as any).createObjectURL = asliBuat;
    (URL as any).revokeObjectURL = asliLepas;
  }
  expect(blob).withContext('tidak ada berkas yang dihasilkan').toBeTruthy();
  return new Uint8Array(await (blob as unknown as Blob).arrayBuffer());
}

describe('Tanda tangan — ikut pada setiap tombol unduh', () => {
  let pdf: string;
  let ttd: string;

  beforeAll(async () => {
    pdf = await halamanBase64();
    ttd = pngUji();
  });

  function isi(c: any, anotasi?: any[]) {
    c.processedDocuments = [
      { pdf, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, anotasi },
      { pdf, thumbnail: '', pageNumber: 2, fileName: 'b.pdf', selected: true },
    ];
    c.updateSelectionState();
  }

  const jalur: { nama: string; jalankan: (c: any) => Promise<void> }[] = [
    { nama: 'GABUNGKAN', jalankan: (c) => c.mergePdfs() },
    { nama: 'SIMPAN TERPILIH', jalankan: (c) => c.saveSelectedPages() },
    { nama: 'GABUNG TERPILIH', jalankan: (c) => c.mergeSelectedPdfs() },
  ];

  jalur.forEach(({ nama, jalankan }) => {
    it(`${nama}: tanda tangan ikut tergambar`, async () => {
      const polos = komponen();
      isi(polos);
      const bitaPolos = await unduh(polos, () => jalankan(polos));

      const c = komponen();
      isi(c, [{ jenis: 'ttd', x: 0.1, y: 0.8, lebar: 0.22, tinggi: 0.06, gambar: ttd }]);
      const bita = await unduh(c, () => jalankan(c));

      // PNG yang disematkan menambah objek gambar ke berkasnya; mustahil
      // hasilnya sama panjang dengan yang polos.
      expect(bita.length).toBeGreaterThan(bitaPolos.length);
    });
  });

  it('tanpa gambar, tidak ada apa pun yang digambar', async () => {
    // Kotak kosong yang tergambar justru MENUTUPI isi halaman — lebih buruk
    // daripada tidak menggambar apa-apa.
    const polos = komponen();
    isi(polos);
    const bitaPolos = await unduh(polos, () => polos.mergePdfs());

    const c = komponen();
    isi(c, [{ jenis: 'ttd', x: 0.1, y: 0.8, lebar: 0.22, tinggi: 0.06 }]);
    const bita = await unduh(c, () => c.mergePdfs());

    expect(bita.length).toBe(bitaPolos.length);
  });

  it('gambar rusak dilewati, unduhannya tetap jadi', async () => {
    const c = komponen();
    isi(c, [
      { jenis: 'ttd', x: 0.1, y: 0.8, lebar: 0.2, tinggi: 0.05, gambar: 'data:image/png;base64,bukanpng' },
      { jenis: 'catatan', x: 0.3, y: 0.3, teks: 'tetap tercetak' },
    ]);
    const bita = await unduh(c, () => c.mergePdfs());
    const hasil = await PDFDocument.load(bita);
    expect(hasil.getPageCount()).toBe(2);
  });

  it('satu tanda tangan dipakai dua halaman hanya disematkan sekali', async () => {
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sematkanGambar(dok, [
      { anotasi: [{ jenis: 'ttd', gambar: ttd }] },
      { anotasi: [{ jenis: 'ttd', gambar: ttd }] },
    ]);
    expect(peta.size).toBe(1);
  });

  it('dua tanda tangan berbeda disematkan dua kali', async () => {
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sematkanGambar(dok, [
      { anotasi: [{ jenis: 'ttd', gambar: ttd }] },
      { anotasi: [{ jenis: 'ttd', gambar: pngUji('#b3322f') }] },
    ]);
    expect(peta.size).toBe(2);
  });
});

/*
 * ARAH & JANGKAR pada halaman berputar — dihitung murni.
 *
 * `jangkarPutar` memindahkan titik acuan ke sudut yang benar dan menukar
 * sisi kotaknya, karena pdf-lib memutar TERHADAP `(x, y)`. Ujinya menyusun
 * ulang daerah yang ditempati setelah diputar, lalu membandingkannya dengan
 * kotak aslinya: kalau jangkarnya keliru, daerahnya melenceng.
 */
describe('jangkarPutar — daerah yang ditempati tetap kotak yang dimaui', () => {
  const jangkar = (PdfMainComponent as any).jangkarPutar;
  const kotak = { x: 100, y: 200, width: 60, height: 30 };

  /** Putar (0,0)-(w,h) berlawanan jarum jam terhadap titik jangkar. */
  function daerah(j: any) {
    const sudut = (j.sudut * Math.PI) / 180;
    const cos = Math.round(Math.cos(sudut));
    const sin = Math.round(Math.sin(sudut));
    const titik = [
      [0, 0],
      [j.width, 0],
      [0, j.height],
      [j.width, j.height],
    ].map(([u, v]) => [j.x + u * cos - v * sin, j.y + u * sin + v * cos]);
    const xs = titik.map((t) => t[0]);
    const ys = titik.map((t) => t[1]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  [0, 90, 180, 270].forEach((r) => {
    it(`${r}°: daerahnya tepat menimpa kotaknya`, () => {
      const j = jangkar(kotak, r);
      expect(j.sudut).toBe(r);
      expect(daerah(j)).toEqual(kotak);
    });
  });

  it('90° dan 270° menukar sisi yang dikirim ke pdf-lib', () => {
    // Inilah yang dulu membuat tanda tangan tergencet: lebar-tinggi yang
    // dikirim adalah ukuran SEBELUM diputar.
    expect(jangkar(kotak, 90).width).toBe(kotak.height);
    expect(jangkar(kotak, 90).height).toBe(kotak.width);
    expect(jangkar(kotak, 270).width).toBe(kotak.height);
  });

  it('sudut di luar 0–359 dinormalkan', () => {
    expect(jangkar(kotak, 450).sudut).toBe(90);
    expect(jangkar(kotak, -90).sudut).toBe(270);
  });
});

describe('geserPutar — sisipan ikut kerangka yang diputar', () => {
  const geser = (PdfMainComponent as any).geserPutar;

  it('tanpa putaran, apa adanya', () => {
    expect(geser(2, 3, 0)).toEqual({ dx: 2, dy: 3 });
  });

  it('90°: sumbunya bertukar dan satu di antaranya berbalik', () => {
    expect(geser(2, 3, 90)).toEqual({ dx: -3, dy: 2 });
  });

  it('180°: keduanya berbalik', () => {
    expect(geser(2, 3, 180)).toEqual({ dx: -2, dy: -3 });
  });

  it('270°', () => {
    expect(geser(2, 3, 270)).toEqual({ dx: 3, dy: -2 });
  });
});

/*
 * DIALOG SUNTING — alat tanda tangan.
 *
 * Komponennya dibuat langsung (bukan lewat `createComponent`) supaya
 * `ngOnInit` — yang memuat pdf.js dan menggambar halaman — tidak ikut
 * berjalan; Karma tidak dapat menyajikan worker pdf.js.
 */
describe('Dialog sunting — alat tanda tangan', () => {
  const KUNCI = 'tnt.ttd.terakhir';

  function buat(data?: any): any {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: data ?? {} },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        new SuntingHalamanComponent(
          data ?? { pdf: '', nomor: 1, fileName: 'a.pdf', rotation: 0, anotasi: [] },
        ),
    ) as any;
  }

  beforeEach(() => {
    try {
      localStorage.removeItem(KUNCI);
    } catch {}
  });

  afterAll(() => {
    try {
      localStorage.removeItem(KUNCI);
    } catch {}
  });

  it('tanpa tanda tangan tersimpan, tombolnya membuka papan — bukan menyalakan alat', () => {
    // Alat yang menyala tanpa gambar akan menaruh kotak kosong.
    const c = buat();
    c.pilihAlat('ttd');
    expect(c.papanTtd).toBeTrue();
    expect(c.alatAktif).toBeNull();
  });

  it('dengan tanda tangan tersimpan, alatnya langsung menyala', () => {
    localStorage.setItem(KUNCI, pngUji());
    const c = buat();
    c.pilihAlat('ttd');
    expect(c.papanTtd).toBeFalse();
    expect(c.alatAktif).toBe('ttd');
  });

  it('menekan tombolnya lagi mematikan alatnya', () => {
    localStorage.setItem(KUNCI, pngUji());
    const c = buat();
    c.pilihAlat('ttd');
    c.pilihAlat('ttd');
    expect(c.alatAktif).toBeNull();
  });

  it('"Gambar ulang" membuka papannya meski tanda tangannya sudah ada', () => {
    localStorage.setItem(KUNCI, pngUji());
    const c = buat();
    c.gantiTtd(new Event('click'));
    expect(c.papanTtd).toBeTrue();
  });

  it('menaruhnya menghasilkan coretan ber-gambar dan mematikan alatnya', () => {
    const gambar = pngUji();
    localStorage.setItem(KUNCI, gambar);
    const c = buat();
    c.pilihAlat('ttd');
    c.taruh(peristiwaKlik());
    expect(c.anotasi.length).toBe(1);
    expect(c.anotasi[0].jenis).toBe('ttd');
    expect(c.anotasi[0].gambar).toBe(gambar);
    expect(c.anotasi[0].lebar).toBeGreaterThan(0);
    expect(c.anotasi[0].tinggi).toBeGreaterThan(0);
    expect(c.alatAktif).toBeNull();
  });

  it('letaknya pecahan 0–1, dijepit di tepi', () => {
    localStorage.setItem(KUNCI, pngUji());
    const c = buat();
    c.pilihAlat('ttd');
    c.taruh(peristiwaKlik(0, 0));
    expect(c.anotasi[0].x).toBe(0);
    expect(c.anotasi[0].y).toBe(0);
  });

  it('menyimpan: tanda tangan ber-gambar disimpan, yang kosong dibuang', () => {
    const c = buat();
    let disimpan: any = null;
    c['dialog'] = { close: (v: any) => (disimpan = v) };
    c.anotasi = [
      { jenis: 'ttd', x: 0.1, y: 0.1, gambar: pngUji() },
      { jenis: 'ttd', x: 0.2, y: 0.2 },
      { jenis: 'catatan', x: 0.3, y: 0.3, teks: '  ' },
      { jenis: 'tutup', x: 0.4, y: 0.4, teks: '' },
    ];
    c.simpan();
    expect(disimpan.length).toBe(2);
    expect(disimpan.map((a: any) => a.jenis)).toEqual(['ttd', 'tutup']);
  });

  it('papan yang belum digores tidak dapat dipakai', () => {
    const c = buat();
    c.bukaPapanTtd();
    expect(c.papanKosong).toBeTrue();
  });

  it('penyimpanan yang menolak tidak menjatuhkan dialognya', () => {
    // Jendela penyamaran MELEMPAR, bukan mengembalikan null.
    const asli = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem');
    spyOn(Storage.prototype, 'getItem').and.throwError('ditolak');
    try {
      expect(() => buat()).not.toThrow();
    } finally {
      if (asli) Object.defineProperty(Storage.prototype, 'getItem', asli);
    }
  });
});

/** Klik pada titik pecahan (fx, fy) di atas kotak 1000x1000. */
function peristiwaKlik(fx = 0.5, fy = 0.5): any {
  return {
    clientX: fx * 1000,
    clientY: fy * 1000,
    currentTarget: {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
    },
  };
}
