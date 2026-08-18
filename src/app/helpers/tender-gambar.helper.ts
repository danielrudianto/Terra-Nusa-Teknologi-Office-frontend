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

  let tinggi = 200; // kepala
  tinggi += 90; // proyek & tanggal
  if (barisUraian.length) tinggi += 20 + barisUraian.length * 38;
  tinggi += 70; // judul daftar
  tinggi += d.items.length * 74;
  if (barisSyarat.length) tinggi += 30 + barisSyarat.length * 38;
  tinggi += 120; // kaki

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
      ctx.fillRect(TEPI - 16, y - 34, lebarIsi + 32, 68);
    }

    ctx.fillStyle = WARNA.redup;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText(`${i + 1}.`, TEPI, y);

    ctx.fillStyle = WARNA.tinta;
    ctx.font = '600 27px system-ui, sans-serif';
    const volume =
      it.quantity !== null && it.quantity !== undefined
        ? `${angka(it.quantity)} ${it.unit ?? ''}`.trim()
        : '';
    const lebarVolume = volume
      ? ctx.measureText(volume).width + 40
      : 0;
    ctx.fillText(
      teksTerpotong(ctx, it.name, lebarIsi - 60 - lebarVolume),
      TEPI + 46,
      y,
    );

    if (volume) {
      ctx.font = '700 26px system-ui, sans-serif';
      const w = ctx.measureText(volume).width;
      ctx.fillText(volume, LEBAR - TEPI - w, y);
    }

    if (it.specification) {
      ctx.fillStyle = WARNA.redup;
      ctx.font = '400 23px system-ui, sans-serif';
      ctx.fillText(
        teksTerpotong(ctx, it.specification, lebarIsi - 60 - lebarVolume),
        TEPI + 46,
        y + 30,
      );
    }

    y += 74;
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
