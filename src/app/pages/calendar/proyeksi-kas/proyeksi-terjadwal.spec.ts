/*
 * Proyeksi kas ikut menghitung pembayaran yang SUDAH diinput.
 *
 * Kas hari ini hanya memuat pembayaran disetujui sampai hari ini. Tanpa
 * pembayaran terjadwal, proyeksi 31 Okt 2026 terbaca 1.209 jt sementara
 * kalender dan Excel menyebut 161 jt — selisihnya persis pembayaran
 * 23 Sep–31 Okt yang sudah diinput (1.048 jt).
 */
import { barisTerjadwal, titikProyeksi } from './proyeksi-kas.component';

describe('proyeksi kas: pembayaran terjadwal', () => {
  const HARI_INI = '2026-09-22';

  it('bawaan dibebankan ke hari ini, harian ke tanggalnya', () => {
    const b = barisTerjadwal(
      {
        bawaanKeluar: 100,
        bawaanMasuk: 0,
        harian: [{ tanggal: '2026-09-24', keluar: 40, masuk: 10 }],
      },
      HARI_INI,
    );
    expect(b).toEqual([
      { status: 'rencana', terjadwal: true, date: HARI_INI, planType: 'keluar', amount: 100 },
      { status: 'rencana', terjadwal: true, date: '2026-09-24', planType: 'keluar', amount: 40 },
      { status: 'rencana', terjadwal: true, date: '2026-09-24', planType: 'masuk', amount: 10 },
    ]);
    expect(barisTerjadwal(null, HARI_INI)).toEqual([]);
  });

  it('titik hari ini tetap kas sungguhan; bawaan masuk besok', () => {
    const b = barisTerjadwal({ bawaanKeluar: 100, bawaanMasuk: 0, harian: [] }, HARI_INI);
    const t = titikProyeksi(b, 1000, HARI_INI, 1);
    expect(t[0].saldo).toBe(1000);
    expect(t[1].tanggal).toBe('2026-09-23');
    expect(t[1].saldo).toBe(900);
  });

  it('angka 31 Okt sepakat dengan kalender: rencana + terjadwal', () => {
    // Pembulatan juta dari kasus 22 Sep 2026.
    const rencana = [
      { status: 'rencana', planType: 'masuk', amount: 2518.29, date: '2026-10-15' },
      { status: 'rencana', planType: 'keluar', amount: 1816.34, date: '2026-10-20' },
    ];
    const terjadwal = barisTerjadwal(
      { bawaanKeluar: 0, bawaanMasuk: 0, harian: [{ tanggal: '2026-09-30', keluar: 1048.12, masuk: 0 }] },
      HARI_INI,
    );
    const tanpa = titikProyeksi(rencana, 507.34, HARI_INI, 13);
    const dengan = titikProyeksi([...rencana, ...terjadwal], 507.34, HARI_INI, 13);
    const pada = (t: any[]) => t.find((x) => x.tanggal === '2026-10-31')!.saldo;
    expect(pada(tanpa)).toBeCloseTo(1209.29, 2);
    expect(pada(dengan)).toBeCloseTo(161.17, 2);
  });
});
