/*
 * ISI PENUTUP (kepekatan, buram, pola) DAN RUPA CATATAN.
 *
 * Empat hal yang dijaga, dan tiga di antaranya adalah COMPATIBILITAS
 * MUNDUR — coretan yang sudah terlanjur dibuat tidak boleh berubah rupa
 * hanya karena ada pilihan baru:
 *
 *   * tanpa kepekatan → pekat penuh;
 *   * tanpa rupa huruf & besar huruf → Helvetica 10;
 *   * tanpa warna catatan → merah, seperti sebelumnya.
 *
 * Yang keempat: nilai yang di luar jangkauan DIJEPIT, tidak diteruskan.
 * pdf-lib menolak kepekatan di luar 0–1 dengan galat, dan satu coretan
 * bernilai aneh akan menjatuhkan SELURUH unduhan — dua puluh halaman lain
 * ikut gagal karena satu kotak.
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
  hal.drawText('Rp 120.000.000', { x: 40, y: 700, size: 14, color: rgb(0, 0, 0) });
  return doc.saveAsBase64({ dataUri: false });
}

function pngUji(): string {
  const k = document.createElement('canvas');
  k.width = 40;
  k.height = 20;
  const ctx = k.getContext('2d')!;
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 40, 20);
  return k.toDataURL('image/png');
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

describe('keOpasitas — nilai aneh dijepit, bukan diteruskan', () => {
  const op = (PdfMainComponent as any).keOpasitas;

  it('kosong berarti pekat penuh', () => {
    expect(op(undefined)).toBe(1);
  });

  it('nilai wajar diteruskan apa adanya', () => {
    expect(op(0.35)).toBe(0.35);
  });

  it('di luar 0–1 dijepit — pdf-lib menolaknya dengan galat', () => {
    expect(op(-3)).toBe(0);
    expect(op(7)).toBe(1);
  });

  it('bukan bilangan berarti pekat penuh', () => {
    expect(op(NaN)).toBe(1);
    expect(op('separuh' as any)).toBe(1);
  });
});

describe('ukuranCatatan & warnaCatatan — bawaan yang lama dipertahankan', () => {
  const uk = (PdfMainComponent as any).ukuranCatatan;
  const wc = (PdfMainComponent as any).warnaCatatan;

  it('tanpa besar huruf: 10 titik, seperti sebelum ukurannya dapat dipilih', () => {
    expect(uk(undefined)).toBe(10);
    expect(uk(0)).toBe(10);
  });

  it('besar huruf dijepit ke jangkauan yang masuk akal', () => {
    expect(uk(1)).toBe(4);
    expect(uk(500)).toBe(96);
    expect(uk(14)).toBe(14);
  });

  it('tanpa warna: MERAH, warna catatan yang lama', () => {
    expect(wc(undefined)).toEqual({ r: 0.72, g: 0.11, b: 0.11 });
    expect(wc('bukan warna')).toEqual({ r: 0.72, g: 0.11, b: 0.11 });
  });

  it('warna yang diberikan dipakai', () => {
    expect(wc('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('kunciFonta — pemetaan ke font baku PDF', () => {
  const kunci = (PdfMainComponent as any).kunciFonta;

  it('bawaan: sans tidak tebal', () => {
    expect(kunci(undefined, undefined)).toBe('sans');
  });

  it('tebal menambahkan akhiran', () => {
    expect(kunci('serif', true)).toBe('serif-tebal');
    expect(kunci(undefined, true)).toBe('sans-tebal');
  });

  it('rupa huruf yang tidak dikenal jatuh ke sans', () => {
    expect(kunci('comic' as any, false)).toBe('sans');
  });
});

describe('sediakanFonta — hanya yang terpakai yang disematkan', () => {
  it('tanpa catatan: cuma sans', async () => {
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sediakanFonta(dok, [
      { anotasi: [{ jenis: 'tutup', teks: 'x' }] },
    ]);
    expect([...peta.keys()]).toEqual(['sans']);
  });

  it('catatan berhuruf serif tebal menambah satu, bukan keenamnya', async () => {
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sediakanFonta(dok, [
      { anotasi: [{ jenis: 'catatan', fonta: 'serif', tebal: true, teks: 'x' }] },
    ]);
    expect([...peta.keys()].sort()).toEqual(['sans', 'serif-tebal']);
  });
});

describe('Kepekatan, isi bergambar, dan rupa catatan sampai ke berkasnya', () => {
  let pdf: string;

  beforeAll(async () => {
    pdf = await halamanBase64();
  });

  async function bita(anotasi?: any[]): Promise<Uint8Array> {
    const c = komponen();
    c.processedDocuments = [
      { pdf, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, anotasi },
    ];
    c.updateSelectionState();
    return unduh(c, () => c.saveSelectedPages());
  }

  const tutup = { jenis: 'tutup', x: 0.1, y: 0.1, lebar: 0.3, tinggi: 0.05, teks: '' };

  it('kepekatan mengubah berkasnya; tanpa kepekatan sama dengan pekat penuh', async () => {
    const tanpa = await bita([{ ...tutup }]);
    const penuh = await bita([{ ...tutup, opasitas: 1 }]);
    const separuh = await bita([{ ...tutup, opasitas: 0.4 }]);
    expect(tanpa.length).toBe(penuh.length);
    expect(separuh.length).not.toBe(penuh.length);
  });

  it('kepekatan di luar jangkauan TIDAK menjatuhkan unduhan', async () => {
    // Inilah bentuk kegagalan yang paling mahal: satu coretan bernilai
    // aneh membuat seluruh berkas gagal terbit.
    const hasil = await PDFDocument.load(await bita([{ ...tutup, opasitas: 9 }]));
    expect(hasil.getPageCount()).toBe(1);
  });

  it('penutup bergambar (buram/pola) digambar sebagai gambar, bukan kotak', async () => {
    const polos = await bita([{ ...tutup, bentuk: 'kotak' }]);
    const bergambar = await bita([
      { ...tutup, bentuk: 'kotak', isi: 'buram', gambar: pngUji() },
    ]);
    expect(bergambar.length).toBeGreaterThan(polos.length);
  });

  it('gambar isi yang gagal disematkan jatuh ke warna polos, bukan tidak menutupi', async () => {
    const polos = await bita([{ ...tutup, bentuk: 'kotak' }]);
    const rusak = await bita([
      { ...tutup, bentuk: 'kotak', isi: 'buram', gambar: 'data:image/png;base64,rusak' },
    ]);
    expect(rusak.length).toBe(polos.length);
  });

  it('rupa huruf catatan benar-benar berubah di berkasnya', async () => {
    const sans = await bita([{ jenis: 'catatan', x: 0.2, y: 0.2, teks: 'Halo' }]);
    const serif = await bita([
      { jenis: 'catatan', x: 0.2, y: 0.2, teks: 'Halo', fonta: 'serif' },
    ]);
    expect(serif.length).not.toBe(sans.length);
  });

  it('catatan lama (tanpa rupa & besar huruf) sama persis dengan bawaannya', async () => {
    // Warnanya tidak ikut diuji di sini: merah bawaan ditulis sebagai
    // 0,72/0,11/0,11, sedangkan `#b81c1c` menghasilkan pecahan yang lebih
    // panjang — sama di mata, beda di bita. Bawaan warnanya dijaga oleh
    // `warnaCatatan` di atas.
    const lama = await bita([{ jenis: 'catatan', x: 0.2, y: 0.2, teks: 'Halo' }]);
    const eksplisit = await bita([
      {
        jenis: 'catatan',
        x: 0.2,
        y: 0.2,
        teks: 'Halo',
        fonta: 'sans',
        ukuran: 10,
        tebal: false,
      },
    ]);
    expect(lama.length).toBe(eksplisit.length);
  });

  it('besar huruf dan huruf tebal terpakai tanpa menjatuhkan unduhan', async () => {
    const hasil = await PDFDocument.load(
      await bita([
        { jenis: 'catatan', x: 0.2, y: 0.2, teks: 'Besar', ukuran: 900, tebal: true },
      ]),
    );
    expect(hasil.getPageCount()).toBe(1);
  });
});

describe('Dialog sunting — isi penutup & rupa catatan', () => {
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

  function pasangContoh(c: any): void {
    const k = document.createElement('canvas');
    k.width = 200;
    k.height = 280;
    const ctx = k.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 280);
    ctx.fillStyle = '#000000';
    ctx.fillRect(10, 10, 120, 18);
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

  it('isi "warna" tidak membuat gambar apa pun', () => {
    const c = buat();
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[0].isi).toBe('warna');
    expect(c.anotasi[0].gambar).toBeUndefined();
  });

  it('kepekatan dari penggeser ikut tersimpan sebagai pecahan 0–1', () => {
    const c = buat();
    c.opasitasTutup = 40;
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[0].opasitas).toBeCloseTo(0.4, 6);
  });

  it('pola menghasilkan PNG walau salinan halamannya belum ada', () => {
    // Pola tidak menyalin apa pun dari halaman, jadi ia tidak bergantung
    // pada pipet.
    const c = buat();
    c.isiTutup = 'silang';
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[0].gambar).toMatch(/^data:image\/png/);
  });

  it('BURAM tanpa salinan halaman jatuh ke warna polos — tetap menutupi', () => {
    // Membiarkannya kosong akan membuat yang hendak ditutup tetap terbaca:
    // kegagalan yang diam dan justru membocorkan.
    const c = buat();
    c.isiTutup = 'buram';
    c.pilihAlat('tutup');
    c.taruh(klik());
    expect(c.anotasi[0].isi).toBe('warna');
    expect(c.anotasi[0].gambar).toBeUndefined();
  });

  it('BURAM dengan salinan halaman menghasilkan gambar', () => {
    const c = buat();
    pasangContoh(c);
    c.isiTutup = 'buram';
    c.pilihAlat('tutup');
    c.taruh(klik(0.2, 0.1));
    expect(c.anotasi[0].isi).toBe('buram');
    expect(c.anotasi[0].gambar).toMatch(/^data:image\/png/);
  });

  it('isi dibuat ULANG setelah kotaknya digeser atau diubah ukurannya', () => {
    // Buram menyalin apa yang ada DI BAWAH kotaknya; kalau tidak dibuat
    // ulang, yang tampak adalah bagian halaman yang keliru.
    const c = buat();
    pasangContoh(c);
    c.isiTutup = 'buram';
    c.pilihAlat('tutup');
    c.taruh(klik(0.2, 0.1));
    const sebelum = c.anotasi[0].gambar;

    c.anotasi[0].x = 0.6;
    c.anotasi[0].lebar = 0.3;
    c['seret'] = { i: 0 };
    c['saatLepas']();

    expect(c.anotasi[0].gambar).not.toBe(sebelum);
  });

  it('catatan membawa warna, rupa, besar huruf, dan tebal yang dipilih', () => {
    const c = buat();
    c.warnaCatatan = '#154dec';
    c.fontaCatatan = 'mono';
    c.ukuranCatatan = 18;
    c.tebalCatatan = true;
    c.pilihAlat('catatan');
    c.taruh(klik());
    expect(c.anotasi[0]).toEqual(
      jasmine.objectContaining({
        jenis: 'catatan',
        warna: '#154dec',
        fonta: 'mono',
        ukuran: 18,
        tebal: true,
      }),
    );
  });

  it('catatan TERPILIH ikut berubah saat rupa & besar hurufnya diganti', () => {
    const c = buat();
    c.anotasi = [{ jenis: 'catatan', x: 0.2, y: 0.2, teks: 'lama' }];
    c.pilihAnotasi(0, new Event('click'));
    c.setFonta('serif');
    c.setUkuran(24);
    c.setTebal(true);
    c.setWarnaCatatan('#000000');
    expect(c.anotasi[0]).toEqual(
      jasmine.objectContaining({
        fonta: 'serif',
        ukuran: 24,
        tebal: true,
        warna: '#000000',
        teks: 'lama',
      }),
    );
  });

  it('memilih catatan membawa bilah alatnya ke rupa huruf catatan itu', () => {
    const c = buat();
    c.anotasi = [
      { jenis: 'catatan', x: 0.2, y: 0.2, teks: 'x', fonta: 'mono', ukuran: 18, tebal: true },
    ];
    c.pilihAnotasi(0, new Event('click'));
    expect(c.fontaCatatan).toBe('mono');
    expect(c.ukuranCatatan).toBe(18);
    expect(c.tebalCatatan).toBeTrue();
  });

  it('isi bergambar dibuat ULANG saat bentuk atau warnanya diganti', () => {
    // Pola memakai warnanya sebagai dasar dan dipotong mengikuti bentuknya,
    // jadi keduanya harus membuat gambarnya dari awal — kalau tidak, yang
    // tampil masih gambar yang lama.
    const c = buat();
    c.isiTutup = 'silang';
    c.pilihAlat('tutup');
    c.taruh(klik());
    const awal = c.anotasi[0].gambar;

    c.setWarnaTutup('#000000');
    const sesudahWarna = c.anotasi[0].gambar;
    expect(sesudahWarna).not.toBe(awal);

    c.setBentuk('lingkaran');
    expect(c.anotasi[0].gambar).not.toBe(sesudahWarna);
  });

  it('besar huruf di layar diskalakan dengan lebar kertas yang TERUKUR', () => {
    // Titik bukan piksel: kertasnya ditampilkan sekecil apa pun yang muat,
    // jadi 10 pt pada kertas selebar 1190 px bukan 10 px.
    //
    // Pernah dipecahkan dengan satuan `cqw`, dan itu menuntut
    // `container-type: inline-size` pada kertasnya — containment yang
    // MENCIUTKAN kertasnya menjadi nol sehingga halamannya hilang dari
    // layar sama sekali, tanpa galat apa pun.
    const c = buat();
    c.lebarPt = 595;
    c.lebarKertasPx = 1190; // dua kali lipat
    expect(c.ukuranLayar({ jenis: 'catatan', x: 0, y: 0, ukuran: 10 })).toBe('20px');
    // Tanpa ukuran, 10 titik — sama dengan yang digambar ke PDF-nya.
    expect(c.ukuranLayar({ jenis: 'catatan', x: 0, y: 0 })).toBe('20px');
  });

  it('kertas seukuran halamannya berarti titik = piksel', () => {
    const c = buat();
    c.lebarPt = 595;
    c.lebarKertasPx = 595;
    expect(c.ukuranLayar({ jenis: 'catatan', x: 0, y: 0, ukuran: 14 })).toBe('14px');
  });

  it('rupa huruf layar mengikuti pilihan yang sama', () => {
    const c = buat();
    expect(c.fontaLayar({ jenis: 'catatan', x: 0, y: 0, fonta: 'serif' })).toContain('Times');
    expect(c.fontaLayar({ jenis: 'catatan', x: 0, y: 0, fonta: 'mono' })).toContain('Courier');
    expect(c.fontaLayar({ jenis: 'catatan', x: 0, y: 0 })).toContain('Helvetica');
  });
});

/*
 * KERTASNYA HARUS PUNYA LEBAR.
 *
 * Cacat yang diuji di sini tidak menghasilkan galat, tidak menghasilkan
 * pemuat, dan tidak menghasilkan pesan gagal — dialognya terbuka dengan
 * seluruh bilah alatnya, dan halamannya sekadar TIDAK ADA.
 *
 * Sebabnya satu baris CSS: `container-type: inline-size` pada kertasnya,
 * dipasang supaya besar huruf catatan dapat memakai satuan `cqw`. Kertas
 * itu berada di dalam grid `place-items: center`, jadi lebarnya ditentukan
 * oleh isinya — sementara containment itu justru melarang peramban melihat
 * isinya. Lebarnya menjadi nol.
 *
 * Ini diuji dengan MERAKIT komponennya sungguhan, bukan memanggil
 * fungsinya: yang rusak tata letaknya, dan tata letak hanya dapat diperiksa
 * oleh peramban. Penggambaran pdf.js diganti (Karma tidak dapat menyajikan
 * worker-nya); yang diuji hanya apa yang terjadi SESUDAH gambarnya ada.
 */
