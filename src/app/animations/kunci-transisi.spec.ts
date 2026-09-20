import { kunciTransisi, SimpulRute } from './transisi-rute';

/**
 * Transisi berlapis di layout bersarang.
 *
 * GEJALANYA
 *
 * "di data master, kenapa tiap kali gw pindah dari supplier ke karyawan, ini
 * yang transisi nya 1 page 1 page nya"
 *
 * Data Master memasang `appTransisiHalaman` pada outlet DI DALAMNYA, dan
 * kerangka utama memasangnya pada outlet luar. Kunci kerangka utama dulu URL
 * penuh, jadi berpindah anak rute di dalam Data Master mengubahnya — dan
 * keduanya menyala untuk satu perpindahan.
 *
 * Yang terlihat: seluruh halaman Master bergerak, lalu isinya bergerak lagi.
 * Opasitasnya berkalian (0->1 dua kali) dan pergeserannya bertumpuk. Tidak ada
 * galat, tidak ada yang rusak — satu perpindahan sekadar terbaca sebagai dua.
 *
 * KENAPA DIUJI DI SINI, BUKAN LEWAT `MainComponent`
 *
 * Menguji lewat `RouterTestingHarness` berarti membangun `MainComponent`
 * beserta `PermissionService`, `VersiService`, `SettingsService`, dan empat
 * komponen anaknya — untuk memeriksa sebuah penelusuran pohon. Logikanya
 * ditarik keluar menjadi fungsi murni justru supaya ujinya semurah ini.
 */

function simpul(
  jalur: string[],
  data: Record<string, unknown> | undefined,
  anak: SimpulRute | null,
): SimpulRute {
  return {
    snapshot: { url: jalur.map((path) => ({ path })), data },
    firstChild: anak,
  };
}

/** Pohon `/Master/<anak>` dengan Data Master menyatakan transisinya sendiri. */
function pohonMaster(anak: string): SimpulRute {
  return simpul(
    [],
    undefined,
    simpul(['Master'], { transisiBersarang: true }, simpul([anak], {}, null)),
  );
}

describe('kunciTransisi', () => {
  it('memberi kunci yang SAMA untuk dua anak Data Master', () => {
    const pemasok = kunciTransisi(pohonMaster('Supplier'), '/Master/Supplier');
    const karyawan = kunciTransisi(pohonMaster('Employee'), '/Master/Employee');

    expect(pemasok).toBe('/Master');
    expect(karyawan).toBe('/Master');
    expect(pemasok).toBe(karyawan);
  });

  it('BERUBAH saat masuk dan keluar Data Master', () => {
    // Kalau ini pun sama, Data Master tidak pernah beranimasi sama sekali saat
    // dibuka dari menu samping — perbaikan yang berubah menjadi kerusakan lain.
    const dariLuar = kunciTransisi(
      simpul([], undefined, simpul(['Purchase'], {}, null)),
      '/Purchase',
    );

    expect(dariLuar).not.toBe('/Master');
  });

  it('tidak memotong rute biasa — halaman berparameter tetap beranimasi', () => {
    const satu = kunciTransisi(
      simpul([], undefined, simpul(['Purchase', '1'], {}, null)),
      '/Purchase/1',
    );
    const dua = kunciTransisi(
      simpul([], undefined, simpul(['Purchase', '2'], {}, null)),
      '/Purchase/2',
    );

    expect(satu).toBe('/Purchase/1');
    expect(dua).toBe('/Purchase/2');
    expect(satu).not.toBe(dua);
  });

  it('mempertahankan parameter kueri di luar subpohon bersarang', () => {
    // Menyaring daftar lewat parameter kueri mengganti isi halaman, dan
    // animasinya yang menandai bahwa isinya memang berganti.
    const hasil = kunciTransisi(
      simpul([], undefined, simpul(['Purchase'], {}, null)),
      '/Purchase?status=draft',
    );

    expect(hasil).toBe('/Purchase?status=draft');
  });

  it('berhenti di rute bersarang PERTAMA, meski ada yang lebih dalam', () => {
    const pohon = simpul(
      [],
      undefined,
      simpul(
        ['Master'],
        { transisiBersarang: true },
        simpul(['Employee'], { transisiBersarang: true }, null),
      ),
    );

    expect(kunciTransisi(pohon, '/Master/Employee')).toBe('/Master');
  });

  it('tidak melempar pada pohon yang belum lengkap', () => {
    // `route.root` dibaca saat `ngOnInit`, sebelum navigasi pertama selesai
    // pada sebagian jalur. Melempar di sana MEMATIKAN langganan rutenya, dan
    // sesudah itu tidak ada satu pun perpindahan yang menyalakan transisi —
    // tanpa apa pun di layar yang menunjukkannya.
    expect(kunciTransisi(null, '/Apa')).toBe('/Apa');
    expect(
      kunciTransisi({ snapshot: {} as any, firstChild: null }, '/Apa'),
    ).toBe('/Apa');
  });
});
