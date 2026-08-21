/**
 * Keterangan satu baris dokumen, untuk ditampilkan tanpa membuka PDF.
 *
 * Baris disimpan memakai kolom bersama `remarks_1` sampai `remarks_6`, dan
 * ARTINYA berbeda tiap varian: pada PO-A `remarks_1` lokasi asal, pada PO-B
 * tanggal mulai sewa, pada PO-511 catatan barang.
 *
 * Tanpa pemetaan ini, dialog lihat hanya dapat menampilkan `task` — yang pada
 * PO-A kebetulan berisi tanggal kirim. Hasilnya daftar berisi tujuh tanggal
 * tanpa satu pun keterangan tentang dari mana ke mana, kendaraan apa, dan
 * siapa pengemudinya. Yang memeriksanya terpaksa membuka PDF untuk tahu isi
 * dokumen yang sedang ia periksa.
 */

export interface BarisTampil {
  /** Baris utama; nama barang atau uraian pekerjaannya. */
  judul: string;
  /** Baris kecil di bawahnya; kosong berarti tidak ada yang perlu disebut. */
  rincian: string[];
}

const FLEET_UDARA = 1000;
const FLEET_LAUT = 1001;

/**
 * Nama kendaraan darat.
 *
 * Daftarnya ada di layar pembuatan; di sini hanya nomornya yang tersimpan.
 * Bila tidak dikenali, nomornya tidak ditampilkan sama sekali — angka telanjang
 * tidak berarti apa pun bagi yang membacanya.
 */
const NAMA_ARMADA: Record<number, string> = {
  1: 'Blind Van',
  2: 'Pick up Bak',
  3: 'Pick up Box',
  4: 'Engkel (CDE) Box',
  5: 'Engkel (CDE) Bak',
  6: 'CDD Box',
  7: 'CDD Bak',
  8: 'CDD Long Box',
  9: 'Fuso Bak',
  10: 'Fuso Box',
  11: 'Fuso Fighter Bak',
  12: 'Fuso Fighter Box',
  13: 'Tronton Wingbox',
  14: 'Tronton Bak',
  15: 'Tronton Box',
  16: 'Trailer 20ft',
  17: 'Trailer 40ft',
  18: 'Trailer Lowbed',
  19: 'CDD Long Bak',
  20: 'Self Loader',
  21: 'Dolly',
  // MPV yang dipakai mengangkut barang; lihat `fleet.ts`.
  22: 'MPV (Avanza/Xenia)',
};

/** Buang nilai kosong supaya tidak ada baris rincian yang hanya berisi pemisah. */
const isi = (...x: (string | null | undefined)[]): string[] =>
  x.map((v) => (v ?? '').trim()).filter((v) => v.length > 0);

function namaBarang(x: any): string {
  return (
    x?.item_description || x?.equipment_name || x?.name || x?.sku || ''
  );
}

/**
 * Tanggal ringkas untuk baris rincian.
 *
 * Disusun dari bagian waktu SETEMPAT; `toISOString()` memundurkan tanggalnya
 * tujuh jam bagi WIB.
 */
function tanggalRingkas(v: any): string {
  if (!v) return '';
  const t = v instanceof Date ? v : new Date(v);
  if (isNaN(t.getTime())) return String(v);
  const B = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return `${t.getDate()} ${B[t.getMonth()]} ${t.getFullYear()}`;
}

/**
 * Pengiriman: dari mana, ke mana, naik apa, siapa pengemudinya.
 *
 * `remarks_3` dan `remarks_4` BERBEDA ARTI menurut modanya — pada darat nomor
 * polisi dan supir, pada laut/udara nama penyedia dan nomor rujukan.
 */
function barisPengiriman(x: any): BarisTampil {
  const fleet = Number(x?.fleet_id);
  const laut = fleet === FLEET_LAUT;
  const udara = fleet === FLEET_UDARA;
  const darat = !laut && !udara;

  const dari = x?.remarks_1 ?? '';
  const ke = x?.remarks_2 ?? '';
  const judul = dari || ke ? `${dari || '—'} → ${ke || '—'}` : 'Pengiriman';

  const moda = laut ? 'Laut' : udara ? 'Udara' : 'Darat';
  const armada = darat ? NAMA_ARMADA[fleet] : '';

  return {
    judul,
    rincian: [
      ...isi(armada ? `${moda} · ${armada}` : moda),
      ...isi(
        darat
          ? x?.remarks_3 && `Nopol ${x.remarks_3}`
          : x?.remarks_3 && `Penyedia ${x.remarks_3}`,
      ),
      ...isi(
        darat
          ? x?.remarks_4 && `Pengemudi ${x.remarks_4}`
          : x?.remarks_4 && `No. rujukan ${x.remarks_4}`,
      ),
      ...isi(x?.task && `Kirim ${tanggalRingkas(x.task)}`),
    ],
  };
}