describe('Dialog sunting — kertasnya tampil, bukan menciut jadi nol', () => {
  /** PNG 600×800 penuh warna — pengganti halaman yang digambar pdf.js. */
  function halamanPng(): string {
    const k = document.createElement('canvas');
    k.width = 600;
    k.height = 800;
    const ctx = k.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 800);
    ctx.fillStyle = '#000000';
    ctx.fillRect(40, 40, 300, 24);
    return k.toDataURL('image/png');
  }

  it('lebar dan tinggi kertasnya lebih dari nol', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            pdf: '',
            nomor: 1,
            fileName: 'a.pdf',
            rotation: 0,
            anotasi: [{ jenis: 'catatan', x: 0.2, y: 0.2, teks: 'Halo' }],
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SuntingHalamanComponent);
    const png = halamanPng();
    // pdf.js diganti: Karma tidak dapat menyajikan worker-nya.
    (fixture.componentInstance as any).gambarHalaman = async () => png;

    // Dialog ini biasanya dibuka pada lebar tetapnya; di dalam harness
    // Karma induknya selebar apa adanya, jadi dipatok supaya ukurannya
    // dapat diperiksa dengan pasti.
    fixture.nativeElement.style.width = '1180px';
    document.body.appendChild(fixture.nativeElement);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const kertas: HTMLElement | null =
      fixture.nativeElement.querySelector('.sh-kertas');
    expect(kertas).withContext('kertasnya tidak dirakit sama sekali').toBeTruthy();

    // Tunggu gambarnya termuat — sebelum itu kertasnya memang belum punya
    // ukuran, dan ujinya akan merah karena alasan yang keliru.
    const img = kertas!.querySelector('img') as HTMLImageElement;
    if (!img.complete) {
      await new Promise<void>((s) => {
        img.onload = () => s();
        img.onerror = () => s();
      });
    }
    fixture.detectChanges();

    expect(kertas!.getBoundingClientRect().width)
      .withContext('kertasnya menciut — periksa containment pada .sh-kertas')
      .toBeGreaterThan(100);
    expect(kertas!.getBoundingClientRect().height).toBeGreaterThan(100);

    fixture.nativeElement.remove();
    fixture.destroy();
  });
});

