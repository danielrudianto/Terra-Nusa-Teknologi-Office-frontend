/**
 * Menandai purchase order "sudah diperiksa".
 *
 * Bentuk sebelumnya membuka dialog TERSENDIRI berisi PDF hasil rakitan. Dua
 * hal salah di sana sekaligus, dan yang kedua baru terlihat di tangan
 * pengguna:
 *
 *   1. Penampil PDF-nya melaporkan NOL halaman — "sisa 0 dari 0" — sehingga
 *      syarat "gulir sampai halaman terakhir" tidak akan pernah terpenuhi.
 *      Tombolnya tidak pernah hidup, dan pemeriksaan berhenti total. Dari
 *      layar, hal itu tampak seperti tombol yang rusak, bukan seperti syarat
 *      yang belum dipenuhi.
 *
 *   2. Yang dibaca pemeriksa menjadi berkas LAIN daripada yang dilihat semua
 *      orang sehari-hari. Dua tampilan atas dokumen yang sama adalah dua
 *      tempat yang harus selalu sepakat — dan yang tertinggal saat salah
 *      satunya berubah tidak menimbulkan galat apa pun.
 *
 * Sekarang pemeriksaan memakai dialog tampilan yang SAMA, pada mode
 * `periksa`. Yang dijaga di sini aturan tombolnya; kesamaan isi layar dengan
 * kertas dijaga `scripts/pemeriksa/pratinjaucek.py`.
 */

import { PurchaseOrderViewComponent } from './purchase-order-view/purchase-order-view.component';

/** Berapa detik pemeriksa ditahan sebelum boleh mencentang. */
const JEDA_PERIKSA_DETIK = 3;

/**
 * Dirakit dari prototipenya; isian kelasnya dipasang sendiri.
 *
 * Membuat komponennya utuh menuntut dialog, rute, dan API yang tidak satu pun
 * ikut menentukan aturan ini.
 */
function periksa(ubah: Record<string, any> = {}): any {
  const c: any = Object.create(PurchaseOrderViewComponent.prototype);
  c.input = { id: 7, periksa: true };
  c.data = { id: 7, name: '077-PO-R35CH-G' };
  c.sisaDetik = JEDA_PERIKSA_DETIK;
  c.dibaca = false;
  c.sudahSampaiBawah = true;
  c.sisaGulir = 0;
  c.ditutupDengan = undefined;
  c.dialogRef = { close: (v: any) => (c.ditutupDengan = v) };
  Object.assign(c, ubah);
  return c;
}

/** Isi dialog beserta ukurannya. */
function wadah(scrollHeight: number, clientHeight: number, scrollTop = 0): any {
  return { scrollHeight, clientHeight, scrollTop };
}

describe('mode pemeriksaan', () => {
  it('berlaku pada dokumen tersimpan, bukan pratinjau', () => {
    expect(periksa().modePeriksa).toBeTrue();
  });

  it('pratinjau TIDAK pernah menjadi mode pemeriksaan', () => {
    /*
     * Pratinjau menampilkan dokumen yang belum tersimpan; tidak ada apa pun
     * yang dapat ditandai sudah diperiksa.
     */
    const c = periksa({ input: { data: { id: 1 }, periksa: true } });
    expect(c.modePeriksa).toBeFalse();
  });

  it('dialog biasa tidak menahan siapa pun', () => {
    expect(periksa({ input: { id: 7 } }).modePeriksa).toBeFalse();
  });
});

describe('syarat menandai sudah diperiksa', () => {
  it('ketiganya harus benar sekaligus', () => {
    const c = periksa({ sisaDetik: 0, sudahSampaiBawah: true, dibaca: true });
    expect(c.bolehTandaiPeriksa).toBeTrue();
  });

  it('waktu tunggu belum habis: belum boleh', () => {
    // Menahan klik refleks. Tanpa jeda, "sudah membaca" dapat dicentang
    // dalam waktu yang tidak cukup untuk membaca apa pun.
    const c = periksa({ sisaDetik: 2, sudahSampaiBawah: true, dibaca: true });
    expect(c.bolehTandaiPeriksa).toBeFalse();
  });

  it('belum tergulir sampai bawah: belum boleh', () => {
    const c = periksa({ sisaDetik: 0, sudahSampaiBawah: false, dibaca: true });
    expect(c.bolehTandaiPeriksa).toBeFalse();
  });

  it('belum dicentang: belum boleh', () => {
    const c = periksa({ sisaDetik: 0, sudahSampaiBawah: true, dibaca: false });
    expect(c.bolehTandaiPeriksa).toBeFalse();
  });
});

