/**
 * PERSETUJUAN PEMBAYARAN DARI PONSEL — YANG DIJAGA ANGKANYA, BUKAN LAYARNYA.
 *
 * Ini satu-satunya tahap di seluruh alur yang benar-benar MEMINDAHKAN UANG.
 * Semua yang sebelumnya menghasilkan dokumen; yang ini menghasilkan transfer.
 *
 * Tidak ada satu pun aturan BARU di layar ini — seluruhnya cerminan yang
 * sudah berlaku di server:
 *
 *   * `payment_outgoing:approve` menentukan siapa yang boleh memutuskan;
 *   * pembuatnya sendiri tidak boleh MENYETUJUI, kecuali pemilik usaha
 *     (`LEVEL_BOLEH_SETUJU_SENDIRI = 5` di `utils/permission.py`);
 *   * yang sudah disetujui atau sudah dihapus ditolak 400.
 *
 * Yang diuji karena itu kesepakatannya: tombol yang muncul harus tombol yang
 * akan diterima server, dan yang tidak akan diterima tidak boleh disodorkan.
 * Penolakan sesudah ditekan terbaca sebagai kerusakan, bukan sebagai aturan.
 */

import { tanggalLokalTeks } from '../../utils/tanggal';
import { PersetujuanPembayaranComponent } from './persetujuan-pembayaran.component';

const SAYA = 7;
const ORANG_LAIN = 9;

function layar(over: {
  level?: number;
  bolehApprove?: boolean;
  userId?: number | null;
} = {}): any {
  const c: any = Object.create(PersetujuanPembayaranComponent.prototype);
  c.akun = { userId: over.userId === undefined ? SAYA : over.userId };
  c.izin = {
    level: () => over.level ?? 3,
    can: () => over.bolehApprove ?? true,
    inDepartment: () => true,
  };
  return c;
}

function bayar(over: Record<string, unknown> = {}): any {
  return {
    id: 1,
    createdBy: ORANG_LAIN,
    isApprove: false,
    isDelete: false,
    amount: 12_500_000,
    date: '2026-09-25',
    ...over,
  };
}

describe('HP — persetujuan pembayaran: wewenang', () => {
  it('tanpa izin approve, dua-duanya tidak ditawarkan', () => {
    const c = layar({ bolehApprove: false, level: 5 });
    expect(c.bolehSetujui(bayar())).toBeFalse();
    expect(c.bolehTolak(bayar())).toBeFalse();
  });

  it('dengan izin approve, keduanya ditawarkan', () => {
    const c = layar();
    expect(c.bolehSetujui(bayar())).toBeTrue();
    expect(c.bolehTolak(bayar())).toBeTrue();
  });

  it('buatan sendiri TIDAK boleh disetujui di bawah level 5', () => {
    for (const lv of [1, 2, 3, 4]) {
      const c = layar({ level: lv });
      expect(c.bolehSetujui(bayar({ createdBy: SAYA })))
        .withContext(`level ${lv}`)
        .toBeFalse();
    }
  });

  it('pemilik usaha boleh menyetujui buatannya sendiri', () => {
    const c = layar({ level: 5 });
    expect(c.bolehSetujui(bayar({ createdBy: SAYA }))).toBeTrue();
  });

  it('buatan sendiri tetap boleh DITARIK (ditolak)', () => {
    // Menarik kembali pembayaran yang disiapkannya sendiri tidak
    // memindahkan uang kepada siapa pun.
    const c = layar({ level: 3 });
    expect(c.bolehTolak(bayar({ createdBy: SAYA }))).toBeTrue();
  });

  it('tanpa id pengguna, jangan dianggap buatan sendiri', () => {
    // Server tetap menolak bila ternyata iya, dan pesannya lebih jelas
    // daripada tombol yang mati tanpa sebab.
    const c = layar({ userId: null, level: 3 });
    expect(c.buatanSendiri(bayar({ createdBy: SAYA }))).toBeFalse();
  });

  it('yang SUDAH disetujui tidak dapat diputuskan lagi', () => {
    const c = layar({ level: 5 });
    expect(c.bolehSetujui(bayar({ isApprove: true }))).toBeFalse();
    expect(c.bolehTolak(bayar({ isApprove: true }))).toBeFalse();
  });

  it('yang SUDAH dihapus tidak dapat diputuskan lagi', () => {
    const c = layar({ level: 5 });
    expect(c.bolehSetujui(bayar({ isDelete: true }))).toBeFalse();
    expect(c.bolehTolak(bayar({ isDelete: true }))).toBeFalse();
  });
});

