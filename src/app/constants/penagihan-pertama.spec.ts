/**
 * Ayat penahan penagihan pertama pada SPK pekerjaan (PO-H).
 *
 * Bunyinya: "Penagihan pertama dapat dilakukan setelah N (terbilang) hari
 * sejak pekerjaan dimulai".
 *
 * Ia BUKAN pengganti siklus penagihan melainkan syarat tambahan di atasnya:
 * siklusnya tetap cutoff atau periode pekan, hanya tagihan pertama yang
 * ditahan. Karena itu ia tercetak sebagai ayat PERTAMA — syarat yang
 * membatasi seluruh ayat sesudahnya harus terbaca lebih dulu.
 *
 * NOL berarti tidak ada penahanan, dan ayatnya tidak boleh muncul sama
 * sekali: "setelah 0 (nol) hari" adalah ketentuan yang tidak mengatur apa
 * pun, dan pembacanya berhenti untuk memikirkan artinya.
 *
 * Diuji lewat penyusun klausulnya, bukan lewat PDF-nya: yang menentukan
 * benar-tidaknya ada atau tidaknya ayat itu dan urutannya, bukan cara
 * pdfmake menggambarnya.
 */

import {
  buildGroutingClauses,
  buildMandorClauses,
  terbilang,
} from './clause-templates';

/** Konteks terkecil yang menghasilkan pasal TATA CARA PEMBAYARAN. */
function konteks(tambahan: Record<string, unknown> = {}): any {
  return {
    billingCycleMode: 'cutoff-tanggal',
    cutoffDays: [15, 30],
    billingTermDays: 14,
    ...tambahan,
  };
}

function pasalPembayaran(seksi: any[]): string[] {
  const p = seksi.find((s) => s.title === 'TATA CARA PEMBAYARAN');
  expect(p).withContext('pasal TATA CARA PEMBAYARAN harus ada').toBeTruthy();
  return p.items.filter((x: unknown) => typeof x === 'string');
}

const PENAHAN = /Penagihan pertama dapat dilakukan setelah/;

describe('ayat penahan penagihan pertama', () => {
  describe('SPK mandor', () => {
    it('tidak muncul bila tidak diisi', () => {
      const items = pasalPembayaran(buildMandorClauses(konteks(), 'mandor-besi'));
      expect(items.some((x) => PENAHAN.test(x))).toBeFalse();
    });

    it('tidak muncul bila NOL', () => {
      /*
       * Nol adalah nilai bawaannya, sehingga inilah keadaan yang berlaku
       * pada hampir seluruh dokumen. Ayat yang bocor di sini akan tercetak
       * pada setiap SPK mandor yang pernah dibuat.
       */
      const items = pasalPembayaran(
        buildMandorClauses(konteks({ firstBillingAfterDays: 0 }), 'mandor-besi'),
      );
      expect(items.some((x) => PENAHAN.test(x))).toBeFalse();
    });

    it('muncul bila diisi, lengkap dengan terbilangnya', () => {
      const items = pasalPembayaran(
        buildMandorClauses(konteks({ firstBillingAfterDays: 14 }), 'mandor-besi'),
      );
      expect(items[0]).toBe(
        'Penagihan pertama dapat dilakukan setelah 14 (empat belas) hari sejak pekerjaan dimulai;',
      );
    });

    it('menjadi ayat PERTAMA, bukan disisipkan di tengah', () => {
      // Ia membatasi seluruh ayat sesudahnya; dibaca belakangan, ayat-ayat
      // di atasnya terlanjur dipahami tanpa syarat itu.
      const items = pasalPembayaran(
        buildMandorClauses(konteks({ firstBillingAfterDays: 7 }), 'mandor-besi'),
      );
      expect(PENAHAN.test(items[0])).toBeTrue();
    });

    it('tidak menggeser satu pun ayat lain', () => {
      /*
       * Penjaga terhadap penyisipan yang menimpa. Ayat siklus penagihan dan
       * ketentuan bersamanya harus tetap utuh — yang bertambah persis satu.
       */
      const tanpa = pasalPembayaran(buildMandorClauses(konteks(), 'mandor-besi'));
      const dengan = pasalPembayaran(
        buildMandorClauses(konteks({ firstBillingAfterDays: 7 }), 'mandor-besi'),
      );
      expect(dengan.length).toBe(tanpa.length + 1);
      expect(dengan.slice(1)).toEqual(tanpa);
    });

    it('berlaku pada ketiga jenis mandor', () => {
      for (const jenis of ['mandor-besi', 'mandor-bor', 'mandor-cor']) {
        const items = pasalPembayaran(
          buildMandorClauses(konteks({ firstBillingAfterDays: 3 }), jenis),
        );
        expect(PENAHAN.test(items[0])).withContext(jenis).toBeTrue();
      }
    });
  });

  describe('SPK grouting', () => {
    it('tidak muncul bila NOL', () => {
      const items = pasalPembayaran(
        buildGroutingClauses(konteks({ firstBillingAfterDays: 0 })),
      );
      expect(items.some((x) => PENAHAN.test(x))).toBeFalse();
    });

    it('muncul sebagai ayat pertama bila diisi', () => {
      const items = pasalPembayaran(
        buildGroutingClauses(konteks({ firstBillingAfterDays: 30 })),
      );
      expect(items[0]).toBe(
        'Penagihan pertama dapat dilakukan setelah 30 (tiga puluh) hari sejak pekerjaan dimulai;',
      );
    });
  });

  describe('nilai yang tidak masuk akal', () => {
    it('teks kosong, bukan angka, dan negatif sama-sama berarti tanpa penahanan', () => {
      /*
       * Isian bertipe angka tetap dapat menyerahkan teks kosong, dan nilai
       * yang tersimpan dari dokumen lama bisa berupa apa saja. Yang tidak
       * dapat dibaca sebagai hari TIDAK boleh menghasilkan ayat berbunyi
       * "setelah NaN hari" pada lembar yang dipegang vendor.
       */
      for (const nilai of ['', null, undefined, 'entah', NaN, -5]) {
        const items = pasalPembayaran(
          buildMandorClauses(
            konteks({ firstBillingAfterDays: nilai }),
            'mandor-besi',
          ),
        );
        expect(items.some((x) => PENAHAN.test(x)))
          .withContext(String(nilai))
          .toBeFalse();
      }
    });

    it('angka berupa teks tetap dibaca', () => {
      // Isian formulir mengembalikan teks pada sebagian jalur penyuntingan.
      const items = pasalPembayaran(
        buildMandorClauses(konteks({ firstBillingAfterDays: '21' }), 'mandor-besi'),
      );
      expect(items[0]).toBe(
        'Penagihan pertama dapat dilakukan setelah 21 (dua puluh satu) hari sejak pekerjaan dimulai;',
      );
    });
  });
});

