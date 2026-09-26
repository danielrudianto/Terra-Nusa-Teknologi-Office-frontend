/*
 * PENGATURAN MOBILE — bagian tanda tangan.
 *
 * "setting tanda tangan di mobile app belum bisa kayanya"
 *
 * Memang belum: kerangka mobile menawarkannya sekali saat login, tetapi yang
 * menutup tawaran itu dengan "Nanti saja" tidak punya jalan lain untuk
 * membuatnya — Pengaturan mobile adalah halaman tersendiri, bukan halaman
 * Pengaturan desktop yang mengecil. Dan justru ponsel berpena tempat tanda
 * tangan paling enak dibuat.
 *
 * Yang dijaga:
 *   1. Bagiannya BENAR-BENAR tergambar, diukur di DOM — bukan dibaca dari
 *      berkasnya. Tombol yang terdaftar tetapi tidak tergambar tidak
 *      menimbulkan galat apa pun.
 *   2. Belum punya -> "Siapkan"; sudah punya -> gambarnya tampil + "Ganti".
 *   3. Antrean persetujuan hanya muncul bagi yang berhak.
 */

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { PengaturanComponent } from './pengaturan/pengaturan.component';
import { AccountService } from '../services/account.service';
import { PermissionService } from '../services/permission.service';
import { PushService } from '../services/push.service';
import { PwaPasangService } from '../services/pwa-pasang.service';
import { SettingsService } from '../services/setting.service';
import { TandaTanganService } from '../services/tanda-tangan.service';
import { VersiService } from '../services/versi.service';

const GAMBAR = 'data:image/png;base64,AAAA';

async function pasang(opsi: {
  punya?: boolean;
  tertunda?: boolean;
  bolehSetujui?: boolean;
  antrean?: any[];
}) {
  const ttd = {
    keadaan: async () => ({
      punya: !!opsi.punya,
      tertunda: !!opsi.tertunda,
      tertundaSejak: null,
    }),
    milikSendiri: async () => (opsi.punya ? GAMBAR : null),
    antrean: async () => opsi.antrean ?? [],
    buka: async () => true,
    putuskan: async () => {},
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PengaturanComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: TandaTanganService, useValue: ttd },
      {
        provide: PermissionService,
        useValue: { can: () => !!opsi.bolehSetujui, level: () => 5 },
      },
      { provide: AccountService, useValue: { name: 'Daniel', level: 5 } },
      {
        provide: PushService,
        useValue: {
          init: async () => {},
          didukung: () => false,
          berlangganan: () => false,
          sedangProses: () => false,
        },
      },
      {
        provide: SettingsService,
        useValue: { theme: 'light', setTheme: () => {}, pageSize: 20 },
      },
      {
        provide: VersiService,
        useValue: {
          versi: () => '1.0.0',
          adaPembaruan: () => false,
          muatUlang: () => {},
        },
      },
      {
        provide: PwaPasangService,
        useValue: { tampil: false, bolehTawarkan: () => false },
      },
      { provide: MatSnackBar, useValue: { open: () => {} } },
    ],
  });
  const f = TestBed.createComponent(PengaturanComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

function teks(f: any): string {
  return (f.nativeElement.textContent || '') as string;
}

afterEach(() => TestBed.resetTestingModule());

describe('Pengaturan mobile — tanda tangan', () => {
  it('belum punya: menawarkan MENYIAPKAN, tanpa gambar', async () => {
    const f = await pasang({ punya: false });

    expect(teks(f)).toContain('ttd.siapkan');
    expect(f.nativeElement.querySelector('.mst-ttd__gambar')).toBeNull();
  });

  it('sudah punya: gambarnya tampil dan tombolnya menjadi GANTI', async () => {
    const f = await pasang({ punya: true });

    const img = f.nativeElement.querySelector('.mst-ttd__gambar');
    expect(img).withContext('gambar tidak tergambar').not.toBeNull();
    expect(img.getAttribute('src')).toBe(GAMBAR);
    expect(teks(f)).toContain('ttd.ganti');
  });

  it('sedang menunggu: keterangannya menyebut itu', async () => {
    const f = await pasang({ punya: true, tertunda: true });
    expect(teks(f)).toContain('ttd.tertundaIsi');
  });

  it('tanpa izin menyetujui: antreannya tidak DIMUAT', async () => {
    const f = await pasang({
      punya: true,
      bolehSetujui: false,
      antrean: [{ id: 1, userName: 'Budi', image: GAMBAR }],
    });

    expect(f.componentInstance.antreanTtd.length).toBe(0);
    expect(teks(f)).not.toContain('ttd.antreanJudul');
  });

  it('tanpa izin menyetujui: antreannya tidak DIGAMBAR meski datanya ada', () => {
    // Penjagaan di dua tempat, dan keduanya perlu diuji sendiri-sendiri:
    // yang satu mencegah permintaannya dikirim, yang lain mencegah isinya
    // tergambar. Menguji keduanya sekaligus membuat salah satunya dapat
    // hilang tanpa satu uji pun berubah warna.
    return pasang({ punya: true, bolehSetujui: false }).then((f) => {
      f.componentInstance.antreanTtd = [
        { id: 1, userName: 'Budi', image: GAMBAR } as any,
      ];
      f.detectChanges();

      expect(teks(f)).not.toContain('ttd.antreanJudul');
      expect(teks(f)).not.toContain('Budi');
    });
  });

  it('dengan izin: antreannya muncul beserta penanda kemiripan', async () => {
    const f = await pasang({
      punya: true,
      bolehSetujui: true,
      antrean: [
        {
          id: 1,
          userName: 'Budi',
          image: GAMBAR,
          similarity: 0.95,
          similarLevel: 'sangat_mirip',
        },
      ],
    });

    expect(teks(f)).toContain('Budi');
    expect(teks(f)).toContain('ttd.sangatMirip');
    expect(
      f.nativeElement.querySelector('.mst-ttd-antre__mirip.is-keras'),
    ).withContext('kemiripan tinggi tidak dibedakan').not.toBeNull();
  });

  it('persen kemiripan dibulatkan, bukan 0.9500000001', async () => {
    const f = await pasang({ punya: true });
    expect(f.componentInstance.persenMirip({ similarity: 0.9512 } as any)).toBe(95);
    expect(f.componentInstance.persenMirip({} as any)).toBe(0);
  });
});
