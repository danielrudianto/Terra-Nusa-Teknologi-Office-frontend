/**
 * Berita acara di lapangan: yang dijaga bukan tampilannya, melainkan angkanya.
 *
 * EMPAT KEGAGALAN YANG TIDAK MENGHASILKAN GALAT
 *
 * 1. Koma sebagai pemisah desimal. Papan ketik angka di sebagian ponsel hanya
 *    menawarkan koma; `Number('1,5')` adalah `NaN`, dan `NaN` disaring oleh
 *    `quantity > 0` — sehingga barisnya DIAM-DIAM TIDAK IKUT TERSIMPAN.
 *    Yang mengisi melihat angkanya di layar, menekan simpan, dan berita
 *    acaranya terbit tanpa baris itu.
 *
 * 2. Baris kosong ikut terkirim sebagai nol. Berita acara dengan baris
 *    bervolume nol menyatakan "pekerjaan ini tidak berjalan periode ini" —
 *    berbeda artinya dari tidak menyebutkannya sama sekali.
 *
 * 3. Volume melebihi sisa pagu. Server menolaknya. Mengetahuinya SETELAH
 *    menekan simpan, di lapangan, berarti mengetik ulang seluruh isian.
 *
 * 4. Periode terbalik. Rentang yang akhirnya mendahului awalnya tetap
 *    tersimpan bila tidak diperiksa, dan yang membacanya di kantor tidak
 *    punya cara tahu mana yang benar.
 */

import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { CertificateOfPaymentService } from '../../services/certificate-of-payment.service';
import { ServerMessageService } from '../../services/server-message.service';
import { BapBuatComponent } from './bap-buat.component';

/** Muatan terakhir yang dikirim ke server. */
let terkirim: any;

function komponen(): any {
  terkirim = undefined;
  TestBed.configureTestingModule({
    providers: [
      {
        provide: CertificateOfPaymentService,
        useValue: {
          daftarSpk: () => ({ subscribe: () => ({ add: () => {} }) }),
          pagu: () => ({ subscribe: () => ({ add: () => {} }) }),
          peringatanFaktur: () => ({ subscribe: () => ({ add: () => {} }) }),
          buat: (body: any) => {
            terkirim = body;
            return {
              subscribe: (o: any) => {
                (o?.next ?? o)?.({ id: 1 });
                o?.complete?.();
                return { add: () => {} };
              },
            };
          },
        },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => 'x' } },
    ],
  });
  return TestBed.runInInjectionContext(() => new (BapBuatComponent as any)());
}

afterEach(() => TestBed.resetTestingModule());

function baris(id: number, sisa: number, task = 'Operator Bor'): any {
  return { purchaseOrderItemID: id, task, unit: "m'", sisa, pagu: sisa };
}

function siap(c: any, baris_: any[]): void {
  c.spk.set({ id: 9, name: '095-SPK-R501-D', projectName: 'R501' });
  c.baris.set(baris_);
  c.periodeAwal.setValue('2026-09-01');
  c.periodeAkhir.setValue('2026-09-15');
}