/**
 * Angka berhuruf pada klausul.
 *
 * Penulisan berhuruf ada justru untuk menutup ruang sengketa atas angkanya.
 * Bentuk lama hanya mengenal dua belas angka — 1 sampai 10, 14, dan 30 —
 * dan mengembalikan sisanya sebagai ANGKA, sehingga klausulnya tercetak
 * "dalam 21 (21) hari" pada dokumen yang ditandatangani.
 *
 * Diamnya yang membuatnya bertahan: 14 dan 30 justru yang paling sering
 * dipakai, sehingga dokumen contoh tidak pernah memperlihatkan bentuk yang
 * rusak.
 */
describe('angka berhuruf', () => {
  it('satuan', () => {
    expect(terbilang(0)).toBe('nol');
    expect(terbilang(1)).toBe('satu');
    expect(terbilang(9)).toBe('sembilan');
  });

  it('sepuluh, sebelas, dan belasan', () => {
    // "sebelas", bukan "satu belas" — bentuk lain tidak dipakai orang.
    expect(terbilang(10)).toBe('sepuluh');
    expect(terbilang(11)).toBe('sebelas');
    expect(terbilang(14)).toBe('empat belas');
    expect(terbilang(19)).toBe('sembilan belas');
  });

  it('puluhan', () => {
    expect(terbilang(20)).toBe('dua puluh');
    expect(terbilang(21)).toBe('dua puluh satu');
    expect(terbilang(30)).toBe('tiga puluh');
    expect(terbilang(45)).toBe('empat puluh lima');
    expect(terbilang(99)).toBe('sembilan puluh sembilan');
  });

  it('ratusan', () => {
    // "seratus", bukan "satu ratus".
    expect(terbilang(100)).toBe('seratus');
    expect(terbilang(101)).toBe('seratus satu');
    expect(terbilang(365)).toBe('tiga ratus enam puluh lima');
  });

  it('angka yang dulu SUDAH benar tetap sama', () => {
    /*
     * Penjaga terhadap kemunduran diam-diam. Bila bentuk barunya mengubah
     * bunyi 14 atau 30, seluruh dokumen yang sudah beredar tidak lagi sama
     * bunyinya dengan yang dicetak ulang — dan tidak ada yang
     * membandingkan keduanya.
     */
    expect(terbilang(14)).toBe('empat belas');
    expect(terbilang(30)).toBe('tiga puluh');
    expect(terbilang(7)).toBe('tujuh');
  });

  it('tidak pernah mengembalikan angka mentah untuk hari yang wajar', () => {
    // Inilah kekeliruan yang lama: "(21)" alih-alih "(dua puluh satu)".
    for (let n = 1; n <= 365; n++) {
      expect(terbilang(n))
        .withContext(String(n))
        .not.toMatch(/^\d+$/);
    }
  });
});
