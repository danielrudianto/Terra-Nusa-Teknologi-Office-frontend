import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { HapusTundaService } from './hapus-tunda.service';

describe('HapusTundaService', () => {
  let svc: HapusTundaService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    });
    svc = TestBed.inject(HapusTundaService);
  });

  function permintaan(hasil$ = of({})) {
    const catat: string[] = [];
    return {
      catat,
      p: {
        label: 'PT Maju',
        kirim: () => {
          catat.push('kirim');
          return hasil$;
        },
        sembunyikan: () => catat.push('sembunyi'),
        pulihkan: () => catat.push('pulih'),
        berhasil: () => catat.push('berhasil'),
      },
    };
  }

  it('baris langsung disembunyikan; server BELUM disentuh', fakeAsync(() => {
    const { p, catat } = permintaan();
    svc.hapus(p);
    expect(catat).toEqual(['sembunyi']);
    expect(svc.adaTertunda).toBeTrue();
    flush();
  }));

  it('Urungkan: tidak ada yang dikirim, baris kembali', fakeAsync(() => {
    const { p, catat } = permintaan();
    const ref = svc.hapus(p);
    ref.dismissWithAction();
    tick(7000);
    flush();
    expect(catat).toEqual(['sembunyi', 'pulih']);
    expect(svc.adaTertunda).toBeFalse();
  }));

  it('waktu habis: DELETE dikirim sekali', fakeAsync(() => {
    const { p, catat } = permintaan();
    svc.hapus(p);
    tick(6500);
    flush();
    expect(catat).toEqual(['sembunyi', 'kirim', 'berhasil']);
  }));

  it('server menolak: baris dipulihkan', fakeAsync(() => {
    const { p, catat } = permintaan(throwError(() => ({ status: 409 })));
    svc.hapus(p);
    tick(6500);
    flush();
    expect(catat).toEqual(['sembunyi', 'kirim', 'pulih']);
  }));

  it('hapus berikutnya mengirim yang sebelumnya lebih awal', fakeAsync(() => {
    const a = permintaan();
    const b = permintaan();
    svc.hapus(a.p);
    svc.hapus(b.p);
    tick(100);
    expect(a.catat).toContain('kirim');
    expect(b.catat).not.toContain('kirim');
    flush();
  }));

  it('pindah halaman / kirimSemua: dikirim sekarang', fakeAsync(() => {
    const { p, catat } = permintaan();
    svc.hapus(p);
    svc.kirimSemua();
    expect(catat).toContain('kirim');
    flush();
  }));
});
