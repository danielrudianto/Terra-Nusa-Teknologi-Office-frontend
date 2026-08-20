/**
 * Tombol "Setujui" tidak berlaku bagi pemeriksanya sendiri.
 *
 * Pemeriksaan dan persetujuan sengaja dua tangan: pemeriksa membaca isinya —
 * harga, volume, spesifikasi — dan penyetuju memutuskan dokumen itu boleh
 * terbit.
 *
 * Yang membuatnya mudah terlewat ada di layar ini: menu tindakan langsung
 * berganti menampilkan "Setujui" begitu "Periksa" ditekan. Dua klik
 * berurutan di tempat yang sama, oleh orang yang sama, dua detik — dan dari
 * kursi penggunanya tidak terasa seperti melanggar apa pun.
 *
 * Server sudah menolaknya. Yang diuji di sini layarnya: tombol yang pasti
 * ditolak tidak boleh disodorkan, sebab penolakan sesudah ditekan terbaca
 * sebagai kerusakan — bukan sebagai aturan.
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { AccountService } from '../../services/account.service';
import { ApiService } from '../../services/api.service';
import { PermissionService } from '../../services/permission.service';
import { ServerMessageService } from '../../services/server-message.service';
import { SettingsService } from '../../services/setting.service';
import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';

const SAYA = 7;
const ORANG_LAIN = 9;

function komponen(
  level: number,
  userId: number | null = SAYA,
  divisi: string[] = ['procurement'],
): any {
  const akun = {
    userId,
    user: { id: userId, authenticationLevel: level },
  };

  /*
   * Level dan divisi dibaca dari `PermissionService`, bukan dari akun.
   *
   * Keduanya berasal dari server; layar tidak menyimpulkan matriks izin
   * sendiri. Tiruannya karena itu harus menyediakan keduanya, bukan hanya
   * level pada objek pengguna.
   */
  const izin = {
    level: () => level,
    departments: () => divisi,
    inDepartment: (...k: string[]) => k.some((x) => divisi.includes(x)),
    can: () => true,
    loaded: () => true,
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: SettingsService, useValue: { pageSize: 10 } },
      { provide: Router, useValue: { navigate: () => {} } },
      { provide: ActivatedRoute, useValue: { snapshot: { params: {}, queryParams: {} }, queryParams: { subscribe: () => {} } } },
      { provide: ApiService, useValue: { get: () => ({ subscribe: () => ({ add: () => {} }) }) } },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => ({ subscribe: () => {} }) }) } },
      { provide: MatSnackBar, useValue: { open: () => {} } },
      { provide: TranslateService, useValue: { instant: (k: string) => k } },
      { provide: ServerMessageService, useValue: { terjemahkan: () => '' } },
      { provide: AccountService, useValue: akun },
      { provide: PermissionService, useValue: izin },
    ],
  });

  return TestBed.runInInjectionContext(
    () =>
      new (PurchaseOrderListComponent as any)(
        TestBed.inject(SettingsService),
        TestBed.inject(Router),
        TestBed.inject(ActivatedRoute),
        TestBed.inject(ApiService),
        TestBed.inject(MatDialog),
        TestBed.inject(MatSnackBar),
        TestBed.inject(TranslateService),
        TestBed.inject(ServerMessageService),
        TestBed.inject(AccountService),
        TestBed.inject(PermissionService),
      ),
  );
}

afterEach(() => TestBed.resetTestingModule());

function po(checkedBy: number | null): any {
  return { id: 1, name: 'PO-001', isChecked: true, checkedBy };
}

function poDisetujui(): any {
  return { id: 2, name: 'PO-002', isChecked: true, isApproved: true, status: 'approved' };
}

