import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

import { ApiService } from './api.service';
import { SelaraskanLunasService } from './selaraskan-lunas.service';

/*
 * "Selaraskan status lunas" berjalan DUA LANGKAH bila selisihnya kecil.
 *
 * Selisih di antara satu sen dan lima rupiah tidak lagi ditandai lunas
 * sendiri oleh sistem. Servernya menjawab `butuh_konfirmasi` beserta
 * angkanya, layar menanyakannya, dan hanya jawaban "ya" yang mengirim ulang
 * dengan `konfirmasi=true`.
 *
 * Selisih sebesar itu di AKN bukan kekeliruan: ia biaya pembulatan antara
 * pembukuan sendiri dan pembukuan pihak lain, yang dicatat sebagai pembayaran
 * tersendiri bernilai di bawah satu rupiah. Ditandai lunas diam-diam,
 * pembayaran itu tidak pernah sempat dibuat — sebab tidak ada lagi yang
 * menunjukkan bahwa masih ada yang kurang.
 */

interface Panggilan {
  jalur: string;
}

describe('SelaraskanLunasService', () => {
  let layanan: SelaraskanLunasService;
  let panggilan: Panggilan[];
  let dialogDibuka: any[];
  let jawabanDialog: boolean | undefined;
  let jawabanPertama: any;

  function siapkan(): void {
    panggilan = [];
    dialogDibuka = [];

    const api = {
      post: (jalur: string): Observable<any> => {
        panggilan.push({ jalur });
        // Panggilan kedua selalu membawa konfirmasi; jawabannya hasil akhir.
        if (jalur.includes('konfirmasi=true')) {
          return of({ butuh_konfirmasi: false, lunas: true });
        }
        return of(jawabanPertama);
      },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: MatDialog,
          useValue: {
            open: (_k: any, opsi: any) => {
              dialogDibuka.push(opsi?.data);
              return { afterClosed: () => of(jawabanDialog) };
            },
          },
        },
      ],
    });

    layanan = TestBed.inject(SelaraskanLunasService);
  }

  beforeEach(() => {
    jawabanDialog = undefined;
    jawabanPertama = { butuh_konfirmasi: false, lunas: true };
    siapkan();
  });

  describe('tanpa selisih', () => {
    it('tidak menanyakan apa pun dan selesai dalam satu langkah', (done) => {
      layanan.jalankan('expense', 7).subscribe((hasil) => {
        expect(dialogDibuka.length)
          .withContext('menanyakan yang sudah jelas membuat pertanyaannya berhenti dibaca')
          .toBe(0);
        expect(panggilan.length).toBe(1);
        expect(hasil).toEqual({ keadaan: 'selesai', lunas: true });
        done();
      });
    });

    it('meneruskan hasil "belum lunas" apa adanya', (done) => {
      jawabanPertama = { butuh_konfirmasi: false, lunas: false };
      layanan.jalankan('purchase', 3).subscribe((hasil) => {
        expect(hasil).toEqual({ keadaan: 'selesai', lunas: false });
        expect(dialogDibuka.length).toBe(0);
        done();
      });
    });
  });

  describe('ketika selisihnya kecil', () => {
    beforeEach(() => {
      jawabanPertama = {
        butuh_konfirmasi: true,
        nilai: 1_000_000,
        dibayar: 999_999.17,
        selisih: 0.83,
      };
    });

    it('menanyakannya dan menyebut ANGKANYA', (done) => {
      jawabanDialog = false;
      layanan.jalankan('expense', 7).subscribe(() => {
        expect(dialogDibuka.length).toBe(1);
        expect(dialogDibuka[0])
          .withContext(
            '"ada selisih" saja tidak dapat diputuskan siapa pun; yang ' +
              'ditanya perlu melihat berapa',
          )
          .toEqual({ nilai: 1_000_000, dibayar: 999_999.17, selisih: 0.83 });
        done();
      });
    });

    it('TIDAK mengirim apa pun bila jawabannya tidak', (done) => {
      jawabanDialog = false;
      layanan.jalankan('expense', 7).subscribe((hasil) => {
        expect(panggilan.length)
          .withContext('jawaban "tidak" tidak boleh tetap menandainya lunas')
          .toBe(1);
        expect(hasil).toEqual({ keadaan: 'ditunda', selisih: 0.83 });
        done();
      });
    });

    it('memperlakukan dialog yang ditutup begitu saja sebagai "tidak"', (done) => {
      jawabanDialog = undefined;
      layanan.jalankan('expense', 7).subscribe((hasil) => {
        expect(panggilan.length).toBe(1);
        expect(hasil.keadaan).toBe('ditunda');
        done();
      });
    });

    it('mengirim ulang dengan konfirmasi bila jawabannya ya', (done) => {
      jawabanDialog = true;
      layanan.jalankan('expense', 7).subscribe((hasil) => {
        expect(panggilan.length).toBe(2);
        expect(panggilan[0].jalur).toContain('konfirmasi=false');
        expect(panggilan[1].jalur).toContain('konfirmasi=true');
        expect(hasil).toEqual({ keadaan: 'selesai', lunas: true });
        done();
      });
    });
  });

  describe('bentuk permintaannya', () => {
    it('mengirim konfirmasi sebagai parameter kueri, bukan isi body', (done) => {
      /*
       * Rutenya menerimanya sebagai parameter kueri. FastAPI membuang nama
       * yang tidak dikenal tanpa galat — yang salah tempat diam-diam jatuh ke
       * `false`, dan dialognya muncul berulang tanpa pernah menandai apa pun.
       */
      layanan.jalankan('loan', 12).subscribe(() => {
        expect(panggilan[0].jalur).toBe(
          'outgoing-payments/selaraskan/loan/12?konfirmasi=false',
        );
        done();
      });
    });

    it('memakai nama jenis yang dikenal rutenya', (done) => {
      layanan.jalankan('salary_slip', 5).subscribe(() => {
        expect(panggilan[0].jalur).toContain('/salary_slip/5');
        done();
      });
    });
  });
});
