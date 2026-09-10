import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { PosisiPphComponent } from './posisi-pph.component';

/**
 * Posisi PPh: dua bagian yang tidak boleh dijumlahkan.
 *
 * PPh 21 (gaji) dan PPh 23/4(2) (potongan ke vendor) disetor dengan kode
 * billing dan formulir SPT yang berbeda, dan yang melapor mengisinya
 * sendiri-sendiri. Satu angka gabungan membuat satu masa tampak lunas padahal
 * yang disetor baru salah satunya.
 */
describe('PosisiPph — dua bagian terpisah', () => {
  const JAWABAN = {
    month: 9,
    year: 2026,
    gaji: {
      nama: 'gaji',
      terutang: 3_000_000,
      setoran: 3_000_000,
      setoranDibayar: 3_000_000,
      sisa: 0,
      keadaan: 'lunas',
      rows: [{ name: 'Budi', nik: '123', taxAmount: 3_000_000, pphValue: 3_000_000 }],
      setoranRows: [{ date: '2026-10-05', dpp: 3_000_000, isPaid: true }],
    },
    pembelian: {
      nama: 'pembelian',
      terutang: 5_000_000,
      setoran: 1_000_000,
      setoranDibayar: 0,
      sisa: 4_000_000,
      keadaan: 'kurang',
      rows: [
        { id: 1, sumber: 'purchase', dpp: 250_000_000, pphPercentage: 2, pphValue: 5_000_000 },
      ],
      setoranRows: [{ date: '2026-10-05', dpp: 1_000_000, isPaid: false }],
    },
  };

  let diminta: string | null;

  function buat(jawaban: any = JAWABAN) {
    diminta = null;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PosisiPphComponent, TranslateModule.forRoot()],
      providers: [
        DatePipe,
        {
          provide: ApiService,
          useValue: {
            get: (jalur: string) => {
              diminta = jalur;
              return of(jawaban);
            },
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: { month: 9, year: 2026 } },
        { provide: MatSnackBar, useValue: { open: () => {} } },
      ],
    });
    const f = TestBed.createComponent(PosisiPphComponent);
    f.detectChanges();
    return f;
  }

  it('periode dari kartu ikut terbawa, tidak dimulai kosong', () => {
    const f = buat();
    expect(f.componentInstance.formGroup.value.month).toBe(9);
    expect(f.componentInstance.formGroup.value.year).toBe(2026);
  });

  it('gaji lebih dulu, lalu pembelian', fakeAsync(() => {
    const f = buat();
    f.componentInstance.onSubmit();
    tick();

    const b = f.componentInstance.bagian;
    expect(b.length).toBe(2);
    expect(b[0].nama).toBe('gaji');
    expect(b[1].nama).toBe('pembelian');
    expect(diminta).toBe('taxes/pph-position');
  }));

  it('tidak ada satu pun angka gabungan gaji + pembelian', fakeAsync(() => {
    const f = buat();
    f.componentInstance.onSubmit();
    tick();
    f.detectChanges();

    const teks: string = f.nativeElement.textContent ?? '';
    // 3.000.000 + 5.000.000 = 8.000.000 tidak boleh muncul di mana pun.
    expect(teks).not.toMatch(/8[.,]000[.,]000/);
    // Sisanya pun tidak: 0 + 4.000.000 tetap dua angka terpisah.
    expect(f.componentInstance.bagian.map((x: any) => x.sisa)).toEqual([0, 4_000_000]);
  }));

  it('sisa ditampilkan tanpa tanda minus; arahnya dibawa labelnya', () => {
    const f = buat();
    expect(f.componentInstance.sisaAbs({ sisa: -4_000_000 })).toBe(4_000_000);
    expect(f.componentInstance.sisaAbs({ sisa: 4_000_000 })).toBe(4_000_000);
    expect(f.componentInstance.sisaAbs({})).toBe(0);
  });

  it('kesimpulan keadaan dibaca dari server, tidak dihitung ulang', () => {
    /*
     * Apakah satu masa sudah selesai adalah pernyataan tentang uang. Bila
     * layarnya menyimpulkan sendiri, suatu saat ia menjawab berbeda dari
     * laporan lain atas angka yang sama — termasuk soal berapa selisih
     * pembulatan yang masih dianggap lunas.
     */
    const f = buat();
    expect(f.componentInstance.keadaan({ keadaan: 'lunas' })).toBe('lunas');
    expect(f.componentInstance.keadaan({})).toBe('belum');
  });

  it('mengganti periode membuang hasil lama', fakeAsync(() => {
    // Hasil masa lalu yang masih tertinggal di layar sementara periodenya
    // sudah berganti adalah cara tercepat salah membaca angka pajak.
    const f = buat();
    f.componentInstance.onSubmit();
    tick();
    expect(f.componentInstance.posisi).toBeTruthy();

    f.componentInstance.pilihBulan(8);
    expect(f.componentInstance.posisi).toBeNull();
  }));

  it('tidak bisa mundur melewati masa paling awal', () => {
    const f = buat();
    f.componentInstance.formGroup.patchValue({ year: 2025 });
    expect(f.componentInstance.bisaMundur).toBeFalse();

    f.componentInstance.gantiTahun(-1);
    expect(f.componentInstance.formGroup.value.year).toBe(2025);
  });
});
