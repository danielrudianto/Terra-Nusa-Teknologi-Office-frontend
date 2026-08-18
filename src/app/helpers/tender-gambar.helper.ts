/**
 * Gambar permintaan penawaran untuk disebar lewat WhatsApp.
 *
 * Digambar di kanvas, bukan disusun dari HTML lalu difoto: pustaka penangkap
 * layar menambah beberapa ratus kilobita ke bundel dan hasilnya bergantung
 * pada font yang kebetulan terpasang di mesin yang membukanya.
 *
 * Kanvas juga membuat ukurannya dapat ditentukan: WhatsApp memampatkan gambar
 * yang terlalu besar sampai teksnya tidak terbaca, dan yang terlalu kecil
 * harus diperbesar penerimanya.
 */

export interface BarisGambar {
  name: string;
  specification?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface DataGambar {
  nomor?: number | null;
  nama: string;
  proyek: string;
  jenis: 'barang' | 'jasa';
  tanggal: string;
  batas?: string | null;
  uraian?: string | null;
  syarat?: string | null;
  items: BarisGambar[];
}

/** Lebar tetap; tinggi mengikuti banyaknya baris. */
const LEBAR = 1080;
const TEPI = 64;

/*
 * Tinggi tiap bagian, dipakai perhitungan DAN penggambaran.
 *
 * Kanvas tidak dapat diperbesar setelah ada isinya, sehingga tingginya harus
 * diukur lebih dulu — dan dua angka yang ditulis terpisah pasti menyimpang
 * begitu salah satunya disesuaikan. Isinya lalu terpotong di bawah, tanpa
 * satu pun galat.
 */
const T_BARIS = 38;
const T_ITEM = 74;
const T_KEPALA = 200;
const T_JUDUL = 90;
const T_DAFTAR = 70;
const T_KAKI = 120;

/** Font yang dipakai; disebut sekali supaya ukuran dan gambar sepadan. */
const F_ITEM = '600 27px system-ui, sans-serif';
const F_VOLUME = '700 26px system-ui, sans-serif';
const F_SPEC = '400 23px system-ui, sans-serif';
const F_TEKS = '400 26px system-ui, sans-serif';

const WARNA = {
  latar: '#ffffff',
  kepala: '#154dec',
  kepalaTeks: '#ffffff',
  tinta: '#16181d',
  redup: '#6b7280',
  garis: '#e4e9fb',
  lembut: '#f6f8ff',
};

function teksTerpotong(
  ctx: CanvasRenderingContext2D,
  teks: string,
  maks: number,
): string {
  if (ctx.measureText(teks).width <= maks) return teks;
  let s = teks;
  while (s.length > 1 && ctx.measureText(s + '…').width > maks) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

/**
 * Pecah teks panjang menjadi beberapa baris.
 *
 * Dipakai pada uraian dan ketentuan, yang panjangnya tidak dapat diduga.
 * Tanpa ini teksnya terpotong di tepi gambar — dan yang terpotong justru
 * syarat yang paling perlu dibaca pemasok.
 */
function bungkus(
  ctx: CanvasRenderingContext2D,
  teks: string,
  maks: number,
): string[] {
  const kata = teks.split(/\s+/);
  const baris: string[] = [];
  let kini = '';
  for (const k of kata) {
    const coba = kini ? `${kini} ${k}` : k;
    if (ctx.measureText(coba).width > maks && kini) {
      baris.push(kini);
      kini = k;
    } else {
      kini = coba;
    }
  }
  if (kini) baris.push(kini);
  return baris;
}

function angka(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

export function gambarPermintaanPenawaran(d: DataGambar): HTMLCanvasElement {
  const kanvas = document.createElement('canvas');
  const ctx = kanvas.getContext('2d')!;

  // Tinggi dihitung DULU, sebelum menggambar.
  //
  // Kanvas tidak dapat diperbesar setelah ada isinya — mengubah ukurannya
  // menghapus seluruh gambarnya. Karena itu tingginya diukur lebih dulu
  // dengan pengukuran teks yang sama.
  kanvas.width = LEBAR;
  ctx.font = '400 26px system-ui, sans-serif';
  const lebarIsi = LEBAR - TEPI * 2;

  const barisUraian = d.uraian ? bungkus(ctx, d.uraian, lebarIsi) : [];
  const barisSyarat = d.syarat ? bungkus(ctx, d.syarat, lebarIsi) : [];

  let tinggi = T_KEPALA;
  tinggi += T_JUDUL;
  if (barisUraian.length) tinggi += 20 + barisUraian.length * T_BARIS;
  tinggi += T_DAFTAR;
  tinggi += d.items.length * T_ITEM;
  if (barisSyarat.length) tinggi += 30 + barisSyarat.length * T_BARIS;
  tinggi += T_KAKI;

  kanvas.height = tinggi;

  // ---- latar ----
  ctx.fillStyle = WARNA.latar;
  ctx.fillRect(0, 0, LEBAR, tinggi);

  // ---- kepala ----
  ctx.fillStyle = WARNA.kepala;
  ctx.fillRect(0, 0, LEBAR, 160);

  ctx.fillStyle = WARNA.kepalaTeks;
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('PERMINTAAN PENAWARAN', TEPI, 62);

  ctx.font = '400 24px system-ui, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText('PT ALPHA KONSTRUKSI NUSANTARA', TEPI, 100);
  ctx.globalAlpha = 1;

  ctx.font = '700 26px system-ui, sans-serif';
  const sebutan = d.nomor ? `No. ${d.nomor}` : '';
  if (sebutan) {
    const w = ctx.measureText(sebutan).width;
    ctx.fillText(sebutan, LEBAR - TEPI - w, 62);
  }

  let y = 220;

  // ---- nama tender ----
  ctx.fillStyle = WARNA.tinta;
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(teksTerpotong(ctx, d.nama, lebarIsi), TEPI, y);
  y += 46;

  ctx.fillStyle = WARNA.redup;
  ctx.font = '400 24px system-ui, sans-serif';
  const kepalaKecil = [
    `Proyek: ${d.proyek}`,
    `Tanggal: ${d.tanggal}`,
    d.batas ? `Penawaran ditunggu s/d ${d.batas}` : '',
  ]
    .filter(Boolean)
    .join('   ·   ');
  ctx.fillText(teksTerpotong(ctx, kepalaKecil, lebarIsi), TEPI, y);
  y += 44;

  // ---- uraian ----
  if (barisUraian.length) {
    ctx.fillStyle = WARNA.tinta;
    ctx.font = '400 26px system-ui, sans-serif';
    for (const b of barisUraian) {
      ctx.fillText(b, TEPI, y);
      y += 38;
    }
    y += 12;
  }

  // ---- judul daftar ----
  ctx.fillStyle = WARNA.redup;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(
    d.jenis === 'jasa' ? 'PEKERJAAN YANG DIMINTA' : 'BARANG YANG DIMINTA',
    TEPI,
    y,
  );
  y += 20;

  ctx.strokeStyle = WARNA.garis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TEPI, y);
  ctx.lineTo(LEBAR - TEPI, y);
  ctx.stroke();
  y += 40;

  // ---- baris ----
  d.items.forEach((it, i) => {
    // Selang-seling latar: daftar panjang tanpa pembeda membuat mata
    // berpindah baris tanpa disadari.
    if (i % 2 === 1) {
      ctx.fillStyle = WARNA.lembut;
      ctx.fillRect(TEPI - 16, y - 34, lebarIsi + 32, T_ITEM - 6);
    }

    ctx.fillStyle = WARNA.redup;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(`${i + 1}.`, TEPI, y);

    const volume =
      it.quantity !== null && it.quantity !== undefined
        ? `${angka(it.quantity)} ${it.unit ?? ''}`.trim()
        : '';

    /*
     * Lebar volume diukur dengan font yang BENAR-BENAR dipakai menggambarnya.
     *
     * Sebelumnya diukur memakai font baris item, lalu digambar dengan font
     * volume yang berbeda — sehingga nama barang dipotong berdasar lebar
     * yang keliru, dan bila volumenya ternyata lebih lebar keduanya
     * bertumpuk di tengah gambar.
     */
    ctx.font = F_VOLUME;
    const lebarVolume = volume ? ctx.measureText(volume).width + 40 : 0;

    ctx.fillStyle = WARNA.tinta;
    ctx.font = F_ITEM;
    ctx.fillText(
      teksTerpotong(ctx, it.name, lebarIsi - 60 - lebarVolume),
      TEPI + 46,
      y,
    );

    if (volume) {
      ctx.font = F_VOLUME;
      const w = ctx.measureText(volume).width;
      ctx.fillText(volume, LEBAR - TEPI - w, y);
    }

    if (it.specification) {
      ctx.fillStyle = WARNA.redup;
      ctx.font = F_SPEC;
      ctx.fillText(
        teksTerpotong(ctx, it.specification, lebarIsi - 60 - lebarVolume),
        TEPI + 46,
        y + 30,
      );
    }

    y += T_ITEM;
  });

  // ---- ketentuan ----
  if (barisSyarat.length) {
    ctx.fillStyle = WARNA.redup;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('KETENTUAN', TEPI, y);
    y += 34;

    ctx.fillStyle = WARNA.tinta;
    ctx.font = '400 26px system-ui, sans-serif';
    for (const b of barisSyarat) {
      ctx.fillText(b, TEPI, y);
      y += 38;
    }
  }

  /*
   * PENJAGA: isinya tidak boleh melewati garis kaki.
   *
   * Tinggi kanvas dihitung sebelum menggambar, dan setiap penyesuaian pada
   * salah satu sisi dapat membuat keduanya menyimpang. Bila itu terjadi,
   * isinya terpotong di bawah — dan gambar yang sudah tersebar ke pemasok
   * tidak dapat ditarik kembali.
   *
   * Kanvas DIPERBESAR, bukan dibiarkan terpotong. Gambar yang sedikit lebih
   * panjang tetap terbaca; yang terpotong kehilangan ketentuannya.
   */
  const batasKaki = tinggi - T_KAKI + 40;
  if (y > batasKaki) {
    const tambahan = y - batasKaki + 20;
    const salinan = document.createElement('canvas');
    salinan.width = LEBAR;
    salinan.height = tinggi + tambahan;
    const ctx2 = salinan.getContext('2d')!;
    ctx2.fillStyle = WARNA.latar;
    ctx2.fillRect(0, 0, LEBAR, salinan.height);
    ctx2.drawImage(kanvas, 0, 0);
    return _gambarKaki(salinan, ctx2, salinan.height);
  }

  return _gambarKaki(kanvas, ctx, tinggi);
}

/** Garis dan kalimat penutup; dipisah supaya dapat dipakai ulang. */
function _gambarKaki(
  kanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  tinggi: number,
): HTMLCanvasElement {
  // ---- kaki ----
  ctx.strokeStyle = WARNA.garis;
  ctx.beginPath();
  ctx.moveTo(TEPI, tinggi - 80);
  ctx.lineTo(LEBAR - TEPI, tinggi - 80);
  ctx.stroke();

  ctx.fillStyle = WARNA.redup;
  ctx.font = '400 22px system-ui, sans-serif';
  /*
   * Termin pembayaran DIMINTA dari pemasok, bukan ditetapkan AKN.
   *
   * Yang paling berharga dari tender justru muncul di sini: "lebih murah
   * tetapi tunai" versus "beda tipis tetapi tempo 30 hari" tidak pernah
   * terbandingkan bila terminnya sudah ditetapkan lebih dulu.
   */
  ctx.fillText(
    'Mohon penawaran memuat harga satuan, TERMIN PEMBAYARAN, masa berlaku, dan waktu kirim.',
    TEPI,
    tinggi - 40,
  );

  return kanvas;
}

/**
 * Naskah pesan WhatsApp.
 *
 * Dipisahkan dari gambarnya: gambar tidak dapat disalin sebagai teks, dan
 * sebagian pemasok membalas dengan mengutip pesannya. Naskah ini yang
 * disalin ke papan klip, gambarnya dilampirkan.
 */
export function naskahWhatsApp(d: DataGambar): string {
  const baris: string[] = [];
  baris.push(`*PERMINTAAN PENAWARAN${d.nomor ? ` No. ${d.nomor}` : ''}*`);
  baris.push('PT Alpha Konstruksi Nusantara');
  baris.push('');
  baris.push(`*${d.nama}*`);
  baris.push(`Proyek: ${d.proyek}`);
  if (d.batas) baris.push(`Penawaran ditunggu sampai: ${d.batas}`);
  baris.push('');

  if (d.uraian) {
    baris.push(d.uraian);
    baris.push('');
  }

  baris.push(
    d.jenis === 'jasa' ? '*Pekerjaan yang diminta:*' : '*Barang yang diminta:*',
  );
  d.items.forEach((it, i) => {
    const volume =
      it.quantity !== null && it.quantity !== undefined
        ? ` — ${angka(it.quantity)} ${it.unit ?? ''}`.trimEnd()
        : '';
    const spec = it.specification ? ` (${it.specification})` : '';
    baris.push(`${i + 1}. ${it.name}${spec}${volume}`);
  });
  baris.push('');

  if (d.syarat) {
    baris.push(`*Ketentuan:* ${d.syarat}`);
    baris.push('');
  }
  baris.push(
    'Mohon penawaran memuat *harga satuan*, *termin pembayaran* yang ditawarkan, masa berlaku penawaran, dan waktu kirim. Terima kasih.',
  );

  return baris.join('\n');
}
