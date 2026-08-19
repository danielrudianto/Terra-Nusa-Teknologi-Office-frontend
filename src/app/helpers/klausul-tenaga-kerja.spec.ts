/*
 * Konteks klausul SPK tenaga kerja.
 *
 * Tiga tempat pernah menyusunnya sendiri-sendiri — formulir, halaman lihat,
 * dan cetak ulang — dan ketiganya menghasilkan dokumen yang berbeda untuk
 * satu purchase order yang sama. Yang paling sedikit isinya justru yang
 * dicetak dan ditandatangani.
 *
 * Yang diuji di sini bukan kalimatnya, melainkan yang menentukan kalimat itu
 * muncul atau tidak: jangka waktu perjanjian dan jadwal upah.
 */
import {
  kalimatJadwalUpah,
  kalimatJadwalUpahPertama,
  konteksKlausulTenagaKerja,
  tanggalPanjang,
} from './klausul-tenaga-kerja.helper';

describe('konteksKlausulTenagaKerja', () => {
  it('membentuk kalimat tanggal dari nilai ISO yang tersimpan', () => {
    const ctx = konteksKlausulTenagaKerja({ contractStart: '2026-02-05' });
    expect(ctx.contractStartText).toBe('5 Februari 2026');
  });

  it('tidak menimpa teks tanggal yang sudah ada', () => {
    const ctx = konteksKlausulTenagaKerja({
      contractStart: '2026-02-05',
      contractStartText: '5 Feb 2026',
    });
    expect(ctx.contractStartText).toBe('5 Feb 2026');
  });

  it('merakit jadwal upah dari data tersimpan', () => {
    const ctx = konteksKlausulTenagaKerja({
      wageSchedules: [
        {
          task: 'Operator bor',
          wages: [
            {
              label: 'Uang makan',
              scheduleType: 'weekly',
              payDay: 'Sabtu',
              cutoffDay: 'Rabu',
            },
          ],
        },
      ],
    });

    expect(ctx.wageSchedules.length).toBe(2);
    expect(ctx.wageSchedules[0]).toContain('setiap minggu pada hari Sabtu');
    // Periode mulai dihitung sehari SESUDAH cut-off.
    expect(ctx.wageSchedules[1]).toContain('dimulai hari Kamis');
  });

  it('dokumen tanpa jadwal tersimpan tidak melempar galat', () => {
    // Dokumen yang dibuat sebelum jadwalnya disimpan; jadwalnya memang hilang.
    const ctx = konteksKlausulTenagaKerja({ contractStart: '2026-02-05' });
    expect(ctx.wageSchedules).toEqual([]);
  });

  it('meneruskan seluruh pengaturan lain apa adanya', () => {
    const ctx = konteksKlausulTenagaKerja(
      { isFieldStaff: true, overtimeRate: 10000, includeSundayPolicy: true },
      { projectName: 'ALPHA' },
    );
    expect(ctx.isFieldStaff).toBe(true);
    expect(ctx.overtimeRate).toBe(10000);
    expect(ctx.includeSundayPolicy).toBe(true);
    expect(ctx.projectName).toBe('ALPHA');
  });
});

describe('kalimatJadwalUpah', () => {
  it('dua kali sebulan memakai cutoffFirst yang tersimpan', () => {
    const [a] = kalimatJadwalUpah(
      { label: 'Insentif bor', scheduleType: 'semiMonthly', cutoffFirst: 20 },
      1,
    );
    expect(a).toContain('rincian pekerjaan 2');
    expect(a).toContain('tanggal 20');
  });

  it('cut-off akhir bulan disebut apa adanya', () => {
    const [, b] = kalimatJadwalUpah(
      { label: 'Gaji pokok', scheduleType: 'sameMonth', cutoffDate: 'end' },
      0,
    );
    expect(b).toContain('akhir bulan');
  });

  it('hanya jadwal pekerjaan pertama yang dipakai', () => {
    const hasil = kalimatJadwalUpahPertama([
      { task: 'A', wages: [{ label: 'Upah A', scheduleType: 'weekly' }] },
      { task: 'B', wages: [{ label: 'Upah B', scheduleType: 'weekly' }] },
    ]);
    expect(hasil.join(' ')).toContain('Upah A');
    expect(hasil.join(' ')).not.toContain('Upah B');
  });
});

describe('tanggalPanjang', () => {
  it('nilai kosong menghasilkan teks kosong, bukan "Invalid Date"', () => {
    expect(tanggalPanjang(null)).toBe('');
    expect(tanggalPanjang('bukan tanggal')).toBe('');
  });
});