describe('pemeriksa tidak menyetujui yang diperiksanya', () => {
  it('tombol disembunyikan dari yang memeriksa', () => {
    const c = komponen(4);
    expect(c.tidakBolehSetujui(po(SAYA))).toBeTrue();
  });

  it('tombol tetap ada bagi orang lain', () => {
    /*
     * Aturan yang menutup jalur yang benar sama tidak bergunanya dengan
     * aturan yang tidak menutup apa pun — bedanya yang pertama menghentikan
     * pekerjaan, dan yang menemukannya menyangka layarnya rusak.
     */
    const c = komponen(4);
    expect(c.tidakBolehSetujui(po(ORANG_LAIN))).toBeFalse();
  });

  it('pemilik (level 5) dikecualikan', () => {
    const c = komponen(5);
    expect(c.tidakBolehSetujui(po(SAYA))).toBeFalse();
  });

  it('level 4 TIDAK dikecualikan', () => {
    // Batasnya sama dengan yang dijaga server. Layar yang lebih longgar
    // menyodorkan tombol yang pasti ditolak; yang lebih ketat menyembunyikan
    // tombol yang sebenarnya boleh ditekan.
    const c = komponen(4);
    expect(c.tidakBolehSetujui(po(SAYA))).toBeTrue();
  });

  it('dokumen lama tanpa pemeriksa tercatat tetap dapat disetujui', () => {
    /*
     * `checkedBy` kosong pada dokumen yang disetujui sebelum tahap
     * pemeriksaan ada. Menyembunyikan tombolnya berarti dokumen itu tidak
     * pernah dapat disetujui oleh siapa pun.
     */
    const c = komponen(4);
    expect(c.tidakBolehSetujui(po(null))).toBeFalse();
  });

  it('tanpa id pengguna, tombolnya tidak ikut hilang', () => {
    // Server tetap menolak bila ternyata memang pemeriksanya, dan pesannya
    // menyebut sebabnya — lebih terbaca daripada tombol yang hilang.
    const c = komponen(4, null);
    expect(c.tidakBolehSetujui(po(SAYA))).toBeFalse();
  });

  it('`checkedBy` berupa teks tetap dikenali', () => {
    // JSON dari server pernah mengirim id sebagai teks; perbandingan tanpa
    // `Number()` selalu bernilai salah, dan aturannya tidak pernah berlaku.
    const c = komponen(4);
    expect(c.tidakBolehSetujui({ ...po(SAYA), checkedBy: String(SAYA) })).toBeTrue();
  });
});

/**
 * Menu "Hapus": bebas sebelum terbit, hanya pemilik sesudahnya.
 *
 * Dokumen yang belum disetujui belum dicetak dan belum dipegang siapa pun di
 * luar kantor. Yang sudah disetujui ada di tangan vendor — menghapusnya
 * membuat lembar yang beredar tidak punya padanan sama sekali di sistem.
 */
describe('menghapus purchase order', () => {
  it('yang belum disetujui bebas dihapus', () => {
    const c = komponen(3);
    expect(c.bolehHapus({ id: 1, isApproved: false, status: 'draft' })).toBeTrue();
  });

  it('yang sudah diperiksa tetapi belum disetujui tetap bebas', () => {
    // Diperiksa bukan terbit. Dokumennya masih di dalam kantor.
    const c = komponen(3);
    expect(c.bolehHapus(po(SAYA))).toBeTrue();
  });

  it('yang dibatalkan tetap bebas dihapus', () => {
    /*
     * Membatalkan mencabut persetujuannya (`isApproved` kembali false),
     * jadi dokumennya tidak lagi terbit. Sebelumnya ia ikut tertutup karena
     * penjagaannya memakai "sudah selesai" — yang menggabungkan disetujui
     * dan dibatalkan menjadi satu keadaan padahal keduanya berbeda.
     */
    const c = komponen(3);
    expect(c.bolehHapus({ id: 1, isApproved: false, status: 'cancelled' })).toBeTrue();
  });

  it('yang sudah disetujui TIDAK boleh dihapus level 4', () => {
    const c = komponen(4);
    expect(c.bolehHapus(poDisetujui())).toBeFalse();
  });

  it('yang sudah disetujui boleh dihapus pemilik', () => {
    const c = komponen(5);
    expect(c.bolehHapus(poDisetujui())).toBeTrue();
  });

  it('`status: approved` tanpa `isApproved` tetap terbaca sudah terbit', () => {
    /*
     * Sebagian dokumen lama tersimpan dengan `status: "approved"` sementara
     * `isApproved` masih false. Memeriksa satu bidang saja membuat dokumen
     * yang sudah dipegang vendor terbuka untuk dihapus siapa pun.
     */
    const c = komponen(4);
    expect(c.bolehHapus({ id: 1, isApproved: false, status: 'approved' })).toBeFalse();
  });
});

/**
 * Tombol yang PASTI ditolak tidak disodorkan.
 *
 * Dua sikap yang berbeda, dan bedanya disengaja:
 *
 *   - bila tindakannya memang BUKAN pekerjaannya — staf level 1, divisi di
 *     luar procurement — tombolnya hilang TANPA keterangan. Menjelaskannya
 *     di setiap baris hanya menambah keramaian yang tidak menolong siapa pun;
 *   - bila tindakannya BIASANYA pekerjaannya tetapi dokumen INI menghalangi
 *     — dibuat sendiri, diperiksa sendiri — hilangnya DIJELASKAN. Tanpa
 *     keterangan, menu yang sama terlihat berbeda tanpa sebab dan yang
 *     membukanya menyimpulkan layarnya rusak.
 */
