import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { TenderService } from 'src/app/services/tender.service';
import { PermissionService } from 'src/app/services/permission.service';
import { TenderViewComponent } from './tender-view.component';

/*
 * SELAGI DRAF HANYA ADA DUA HAL YANG MASUK AKAL: SETUJUI, ATAU BUANG.
 *
 * Sebelumnya layar draf menampilkan perbandingan penawaran dan hasil tender
 * yang keduanya kosong, lengkap dengan tombol "Tetapkan pemenang" yang pasti
 * ditolak server ("Tender ini masih draf"). Spanduk kecil di atasnya memang
 * menerangkan sebabnya, tetapi yang terlihat mata tetap dua bagian yang
 * seolah tinggal diisi — dan orang tetap mencoba.
 *
 * Dijaga pula kecocokan izinnya dengan rutenya: `/sebarkan` menuntut
 * `tender:approve` (level 3), sementara tombolnya dulu dijaga
 * `tender:update` (level 1). Level 1 melihat tombolnya lalu menerima 403.
 */
function buat(izin: (m: string, a: string) => boolean) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TenderViewComponent, TranslateModule.forRoot()],
    providers: [
      provideNoopAnimations(),
      { provide: ApiService, useValue: { get: () => of({ data: [] }) } },
      { provide: TenderService, useValue: { ambil: () => of(null) } },
      { provide: PermissionService, useValue: { can: izin, permissions: () => ({}) } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => '9' } } },
      },
    ],
  });
  const f = TestBed.createComponent(TenderViewComponent);
  return f.componentInstance as any;
}

const SEMUA = () => true;
const TANPA_APA_PUN = () => false;

describe('tender draf: keterangan dan tindakan', () => {
  it('draf: pemenang TIDAK dapat ditetapkan', () => {
    const k = buat(SEMUA);
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.masihDraf).toBeTrue();
    expect(k.dapatDiputuskan).toBeFalse();
  });

  it('berjalan: barulah pemenang dapat ditetapkan', () => {
    const k = buat(SEMUA);
    k.data = { status: 'berjalan', items: [], quotes: [] };
    expect(k.masihDraf).toBeFalse();
    expect(k.dapatDiputuskan).toBeTrue();
  });

  it('draf: kartu sebar WhatsApp TIDAK muncul', () => {
    // Menyebarkan daftar yang masih boleh berubah berarti pemasok menjawab
    // pertanyaan yang sebentar lagi tidak berlaku.
    const k = buat(SEMUA);
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.dapatMenerimaPenawaran).toBeFalse();
  });

  it('persetujuan menuntut izin approve, bukan update', () => {
    const k = buat((m: string, a: string) => m === 'tender' && a === 'update');
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.bolehSetujui).toBeFalse();
  });

  it('yang berizin approve boleh menyetujui', () => {
    const k = buat((m: string, a: string) => m === 'tender' && a === 'approve');
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.bolehSetujui).toBeTrue();
    expect(k.bolehHapus).toBeFalse();
  });

  it('hapus dijaga izin delete tersendiri', () => {
    const k = buat((m: string, a: string) => m === 'tender' && a === 'delete');
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.bolehHapus).toBeTrue();
    expect(k.bolehSetujui).toBeFalse();
  });

  it('tanpa izin apa pun: tidak ada tindakan yang ditawarkan', () => {
    const k = buat(TANPA_APA_PUN);
    k.data = { status: 'draft', items: [], quotes: [] };
    expect(k.bolehSetujui).toBeFalse();
    expect(k.bolehHapus).toBeFalse();
  });

  it('hapus memanggil layanan dan kembali ke daftar', () => {
    const k = buat(SEMUA);
    k.data = { status: 'draft', name: 'Kabel NYM', items: [], quotes: [] };

    let dipanggil = 0;
    k.service = { hapus: (_id: number) => { dipanggil++; return of({}); } };
    k.dialog = { open: () => ({ afterClosed: () => of(true) }) };
    const jalur: any[] = [];
    k.router = { navigate: (x: any) => jalur.push(x) };

    k.hapus();
    expect(dipanggil).toBe(1);
    expect(jalur[0]).toEqual(['/Tender']);
  });

  it('konfirmasi ditolak: tidak menghapus apa pun', () => {
    const k = buat(SEMUA);
    k.data = { status: 'draft', name: 'Kabel NYM', items: [], quotes: [] };

    let dipanggil = 0;
    k.service = { hapus: () => { dipanggil++; return of({}); } };
    k.dialog = { open: () => ({ afterClosed: () => of(false) }) };
    k.router = { navigate: () => {} };

    k.hapus();
    expect(dipanggil).toBe(0);
  });
});
