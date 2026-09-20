/*
 * TAHAP YANG SUDAH DILEWATI — apa yang dilakukan layar saat server menolak.
 *
 * Ditemukan di produksi: beberapa orang menekan "Periksa" pada purchase
 * order yang SUDAH diperiksa, berkali-kali, dan setiap kali berhasil.
 * Server sekarang menolaknya dengan 409.
 *
 * Tetapi menolak saja belum menyelesaikan apa yang dialami penggunanya.
 * Baris yang sama masih di layar, dengan menu yang sama, menawarkan
 * tindakan yang sama — karena daftar ini dimuat SEBELUM orang lain
 * memeriksa. Yang membaca penolakannya menekannya lagi, ditolak lagi, dan
 * penolakan kedua itu terbaca sebagai kerusakan.
 *
 * Jadi 409 harus IKUT memuat ulang daftarnya. Dan hanya 409: galat jaringan
 * atau 500 berarti keputusannya belum tercatat sama sekali, dan memuat
 * ulang di situ hanya menyembunyikan pekerjaan yang masih harus dikerjakan.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';
import { ServerMessageService } from '../../services/server-message.service';

function konteks() {
  const dicatat: { pesan: string[]; dimuat: number[] } = {
    pesan: [],
    dimuat: [],
  };
  const diri: any = {
    page: 3,
    snackBar: { open: (p: string) => dicatat.pesan.push(p) },
    serverMessage: { terjemahkan: (e: any) => e?.pesan ?? 'galat' },
    fetch: (h: number) => dicatat.dimuat.push(h),
  };
  return { diri, dicatat };
}

const galatTindakan = (diri: any, err: any) =>
  (PurchaseOrderListComponent.prototype as any).galatTindakan.call(diri, err);

describe('galatTindakan', () => {
  it('409 memuat ulang halaman yang sedang dibuka', () => {
    const { diri, dicatat } = konteks();

    galatTindakan(diri, { status: 409, pesan: 'sudah diperiksa oleh Budi' });

    expect(dicatat.dimuat).toEqual([3]);
  });

  it('409 tetap menampilkan pesannya, bukan hanya memuat ulang diam-diam', () => {
    /*
     * Daftar yang berubah sendiri tanpa sebab yang disebut membuat orang
     * mengira tekanannya berhasil.
     */
    const { diri, dicatat } = konteks();

    galatTindakan(diri, { status: 409, pesan: 'sudah diperiksa oleh Budi' });

    expect(dicatat.pesan).toEqual(['sudah diperiksa oleh Budi']);
  });

  it('500 TIDAK memuat ulang', () => {
    const { diri, dicatat } = konteks();

    galatTindakan(diri, { status: 500, pesan: 'galat server' });

    expect(dicatat.dimuat).toEqual([]);
    expect(dicatat.pesan.length).toBe(1);
  });

  it('galat tanpa status — jaringan putus — TIDAK memuat ulang', () => {
    const { diri, dicatat } = konteks();

    galatTindakan(diri, { pesan: 'jaringan' });

    expect(dicatat.dimuat).toEqual([]);
  });
});

/*
 * Pesan yang MENYEBUT NAMA pemeriksanya harus sampai ke layar.
 *
 * Jalur berkode di `ServerMessageService` dulu berhenti pada kalimat umum
 * bila kodenya belum punya terjemahan — sehingga galat BERKODE justru
 * dijawab lebih buruk daripada galat tanpa kode, yang kalimat Indonesianya
 * diteruskan apa adanya.
 *
 * Nama pemeriksanya tidak dapat ditulis sebagai kunci terjemahan tetap, dan
 * justru nama itu yang memberi tahu penggunanya harus menghubungi siapa.
 */
describe('ServerMessageService: kode tanpa terjemahan', () => {
  /*
   * Lewat TestBed, bukan `new`. Layanannya memakai `inject()` pada
   * penginisialisasi bidang, yang hanya sah di dalam konteks injeksi —
   * `new ServerMessageService()` gagal dengan NG0203.
   */
  function layanan(petaTerjemahan: Record<string, string> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslateService,
          useValue: { instant: (k: string) => petaTerjemahan[k] ?? k },
        },
      ],
    });
    return TestBed.inject(ServerMessageService);
  }

  afterEach(() => TestBed.resetTestingModule());

  const galat = (code: string, message: string) => ({
    status: 409,
    error: { detail: { code, message } },
  });

  it('meneruskan pesan Indonesia beserta nama pemeriksanya', () => {
    const s = layanan();

    const hasil = s.terjemahkan(
      galat(
        'PO_ALREADY_CHECKED',
        'Purchase order ini sudah diperiksa oleh Budi Santoso. Muat ulang daftarnya.',
      ),
    );

    expect(hasil).toContain('Budi Santoso');
  });

  it('terjemahan yang ADA tetap menang atas pesan server', () => {
    /*
     * Jalur baru ini tambahan, bukan pengganti. Kode yang sudah punya
     * kalimat Indonesianya sendiri harus tetap memakai kalimat itu.
     */
    const s = layanan({
      'serverError.PO_EDIT_FORBIDDEN': 'Kalimat dari berkas terjemahan.',
    });

    const hasil = s.terjemahkan(
      galat('PO_EDIT_FORBIDDEN', 'Kalimat mentah dari server.'),
    );

    expect(hasil).toBe('Kalimat dari berkas terjemahan.');
  });

  it('pesan berbahasa Inggris TIDAK diteruskan mentah', () => {
    /*
     * Sebab jalur berkode itu ada sejak awal: layar tidak boleh mendadak
     * berbahasa lain tepat saat penggunanya sedang menghadapi persoalan.
     */
    const s = layanan();

    const hasil = s.terjemahkan(
      galat('SOMETHING_NEW', 'Internal server error occurred.'),
    );

    expect(hasil).not.toContain('Internal server error occurred');
  });
});
