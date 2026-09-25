/**
 * IZIN DI APLIKASI PONSEL — YANG DITAMPILKAN HARUS SEPAKAT DENGAN SERVER.
 *
 * Tiga hal yang diuji di sini, semuanya pernah salah dan tidak satu pun
 * menghasilkan galat:
 *
 * 1. ANTREAN PERSETUJUAN PO SELALU KOSONG. Layarnya mengirim
 *    `status: 'draft'` DAN `checked: true` sekaligus, dan keduanya menambah
 *    syarat ke daftar WHERE yang sama di server: `isChecked = 0 AND
 *    isChecked = 1`. Nol baris, selamanya — dan terbaca sebagai "tidak ada
 *    yang menunggu", bukan sebagai penyaring yang keliru.
 *
 * 2. TOMBOL TOLAK SELALU 422. Parameternya bertipe enum
 *    `PurchaseOrderStatus` = draft | approved | completed | cancelled.
 *    `'rejected'` ditolak FastAPI di pintu, sebelum satu baris logika jalan.
 *
 * 3. PERSETUJUAN CoP TANPA PEMERIKSAAN IZIN. Matriks memberi
 *    `certificate_of_payment:approve` mulai level 3; server meminta level 4
 *    (`boleh_menyetujui_bap_cop`). Selisih satu tingkat, dan tepat mengenai
 *    manajer level 3: tombolnya hidup di setiap baris, dan setiap baris 403.
 */

import {
  LEVEL_COP_SETUJU,
  bolehMembuatBapMobile,
  bolehMenyetujuiCop,
} from './penjaga-level';
import { PoDaftarComponent } from './po-daftar/po-daftar.component';
import { PersetujuanCopComponent } from './persetujuan-cop/persetujuan-cop.component';
import { PersetujuanReimbursementComponent } from './persetujuan-reimbursement/persetujuan-reimbursement.component';

function izinPalsu(over: Partial<{
  level: number;
  can: (m: string, a: string) => boolean;
  departments: string[];
}> = {}): any {
  const level = over.level ?? 3;
  const divisi = over.departments ?? [];
  return {
    level: () => level,
    inDepartment: (d: string) => divisi.includes(d),
    can: over.can ?? (() => true),
  };
}

// ---------------------------------------------------------------------------
describe('HP — antrean purchase order', () => {
  function layar(mode: 'periksa' | 'setujui'): any {
    const c: any = Object.create(PoDaftarComponent.prototype);
    c.mode = mode;
    c.page = 1;
    c.pageSize = 20;
    c.habis = false;
    c.sedangSegar = false;
    c.sedangMemuat = false;
    c.sedangMuatLagi = false;
    c.daftar = [];
    c.cariCtrl = { value: '' };
    return c;
  }

  function tangkapParam(mode: 'periksa' | 'setujui'): any {
    const c = layar(mode);
    let param: any = null;
    c.api = {
      get: (_jalur: string, p: any) => {
        param = p;
        // `muat()` merantai `.add(...)` pada langganannya; tiruan yang
        // mengembalikan undefined melempar sebelum assert mana pun jalan.
        return { subscribe: () => ({ add: () => {} }) };
      },
    };
    c.muat(true);
    return param;
  }

  it('mode periksa meminta draft', () => {
    expect(tangkapParam('periksa').status).toBe('draft');
  });

  it('mode setujui meminta checked — BUKAN draft', () => {
    expect(tangkapParam('setujui').status).toBe('checked');
  });

  it('`checked` tidak dikirim sama sekali — inilah yang mengosongkan antrean', () => {
    for (const mode of ['periksa', 'setujui'] as const) {
      const p = tangkapParam(mode);
      expect(p.checked)
        .withContext(`mode ${mode} tidak boleh mengirim checked`)
        .toBeUndefined();
    }
  });

  it('kedua mode tidak pernah meminta dua tahap sekaligus', () => {
    // Penjaga atas kekeliruan yang sama dalam bentuk lain: apa pun yang
    // dikirim, tidak boleh ada dua penyaring tahap dalam satu permintaan.
    for (const mode of ['periksa', 'setujui'] as const) {
      const p = tangkapParam(mode);
      const tahap = ['status', 'checked'].filter((k) => p[k] !== undefined);
      expect(tahap.length).withContext(`mode ${mode}`).toBe(1);
    }
  });
});

describe('HP — tolak purchase order', () => {
  /** Nilai yang sah menurut `schemas/purchase_order_schema.py`. */
  const STATUS_SAH = ['draft', 'approved', 'completed', 'cancelled'];

  function layar(): { c: any; terkirim: string[] } {
    const terkirim: string[] = [];
    const c: any = Object.create(PoDaftarComponent.prototype);
    c.mode = 'setujui';
    c.translate = { instant: () => '' };
    c.kirim = () => {};
    c.api = {
      patch: (jalur: string) => {
        terkirim.push(jalur);
        return { subscribe: () => ({ add: () => {} }) };
      },
    };
    return { c, terkirim };
  }

  it('mengirim cancelled, bukan rejected', () => {
    const { c, terkirim } = layar();
    c.tolak({ id: 12, name: '062-PO' });
    expect(terkirim.length).toBe(1);
    expect(terkirim[0]).toContain('status=cancelled');
    expect(terkirim[0]).not.toContain('rejected');
  });

  it('nilainya ada di dalam enum server', () => {
    const { c, terkirim } = layar();
    c.tolak({ id: 12, name: '062-PO' });
    const nilai = terkirim[0].split('status=')[1];
    expect(STATUS_SAH).toContain(nilai);
  });

  it('setujui tetap mengirim approved', () => {
    const { c, terkirim } = layar();
    c.bolehTekanTindak = () => true;
    c.tindak({ id: 12, name: '062-PO' });
    expect(terkirim[0]).toContain('status=approved');
  });
});