describe('tombol yang tidak pernah dapat ditekan', () => {
  const poOrangLain = { id: 1, createdBy: ORANG_LAIN, checkedBy: null };

  describe('siapa yang memeriksa', () => {
    it('level 4 boleh, tanpa memandang divisi', () => {
      expect(komponen(4, SAYA, []).peranPemeriksa).toBeTrue();
    });

    it('level 3 procurement boleh', () => {
      expect(komponen(3, SAYA, ['procurement']).peranPemeriksa).toBeTrue();
    });

    it('level 3 di luar procurement TIDAK', () => {
      // Cerminan `boleh_memeriksa` di server: level 3 harus procurement.
      expect(komponen(3, SAYA, ['fat']).peranPemeriksa).toBeFalse();
    });

    /*
     * Merekalah yang membuat dokumennya, dan `purchase_order:update` memang
     * terbuka sejak level 1 — sehingga tanpa aturan ini tombol "Periksa"
     * muncul pada setiap baris bagi setiap staf, dan selalu ditolak server.
     *
     * Dipisah menjadi dua pengujian, bukan dua pernyataan dalam satu:
     * `TestBed` hanya dapat dirakit SEKALI per pengujian, dan memanggil
     * `komponen()` dua kali melemparkan galat yang menyesatkan — bunyinya
     * soal `inject`, bukan soal aturan yang sedang diuji.
     */
    it('level 1 TIDAK, walaupun procurement', () => {
      expect(komponen(1, SAYA, ['procurement']).peranPemeriksa).toBeFalse();
    });

    it('level 2 TIDAK, walaupun procurement', () => {
      expect(komponen(2, SAYA, ['procurement']).peranPemeriksa).toBeFalse();
    });
  });

  describe('tombol Periksa', () => {
    it('tampil bagi pemeriksa pada dokumen orang lain', () => {
      const c = komponen(3);
      expect(c.bolehMemeriksa(poOrangLain)).toBeTrue();
      expect(c.periksaTerhalangPembuat(poOrangLain)).toBeFalse();
    });

    it('hilang TANPA keterangan bila memeriksa bukan pekerjaannya', () => {
      const c = komponen(1);
      expect(c.bolehMemeriksa(poOrangLain)).toBeFalse();
      expect(c.periksaTerhalangPembuat(poOrangLain))
        .withContext('bukan pekerjaannya — tidak perlu dijelaskan')
        .toBeFalse();
    });

    it('hilang DENGAN keterangan pada dokumen buatannya sendiri', () => {
      const c = komponen(3);
      const punyaku = { id: 1, createdBy: SAYA, checkedBy: null };
      expect(c.bolehMemeriksa(punyaku)).toBeFalse();
      expect(c.periksaTerhalangPembuat(punyaku)).toBeTrue();
    });
  });

  describe('tombol Setujui pada dokumen buatan sendiri', () => {
    it('disembunyikan — server menolaknya', () => {
      /*
       * Sebelumnya layar hanya mengenali "diperiksa sendiri". Pembuat
       * dokumen tetap disodori tombolnya dan ditolak dengan
       * SELF_APPROVAL_FORBIDDEN.
       */
      const c = komponen(4);
      const punyaku = { id: 1, createdBy: SAYA, checkedBy: ORANG_LAIN };
      expect(c.tidakBolehSetujui(punyaku)).toBeTrue();
      expect(c.sebabTakBolehSetujui(punyaku)).toBe('buatanSendiri');
    });

    it('pemilik (level 5) tetap boleh', () => {
      const c = komponen(5);
      const punyaku = { id: 1, createdBy: SAYA, checkedBy: ORANG_LAIN };
      expect(c.tidakBolehSetujui(punyaku)).toBeFalse();
      expect(c.sebabTakBolehSetujui(punyaku)).toBeNull();
    });

    it('bila keduanya berlaku, yang disebut pemeriksaannya', () => {
      // Itu tindakan yang paling dekat dengan yang baru saja dilakukannya.
      const c = komponen(4);
      const punyaku = { id: 1, createdBy: SAYA, checkedBy: SAYA };
      expect(c.sebabTakBolehSetujui(punyaku)).toBe('diperiksaSendiri');
    });

    it('dokumen orang lain tetap dapat disetujui', () => {
      const c = komponen(4);
      expect(c.tidakBolehSetujui(poOrangLain)).toBeFalse();
      expect(c.sebabTakBolehSetujui(poOrangLain)).toBeNull();
    });
  });
});
