/**
 * Pembalikan pemetaan baris dokumen, per varian purchase order.
 *
 * Saat disimpan, tiap varian memampatkan isian barisnya ke kolom bersama
 * `remarks_1` sampai `remarks_6`. Pemetaannya BERBEDA-BEDA: `remarks_1` pada
 * PO-A adalah lokasi asal, pada PO-B tanggal mulai sewa, pada PO-511 catatan
 * barang.
 *
 * Karena itu tidak ada satu pemetaan bersama yang benar. Memakai satu peta
 * untuk semuanya menghasilkan baris yang isinya tertukar — dan itu tidak
 * menimbulkan galat, hanya dokumen yang salah isi.
 *
 * Berkas ini menyimpan kebalikannya, satu fungsi per varian, disusun langsung
 * dari `formatData()` masing-masing. Bila `formatData()` sebuah varian
 * berubah, fungsi di sini harus ikut berubah — `warisancek.py` memeriksa
 * keduanya tetap sepadan.
 */

import { bacaJumlahAlat } from './unit-sewa';

/** Satu baris `items` sebagaimana dikembalikan server. */
export interface BarisDokumen {
  item_id?: number | null;
  /** Nama barang dari master; server melabelinya begini, bukan `description`. */
  item_description?: string | null;
  equipment_name?: string | null;
  sku?: string | null;
  equipment_id?: number | null;
  fleet_id?: number | null;
  task?: string | null;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
  /**
   * Jumlah baris yang DITULIS — pembetulan pembulatan, bukan harga.
   *
   * Kosong pada hampir seluruh baris; hanya terisi bila volume kali harga
   * tidak pernah bulat pada empat desimal. Lihat `nilai-baris.helper.ts`.
   *
   * Sebagian varian — PO-A, 6.4.1, 6.4.2 — memakai nama isian `amount`
   * untuk hal yang BERBEDA (nominalnya sendiri). Karena itu kolom ini tidak
   * dipulihkan di `dasar()` melainkan disebut satu per satu pada varian
   * yang memang memakainya begini.
   */
  amount?: number | null;
  remarks_1?: string | null;
  remarks_2?: string | null;
  remarks_3?: string | null;
  remarks_4?: string | null;
  remarks_5?: string | null;
  remarks_6?: string | null;
}

/**
 * Volume dikosongkan pada adendum, disalin pada koreksi.
 *
 * Adendum berisi SELISIH — pada dokumen yang aslinya 100 m3, adendumnya
 * memuat 5, bukan 105. Menyalin volume induk membuat yang mengisi tinggal
 * menekan simpan dan menggandakan seluruh pekerjaannya tanpa menyadarinya.
 */
function volume(x: BarisDokumen, isUbah: boolean): number | null {
  return isUbah ? (Number(x.quantity) || 0) : null;
}

/**
 * Nama barang dari baris dokumen.
 *
 * Server mengembalikannya sebagai `item_description` dan `equipment_name` —
 * BUKAN `description` dan `name` seperti pada objek katalog. Pembangun baris
 * tiap varian menerima objek katalog, sehingga membacanya apa adanya
 * menghasilkan nama kosong: yang menyunting hanya melihat SKU, dan harus
 * membuka master barang untuk tahu itu barang apa.
 */
function namaBarang(x: BarisDokumen): string {
  return x.item_description ?? x.equipment_name ?? '';
}

const dasar = (x: BarisDokumen, isUbah: boolean) => ({
  quantity: volume(x, isUbah),
  unit: x.unit ?? '',
  price: Number(x.price) || 0,
  // Disertakan pada SETIAP varian: yang punya isian `description` atau
  // `sku` akan terisi, yang tidak punya mengabaikannya — `patchValue`
  // melewati kunci yang tidak ada di formulirnya.
  description: namaBarang(x),
  sku: x.sku ?? '',
});

/**
 * Fleet id untuk moda selain darat; kebalikan `MODE_FLEET_ID` pada PO-A.
 *
 * Disalin ke sini, bukan diimpor, karena berkas ini tidak boleh bergantung
 * pada komponen mana pun — ia dipakai OLEH komponen.
 */
const FLEET_UDARA = 1000;
const FLEET_LAUT = 1001;

function modaDariFleet(fleetId: number | null | undefined): string {
  if (fleetId === FLEET_UDARA) return 'udara';
  if (fleetId === FLEET_LAUT) return 'laut';
  return 'darat';
}

/**
 * Pembalikan per varian.
 *
 * Kuncinya kode varian sebagaimana dipakai pada nama komponennya.
 */