describe('HP — persetujuan pembayaran: tindakan', () => {
  function siap(over = {}): { c: any; kirim: any[] } {
    const kirim: any[] = [];
    const c = layar(over);
    c.sudahBaca = true;
    c.api = {
      put: (jalur: string) => {
        kirim.push(jalur);
        return { subscribe: () => ({ add: () => {} }) };
      },
    };
    c.snackBar = { open: () => {} };
    c.translate = { instant: () => '' };
    c.pesanServer = { terjemahkan: () => '' };
    c.daftar = [];
    return { c, kirim };
  }

  it('setujui memanggil jalur approve', () => {
    const { c, kirim } = siap();
    c.setujui(bayar());
    expect(kirim).toEqual(['outgoing-payments/approve/1']);
  });

  it('tolak memanggil jalur reject', () => {
    const { c, kirim } = siap();
    c.tolak(bayar());
    expect(kirim).toEqual(['outgoing-payments/reject/1']);
  });

  it('TANPA centang "sudah baca", setujui tidak mengirim apa pun', () => {
    // Penghenti langkah, bukan pengaman — tetapi tetap harus benar-benar
    // menahan, bukan sekadar mematikan tombolnya di template.
    const { c, kirim } = siap();
    c.sudahBaca = false;
    c.setujui(bayar());
    expect(kirim).toEqual([]);
  });

  it('setujui buatan sendiri tidak mengirim apa pun walau dipaksa', () => {
    const { c, kirim } = siap({ level: 4 });
    c.setujui(bayar({ createdBy: SAYA }));
    expect(kirim).toEqual([]);
  });

  it('menolak yang sudah disetujui tidak mengirim apa pun', () => {
    const { c, kirim } = siap({ level: 5 });
    c.tolak(bayar({ isApprove: true }));
    expect(kirim).toEqual([]);
  });
});

describe('HP — persetujuan pembayaran: jangkauan tanggal', () => {
  function rentang(j: string): any {
    const c = layar();
    c.jangkauan = j;
    return c.rentang();
  }

  // Penolong yang SAMA dengan komponennya. `toISOString()` memberi UTC,
  // dan pengujian yang lulus di UTC akan gagal di WIB pada jam tertentu —
  // kegagalan yang muncul dan hilang menurut jam dinding.
  const HARI_INI = tanggalLokalTeks(new Date());

  it('hari ini menyaring satu hari saja', () => {
    expect(rentang('hari-ini')).toEqual({
      dateFrom: HARI_INI,
      dateTo: HARI_INI,
    });
  });

  it('jatuh tempo TIDAK memakai dateFrom', () => {
    // Yang tanggalnya sudah lewat dan belum diputuskan justru yang paling
    // sering terlupa; `dateFrom` akan membuangnya.
    const r = rentang('jatuh-tempo');
    expect(r.dateFrom).toBeUndefined();
    expect(r.dateTo).toBe(HARI_INI);
  });

  it('semua tidak menyaring tanggal sama sekali', () => {
    expect(rentang('semua')).toEqual({});
  });

  it('permintaannya selalu isPending, apa pun jangkauannya', () => {
    for (const j of ['hari-ini', 'jatuh-tempo', 'semua']) {
      const c = layar();
      c.jangkauan = j;
      c.page = 1;
      c.pageSize = 20;
      c.habis = false;
      c.sedangSegar = false;
      c.sedangMemuat = false;
      c.sedangMuatLagi = false;
      c.daftar = [];
      c.cariCtrl = { value: '' };
      let param: any = null;
      c.api = {
        get: (_j: string, p: any) => {
          param = p;
          return { subscribe: () => ({ add: () => {} }) };
        },
      };
      c.muat(true);
      expect(param.isPending).withContext(j).toBeTrue();
    }
  });
});

describe('HP — persetujuan pembayaran: tampilan', () => {
  it('tanggal yang sudah lewat ditandai terlambat', () => {
    const c = layar();
    expect(c.terlambat(bayar({ date: '2020-01-01' }))).toBeTrue();
  });

  it('hari ini BUKAN terlambat', () => {
    const c = layar();
    const hariIni = tanggalLokalTeks(new Date());
    expect(c.terlambat(bayar({ date: hariIni }))).toBeFalse();
  });

  it('tanpa tanggal bukan terlambat', () => {
    const c = layar();
    expect(c.terlambat(bayar({ date: null }))).toBeFalse();
  });
});
