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
      periodeSlip: { month: 8, year: 2026 },
      rows: [{ name: 'Budi', nik: '123', taxAmount: 3_000_000, pphValue: 3_000_000 }],
    },
    pembelian: {
      nama: 'pembelian',
      terutang: 5_000_000,
      rows: [
        { id: 1, sumber: 'purchase', dpp: 250_000_000, pphPercentage: 2, pphValue: 5_000_000 },
      ],
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
    expect(f.componentInstance.bagian.map((x: any) => x.terutang)).toEqual([
      3_000_000, 5_000_000,
    ]);
  }));

  it('tidak menyatakan apa pun tentang setoran', fakeAsync(() => {
    /*
     * Setorannya sempat dicari di antara beban dengan kode tertentu, lalu
     * dikurangkan dari terutang untuk menyimpulkan "kurang setor" atau
     * "lunas". Pemetaan kodenya tidak bertahan, dan yang berbahaya bukan
     * angkanya melainkan kesimpulannya: masa yang sebenarnya sudah disetor
     * tampil merah, dan yang membacanya menyetor dua kali.
     *
     * Lebih baik tidak menyatakan apa pun tentang setoran daripada
     * menyatakannya salah.
     */
    const f = buat();
    f.componentInstance.onSubmit();
    tick();
    f.detectChanges();

    const teks: string = f.nativeElement.textContent ?? '';
    for (const kata of ['Setoran', 'setoran', 'Kurang setor', 'Lebih setor']) {
      expect(teks)
        .withContext(`layar masih menyebut "${kata}"`)
        .not.toContain(kata);
    }
  }));

  it('hanya menampilkan yang terutang', fakeAsync(() => {
    const f = buat();
    f.componentInstance.onSubmit();
    tick();
    f.detectChanges();

    const teks: string = f.nativeElement.textContent ?? '';
    expect(teks).toMatch(/3[.,]000[.,]000/);
    expect(teks).toMatch(/5[.,]000[.,]000/);
  }));

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

  it('menyebut periode slip yang menjadi sumber bagian gaji', fakeAsync(() => {
    /*
     * Gaji Agustus dibayarkan September, dan PPh 21 terutang saat
     * penghasilannya dibayarkan — jadi masa September memang berisi slip
     * Agustus. Yang membaca "Masa September" lalu melihat Agustus di
     * rinciannya akan mengira ada yang keliru kalau tidak disebutkan.
     */
    const f = buat();
    f.componentInstance.onSubmit();
    tick();
    f.detectChanges();

    expect(f.componentInstance.periodeSlip({ periodeSlip: { month: 8, year: 2026 } }))
      .toBe('Agustus 2026');
  }));

  it('tidak menyebut periode slip pada bagian yang tidak digeser', () => {
    /*
     * PPh 23/4(2) atas pembelian memang bicara tentang masanya sendiri —
     * disaring dari tanggal pembayaran. Menempelkan keterangan periode di
     * sana menyiratkan pergeseran yang tidak ada.
     */
    const f = buat();
    expect(f.componentInstance.periodeSlip({})).toBe('');
    expect(f.componentInstance.periodeSlip({ periodeSlip: {} })).toBe('');
  });
});