export const BALIK_BARIS: Record<
  string,
  (x: BarisDokumen, isUbah: boolean) => Record<string, unknown>
> = {
  // --- barang: catatan di remarks_1 ---
  '511': (x, u) => ({
    ...dasar(x, u),
    item_id: x.item_id,
    remarks: x.remarks_1 ?? '',
    amount: x.amount ?? null,
  }),
  '5112': (x, u) => ({ ...dasar(x, u), remarks: x.remarks_1 ?? '' }),
  '516': (x, u) => ({
    ...dasar(x, u),
    item_id: x.item_id,
    remarks: x.remarks_1 ?? '',
    amount: x.amount ?? null,
  }),
  c: (x, u) => ({ ...dasar(x, u), item_id: x.item_id, remarks: x.remarks_1 ?? '' }),
  g: (x, u) => ({
    ...dasar(x, u),
    item_id: x.item_id,
    remarks: x.remarks_1 ?? '',
    amount: x.amount ?? null,
  }),

  // --- barang ATAU jasa: `task` terisi hanya pada jasa ---
  '512': (x, u) => ({
    ...dasar(x, u),
    item_id: x.item_id,
    amount: x.amount ?? null,
    task: x.task ?? '',
    note: x.remarks_1 ?? '',
    asset: x.remarks_2 ?? '',
  }),
  '63': (x, u) => ({
    ...dasar(x, u),
    item_id: x.item_id,
    task: x.task ?? '',
    note: x.remarks_1 ?? '',
  }),

  // --- jasa dengan uraian ---
  '641': (x, u) => ({
    ...dasar(x, u),
    description: x.remarks_1 ?? '',
    targetDays: x.remarks_2 ?? '',
  }),
  '651': (x, u) => ({ ...dasar(x, u), task: x.task ?? '', note: x.remarks_1 ?? '' }),
  '652': (x, u) => ({
    ...dasar(x, u),
    startDate: x.remarks_1 ?? '',
    endDate: x.remarks_2 ?? '',
    issuer: x.remarks_3 ?? '',
  }),
  h: (x, u) => ({ ...dasar(x, u), task: x.task ?? '' }),

  // --- pengujian material: barang dari katalog, catatan di remarks_1 ---
  f: (x, u) => ({ ...dasar(x, u), item_id: x.item_id, remarks: x.remarks_1 ?? '' }),

  // --- pertanggungan: rinciannya di customData, `items` hanya angkanya ---
  '642': (x, u) => ({ ...dasar(x, u), object: x.remarks_1 ?? '' }),

  // --- sewa alat ---
  b: (x, u) => ({
    ...dasar(x, u),
    equipment_id: x.equipment_id,
    item_id: x.item_id,
    fromDate: x.remarks_1 ?? '',
    toDate: x.remarks_2 ?? '',
    location: x.remarks_3 ?? '',
    mobilisasi: Number(x.remarks_4) || 0,
    demobilisasi: Number(x.remarks_5) || 0,
    // Jumlah alat, terpisah dari durasinya; `remarks_6` berisi `10|set`.
    // Dokumen lama tidak memuatnya dan dibaca sebagai satu.
    ...bacaJumlahAlat(x.remarks_6),
  }),

  /**
   * Pengiriman.
   *
   * Moda disimpulkan dari `fleet_id`, dan isi `remarks_3` serta `remarks_4`
   * BERBEDA ARTI menurut modanya — pada darat nomor polisi dan supir, pada
   * laut/udara nama penyedia dan nomor rujukan. Menyalinnya ke bidang yang
   * sama membuat nomor polisi tertulis sebagai nama maskapai.
   */
  a: (x, u) => {
    const mode = modaDariFleet(x.fleet_id);
    const darat = mode === 'darat';
    return {
      ...dasar(x, u),
      mode,
      fleet_id: darat ? x.fleet_id : '',
      deliveryDate: x.task ?? '',
      from: x.remarks_1 ?? '',
      to: x.remarks_2 ?? '',
      nopol: darat ? (x.remarks_3 ?? '') : '',
      provider: darat ? '' : (x.remarks_3 ?? ''),
      driver: darat ? (x.remarks_4 ?? '') : '',
      refNumber: darat ? '' : (x.remarks_4 ?? ''),
      picName: x.remarks_5 ?? '',
      picPhone: x.remarks_6 ?? '',
      // `amount` adalah nama isian pada layarnya; `price` nama kolomnya.
      amount: Number(x.price) || 0,
    };
  },
};