// ---------------------------------------------------------------------------
describe('HP — wewenang menyetujui CoP', () => {
  function layar(izin: any): any {
    const c: any = Object.create(PersetujuanCopComponent.prototype);
    c.izin = izin;
    return c;
  }

  it('level 3 dengan izin approve TETAP tidak boleh — server minta 4', () => {
    expect(layar(izinPalsu({ level: 3 })).bolehSetujui).toBeFalse();
  });

  it('level 4 boleh', () => {
    expect(layar(izinPalsu({ level: 4 })).bolehSetujui).toBeTrue();
  });

  it('level 5 boleh', () => {
    expect(layar(izinPalsu({ level: 5 })).bolehSetujui).toBeTrue();
  });

  it('level cukup tetapi izinnya dicabut (akun hanya-baca) tidak boleh', () => {
    const izin = izinPalsu({ level: 5, can: () => false });
    expect(layar(izin).bolehSetujui).toBeFalse();
  });

  it('helpernya satu tempat — layar dan tab memakai fungsi yang sama', () => {
    const izin = izinPalsu({ level: 3 });
    expect(layar(izin).bolehSetujui).toBe(bolehMenyetujuiCop(izin));
  });

  it('angka levelnya sepadan dengan server: 4', () => {
    // Dibaca dari `penjaga-level`, bukan dari instance: `Object.create`
    // tidak menjalankan field initialiser, jadi `LEVEL_SETUJU` pada
    // instance tiruan memang tidak ada.
    expect(LEVEL_COP_SETUJU).toBe(4);
  });
});

// ---------------------------------------------------------------------------
describe('HP — wewenang membuat berita acara', () => {
  it('engineering level 1 boleh — layar ini memang untuk lapangan', () => {
    expect(
      bolehMembuatBapMobile(izinPalsu({ level: 1, departments: ['engineering'] })),
    ).toBeTrue();
  });

  it('level 4 boleh tanpa memandang divisi', () => {
    expect(bolehMembuatBapMobile(izinPalsu({ level: 4 }))).toBeTrue();
  });

  it('level 1 TANPA divisi tidak boleh — `can()` sendiri melewatkannya', () => {
    // Di server, pemeriksaan divisi di dalam `is_allowed` dilewati ketika
    // daftar divisi penggunanya kosong; `boleh_membuat_cop` yang menolak.
    // Tanpa baris ini layarnya terbuka, volumenya diketik, lalu 403.
    expect(bolehMembuatBapMobile(izinPalsu({ level: 1 }))).toBeFalse();
  });

  it('procurement level 3 tidak boleh', () => {
    expect(
      bolehMembuatBapMobile(izinPalsu({ level: 3, departments: ['procurement'] })),
    ).toBeFalse();
  });

  it('tanpa izin create, divisi apa pun tidak menolong', () => {
    expect(
      bolehMembuatBapMobile(
        izinPalsu({ level: 5, departments: ['engineering'], can: () => false }),
      ),
    ).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
describe('HP — wewenang memutuskan reimbursement', () => {
  const SAYA = 7;

  function layar(izin: any): any {
    const c: any = Object.create(PersetujuanReimbursementComponent.prototype);
    c.izin = izin;
    c.akun = { userId: SAYA };
    return c;
  }

  function ajuan(over: Record<string, unknown> = {}): any {
    return { id: 1, createdBy: 99, isApprove: 0, ...over };
  }

  it('tanpa izin approve, dua-duanya tidak ditawarkan', () => {
    const c = layar(izinPalsu({ level: 5, can: () => false }));
    expect(c.bolehSetujui(ajuan())).toBeFalse();
    expect(c.bolehTolak(ajuan())).toBeFalse();
  });

  it('dengan izin approve, keduanya ditawarkan', () => {
    const c = layar(izinPalsu({ level: 3 }));
    expect(c.bolehSetujui(ajuan())).toBeTrue();
    expect(c.bolehTolak(ajuan())).toBeTrue();
  });

  it('ajuan sendiri tidak boleh DISETUJUI', () => {
    const c = layar(izinPalsu({ level: 3 }));
    expect(c.bolehSetujui(ajuan({ createdBy: SAYA }))).toBeFalse();
  });

  it('ajuan sendiri tetap boleh DITARIK (ditolak)', () => {
    const c = layar(izinPalsu({ level: 3 }));
    expect(c.bolehTolak(ajuan({ createdBy: SAYA }))).toBeTrue();
  });

  it('yang SUDAH disetujui tidak boleh ditolak lagi', () => {
    // Server tidak menahannya: `reject_reimbursement` hanya memeriksa
    // `isDelete`. Satu ketukan mencabut persetujuan yang sudah dibayarkan.
    const c = layar(izinPalsu({ level: 5 }));
    expect(c.bolehTolak(ajuan({ isApprove: 1 }))).toBeFalse();
    expect(c.bolehSetujui(ajuan({ isApprove: 1 }))).toBeFalse();
  });

  it('`tolak()` tetap menolak walau tombolnya dipaksa', () => {
    let dipanggil = 0;
    const c = layar(izinPalsu({ level: 5 }));
    c.kirim = () => { dipanggil++; };
    c.tolak(ajuan({ isApprove: 1 }));
    expect(dipanggil).toBe(0);
  });

  it('`setujui()` tetap menolak ajuan sendiri walau dipaksa', () => {
    let dipanggil = 0;
    const c = layar(izinPalsu({ level: 5 }));
    c.kirim = () => { dipanggil++; };
    c.setujui(ajuan({ createdBy: SAYA }));
    expect(dipanggil).toBe(0);
  });
});