describe('gulir sampai bawah', () => {
  it('dokumen PENDEK dianggap sudah terbaca', () => {
    /*
     * Inilah yang rusak pada bentuk sebelumnya, dengan sebab yang berbeda:
     * syarat yang tidak mungkin dipenuhi menghalangi pemeriksaan alih-alih
     * menjaganya. Dokumen yang tidak dapat digulir sama sekali sudah
     * terlihat seluruhnya.
     */
    const c = periksa();
    c.hitungGulir(wadah(400, 400));
    expect(c.sudahSampaiBawah).toBeTrue();
  });

  it('dokumen panjang belum dianggap terbaca sebelum digulir', () => {
    const c = periksa();
    c.hitungGulir(wadah(2000, 400));
    expect(c.sudahSampaiBawah).toBeFalse();
  });

  it('tergulir sampai bawah menyalakannya', () => {
    const c = periksa();
    c.hitungGulir(wadah(2000, 400));
    c.padaGulir(wadah(2000, 400, 1600));
    expect(c.sudahSampaiBawah).toBeTrue();
  });

  it('tergulir separuh belum cukup', () => {
    const c = periksa();
    c.hitungGulir(wadah(2000, 400));
    c.padaGulir(wadah(2000, 400, 800));
    expect(c.sudahSampaiBawah).toBeFalse();
    expect(c.sisaGulir).toBe(800);
  });

  it('kurang beberapa piksel tetap dihitung sampai bawah', () => {
    /*
     * `scrollHeight` dan `clientHeight` tidak pernah persis sama pada zoom
     * peramban selain 100%. Perbandingan tepat membuat sebagian orang tidak
     * pernah dianggap sampai bawah — tanpa sebab yang terlihat dari layar.
     */
    const c = periksa();
    c.hitungGulir(wadah(2000, 400));
    c.padaGulir(wadah(2000, 400, 1590));
    expect(c.sudahSampaiBawah).toBeTrue();
  });

  it('sekali sampai bawah tetap dihitung walau digulir naik lagi', () => {
    // Yang dijaga adalah "halamannya pernah dilewati", bukan posisi
    // gulirnya saat tombol ditekan.
    const c = periksa();
    c.hitungGulir(wadah(2000, 400));
    c.padaGulir(wadah(2000, 400, 1600));
    c.padaGulir(wadah(2000, 400, 0));
    expect(c.sudahSampaiBawah).toBeTrue();
  });

  it('wadah yang belum ada tidak mengubah apa pun', () => {
    const c = periksa({ sudahSampaiBawah: false });
    c.padaGulir(null);
    c.hitungGulir(null);
    expect(c.sudahSampaiBawah).toBeFalse();
  });
});

describe('menandai', () => {
  it('menutup dialog dengan true', () => {
    const c = periksa({ sisaDetik: 0, dibaca: true });
    c.konfirmasiPeriksa();
    expect(c.ditutupDengan).toBeTrue();
  });

  it('DITOLAK di dalam fungsinya, bukan hanya oleh tombol yang mati', () => {
    /*
     * Keadaan tombol bukan tempat menaruh aturan: ia dapat ditekan lewat
     * papan ketik, dan `disabled` dapat dilepas dari peramban.
     */
    const c = periksa({ sisaDetik: 3, dibaca: true });
    c.konfirmasiPeriksa();
    expect(c.ditutupDengan).toBeUndefined();
  });

  it('tanpa centang tidak menutup apa pun', () => {
    const c = periksa({ sisaDetik: 0, dibaca: false });
    c.konfirmasiPeriksa();
    expect(c.ditutupDengan).toBeUndefined();
  });
});

describe('adendum diberi peringatan', () => {
  it('disebut ketika dokumennya adendum', () => {
    /*
     * Adendum memuat SELISIH. Dibaca sendirian, volume di dalamnya tidak
     * menyatakan yang berlaku — dan pemeriksa yang menilai angkanya tanpa
     * membuka induknya menyetujui sesuatu yang belum utuh.
     */
    const c = periksa({ data: { id: 7, parentPurchaseOrderID: 3 } });
    expect(c.adendumSelisih).toBeTrue();
  });

  it('tidak disebut pada dokumen biasa', () => {
    expect(periksa().adendumSelisih).toBeFalse();
  });

  it('tidak disebut di luar mode pemeriksaan', () => {
    const c = periksa({
      input: { id: 7 },
      data: { id: 7, parentPurchaseOrderID: 3 },
    });
    expect(c.adendumSelisih).toBeFalse();
  });
});
