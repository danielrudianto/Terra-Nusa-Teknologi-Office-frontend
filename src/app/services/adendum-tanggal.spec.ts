/**
 * Mode UBAH: tanggal dokumen DIWARISI ke formulir sebagai objek moment.
 *
 * Pemilih tanggal memakai adapter moment. Menaruh untai mentah "2026-04-04"
 * ke sana tidak dikenali adapternya: kolomnya tampil kosong, lalu terisi hari
 * ini saat disentuh — sehingga dokumen yang disunting seolah bertanggal hari
 * ini. Uji ini menahan agar tanggalnya selalu sampai sebagai moment yang sah.
 */
import { FormControl, FormGroup } from '@angular/forms';
import moment from 'moment';

import { AdendumService } from './adendum.service';

function layanan(ubah: boolean): AdendumService {
  const route: any = {
    snapshot: {
      queryParamMap: {
        get: (k: string) => (k === 'ubah' && ubah ? '7' : null),
      },
    },
  };
  return new AdendumService({} as any, route);
}

describe('adendum: tanggal pada mode ubah', () => {
  it('tanggal dokumen menjadi moment yang sah di formulir', () => {
    const svc = layanan(true);
    const fg = new FormGroup({
      date: new FormControl(''),
      projectName: new FormControl(''),
    });
    svc.isiFormulir(fg, { date: '2026-04-04', projectName: 'R501', customData: {} });

    const v = fg.get('date')!.value as any;
    expect(moment.isMoment(v)).toBeTrue();
    expect((v as moment.Moment).format('YYYY-MM-DD')).toBe('2026-04-04');
  });

  it('menerima tanggal ber-ISO lengkap dari server', () => {
    const svc = layanan(true);
    const fg = new FormGroup({ date: new FormControl('') });
    svc.isiFormulir(fg, { date: '2026-04-04T00:00:00.000Z', customData: {} });
    const v = fg.get('date')!.value as any;
    expect(moment.isMoment(v)).toBeTrue();
  });

  it('pada mode adendum, tanggal JUGA diwarisi sebagai nilai awal', () => {
    /*
     * Keputusan lapangan: 95% penyuntingan tak menyentuh tanggal, dan kolom
     * kosong menghentikan orang di tengah pekerjaan barang/harga. Adendum
     * kini terisi tanggal dokumen sebelumnya — tetap dapat diganti bila
     * adendumnya memang terbit di hari lain.
     */
    const svc = layanan(false);
    const fg = new FormGroup({ date: new FormControl('') });
    svc.isiFormulir(fg, { date: '2026-04-04', customData: {} });
    const v = fg.get('date')!.value as any;
    expect(moment.isMoment(v)).toBeTrue();
    expect((v as moment.Moment).format('YYYY-MM-DD')).toBe('2026-04-04');
  });

  it('nomor dokumen tetap TIDAK diwarisi ke isian', () => {
    // Nomor dipegang dokumennya sendiri, bukan diketik ulang.
    const svc = layanan(true);
    const fg = new FormGroup({
      date: new FormControl(''),
      purchase_order: new FormControl(''),
      name: new FormControl(''),
    });
    svc.isiFormulir(fg, {
      date: '2026-04-04',
      purchase_order: 'X',
      name: 'PO-1',
      customData: {},
    });
    expect(fg.get('purchase_order')!.value).toBe('');
    expect(fg.get('name')!.value).toBe('');
  });
});
