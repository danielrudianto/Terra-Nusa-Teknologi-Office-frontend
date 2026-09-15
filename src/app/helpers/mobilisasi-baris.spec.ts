import {
  gabungBarisMobilisasi,
  namaiBarisMobilisasi,
  pecahBarisMobilisasi,
} from './purchase-order-b.helper';

/*
 * Mobilisasi sebagai BARIS SUNGGUHAN.
 *
 * Sebelumnya mobilisasi dan demobilisasi adalah dua kolom uang yang menempel
 * pada baris alatnya (`remarks_4`, `remarks_5`). Baris "Mobilisasi Crane 25T
 * sesuai pada nomor 1" yang tercetak pada SPK tidak pernah ada di basis data
 * — ia dikarang saat mencetak.
 *
 * Akibatnya certificate of payment tidak dapat menyentuhnya: CoP
 * menyertifikasi per `purchase_order_items.id`, dan mobilisasi tidak punya
 * `id`. SPK sewa yang sepertiga nilainya mobilisasi hanya dapat
 * disertifikasi dua pertiga — selamanya.
 *
 * Yang dijaga di sini BUKAN bahwa kodenya jalan, melainkan tiga hal yang
 * membuat perpindahan itu aman:
 *
 *   * dokumen yang SUDAH DITANDATANGANI harus tercetak sama persis seperti
 *     sebelumnya — susunan baris, nama, nilai, dan nomor rujukannya;
 *   * memecah lalu menggabungkan kembali harus mengembalikan keadaan semula,
 *     sebab itulah yang terjadi setiap kali dokumen dibuka dan disimpan ulang;
 *   * SPK tanpa mobilisasi tidak boleh menumbuhkan baris "Mobilisasi Rp 0".
 */

/** Susunan yang dihasilkan cara LAMA, disalin apa adanya sebagai pembanding. */
function perluasCaraLama(
  items: ReadonlyArray<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    remarks_4?: string | null;
    remarks_5?: string | null;
  }>,
): Array<{ name: string; quantity: number; unit: string; price: number }> {
  const hasil: any[] = [];
  items.forEach((item) => {
    hasil.push({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
    });
    const nomorAlat = hasil.length;
    const tambahan: Array<[string, number]> = [
      ['Mobilisasi', Number(item.remarks_4) || 0],
      ['Demobilisasi', Number(item.remarks_5) || 0],
    ];
    tambahan.forEach(([label, nilai]) => {
      if (nilai <= 0) return;
      hasil.push({
        name: `${label} ${item.name || ''} sesuai pada nomor ${nomorAlat}`.replace(
          /\s+/g,
          ' ',
        ),
        quantity: 1,
        unit: 'LS',
        price: nilai,
      });
    });
  });
  return hasil;
}

const FORMULIR = [
  {
    name: 'Crane 25T',
    quantity: 2,
    unit: 'bulan',
    price: 20_000_000,
    mobilisasi: 15_000_000,
    demobilisasi: 15_000_000,
  },
  {
    name: 'Genset 100 kVA',
    quantity: 1,
    unit: 'bulan',
    price: 20_000_000,
    mobilisasi: 0,
    demobilisasi: 0,
  },
  {
    name: 'Crane 50T',
    quantity: 1,
    unit: 'bulan',
    price: 30_000_000,
    mobilisasi: 9_000_000,
    demobilisasi: 9_000_000,
  },
];

const LAMA = FORMULIR.map((x) => ({
  name: x.name,
  quantity: x.quantity,
  unit: x.unit,
  price: x.price,
  remarks_4: String(x.mobilisasi),
  remarks_5: String(x.demobilisasi),
}));

