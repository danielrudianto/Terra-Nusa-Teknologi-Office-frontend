import { TestBed } from '@angular/core/testing';
import { HeaderTitleComponent } from './header-title.component';
import { PermissionService } from '../../services/permission.service';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Tombol tindakan yang menuntut izin harus MATI bagi yang tidak punya.
 *
 * Sebelumnya tombolnya selalu hidup: yang tidak berwenang membuka formulir,
 * mengisinya sampai selesai, lalu ditolak server saat menyimpan. Dua puluh
 * layar berperilaku begitu sekaligus, karena tidak satu pun menyebutkan
 * izin yang dituntut tombolnya.
 */
describe('HeaderTitleComponent — penjagaan izin pada tombol tindakan', () => {
  function buat(peta: any, izinTombol: string | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HeaderTitleComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: PermissionService,
          useValue: { can: (m: string, a: string) => peta?.[m]?.[a] === true },
        },
      ],
    });
    const f = TestBed.createComponent(HeaderTitleComponent);
    f.componentInstance.title = 'Judul';
    f.componentInstance.actionButtonLabel = 'Tambah';
    f.componentInstance.actionButtonPermission = izinTombol;
    f.detectChanges();
    return f;
  }

  it('mati bila izinnya tidak dimiliki', () => {
    const f = buat({ master_item: { read: true } }, 'master_item:create');
    expect(f.componentInstance.tindakanTerkunci).toBeTrue();
    const tombol: HTMLButtonElement =
      f.nativeElement.querySelector('.header-button');
    expect(tombol.disabled).toBeTrue();
  });

  it('hidup bila izinnya dimiliki', () => {
    const f = buat({ master_item: { create: true } }, 'master_item:create');
    expect(f.componentInstance.tindakanTerkunci).toBeFalse();
    const tombol: HTMLButtonElement =
      f.nativeElement.querySelector('.header-button');
    expect(tombol.disabled).toBeFalse();
  });

  it('tanpa izin yang disebut, tombolnya tetap hidup seperti sebelumnya', () => {
    const f = buat({}, null);
    expect(f.componentInstance.tindakanTerkunci).toBeFalse();
  });

  it('tidak memancarkan klik saat terkunci', () => {
    const f = buat({}, 'master_item:create');
    let kena = 0;
    f.componentInstance.onActionButtonClicked.subscribe(() => kena++);
    f.componentInstance.actionButtonClicked();
    expect(kena).toBe(0);
  });
});
