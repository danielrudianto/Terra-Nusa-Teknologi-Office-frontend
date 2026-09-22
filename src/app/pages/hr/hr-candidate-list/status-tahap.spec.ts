import { HrCandidateListComponent } from './hr-candidate-list.component';

describe('Pelamar — pilihan status menurut tahap', () => {
  const boleh = (status: string) =>
    HrCandidateListComponent.prototype.statusBoleh.call({}, { status });

  it('sebelum wawancara: Diwawancara atau Gagal', () => {
    for (const st of ['baru', 'mengerjakan', 'selesai', 'dinilai', 'ditolak']) {
      expect(boleh(st)).toEqual(['diwawancara', 'ditolak']);
    }
  });

  it('sesudah wawancara: Gagal saat diwawancara atau Berhasil', () => {
    for (const st of ['diwawancara', 'gagal_wawancara', 'diterima']) {
      expect(boleh(st)).toEqual(['diwawancara', 'gagal_wawancara', 'diterima']);
    }
  });
});
