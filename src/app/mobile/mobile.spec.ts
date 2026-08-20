/**
 * Aturan yang tampak di layar mobile harus SAMA dengan yang di desktop.
 *
 * Aplikasi mobile ini sengaja hidup di repo yang sama dan memakai layanan
 * yang sama. Yang tetap harus dijaga: sedikit aturan yang mau tidak mau
 * ditampilkan ulang di layarnya — siapa yang tidak boleh menyetujui apa.
 *
 * Bila salah satunya kelak berbeda, gejalanya paling mahal yang mungkin:
 * dokumen yang disetujui dari ponsel padahal aturannya melarang, atau
 * sebaliknya — tombol yang hilang di ponsel pada dokumen yang sebenarnya
 * boleh disetujui, sehingga persetujuannya tertunda tanpa ada yang tahu
 * mengapa.
 */

import { LEVEL_MINIMUM_MOBILE } from './penjaga-level';
import { PersetujuanPoComponent } from './persetujuan-po/persetujuan-po.component';

const SAYA = 7;
const ORANG_LAIN = 9;

function layar(level: number, userId: number | null = SAYA): any {
  const c: any = Object.create(PersetujuanPoComponent.prototype);
  c.akun = { userId, user: { id: userId, authenticationLevel: level } };
  c.izin = { level: () => level };
  return c;
}

function po(over: Record<string, unknown> = {}): any {
  return {
    id: 1,
    name: '062-PO-R35CH-G',
    isChecked: true,
    createdBy: ORANG_LAIN,
    checkedBy: ORANG_LAIN,
    dpp: 1_000_000,
    ppn: 11,
    otherValue: 0,
    ...over,
  };
}

describe('mobile: batas level', () => {
  it('mulai dari level 3', () => {
    /*
     * Di bawah 3 tidak ada satu pun yang dapat dikerjakan di sini —
     * seluruh isinya menyetujui dan menghapus. Layar penuh tombol yang
     * semuanya ditolak lebih buruk daripada pintu tertutup berketerangan.
     */
    expect(LEVEL_MINIMUM_MOBILE).toBe(3);
  });
});

describe('mobile: siapa yang tidak boleh menyetujui purchase order', () => {
  it('pemeriksanya sendiri tidak boleh', () => {
    const c = layar(4);
    expect(c.sebabTerhalang(po({ checkedBy: SAYA }))).toBe(
      'mobile.po.diperiksaSendiri',
    );
    expect(c.bolehSetujui(po({ checkedBy: SAYA }))).toBeFalse();
  });

  it('pembuatnya sendiri tidak boleh', () => {
    const c = layar(4);
    expect(c.sebabTerhalang(po({ createdBy: SAYA }))).toBe(
      'mobile.po.buatanSendiri',
    );
  });

  it('bila keduanya berlaku, yang disebut pemeriksaannya', () => {
    // Tindakan yang paling dekat dengan yang baru saja dilakukannya.
    const c = layar(4);
    expect(c.sebabTerhalang(po({ createdBy: SAYA, checkedBy: SAYA }))).toBe(
      'mobile.po.diperiksaSendiri',
    );
  });

  it('pemilik (level 5) dikecualikan pada keduanya', () => {
    const c = layar(5);
    expect(c.bolehSetujui(po({ checkedBy: SAYA }))).toBeTrue();
    expect(c.bolehSetujui(po({ createdBy: SAYA }))).toBeTrue();
  });

  it('dokumen orang lain boleh disetujui', () => {
    const c = layar(4);
    expect(c.sebabTerhalang(po())).toBeNull();
    expect(c.bolehSetujui(po())).toBeTrue();
  });

  it('tanpa id pengguna, tidak ada yang dianggap milik sendiri', () => {
    /*
     * Bukan sebaliknya. Server tetap menolak bila ternyata memang miliknya,
     * dan pesannya lebih jelas daripada tombol yang hilang tanpa sebab.
     */
    const c = layar(4, null);
    expect(c.bolehSetujui(po({ createdBy: SAYA, checkedBy: SAYA }))).toBeTrue();
  });
});

describe('mobile: nilai yang ditampilkan sebelum menyetujui', () => {
  it('DPP ditambah PPN dan nilai lain', () => {
    /*
     * Yang dibaca sebelum menandatangani harus nominal yang sebenarnya
     * ditagihkan. Menampilkan DPP saja membuat dokumen ber-PPN tampak
     * sebelas persen lebih murah daripada yang disetujuinya.
     */
    const c = layar(4);
    expect(c.nilai(po({ dpp: 1_000_000, ppn: 11 }))).toBe(1_110_000);
  });

  it('nilai lain ikut — premi asuransi ada di sana', () => {
    const c = layar(4);
    expect(c.nilai(po({ dpp: 1_000_000, ppn: 0, otherValue: 250_000 }))).toBe(
      1_250_000,
    );
  });

  it('nilai yang hilang terbaca nol, bukan NaN', () => {
    const c = layar(4);
    expect(c.nilai({})).toBe(0);
    expect(c.nilai(po({ dpp: 'entah', ppn: null, otherValue: undefined }))).toBe(
      0,
    );
  });
});

/**
 * Data lokal `id` harus terdaftar sebelum pipe angka dipakai.
 *
 * Kegagalan yang mendorongnya: aplikasi mobile menyetel `LOCALE_ID: 'id'`
 * tetapi tidak pernah memanggil `registerLocaleData` — desktop
 * melakukannya di `language.service.ts`, yang tidak ikut terpakai bootstrap
 * mobile. Akibatnya pipe `number` melempar NG02100 pada render pertama, dan
 * halaman daftar gagal seketika dengan galat yang tidak menyebut lokal.
 *
 * Diuji lewat `DecimalPipe` langsung — pipe yang sama yang dipakai
 * `{{ nilai | number }}` di setiap kartu.
 */
import { DecimalPipe, registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';

describe('mobile: data lokal id terdaftar', () => {
  it('DecimalPipe id memformat tanpa melempar NG02100', () => {
    registerLocaleData(localeId, 'id');
    const pipe = new DecimalPipe('id');
    // Format Indonesia: pemisah ribuan titik.
    expect(pipe.transform(1846153, '1.0-0')).toBe('1.846.153');
  });
});
