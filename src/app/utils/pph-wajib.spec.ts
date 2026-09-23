import { FormControl, FormGroup } from '@angular/forms';
import { pphDiputuskan, tarifPphNol } from './pph-wajib';

function grup(nilai: Partial<Record<string, unknown>> = {}) {
  return new FormGroup(
    {
      pphCode: new FormControl(nilai['pphCode'] ?? ''),
      pphTaxObject: new FormControl(nilai['pphTaxObject'] ?? ''),
      pphPercentage: new FormControl(nilai['pphPercentage'] ?? 0),
      tanpaPph: new FormControl(nilai['tanpaPph'] ?? false),
    },
    { validators: pphDiputuskan() },
  );
}

describe('PPh wajib diputuskan', () => {
  it('kosong tanpa pernyataan: ditolak', () => {
    // Inilah keadaan yang membuat SELURUH SPK operator terbit tanpa PPh.
    expect(grup().valid).toBeFalse();
    expect(grup().errors?.['pphBelumDiputuskan']).toBeTrue();
  });

  it('kode terpilih: lolos', () => {
    expect(grup({ pphCode: '21-100-03', pphPercentage: 2.5 }).valid).toBeTrue();
  });

  it('dinyatakan tanpa PPh: lolos', () => {
    // Pekerja di bawah batas memang tidak dipotong — SPK-nya harus tetap
    // dapat terbit, asalkan ada yang menyatakannya.
    expect(grup({ tanpaPph: true }).valid).toBeTrue();
  });

  it('spasi saja bukan pilihan', () => {
    expect(grup({ pphCode: '   ' }).valid).toBeFalse();
  });

  describe('peringatan tarif nol', () => {
    it('kode bertarif nol ditandai', () => {
      // `21-100-35` — kode yang menyebabkan CoP operator tidak memotong.
      expect(tarifPphNol(grup({ pphCode: '21-100-35', pphPercentage: 0 }))).toBeTrue();
    });

    it('kode bertarif ada tidak ditandai', () => {
      expect(tarifPphNol(grup({ pphCode: '21-100-03', pphPercentage: 2.5 }))).toBeFalse();
    });

    it('belum memilih apa pun BUKAN peringatan tarif nol', () => {
      // Itu keadaan "belum diputuskan", yang sudah dijaga validator —
      // menampilkan dua peringatan sekaligus hanya membingungkan.
      expect(tarifPphNol(grup())).toBeFalse();
    });

    it('SKB yang menolkan tarif tetap ditandai', () => {
      expect(tarifPphNol(grup({ pphCode: '23-104-01', pphPercentage: 0 }))).toBeTrue();
    });
  });
});