/*
 * TEKS PENGGANTI PADA PENUTUP — rupa huruf, warna, dan perataannya.
 *
 * Dua bawaan yang TIDAK BOLEH bergeser, karena keduanya sudah berlaku pada
 * ribuan coretan yang sudah terlanjur dibuat:
 *
 *   * tanpa ukuran, besar hurufnya MENYESUAIKAN tinggi kotaknya;
 *   * tanpa warna sendiri, warnanya dihitung agar KONTRAS terhadap
 *     penutupnya — hitam di atas putih, putih di atas biru tua.
 *
 * Yang ketiga baru, dan satu-satunya yang butuh hitungan: perataan diukur
 * dari LEBAR TULISAN SEBENARNYA, bukan dari jumlah hurufnya.
 */
describe('geserRata — perataan teks di dalam kotak', () => {
  const rata = (PdfMainComponent as any).geserRata;

  it('kiri (dan tanpa perataan) = sisipannya saja', () => {
    expect(rata(undefined, 100, 40, 2)).toBe(2);
    expect(rata('kiri', 100, 40, 2)).toBe(2);
  });

  it('tengah membagi sisa ruangnya', () => {
    expect(rata('tengah', 100, 40, 2)).toBe(30);
  });

  it('kanan menempel tepi kanan, dikurangi sisipannya', () => {
    expect(rata('kanan', 100, 40, 2)).toBe(58);
  });

  it('tulisan yang LEBIH LEBAR dari kotaknya tidak menjorok keluar ke kiri', () => {
    // Tanpa jepitan, (100-160)/2 = -30: tulisannya mulai di luar kotak,
    // dan pada penutup itu berarti menimpa isi halaman di sebelahnya.
    expect(rata('tengah', 100, 160, 2)).toBe(2);
    expect(rata('kanan', 100, 160, 2)).toBe(2);
  });
});

