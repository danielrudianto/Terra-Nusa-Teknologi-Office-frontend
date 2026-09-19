/*
 * DIALOG RINCIAN RASIO.
 *
 * Isi dialog inilah satu-satunya tempat sebuah rasio dijelaskan: artinya,
 * risikonya bila terlalu rendah atau terlalu tinggi, dan hitungan yang
 * menghasilkannya. Petak di halamannya hanya angka dan sebuah chip.
 *
 * Karena itu kegagalan di sini tidak tampak sebagai galat — yang terbuka
 * adalah kotak berisi angka tanpa penjelasan, persis keadaan yang dialog ini
 * dibuat untuk memperbaikinya.
 */

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { RasioDialogComponent } from './rasio-dialog.component';
import { ApiService } from 'src/app/services/api.service';
import { PermissionService } from 'src/app/services/permission.service';
import { ServerMessageService } from 'src/app/services/server-message.service';

/** Apa yang dikirim ke server pada uji terakhir. */
const kiriman: any = { url: null, body: null, metode: null };
let bolehUbah = true;
let gagalkanKiriman = false;

function dialog(data: any, terjemahan: Record<string, string> = {}): any {
  kiriman.url = null;
  kiriman.body = null;
  kiriman.metode = null;
  TestBed.configureTestingModule({
    providers: [
      { provide: MatDialogRef, useValue: { close: (r?: any) => (kiriman.tutup = r) } },
      { provide: MAT_DIALOG_DATA, useValue: data },
      {
        provide: TranslateService,
        useValue: { instant: (k: string) => terjemahan[k] ?? k },
      },
      {
        provide: ApiService,
        useValue: {
          put: (url: string, body: any) => {
            kiriman.metode = 'put';
            kiriman.url = url;
            kiriman.body = body;
            return gagalkanKiriman ? throwError(() => new Error('x')) : of({});
          },
          delete: (url: string) => {
            kiriman.metode = 'delete';
            kiriman.url = url;
            return gagalkanKiriman ? throwError(() => new Error('x')) : of({});
          },
        },
      },
      { provide: PermissionService, useValue: { can: () => bolehUbah } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'galat' } },
    ],
  });
  return TestBed.runInInjectionContext(
    () =>
      new (RasioDialogComponent as any)(
        TestBed.inject(MatDialogRef),
        TestBed.inject(TranslateService),
        data,
      ),
  );
}

afterEach(() => {
  TestBed.resetTestingModule();
  bolehUbah = true;
  gagalkanKiriman = false;
});

const CONTOH = {
  kode: 'rasioOverhead',
  teks: '18,5%',
  posisi: 'diatas',
  baik: false,
  pitaTeks: 'maks 15,0%',
  acuan: 'CFMA',
  arti: 'posisiKeuangan.arti.rasioOverhead.diatas',
  bentuk: 'persen' as const,
  pita: { bawah: null, atas: 0.15 },
  hitungan: {
    pembilang: {
      label: 'bebanUsaha',
      nilai: 185_000_000,
      rincian: [
        { kategori: 'gaji', label: 'Gaji', nilai: 120_000_000 },
        { kategori: 'sewa', label: 'Sewa kantor', nilai: 65_000_000 },
      ],
    },
    penyebut: { label: 'pendapatan', nilai: 1_000_000_000 },
  },
};

describe('rincian penyusun rasio', () => {
  it('pembilang yang dirinci terbaca seluruhnya', () => {
    const c = dialog(CONTOH);
    expect(c.rincian(c.data.hitungan.pembilang).length).toBe(2);
  });

  it('sisi TANPA rincian mengembalikan daftar kosong, bukan meledak', () => {
    /*
     * Tidak semua rasio dirinci. `undefined.map` akan menjatuhkan dialognya —
     * dan dialog yang mati jauh lebih buruk daripada satu baris rincian yang
     * memang tidak ada.
     */
    const c = dialog(CONTOH);
    expect(c.rincian(c.data.hitungan.penyebut)).toEqual([]);
    expect(c.rincian(undefined)).toEqual([]);
    expect(c.rincian(null)).toEqual([]);
    expect(c.rincian({ rincian: 'bukan array' })).toEqual([]);
  });
});

describe('label komponen', () => {
  it('memakai terjemahan bila kategorinya dikenali', () => {
    const c = dialog(CONTOH, {
      'posisiKeuangan.komponen.gaji': 'Gaji & tunjangan',
    });
    expect(c.labelKomponen({ kategori: 'gaji', label: 'Gaji' })).toBe(
      'Gaji & tunjangan',
    );
  });

  it('kategori TANPA terjemahan memakai labelnya, bukan kunci mentah', () => {
    /*
     * Kategori beban datang dari DATA, bukan dari daftar tetap. Yang belum
     * punya terjemahan akan tercetak sebagai "posisiKeuangan.komponen.sewa"
     * di layar yang dibaca stakeholder — bukan galat, hanya memalukan dan
     * tidak terbaca.
     */
    const c = dialog(CONTOH);
    expect(c.labelKomponen({ kategori: 'entah', label: 'Sewa kantor' })).toBe(
      'Sewa kantor',
    );
  });

  it('tanpa kategori maupun label, dicetak tanda pisah', () => {
    const c = dialog(CONTOH);
    expect(c.labelKomponen({})).toBe('—');
  });
});

describe('angka rupiah', () => {
  it('"Rp" tidak boleh terpisah barisnya dari angkanya', () => {
    /*
     * Spasi biasa membuat peramban memutus barisnya persis di antara "Rp"
     * dan angkanya, dan pada kolom sempit yang terlihat adalah "Rp"
     * menggantung sendirian di satu baris — sempat terbaca sebagai kolom
     * yang kosong.
     */
    const c = dialog(CONTOH);
    const teks = c.uang(185_000_000);
    expect(teks).toContain(' ');
    expect(teks).not.toContain('Rp ');
  });
});

