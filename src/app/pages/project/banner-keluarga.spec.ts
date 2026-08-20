/**
 * Banner keluarga proyek pada layar proyek.
 *
 * Muncul HANYA bila proyek yang dibuka memang bertaut — induk atau anak.
 * Hampir seluruh proyek berdiri sendiri, dan banner yang selalu ada pada
 * proyek biasa hanya menambah satu kotak yang tidak menjawab apa pun.
 *
 * Yang dijaga di sini dua hal yang tidak akan menimbulkan galat bila salah:
 *
 *   1. Keterangan keluarga yang GAGAL diambil tidak boleh menjatuhkan
 *      layarnya. Ia hanya melengkapi; proyeknya sendiri sudah tampil.
 *
 *   2. Perpindahan antar proyek memakai ID, sedangkan laporan memakai KODE.
 *      Tertukar tidak terlihat dari kode — `/Project/88` dan
 *      `/Project/Report/88` sama-sama alamat yang sah bentuknya, dan yang
 *      kedua menghasilkan laporan kosong untuk proyek berkode "88".
 */

import { ProjectViewComponent } from './project-view/project-view.component';

function komponen(jawaban: any, gagal = false): any {
  const c: any = Object.create(ProjectViewComponent.prototype);
  c.keluarga = { induk: null, anak: [] };
  c.jalan = [];
  c.router = { navigate: (perintah: any[]) => c.jalan.push(perintah) };
  c.apiService = {
    get: () => ({
      subscribe: ({ next, error }: any) =>
        gagal ? error?.({ status: 500 }) : next?.(jawaban),
    }),
  };
  return c;
}

describe('banner keluarga proyek', () => {
  it('tidak muncul pada proyek yang berdiri sendiri', () => {
    const c = komponen({ induk: null, anak: [] });
    c.muatKeluarga(1);
    expect(c.punyaKeluarga).toBeFalse();
  });

  it('muncul bila proyek ini punya anak', () => {
    const c = komponen({ induk: null, anak: [{ id: 2, code: 'R501A' }] });
    c.muatKeluarga(1);
    expect(c.punyaKeluarga).toBeTrue();
    expect(c.keluarga.anak.length).toBe(1);
  });

  it('muncul bila proyek ini seorang anak', () => {
    const c = komponen({ induk: { id: 7, code: 'R501' }, anak: [] });
    c.muatKeluarga(2);
    expect(c.punyaKeluarga).toBeTrue();
    expect(c.keluarga.induk.code).toBe('R501');
  });

  it('gagal mengambil keluarga tidak menjatuhkan layarnya', () => {
    /*
     * Proyeknya sendiri sudah tampil dari permintaan yang lain. Galat di
     * sini hanya boleh menghilangkan bannernya — bukan memunculkan pesan
     * gagal pada layar yang isinya baik-baik saja.
     */
    const c = komponen(null, true);
    expect(() => c.muatKeluarga(1)).not.toThrow();
    expect(c.punyaKeluarga).toBeFalse();
  });

  it('jawaban tanpa isi tidak membuat banner setengah jadi', () => {
    const c = komponen({});
    c.muatKeluarga(1);
    expect(c.keluarga).toEqual({ induk: null, anak: [] });
    expect(c.punyaKeluarga).toBeFalse();
  });

  it('berpindah proyek memakai ID', () => {
    const c = komponen({ induk: null, anak: [] });
    c.bukaProyek(88);
    expect(c.jalan[0]).toEqual(['/Project', 88]);
  });

  it('membuka laporan memakai KODE, bukan id', () => {
    /*
     * Tertukar tidak menimbulkan galat: `/Project/Report/88` adalah alamat
     * yang sah bentuknya, dan yang membukanya melihat laporan kosong untuk
     * proyek berkode "88" — lalu menyimpulkan proyeknya memang tidak punya
     * biaya.
     */
    const c = komponen({ induk: null, anak: [] });
    c.bukaLaporan('R501');
    expect(c.jalan[0]).toEqual(['/Project/Report', 'R501']);
  });
});