describe('berita acara lapangan', () => {
  it('KOMA diterima sebagai pemisah desimal', async () => {
    /*
     * Papan ketik angka di sebagian ponsel hanya menawarkan koma.
     * `Number('135,75')` adalah NaN, dan NaN tidak lolos `quantity > 0` —
     * barisnya hilang dari berita acara tanpa satu pun pesan.
     */
    const c = komponen();
    siap(c, [baris(1, 2000)]);
    c.ubahVolume(1, '135,75');

    expect(c.bolehSimpan).toBeTrue();
    await c.simpan();

    expect(terkirim.items.length)
      .withContext('baris berkoma hilang dari muatan')
      .toBe(1);
    expect(terkirim.items[0].quantity).toBe(135.75);
  });

  it('baris kosong TIDAK ikut terkirim', () => {
    const c = komponen();
    siap(c, [baris(1, 2000), baris(2, 200, 'Lembur')]);
    c.ubahVolume(1, '10');

    void c.simpan();

    expect(terkirim.items.map((x: any) => x.purchaseOrderItemID)).toEqual([1]);
  });

  it('tanpa satu pun isian, simpan tertutup', () => {
    const c = komponen();
    siap(c, [baris(1, 2000)]);

    expect(c.bolehSimpan).toBeFalse();
  });

  it('volume melebihi sisa pagu ditandai, dan simpan tertutup', () => {
    const c = komponen();
    siap(c, [baris(1, 100)]);
    c.ubahVolume(1, '150');

    expect(c.lebih(c.baris()[0]))
      .withContext(
        'melebihi sisa tidak ditandai — ditolak server sesudah simpan, ' +
          'dan seluruh isian harus diketik ulang di lapangan',
      )
      .toBeTrue();
    expect(c.bolehSimpan).toBeFalse();
  });

  it('pas menghabiskan sisa pagu tetap boleh', () => {
    const c = komponen();
    siap(c, [baris(1, 100)]);
    c.ubahVolume(1, '100');

    expect(c.lebih(c.baris()[0])).toBeFalse();
    expect(c.bolehSimpan).toBeTrue();
  });

  it('SPK harga satuan: volume berapa pun tidak ditandai melebihi', () => {
    /*
     * SPK D harga satuan tidak menyepakati volume, jadi `sisa`-nya NOL.
     *
     * Tanpa `tanpaPagu`, setiap angka yang diketik di lapangan lebih besar
     * dari nol — seluruh baris merah, tombol simpan mati, dan tidak ada satu
     * pun cara meneruskannya dari ponsel. Persis yang terjadi pada SPK
     * 2.000 m' yang tidak dapat dibuatkan berita acara sama sekali.
     *
     * Servernya sendiri MENERIMA. Jadi yang menghalangi hanya layar ini.
     */
    const c = komponen();
    const b = { ...baris(1, 0), tanpaPagu: true };
    siap(c, [b]);
    c.ubahVolume(1, '2000');

    expect(c.lebih(c.baris()[0]))
      .withContext('baris tanpa plafon ditandai melebihi — simpan mati')
      .toBeFalse();
    expect(c.bolehSimpan).toBeTrue();
  });

  it('baris berplafon di SPK yang sama TETAP dijaga', () => {
    /*
     * Satu SPK D dapat punya keduanya: upah tanpa plafon dan mobilisasi
     * 2 kali. Penandanya per BARIS — bila terbaca per dokumen, membuka yang
     * satu akan membuka yang lain diam-diam, dan volume lolos melampaui
     * kontrak tanpa galat apa pun.
     */
    const c = komponen();
    siap(c, [
      { ...baris(1, 0), tanpaPagu: true },
      baris(2, 2, 'Mobilisasi'),
    ]);
    c.ubahVolume(1, '2000');
    c.ubahVolume(2, '3');

    expect(c.lebih(c.baris()[0])).toBeFalse();
    expect(c.lebih(c.baris()[1])).toBeTrue();
    expect(c.bolehSimpan).toBeFalse();
  });

  it('periode terbalik menutup simpan', () => {
    const c = komponen();
    siap(c, [baris(1, 2000)]);
    c.ubahVolume(1, '10');
    c.periodeAwal.setValue('2026-09-15');
    c.periodeAkhir.setValue('2026-09-01');

    expect(c.periodeSah).toBeFalse();
    expect(c.bolehSimpan).toBeFalse();
  });

  it('periode kosong menutup simpan', () => {
    const c = komponen();
    siap(c, [baris(1, 2000)]);
    c.ubahVolume(1, '10');
    c.periodeAkhir.setValue('');

    expect(c.bolehSimpan).toBeFalse();
  });

  it('tanggal dokumen ikut terkirim, periode diteruskan apa adanya', () => {
    const c = komponen();
    siap(c, [baris(1, 2000)]);
    c.ubahVolume(1, '10');

    void c.simpan();

    expect(terkirim.purchaseOrderID).toBe(9);
    expect(terkirim.periodStart).toBe('2026-09-01');
    expect(terkirim.periodEnd).toBe('2026-09-15');
    expect(terkirim.date).toBeTruthy();
  });

  it('TIDAK mengirim satu pun angka rupiah', () => {
    /*
     * Lembar ini tahap pencatatan volume. Harga diisi di tahap berikutnya,
     * di desktop — dan yang mengisi di lapangan belum tentu berhak
     * melihatnya sama sekali.
     */
    const c = komponen();
    siap(c, [baris(1, 2000)]);
    c.ubahVolume(1, '10');

    void c.simpan();

    const teks = JSON.stringify(terkirim);
    for (const kunci of ['price', 'amount', 'total', 'dpp']) {
      expect(teks)
        .withContext(`muatan lapangan membawa kolom nilai \`${kunci}\``)
        .not.toContain(`"${kunci}"`);
    }
  });
});