describe('Teks penutup — bawaan lama dipertahankan', () => {
  let pdf: string;

  beforeAll(async () => {
    pdf = await halamanBase64();
  });

  async function bita(anotasi?: any[]): Promise<Uint8Array> {
    const c = komponen();
    c.processedDocuments = [
      { pdf, thumbnail: '', pageNumber: 1, fileName: 'a.pdf', selected: true, anotasi },
    ];
    c.updateSelectionState();
    return unduh(c, () => c.saveSelectedPages());
  }

  const tutup = {
    jenis: 'tutup',
    x: 0.1,
    y: 0.1,
    lebar: 0.4,
    tinggi: 0.05,
    teks: 'Rp 120.000',
  };

  it('penutup lama (tanpa rupa, ukuran, warna teks, perataan) tidak berubah', async () => {
    const lama = await bita([{ ...tutup }]);
    const eksplisit = await bita([
      { ...tutup, fonta: 'sans', tebal: false, rata: 'kiri' },
    ]);
    expect(lama.length).toBe(eksplisit.length);
  });

  it('rupa huruf penutup benar-benar berubah di berkasnya', async () => {
    const sans = await bita([{ ...tutup }]);
    const serif = await bita([{ ...tutup, fonta: 'serif' }]);
    expect(serif.length).not.toBe(sans.length);
  });

  it('perataan mengubah letaknya', async () => {
    const kiri = await bita([{ ...tutup, rata: 'kiri' }]);
    const tengah = await bita([{ ...tutup, rata: 'tengah' }]);
    expect(tengah.length).not.toBe(kiri.length);
  });

  it('warna teks sendiri dipakai; tanpa itu, kontras', async () => {
    const otomatis = await bita([{ ...tutup, warna: '#ffffff' }]);
    const sendiri = await bita([{ ...tutup, warna: '#ffffff', warnaTeks: '#154dec' }]);
    expect(sendiri.length).not.toBe(otomatis.length);
  });

  it('rupa huruf penutup ikut disematkan, bukan hanya rupa huruf catatan', async () => {
    // Kalau `sediakanFonta` melewatkan penutup, `font.get()` mengembalikan
    // undefined dan seluruh tulisannya diam-diam jatuh ke sans.
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sediakanFonta(dok, [
      { anotasi: [{ jenis: 'tutup', teks: 'x', fonta: 'mono', tebal: true }] },
    ]);
    expect([...peta.keys()].sort()).toEqual(['mono-tebal', 'sans']);
  });

  it('penutup TANPA tulisan tidak menyeret rupa huruf apa pun', async () => {
    const c = komponen();
    const dok = await PDFDocument.create();
    const peta = await (c as any).sediakanFonta(dok, [
      { anotasi: [{ jenis: 'tutup', fonta: 'serif' }] },
    ]);
    expect([...peta.keys()]).toEqual(['sans']);
  });

  it('ukuran & tebal terpakai tanpa menjatuhkan unduhan', async () => {
    const hasil = await PDFDocument.load(
      await bita([{ ...tutup, ukuran: 24, tebal: true, rata: 'kanan' }]),
    );
    expect(hasil.getPageCount()).toBe(1);
  });
});