describe('ubah pita acuan', () => {
  /*
   * SATU KEKELIRUAN YANG DIJAGA PALING KERAS DI SINI: SKALA.
   *
   * Pita rasio persen DISIMPAN sebagai pecahan (0,15) dan DIBACA orang
   * sebagai 15%. Bila kotak isiannya menerima 15 lalu menyimpannya apa
   * adanya, yang tersimpan adalah 1500% — pita yang tak pernah dilampaui
   * siapa pun, sehingga setiap rasio selamanya "di dalam acuan".
   *
   * Tidak ada galat, tidak ada yang merah, dan yang membaca halaman itu
   * menyimpulkan perusahaannya baik-baik saja — justru pada halaman yang
   * dibuat untuk memberitahunya kalau tidak.
   */

  it('pita persen ditampilkan sebagai ANGKA PERSEN di kotaknya', () => {
    const c = dialog(CONTOH);
    expect(c.isianAtas).toBe(15);
    expect(c.isianBawah).toBeNull();
  });

  it('pita persen disimpan kembali sebagai PECAHAN, bukan angka persennya', async () => {
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianAtas = 20;
    await c.simpan();

    expect(kiriman.metode).toBe('put');
    expect(kiriman.url).toBe('finance-status/ambang/rasioOverhead');
    expect(kiriman.body.atas).toBeCloseTo(0.2, 6);
    expect(kiriman.body.bawah).toBeNull();
  });

  it('rasio berbentuk ANGKA tidak diskalakan sama sekali', () => {
    /*
     * Sisi sebaliknya, dan sama mudahnya salah: quick ratio 1,1 disimpan
     * apa adanya. Menskalakannya juga akan menyimpan 110.
     */
    const c = dialog({
      ...CONTOH,
      kode: 'quickRatio',
      bentuk: 'angka',
      pita: { bawah: 1.1, atas: 1.5 },
    });
    expect(c.isianBawah).toBe(1.1);
    expect(c.isianAtas).toBe(1.5);
  });

  it('rasio berbentuk HARI tidak diskalakan', () => {
    const c = dialog({
      ...CONTOH,
      kode: 'dso',
      bentuk: 'hari',
      pita: { bawah: null, atas: 95 },
    });
    expect(c.isianAtas).toBe(95);
    expect(c.satuan()).toBe('posisiKeuangan.satuanHari');
  });

  it('sisi yang dikosongkan dikirim null, bukan nol', async () => {
    /*
     * Nol adalah BATAS yang sah — "maks 0" berarti apa pun di atas nol di
     * luar acuan. Mengirim nol untuk sisi yang dikosongkan berarti seluruh
     * rasio seketika menyala.
     */
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianAtas = null;
    c.isianBawah = null;
    await c.simpan();
    expect(kiriman.body.atas).toBeNull();
    expect(kiriman.body.bawah).toBeNull();
  });

  it('pita TERBALIK ditolak sebelum dikirim', async () => {
    /*
     * Bawah melampaui atas tidak menghasilkan galat pada perhitungannya: ia
     * membuat SETIAP nilai berada di luar acuan sekaligus — seluruh rasio
     * menyala merah, dan yang membacanya mengira perusahaannya yang
     * bermasalah, bukan pitanya.
     */
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianBawah = 30;
    c.isianAtas = 10;

    expect(c.pitaTerbalik()).toBeTrue();
    await c.simpan();
    expect(kiriman.metode)
      .withContext('pita terbalik tetap dikirim ke server')
      .toBeNull();
  });

  it('pita yang sah TIDAK ditandai terbalik', () => {
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianBawah = 10;
    c.isianAtas = 30;
    expect(c.pitaTerbalik()).toBeFalse();

    // Satu sisi kosong bukan pita terbalik.
    c.isianBawah = null;
    expect(c.pitaTerbalik()).toBeFalse();
  });

  it('kembali ke bawaan memanggil DELETE, bukan menyimpan nol', async () => {
    const c = dialog(CONTOH);
    await c.kembalikanBawaan();
    expect(kiriman.metode).toBe('delete');
    expect(kiriman.url).toBe('finance-status/ambang/rasioOverhead');
  });

  it('berhasil menyimpan menutup dialog DENGAN penanda', async () => {
    /*
     * Penanda itulah yang membuat halamannya memuat ulang. Tanpa penanda,
     * pita berubah di server sementara kesepuluh petak lain masih menyebut
     * letak yang dihitung dengan pita lama — dan tidak ada apa pun di layar
     * yang menandainya.
     */
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianAtas = 12;
    await c.simpan();
    expect(kiriman.tutup).toEqual({ ambangBerubah: true });
  });

  it('gagal menyimpan TIDAK menutup dialog dan menyebut galatnya', async () => {
    gagalkanKiriman = true;
    const c = dialog(CONTOH);
    kiriman.tutup = undefined;
    c.mulaiUbah();
    c.isianAtas = 12;
    await c.simpan();

    expect(kiriman.tutup).toBeUndefined();
    expect(c.galatSimpan()).toBe('galat');
  });

  it('batal mengembalikan isian ke nilai yang berlaku', () => {
    const c = dialog(CONTOH);
    c.mulaiUbah();
    c.isianAtas = 99;
    c.batalUbah();
    expect(c.isianAtas).toBe(15);
    expect(c.mengubah()).toBeFalse();
  });

  it('tanpa izin `finance_status:update`, penyuntingnya tidak ada', () => {
    bolehUbah = false;
    const c = dialog(CONTOH);
    expect(c.bolehUbah()).toBeFalse();
  });
});
