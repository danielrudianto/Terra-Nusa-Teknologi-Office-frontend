import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { AvatarService, KeadaanAvatar } from './avatar.service';

/**
 * Avatar: orang yang sama tampil dengan wajah berbeda-beda.
 *
 * Keluhan yang memulai ini: satu orang berwajah A di satu dokumen dan
 * berwajah B di dokumen lain. Datanya bersih — satu akun, satu id, nama
 * konsisten di seluruh jejak audit — jadi yang berubah bukan datanya.
 *
 * Penyebabnya tiga hal yang saling menutupi, dan TIDAK SATU PUN menghasilkan
 * galat:
 *
 *   1. `DEFAULT_AVATAR` dipancarkan sebagai keadaan awal. Ia bukan "kosong",
 *      melainkan SATU wajah tertentu — jadi semua orang yang belum menyetel
 *      avatar tampil identik, dan setiap pengambilan yang belum/gagal selesai
 *      ikut memakai wajah itu.
 *
 *   2. Permintaan yang GAGAL meninggalkan subject-nya di cache. `get()`
 *      berikutnya menemukannya dan tidak pernah meminta ulang — sisa sesi itu
 *      orangnya berwajah bawaan di seluruh halaman, dan normal lagi setelah
 *      muat ulang. Persis "kadang begini kadang begitu".
 *
 *   3. `isDefault` dari server dibuang, padahal server SUDAH membedakan
 *      "punya avatar" dari "tidak punya".
 *
 * Uji Karma tidak dapat menangkap gejalanya (yang salah gambarnya, bukan
 * datanya), tetapi dapat menangkap KETIGA sebabnya — dan itu yang dijaga di
 * sini.
 */