describe('mobilisasi sebagai baris sungguhan', () => {
  it('menghasilkan dokumen yang SAMA PERSIS dengan cara lama', () => {
    const baru = namaiBarisMobilisasi(pecahBarisMobilisasi(FORMULIR)).map(
      (x) => ({
        name: x.name,
        quantity: x.quantity,
        unit: x.unit,
        price: x.price,
      }),
    );

    // Inilah yang membuat migrasi dokumen yang sudah ditandatangani aman.
    // Kalau uji ini gugur, cetak ulang SPK lama berubah — dan yang
    // memegang lembar aslinya akan menemukan dokumen yang berbeda.
    expect(baru).toEqual(perluasCaraLama(LAMA));
  });

  it('menyebut nomor CETAK induknya, bukan nomor urut alat', () => {
    const hasil = namaiBarisMobilisasi(pecahBarisMobilisasi(FORMULIR));

    // Crane 50T adalah alat KETIGA, tetapi tercetak pada baris kelima —
    // sesudah dua baris mobilisasi milik Crane 25T. Yang dicari vendor saat
    // membaca "sesuai pada nomor 5" adalah nomor di kolom kiri dokumen.
    expect(hasil[4].name).toBe('Crane 50T');
    expect(hasil[5].name).toBe('Mobilisasi Crane 50T sesuai pada nomor 5');
    expect(hasil[6].name).toBe('Demobilisasi Crane 50T sesuai pada nomor 5');
  });

  it('tidak menumbuhkan baris bernilai nol', () => {
    const hasil = pecahBarisMobilisasi(FORMULIR);
    // Genset tanpa mobilisasi: tiga alat, empat baris mobilisasi, tidak ada
    // baris "Mobilisasi Rp 0" pada dokumen yang selama ini tidak memuatnya.
    expect(hasil.length).toBe(7);
    expect(hasil.filter((x) => x.itemKind).length).toBe(4);
    expect(hasil.some((x) => x.price === 0 && x.itemKind)).toBeFalse();
  });

  it('menunjuk induknya lewat POSISI, bukan lewat id', () => {
    const hasil = pecahBarisMobilisasi(FORMULIR);
    // Pada dokumen baru induknya belum punya `id`; yang dapat dikirim ke
    // server hanyalah posisinya di dalam daftar yang sedang dikirim.
    expect(hasil[1].parentIndex).toBe(0);
    expect(hasil[2].parentIndex).toBe(0);
    expect(hasil[5].parentIndex).toBe(4);
    expect(hasil[6].parentIndex).toBe(4);
  });

  it('menggabungkan baris anak kembali ke induknya saat disunting', () => {
    // Bentuk yang datang dari basis data, sudah berurutan.
    const dariBasisData = [
      { id: 1, task: 'Crane 25T', price: 20_000_000, quantity: 2, unit: 'bulan' },
      { id: 5, task: 'Mobilisasi', price: 15_000_000, quantity: 1, unit: 'LS',
        itemKind: 'mobilisasi', parentItemID: 1 },
      { id: 6, task: 'Demobilisasi', price: 15_000_000, quantity: 1, unit: 'LS',
        itemKind: 'demobilisasi', parentItemID: 1 },
      { id: 2, task: 'Genset 100 kVA', price: 20_000_000, quantity: 1, unit: 'bulan' },
    ];

    const formulir = gabungBarisMobilisasi(dariBasisData);

    // Formulir melihat DUA baris alat, persis seperti yang pernah diketik —
    // bukan empat baris dengan "Mobilisasi" berdiri sendiri di antaranya.
    expect(formulir.length).toBe(2);
    expect(formulir[0].mobilisasi).toBe(15_000_000);
    expect(formulir[0].demobilisasi).toBe(15_000_000);
    expect(formulir[1].mobilisasi).toBeUndefined();
  });

  it('pecah lalu gabung mengembalikan keadaan semula', () => {
    // Inilah yang terjadi tiap kali dokumen dibuka lalu disimpan ulang.
    // Bila keduanya tidak saling membatalkan, nilainya menyusut atau
    // berlipat pada tiap penyuntingan — perlahan, tanpa galat.
    const dipecah = pecahBarisMobilisasi(FORMULIR).map((x, i) => ({
      ...x,
      id: 100 + i,
      parentItemID:
        x.parentIndex != null ? 100 + (x.parentIndex as number) : null,
    }));

    const kembali = gabungBarisMobilisasi(dipecah);

    expect(kembali.length).toBe(FORMULIR.length);
    expect(kembali.map((x) => x.name)).toEqual(FORMULIR.map((x) => x.name));
    expect(kembali[0].mobilisasi).toBe(15_000_000);
    expect(kembali[2].demobilisasi).toBe(9_000_000);
  });

  it('tidak membuang baris anak yang induknya hilang', () => {
    // Induk yang terhapus membawa serta anaknya lewat ON DELETE CASCADE,
    // jadi keadaan ini seharusnya tidak pernah ada. Tetapi bila toh terjadi,
    // membuang barisnya berarti nilainya LENYAP dari dokumen saat disimpan
    // ulang — dan dokumen menyusut tanpa ada yang menyentuh angkanya.
    const yatim = [
      { id: 9, task: 'Mobilisasi', price: 5_000_000, quantity: 1, unit: 'LS',
        itemKind: 'mobilisasi', parentItemID: 999 },
    ];
    expect(gabungBarisMobilisasi(yatim).length).toBe(1);
  });

  it('tidak mengubah daftar yang diberikan kepadanya', () => {
    const asal: any[] = [
      { id: 1, task: 'Crane 25T', price: 20_000_000 },
      { id: 5, task: 'Mobilisasi', price: 15_000_000,
        itemKind: 'mobilisasi', parentItemID: 1 },
    ];
    gabungBarisMobilisasi(asal);
    // Pemanggil berikutnya harus menerima daftar yang sama seperti semula;
    // kalau tidak, ia menerima baris yang sudah tergabung sebagian.
    expect(asal[0].mobilisasi).toBeUndefined();
  });
});
