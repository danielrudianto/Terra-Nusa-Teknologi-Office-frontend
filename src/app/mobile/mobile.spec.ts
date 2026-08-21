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

/**
 * Persetujuan terkunci sampai klausulnya ditandai dibaca.
 *
 * Ini yang membedakan "menyetujui" dari "menekan tombol": tombol setuju baru
 * hidup setelah `sudahBaca`, dan `sudahBaca` hanya benar setelah klausulnya
 * termuat lalu ditandai — atau ketika dokumennya memang tak punya klausul.
 */
describe('mobile: persetujuan menunggu klausul dibaca', () => {
  function layarPo(over: Record<string, unknown> = {}): any {
    const c: any = Object.create(PersetujuanPoComponent.prototype);
    c.akun = { userId: 7, user: { id: 7, authenticationLevel: 4 } };
    c.izin = { level: () => 4 };
    c.klausul = [{ items: ['Butir 1'] }];
    c.sudahBaca = false;
    c.memuatRincian = false;
    Object.assign(c, over);
    return c;
  }

  const poOrangLain = { id: 1, name: 'x', createdBy: 9, checkedBy: 9 };

  it('tombol setuju mati sebelum klausul ditandai dibaca', () => {
    const c = layarPo({ sudahBaca: false });
    expect(c.bolehTekanSetuju(poOrangLain)).toBeFalse();
  });

  it('hidup setelah ditandai dibaca', () => {
    const c = layarPo({ sudahBaca: false });
    c.tandaiBaca(true);
    expect(c.sudahBaca).toBeTrue();
    expect(c.bolehTekanSetuju(poOrangLain)).toBeTrue();
  });

  it('tetap mati selama rincian masih dimuat', () => {
    const c = layarPo({ sudahBaca: true, memuatRincian: true });
    expect(c.bolehTekanSetuju(poOrangLain)).toBeFalse();
  });

  it('setujui tidak mengirim apa-apa bila belum dibaca', () => {
    let dikirim = false;
    const c = layarPo({ sudahBaca: false });
    c.kirimStatus = () => (dikirim = true);
    c.setujui(poOrangLain);
    expect(dikirim).toBeFalse();
  });

  it('ikon SPK berbeda dari PO', () => {
    const c = layarPo();
    expect(c.ikon({ name: '082-SPK-MICZ-A' })).toBe('engineering');
    expect(c.ikon({ name: '086-PO-R501-G' })).toBe('inventory_2');
  });
});

describe('mobile: daftar barang PO dapat dibuka', () => {
  function layar(items: any[]): any {
    const c: any = Object.create(PersetujuanPoComponent.prototype);
    c.dipilih = { purchaseType: 'G', items };
    return c;
  }

  it('memetakan baris memakai barisTampil bersama', () => {
    const c = layar([
      { quantity: 200, unit: 'sak', price: 62500, item_description: 'Semen' },
    ]);
    expect(c.jumlahBarang).toBe(1);
    const b = c.barang[0];
    expect(b.judul).toContain('Semen');
    expect(b.qty).toBe('200 sak');
    expect(b.nilai).toBe(200 * 62500);
  });

  it('menghormati jumlah tertulis pada baris', () => {
    // Baris dengan `amount` (pembetulan pembulatan) memakai angka itu, bukan
    // volume kali harga — sama dengan seluruh aplikasi.
    const c = layar([{ quantity: 7000, price: 42.8571, amount: 300000, item_description: 'Solar' }]);
    expect(c.barang[0].nilai).toBe(300000);
  });

  it('tanpa barang, jumlahnya nol', () => {
    const c = layar([]);
    expect(c.jumlahBarang).toBe(0);
    expect(c.barang).toEqual([]);
  });
});