describe('AvatarService', () => {
  let service: AvatarService;
  let panggilan: Array<{ ids: number[]; hasil: Subject<any> }>;

  /** ApiService palsu; tiap panggilan dicatat dan dikendalikan uji. */
  class ApiPalsu {
    get(_url: string, params: any): Observable<any> {
      const hasil = new Subject<any>();
      panggilan.push({ ids: (params?.ids ?? []).slice(), hasil });
      return hasil.asObservable();
    }
  }

  /** ApiService yang selalu gagal seketika. */
  class ApiGagal {
    get(_url: string, params: any): Observable<any> {
      panggilan.push({ ids: (params?.ids ?? []).slice(), hasil: new Subject() });
      return throwError(() => ({ status: 500 }));
    }
  }

  const BARIS_ASLI = {
    userID: 11,
    isDefault: false,
    faceID: 'face-04',
    hairID: 'hair-07',
    skinTone: 'tone-05',
  };

  function pasang(api: any) {
    panggilan = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AvatarService, { provide: ApiService, useValue: new api() }],
    });
    service = TestBed.inject(AvatarService);
  }

  /** Nilai terakhir yang dipancarkan aliran. */
  function rekam(id: number): () => KeadaanAvatar {
    let nilai: KeadaanAvatar = undefined as any;
    service.get(id).subscribe((v) => (nilai = v));
    return () => nilai;
  }

  beforeEach(() => pasang(ApiPalsu));

  // ------------------------------------------------------------------
  // 1. Keadaan awal bukan sebuah wajah
  // ------------------------------------------------------------------

  it('memancarkan `null` lebih dulu, BUKAN wajah bawaan', () => {
    const nilai = rekam(11);
    expect(nilai())
      .withContext(
        'wajah bawaan sebagai keadaan awal membuat semua orang yang belum ' +
          'punya avatar tampil identik, dan tiap pengambilan yang belum ' +
          'selesai ikut memakai wajah itu',
      )
      .toBeNull();
  });

  it('id yang kosong tidak meminta apa pun', () => {
    const nilai = rekam(null as any);
    expect(nilai()).toBeNull();
    expect(panggilan.length).toBe(0);
  });

  // ------------------------------------------------------------------
  // 2. `isDefault` dari server dipakai
  // ------------------------------------------------------------------

  it('`isDefault: true` tetap `null` — tidak menggambar wajah', (done) => {
    const nilai = rekam(11);
    setTimeout(() => {
      panggilan[0].hasil.next([{ userID: 11, isDefault: true, faceID: 'face-01' }]);
      expect(nilai())
        .withContext(
          'server sudah menyebut orang ini belum punya avatar; menggambar ' +
            '`face-01` di sini membuatnya tidak dapat dibedakan dari orang lain ' +
            'yang juga belum punya',
        )
        .toBeNull();
      done();
    }, 1);
  });

  it('baris avatar sungguhan dipancarkan apa adanya', (done) => {
    const nilai = rekam(11);
    setTimeout(() => {
      panggilan[0].hasil.next([BARIS_ASLI]);
      expect(nilai()?.faceID).toBe('face-04');
      expect(nilai()?.skinTone).toBe('tone-05');
      // Bidang yang tidak disebut baris itu diisi dari bawaan, bukan `undefined`.
      expect(nilai()?.mouthID).toBeTruthy();
      done();
    }, 1);
  });

  // ------------------------------------------------------------------
  // 3. Batching
  // ------------------------------------------------------------------

  it('beberapa id dalam satu tick dikirim sebagai SATU permintaan', (done) => {
    rekam(1);
    rekam(3);
    rekam(11);
    setTimeout(() => {
      expect(panggilan.length).toBe(1);
      // `sort()` tanpa pembanding mengurutkan sebagai TEKS — [1, 11, 3].
      expect(panggilan[0].ids.sort((a, b) => a - b)).toEqual([1, 3, 11]);
      done();
    }, 1);
  });

  it('id yang sudah terjawab tidak diminta lagi', (done) => {
    rekam(11);
    setTimeout(() => {
      panggilan[0].hasil.next([BARIS_ASLI]);
      rekam(11);
      setTimeout(() => {
        expect(panggilan.length)
          .withContext('jawaban yang sudah ada tidak perlu diminta ulang')
          .toBe(1);
        done();
      }, 1);
    }, 1);
  });

  // ------------------------------------------------------------------
  // 4. Kegagalan TIDAK permanen  <<< inti perbaikannya
  // ------------------------------------------------------------------

  it('permintaan yang GAGAL dicoba lagi oleh tampilan berikutnya', (done) => {
    pasang(ApiGagal);
    rekam(11);
    setTimeout(() => {
      expect(panggilan.length).toBe(1);

      // Halaman lain menampilkan orang yang sama.
      rekam(11);
      setTimeout(() => {
        expect(panggilan.length)
          .withContext(
            'dulu subject-nya tetap tersimpan di cache sesudah gagal, sehingga ' +
              'id itu TIDAK PERNAH diminta lagi — orangnya berwajah bawaan ' +
              'selama sisa sesi, dan normal lagi setelah muat ulang halaman',
          )
          .toBe(2);
        done();
      }, 1);
    }, 1);
  });

  it('percobaan ulangnya DIBATASI, tidak berputar terus', (done) => {
    pasang(ApiGagal);

    // Server yang menolak permanen (divisi tanpa izin `user_avatar`) tidak
    // boleh membuat tiap baris daftar menembakkan satu permintaan lagi.
    let n = 0;
    const coba = () => {
      if (n++ > 8) {
        expect(panggilan.length).toBeLessThanOrEqual(3);
        done();
        return;
      }
      rekam(11);
      setTimeout(coba, 1);
    };
    coba();
  });

  it('id yang diminta tetapi tidak ada di jawabannya dianggap selesai', (done) => {
    rekam(11);
    setTimeout(() => {
      // Server menjawab, tetapi tanpa baris untuk 11.
      panggilan[0].hasil.next([]);
      rekam(11);
      setTimeout(() => {
        expect(panggilan.length)
          .withContext(
            'kalau tidak dianggap selesai, id ini diminta ulang pada setiap ' +
              'penggambaran dan tidak pernah berhenti',
          )
          .toBe(1);
        done();
      }, 1);
    }, 1);
  });

  // ------------------------------------------------------------------
  // 5. Setelah menyimpan di perancangnya
  // ------------------------------------------------------------------

  it('`update` langsung terlihat oleh yang sudah berlangganan', () => {
    const nilai = rekam(11);
    service.update(11, { faceID: 'face-09' });
    expect(nilai()?.faceID).toBe('face-09');
  });

  it('`clear` membuang cache DAN hitungan percobaannya', (done) => {
    pasang(ApiGagal);

    /*
     * Percobaannya DIHABISKAN lebih dulu.
     *
     * Kalau hanya gagal sekali lalu `clear()`, permintaan berikutnya tetap
     * terkirim karena jatahnya belum habis — uji itu akan hijau meski
     * `percobaan` tidak pernah dibersihkan. Yang dijaga di sini keadaan
     * sesudah jatahnya habis: keluar-masuk akun harus memulai dari nol, bukan
     * mewarisi kegagalan pengguna sebelumnya.
     */
    let n = 0;
    const habiskan = () => {
      if (n++ < 5) {
        rekam(11);
        setTimeout(habiskan, 1);
        return;
      }

      const sebelum = panggilan.length;
      // Jatahnya sudah habis: tanpa `clear()`, tidak ada permintaan lagi.
      rekam(11);
      setTimeout(() => {
        expect(panggilan.length).toBe(sebelum);

        service.clear();
        rekam(11);
        setTimeout(() => {
          expect(panggilan.length)
            .withContext(
              '`clear()` harus mengembalikan jatah percobaannya; kalau tidak, ' +
                'pengguna berikutnya di peramban yang sama tidak akan pernah ' +
                'mendapat avatarnya',
            )
            .toBe(sebelum + 1);
          done();
        }, 1);
      }, 1);
    };
    habiskan();
  });
});
