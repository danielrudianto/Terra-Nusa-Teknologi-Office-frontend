/*
 * PENUTUP — BENTUK, WARNA, DAN PIPET.
 *
 * Yang dijaga di sini, berurutan dari yang paling mahal kalau rusak:
 *
 *   1. COMPATIBILITAS MUNDUR. Coretan yang dibuat sebelum bentuk dan warna
 *      ada tidak menyimpan keduanya. Kalau nilai kosong tidak lagi berarti
 *      "kotak putih", semua penutup lama berubah rupa diam-diam — dan yang
 *      membuatnya tidak akan pernah tahu sampai berkasnya sudah dikirim.
 *
 *   2. ARAH SEGITIGA pada halaman ber-`/Rotate`. Puncaknya harus menghadap
 *      atas SEBAGAIMANA TERLIHAT, bukan atas halaman aslinya.
 *
 *   3. WARNA TEKS. Teks pengganti dulu selalu hitam; di atas penutup gelap
 *      ia lenyap sama sekali.
 *
 *   4. PIPET mengambil warna dari GAMBAR HALAMANNYA, jadi ia dapat diuji
 *      tanpa layar dan tanpa `EyeDropper` bawaan peramban.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PDFDocument, rgb } from 'pdf-lib';

import { PdfMainComponent } from './pdf-main.component';
import { SuntingHalamanComponent } from './sunting-halaman/sunting-halaman.component';

async function halamanBase64(): Promise<string> {
  const doc = await PDFDocument.create();
  const hal = doc.addPage([595, 842]);
  hal.drawText('Angka rahasia 120.000', { x: 40, y: 700, size: 12, color: rgb(0, 0, 0) });
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
  return new Uint8Array(await (blob as unknown as Blob).arrayBuffer());
}

describe('keRgb — warna penutup', () => {
  const keRgb = (PdfMainComponent as any).keRgb;

  it('kosong berarti PUTIH — penutup lama tidak berubah rupa', () => {
    expect(keRgb(undefined)).toEqual({ r: 1, g: 1, b: 1 });
    expect(keRgb('')).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('nilai yang tidak terbaca juga putih, bukan hitam', () => {
    // Hitam akan MENUTUPI isi halaman dengan blok pekat — kegagalan yang
    // jauh lebih merusak daripada sekadar kembali ke bawaan.
    expect(keRgb('merah')).toEqual({ r: 1, g: 1, b: 1 });
    expect(keRgb('#12345')).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('membaca #rrggbb, dengan atau tanpa pagar, huruf besar atau kecil', () => {
    expect(keRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(keRgb('00FF00')).toEqual({ r: 0, g: 1, b: 0 });
    expect(keRgb(' #0000ff ')).toEqual({ r: 0, g: 0, b: 1 });
  });
});

describe('teksKontras — teks pengganti harus terbaca', () => {
  const kontras = (PdfMainComponent as any).teksKontras;

  it('di atas penutup putih: hitam', () => {
    expect(kontras('#ffffff')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('di atas penutup hitam atau biru tua: putih', () => {
    expect(kontras('#000000')).toEqual({ r: 1, g: 1, b: 1 });
    expect(kontras('#154dec')).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('kuning muda dihitung TERANG meski nilainya besar di dua kanal', () => {
    // Rata-rata ketiga kanal akan salah di sini; luminansi berbobot tidak.
    expect(kontras('#fde68a')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('tanpa warna: hitam, seperti sebelum warnanya dapat dipilih', () => {
    expect(kontras(undefined)).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('titikSegitiga — puncak menghadap atas SEBAGAIMANA TERLIHAT', () => {
  const titik = (PdfMainComponent as any).titikSegitiga;
  const k = { x: 100, y: 200, width: 60, height: 30 };

  it('tanpa putaran: puncak di tengah-atas kotak', () => {
    expect(titik(k, 0)[0]).toEqual([130, 230]);
  });

  it('90°: "atas layar" adalah sisi KIRI halaman aslinya', () => {
    expect(titik(k, 90)[0]).toEqual([100, 215]);
  });

  it('180°: puncak di tengah-bawah', () => {
    expect(titik(k, 180)[0]).toEqual([130, 200]);
  });

  it('270°: puncak di sisi kanan', () => {
    expect(titik(k, 270)[0]).toEqual([160, 215]);
  });

  it('selalu tiga titik, dan semuanya di dalam kotaknya', () => {
    [0, 90, 180, 270].forEach((r) => {
      const t = titik(k, r);
      expect(t.length).toBe(3);
      t.forEach(([x, y]: [number, number]) => {
        expect(x).toBeGreaterThanOrEqual(k.x);
        expect(x).toBeLessThanOrEqual(k.x + k.width);
        expect(y).toBeGreaterThanOrEqual(k.y);
        expect(y).toBeLessThanOrEqual(k.y + k.height);
      });
    });
  });

  it('sudut di luar 0–359 dinormalkan', () => {
    expect(titik(k, 450)[0]).toEqual(titik(k, 90)[0]);
  });
});

describe('Penutup berbentuk & berwarna — sampai ke berkasnya', () => {
  let pdf: string;

  beforeAll(async () => {
    pdf = await halamanBase64();
  });

  function isi(c: any, anotasi?: any[]) {
    c.processedDocuments = [
      { pdf, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, anotasi },
    ];
    c.updateSelectionState();
  }

  async function bita(anotasi?: any[]): Promise<Uint8Array> {
    const c = komponen();
    isi(c, anotasi);
    return unduh(c, () => c.saveSelectedPages());
  }

  const dasar = { jenis: 'tutup', x: 0.1, y: 0.1, lebar: 0.3, tinggi: 0.05, teks: '' };

  it('coretan lama (tanpa bentuk & warna) SAMA PERSIS dengan kotak putih', async () => {
    const lama = await bita([{ ...dasar }]);
    const baru = await bita([{ ...dasar, bentuk: 'kotak', warna: '#ffffff' }]);
    expect(lama.length).toBe(baru.length);
  });

  it('lingkaran menghasilkan berkas yang berbeda dari kotak', async () => {
    const kotak = await bita([{ ...dasar, bentuk: 'kotak' }]);
    const lingkaran = await bita([{ ...dasar, bentuk: 'lingkaran' }]);
    expect(lingkaran.length).not.toBe(kotak.length);
  });

  it('segitiga menghasilkan berkas yang berbeda dari kotak dan lingkaran', async () => {
    const kotak = await bita([{ ...dasar, bentuk: 'kotak' }]);
    const lingkaran = await bita([{ ...dasar, bentuk: 'lingkaran' }]);
    const segitiga = await bita([{ ...dasar, bentuk: 'segitiga' }]);
    expect(segitiga.length).not.toBe(kotak.length);
    expect(segitiga.length).not.toBe(lingkaran.length);
  });

  it('bentuk yang tidak dikenal jatuh ke kotak, bukan tidak tergambar', async () => {
    const kotak = await bita([{ ...dasar, bentuk: 'kotak' }]);
    const aneh = await bita([{ ...dasar, bentuk: 'bintang' }]);
    expect(aneh.length).toBe(kotak.length);
  });

  it('semua bentuk tetap tergambar pada halaman berputar', async () => {
    for (const bentuk of ['kotak', 'lingkaran', 'segitiga']) {
      const c = komponen();
      c.processedDocuments = [
        {
          pdf,
          thumbnail: '',
          pageNumber: 1,
          fileName: 'a.pdf',
          selected: true,
          rotation: 90,
          anotasi: [{ ...dasar, bentuk }],
        },
      ];
      c.updateSelectionState();
      const hasil = await PDFDocument.load(await unduh(c, () => c.saveSelectedPages()));
      expect(hasil.getPage(0).getRotation().angle)
        .withContext(bentuk)
        .toBe(90);
    }
  });
});

describe('Dialog sunting — bentuk, warna, pipet', () => {
  function buat(): any {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        new SuntingHalamanComponent({
          pdf: '',
          nomor: 1,
          fileName: 'a.pdf',
          rotation: 0,
          anotasi: [],
        }),
    ) as any;
  }

  /** Kanvas satu warna, dipasang sebagai salinan halaman untuk pipet. */
  function pasangContoh(c: any, warna: string): void {
    const k = document.createElement('canvas');
    k.width = 20;
    k.height = 20;
    const ctx = k.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = warna;
    ctx.fillRect(0, 0, 20, 20);
    c['contoh'] = ctx;
  }

  function klik(fx = 0.5, fy = 0.5): any {
    return {
      clientX: fx * 1000,
      clientY: fy * 1000,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
      },
    };
  }

  it('bawaannya kotak putih — sama dengan sebelum ada pilihan bentuk', () => {
    const c = buat();
    expect(c.bentukTutup).toBe('kotak');
    expect(c.warnaTutup).toBe('#ffffff');
  });

  it('penutup yang ditaruh membawa bentuk & warna yang sedang dipilih', () => {
    const c = buat();
    c.bentukTutup = 'lingkaran';
    c.warnaTutup = '#154dec';
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[0].bentuk).toBe('lingkaran');
    expect(c.anotasi[0].warna).toBe('#154dec');
  });

  it('lingkaran & segitiga tidak memakai ukuran kotak yang setipis satu baris', () => {
    const c = buat();
    c.bentukTutup = 'kotak';
    c.pilihAlat('tutup');
    c.taruh(klik());
    const kotak = c.anotasi[0];

    c.bentukTutup = 'segitiga';
    c.pilihAlat('tutup');
    c.taruh(klik());
    const segitiga = c.anotasi[1];

    expect(segitiga.tinggi).toBeGreaterThan(kotak.tinggi);
  });

  it('coretan baru terpusat pada titik yang diklik', () => {
    const c = buat();
    c.bentukTutup = 'lingkaran';
    c.pilihAlat('tutup');
    c.taruh(klik(0.5, 0.5));
    const a = c.anotasi[0];
    expect(a.x + a.lebar / 2).toBeCloseTo(0.5, 5);
    expect(a.y + a.tinggi / 2).toBeCloseTo(0.5, 5);
  });

  it('PIPET mengambil warna halaman dan menyerahkan giliran ke alat penutup', () => {
    const c = buat();
    pasangContoh(c, '#154dec');
    c.pilihAlat('pipet');
    expect(c.alatAktif).toBe('pipet');

    c.taruh(klik());
    expect(c.warnaTutup).toBe('#154dec');
    // Tidak menaruh apa pun — ia hanya mengambil warna.
    expect(c.anotasi.length).toBe(0);
    expect(c.alatAktif).toBe('tutup');
  });

  it('pipet tidak mengubah apa pun bila salinan halamannya belum siap', () => {
    const c = buat();
    c.alatAktif = 'pipet';
    c.taruh(klik());
    expect(c.warnaTutup).toBe('#ffffff');
    expect(c.pipetSiap).toBeFalse();
  });

  it('warnaDiTitik dijepit di tepi, tidak pernah keluar kanvas', () => {
    const c = buat();
    pasangContoh(c, '#000000');
    expect(c.warnaDiTitik(-5, 2)).toBe('#000000');
    expect(c.warnaDiTitik(1, 1)).toBe('#000000');
  });

  it('penutup TERPILIH ikut berubah saat bentuk & warnanya diganti', () => {
    // Tanpa ini, satu-satunya cara mengganti warna adalah menghapus lalu
    // menaruh ulang — dan letaknya yang sudah pas ikut hilang.
    const c = buat();
    c.anotasi = [{ jenis: 'tutup', x: 0.3, y: 0.4, lebar: 0.2, tinggi: 0.02 }];
    c.pilihAnotasi(0, new Event('click'));
    c.setBentuk('segitiga');
    c.setWarnaTutup('#b3322f');
    expect(c.anotasi[0]).toEqual(
      jasmine.objectContaining({ x: 0.3, y: 0.4, bentuk: 'segitiga', warna: '#b3322f' }),
    );
  });

  it('setelan penutup tidak menyentuh catatan yang terpilih', () => {
    const c = buat();
    c.anotasi = [{ jenis: 'catatan', x: 0.1, y: 0.1, teks: 'halo' }];
    c.pilihAnotasi(0, new Event('click'));
    c.setBentuk('lingkaran');
    c.setWarnaTutup('#000000');
    expect(c.anotasi[0].bentuk).toBeUndefined();
    // Warna penutup dan warna catatan dua setelan yang berbeda; yang satu
    // tidak boleh bocor ke yang lain.
    expect(c.anotasi[0].warna).toBeUndefined();
  });

  it('tanpa yang terpilih, setelannya hanya mengenai coretan BERIKUTNYA', () => {
    const c = buat();
    c.anotasi = [{ jenis: 'tutup', x: 0.3, y: 0.4, lebar: 0.2, tinggi: 0.02 }];
    c.setWarnaTutup('#000000');
    expect(c.anotasi[0].warna).toBeUndefined();

    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[1].warna).toBe('#000000');
  });

  it('memilih satu coretan MEMBAWA bilah alatnya ke setelan coretan itu', () => {
    // Kalau tidak, yang tampil di bilah alat bukan yang sedang disunting —
    // dan menyentuh apa pun di sana mengubahnya menjadi yang tidak diminta.
    const c = buat();
    c.anotasi = [
      {
        jenis: 'tutup',
        x: 0.1,
        y: 0.1,
        lebar: 0.2,
        tinggi: 0.02,
        bentuk: 'lingkaran',
        warna: '#fde68a',
        opasitas: 0.5,
      },
    ];
    c.pilihAnotasi(0, new Event('click'));
    expect(c.bentukTutup).toBe('lingkaran');
    expect(c.warnaTutup).toBe('#fde68a');
    expect(c.opasitasTutup).toBe(50);
  });

  it('coretan yang baru ditaruh langsung terpilih', () => {
    const c = buat();
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.terpilih).toBe(0);
  });

  it('menekan kertas yang kosong melepas pilihannya', () => {
    const c = buat();
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.terpilih).toBe(0);
    // Alatnya mati sendiri setelah menaruh, jadi klik berikutnya jatuh ke
    // kertas kosong.
    c.taruh(klik(0.9, 0.9));
    expect(c.terpilih).toBeNull();
  });

  it('menghapus menggeser pilihannya, bukan membiarkannya menunjuk tetangga', () => {
    const c = buat();
    c.anotasi = [
      { jenis: 'tutup', x: 0.1, y: 0.1 },
      { jenis: 'tutup', x: 0.2, y: 0.2 },
      { jenis: 'tutup', x: 0.3, y: 0.3 },
    ];
    c.terpilih = 2;
    c.hapus(0);
    expect(c.terpilih).toBe(1);
    expect(c.anotasi[1].x).toBe(0.3);

    c.hapus(1);
    expect(c.terpilih).toBeNull();
  });

  it('PIPET mewarnai penutup yang sedang terpilih, bukan hanya yang berikutnya', () => {
    const c = buat();
    pasangContoh(c, '#154dec');
    c.anotasi = [{ jenis: 'tutup', x: 0.3, y: 0.4, lebar: 0.2, tinggi: 0.02 }];
    c.pilihAnotasi(0, new Event('click'));
    c.pilihAlat('pipet');
    c.taruh(klik());
    expect(c.anotasi[0].warna).toBe('#154dec');
  });

  it('warnaTeks di layar sepakat dengan yang digambar ke PDF-nya', () => {
    // Dua hitungan terpisah yang harus selalu sepakat: kalau tidak, apa
    // yang terlihat saat menyunting bukan apa yang tercetak.
    const c = buat();
    const pdfKontras = (PdfMainComponent as any).teksKontras;
    ['#ffffff', '#000000', '#154dec', '#fde68a', undefined].forEach((w) => {
      const gelapDiLayar = c.warnaTeks(w) === '#16181d';
      const gelapDiPdf = pdfKontras(w).r === 0;
      expect(gelapDiLayar).withContext(String(w)).toBe(gelapDiPdf);
    });
  });
});
