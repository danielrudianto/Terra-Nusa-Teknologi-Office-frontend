/**
 * Fleet catalogue — hardcoded (not stored in the database).
 * `id` is a stable 1..18 reference used as purchase_order_items.fleet_id.
 * Dimensions (mm) are indicative cargo-space figures; maxLoad in kg.
 * Sources: Deliveree, EasyGo, Papandayan Cargo, forwarder.ai (Indonesian
 * logistics references, 2025–2026). Actual specs vary per unit.
 */
export interface FleetOption {
  id: number;
  name: string;
  icon: string;
  maxWidth: number;
  maxHeight: number;
  maxLength: number;
  maxLoad: number; // kg
  wheelCount: number;
  axles?: number; // more meaningful for tronton/trailer
}

export const FLEET_OPTIONS: FleetOption[] = [
  {
    /*
     * MPV — Avanza, Xenia, dan sejenisnya, dipakai MENGANGKUT BARANG.
     *
     * Bukan kendaraan barang, tetapi nyata dipakai untuk kiriman kecil dan
     * mendesak: contoh uji ke laboratorium, suku cadang, dokumen berukuran
     * besar. Tanpa pilihan ini, yang mengisi terpaksa memilih Blind Van dan
     * dokumennya menyebut kendaraan yang tidak pernah datang.
     *
     * `id: 22` — nomor BARU, bukan menyisipkan di antara yang ada.
     * Dokumen lama menyimpan nomornya, bukan namanya; menggeser nomor
     * membuat setiap SPK lama menyebut kendaraan yang berbeda dari yang
     * ditandatangani.
     *
     * DIMENSI — sebagian bersumber, sebagian turunan:
     *
     *   bersumber : kapasitas bagasi 1.456 liter dengan kedua baris kursi
     *               dilipat rata; tinggi ruang 675-855 mm
     *   turunan   : 1600 x 1200 x 760 mm menghasilkan 1.459 liter, sepadan
     *               dengan angka itu
     *   perkiraan : muatan 500 kg — dihitung dari bobot maksimum dikurangi
     *               bobot kosong dan satu pengemudi, DIBULATKAN KE BAWAH
     *
     * Angka muatan sengaja konservatif: yang memesan berpatokan padanya, dan
     * kelebihan muatan pada kendaraan penumpang lebih berbahaya daripada
     * pada truk yang memang dirancang untuk itu.
     */
    id: 22,
    name: 'MPV (Avanza/Xenia)',
    icon: 'van',
    maxWidth: 1200,
    maxHeight: 760,
    maxLength: 1600,
    maxLoad: 500,
    wheelCount: 4,
  },
  {
    id: 1,
    name: 'Blind Van',
    icon: 'van',
    maxWidth: 1350,
    maxHeight: 1300,
    maxLength: 2200,
    maxLoad: 750,
    wheelCount: 4,
  },
  {
    id: 2,
    name: 'Pick up Bak',
    icon: 'pickup',
    maxWidth: 1500,
    maxHeight: 1200,
    maxLength: 2000,
    maxLoad: 1000,
    wheelCount: 4,
  },
  {
    id: 3,
    name: 'Pick up Box',
    icon: 'pickup',
    maxWidth: 1600,
    maxHeight: 1600,
    maxLength: 2400,
    maxLoad: 1000,
    wheelCount: 4,
  },
  {
    id: 4,
    name: 'Engkel (CDE) Box',
    icon: 'engkel',
    maxWidth: 1700,
    maxHeight: 1700,
    maxLength: 3000,
    maxLoad: 2000,
    wheelCount: 4,
  },
  {
    id: 5,
    name: 'Engkel (CDE) Bak',
    icon: 'engkel',
    maxWidth: 1700,
    maxHeight: 1700,
    maxLength: 3100,
    maxLoad: 2500,
    wheelCount: 4,
  },
  {
    id: 6,
    name: 'CDD Box',
    icon: 'cdd',
    maxWidth: 2000,
    maxHeight: 2000,
    maxLength: 4200,
    maxLoad: 5000,
    wheelCount: 6,
  },
  {
    id: 7,
    name: 'CDD Bak',
    icon: 'cdd',
    maxWidth: 2000,
    maxHeight: 2000,
    maxLength: 4500,
    maxLoad: 5000,
    wheelCount: 6,
  },
  {
    id: 8,
    name: 'CDD Long Box',
    icon: 'cdd_long',
    maxWidth: 2000,
    maxHeight: 2100,
    maxLength: 5300,
    maxLoad: 6000,
    wheelCount: 6,
  },
  {
    id: 9,
    name: 'Fuso Bak',
    icon: 'fuso',
    maxWidth: 2300,
    maxHeight: 2200,
    maxLength: 5700,
    maxLoad: 8000,
    wheelCount: 6,
  },
  {
    id: 10,
    name: 'Fuso Box',
    icon: 'fuso',
    maxWidth: 2300,
    maxHeight: 2200,
    maxLength: 5700,
    maxLoad: 8000,
    wheelCount: 6,
  },
  {
    id: 11,
    name: 'Fuso Fighter Bak',
    icon: 'fuso',
    maxWidth: 2400,
    maxHeight: 2400,
    maxLength: 6200,
    maxLoad: 8000,
    wheelCount: 6,
  },
  {
    id: 12,
    name: 'Fuso Fighter Box',
    icon: 'fuso',
    maxWidth: 2400,
    maxHeight: 2400,
    maxLength: 6200,
    maxLoad: 8000,
    wheelCount: 6,
  },
  {
    id: 13,
    name: 'Tronton Wingbox',
    icon: 'wingbox',
    maxWidth: 2450,
    maxHeight: 2500,
    maxLength: 9500,
    maxLoad: 18000,
    wheelCount: 10,
    axles: 3,
  },
  {
    id: 14,
    name: 'Tronton Bak',
    icon: 'tronton',
    maxWidth: 2400,
    maxHeight: 2400,
    maxLength: 9000,
    maxLoad: 20000,
    wheelCount: 10,
    axles: 3,
  },
  {
    id: 15,
    name: 'Tronton Box',
    icon: 'tronton',
    maxWidth: 2450,
    maxHeight: 2500,
    maxLength: 9500,
    maxLoad: 20000,
    wheelCount: 10,
    axles: 3,
  },
  {
    id: 16,
    name: 'Trailer 20ft',
    icon: 'trailer',
    maxWidth: 2350,
    maxHeight: 2390,
    maxLength: 6000,
    maxLoad: 25000,
    wheelCount: 16,
    axles: 4,
  },
  {
    id: 17,
    name: 'Trailer 40ft',
    icon: 'trailer',
    maxWidth: 2350,
    maxHeight: 2390,
    maxLength: 12000,
    maxLoad: 30000,
    wheelCount: 22,
    axles: 6,
  },
  {
    id: 18,
    name: 'Trailer Lowbed',
    icon: 'trailer',
    maxWidth: 2500,
    maxHeight: 2000,
    maxLength: 12000,
    maxLoad: 30000,
    wheelCount: 22,
    axles: 6,
  },
  {
    id: 19,
    name: 'CDD Long Bak',
    icon: 'cdd_long',
    maxWidth: 2000,
    maxHeight: 2100,
    maxLength: 5300,
    maxLoad: 6000,
    wheelCount: 6,
  },
  {
    id: 20,
    name: 'Self Loader',
    icon: 'selfloader',
    maxWidth: 2400,
    maxHeight: 2200,
    maxLength: 8500,
    maxLoad: 20000,
    wheelCount: 10,
    axles: 3,
  },
  {
    id: 21,
    name: 'Dolly',
    icon: 'dolly',
    maxWidth: 3000,
    maxHeight: 700,
    maxLength: 8000,
    maxLoad: 40000,
    wheelCount: 16,
    axles: 4,
  },
];

/**
 * Fixed fleet_id sentinels for non-road modes (no real vehicle picked).
 * Kept out of FLEET_OPTIONS so they never show up in the picker/search.
 *   udara = 1000, laut = 1001, ekspedisi = 1002
 * Road (darat) uses the real fleet id (1..21).
 */
export const MODE_FLEET_ID: { [mode: string]: number } = {
  udara: 1000,
  laut: 1001,
};

/** Reverse lookup: mode label from a sentinel fleet_id (for read-back). */
export const FLEET_ID_MODE: { [id: number]: string } = {
  1000: 'udara',
  1001: 'laut',
  // Ekspedisi tidak lagi ditawarkan saat membuat PO baru karena isinya
  // tumpang tindih dengan ketiga moda lain. Pemetaan ini dipertahankan agar
  // PO lama yang memakainya tetap terbaca.
  1002: 'ekspedisi',
};