/** Sewa alat: berapa lama, di mana. */
function barisSewa(x: any): BarisTampil {
  const mulai = tanggalRingkas(x?.remarks_1);
  const selesai = tanggalRingkas(x?.remarks_2);
  return {
    judul: namaBarang(x) || x?.task || 'Sewa alat',
    rincian: [
      ...isi(mulai && selesai ? `${mulai} – ${selesai}` : mulai || selesai),
      ...isi(x?.remarks_3 && `Lokasi ${x.remarks_3}`),
    ],
  };
}

/** Barang katalog: nama, SKU, catatan. */
function barisBarang(x: any): BarisTampil {
  return {
    judul: namaBarang(x) || x?.task || '—',
    rincian: [
      ...isi(x?.sku),
      ...isi(x?.remarks_1),
    ],
  };
}

/** Pertanggungan: jenis, objek yang dijamin. */
function barisPertanggungan(x: any): BarisTampil {
  return {
    judul: x?.task || 'Pertanggungan',
    rincian: isi(x?.remarks_1 && `Objek ${x.remarks_1}`),
  };
}

/** Jasa dengan uraian pekerjaan. */
function barisJasa(x: any): BarisTampil {
  return {
    judul: x?.task || namaBarang(x) || '—',
    rincian: isi(x?.remarks_1),
  };
}

/** Sertifikasi / perizinan berjangka. */
function barisBerjangka(x: any): BarisTampil {
  const mulai = tanggalRingkas(x?.remarks_1);
  const selesai = tanggalRingkas(x?.remarks_2);
  return {
    judul: x?.task || '—',
    rincian: [
      ...isi(mulai && selesai ? `${mulai} – ${selesai}` : mulai || selesai),
      ...isi(x?.remarks_3 && `Penerbit ${x.remarks_3}`),
    ],
  };
}

/**
 * Upah tenaga kerja harian (PO-D).
 *
 * Satu pekerja diratakan menjadi beberapa baris — satu per KOMPONEN upah
 * (gaji, uang makan, uang transportasi), yang tersimpan di `remarks_3`.
 * Judulnya komponen upahnya, BUKAN nama pekerjaannya: `task` sama untuk
 * ketiga baris ("Staff Engineer" tiga kali) sehingga tidak membedakan apa
 * pun, sementara komponennyalah yang menyatakan baris ini bayaran untuk apa.
 * Nama pekerjaannya dipindah ke rincian, dan identitas pekerja sudah tampil
 * di kepala dokumen.
 */
function barisUpah(x: any): BarisTampil {
  return {
    judul: x?.remarks_3 || x?.task || 'Upah',
    rincian: isi(x?.task),
  };
}

const PETA: Record<string, (x: any) => BarisTampil> = {
  A: barisPengiriman,
  B: barisSewa,
  C: barisBarang,
  G: barisBarang,
  F: barisBarang,
  '511': barisBarang,
  '5112': barisBarang,
  '512': barisBarang,
  '516': barisBarang,
  '63': barisBarang,
  '641': barisJasa,
  '642': barisPertanggungan,
  '651': barisJasa,
  '652': barisBerjangka,
  D: barisUpah,
  H: barisJasa,
};

/**
 * Keterangan baris menurut jenis dokumennya.
 *
 * Jenis yang tidak dikenali jatuh ke bentuk barang — bukan ke tanda hubung:
 * varian baru yang belum dipetakan tetap menampilkan nama dan catatannya,
 * hanya tanpa rincian khusus.
 */
export function barisTampil(purchaseType: any, x: any): BarisTampil {
  const kode = String(purchaseType ?? '').toUpperCase();
  const f = PETA[kode] ?? PETA[String(purchaseType ?? '')] ?? barisBarang;
  return f(x);
}
