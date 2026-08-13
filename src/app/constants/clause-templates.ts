/**
 * Versioned agreement-clause templates, kept on the frontend.
 *
 * Why frontend: these are boilerplate legal terms, not transaction data. They
 * change rarely and don't belong in the database.
 *
 * Why versioned: a PO must keep the clauses that were in force when it was
 * created. When a template gets a new version, existing POs must NOT change —
 * they were signed against the old text. So each PO stores only its
 * `templateVersion`; the text itself is resolved here at render time.
 *
 * Adding a new version:
 *   1. Append a new entry to the type's array with a higher `version`.
 *   2. That's it — new POs auto-pick the latest; old POs keep their version.
 *
 * NOTE: keep old versions in place forever. Deleting one breaks the display of
 * every historical PO that referenced it.
 */

/** Company contact details baked into some clauses (kept fixed for now). */
export const OFFICE_CONTACT = {
  email: 'procurement@alphakonstruksi.id',
  address: 'Ruko Asia Tropis Blok AT 12 No 21, Kota Harapan Indah, Bekasi',
};

/** Everything a template might need to fill in the variable points (1-5). */
export interface ClauseContext {
  paymentTerm?: string; // CASH | COD | CBD | PPD | CR | CRD
  /** Cara pelunasan sisa setelah uang muka: 'cash' atau 'tempo'. */
  settlementMode?: 'cash' | 'tempo';
  /** Lama tempo pelunasan (hari); dipakai bila settlementMode = 'tempo'. */
  settlementDays?: number | string;
  creditTerm?: number;
  prepaidTerm?: number;
  deliveryMethod?: string | number; // 0 = Franco, 1 = Loco
  deliveryAddress?: string;
  supplierPICName?: string;
  supplierPICPhoneNumber?: string;
  officePICName?: string;
  officePICPhoneNumber?: string;
  // PO-C (fuel): whether the fuel-analysis / calibration clause is required.
  // Stored on the PO so old POs re-render with the same on/off state.
  fuelReportRequired?: boolean;
  // PO-F: 'beton' | 'besi' | 'lain' | 'ujitekan' — menentukan rangkaian klausul
  // Khusus 'ujitekan' & 'ujibesi', dokumennya SPK (jasa, bukan barang).
  /** Jumlah benda uji yang diuji; diisi manual pada formulir. */
  sampleCount?: number | string;
  /** Tenggat penerbitan laporan hasil uji (hari kerja). */
  testReportDays?: number | string;
  /** Cara penyerahan benda uji ke laboratorium. */
  sampleHandover?: string;
  materialType?: string;
  // PO-H: keterangan pekerjaan
  workLocation?: string;
  jobType?: string;
  startDate?: string;
  endDate?: string;
  /** 'unit' (harga satuan) atau 'lumpsum' (borongan). */
  rateType?: string;
  // PO-F: tanggal pengiriman & batas pembayaran (teks siap cetak, opsional)
  deliveryDate?: string;
  paymentDueDate?: string;
  // PO-F: uji tarik & tekuk (umumnya untuk besi tulangan)
  materialTestRequired?: boolean;
  /**
   * Ketentuan uji kuat tekan beton diberlakukan.
   *
   * Bila false, poin-poinnya tetap tercetak dalam keadaan tercoret sehingga
   * terlihat sengaja tidak dipakai, bukan terlewat.
   */
  concreteTestRequired?: boolean;
  /** Penanggung biaya uji di laboratorium independen. */
  concreteTestCostBearer?: 'pembeli' | 'penjual';
  // ---- PO 6.3.1 / 6.3.2 (pemasaran) ----
  /** Jumlah revisi yang sudah termasuk dalam nilai pekerjaan. */
  revisionCount?: number | string;
  /**
   * Denda keterlambatan diberlakukan.
   *
   * Bila dimatikan, poinnya tetap tercetak dalam keadaan tercoret agar
   * terbaca sengaja tidak dipakai, bukan terlewat saat penyusunan.
   */
  latePenaltyRequired?: boolean;
  /** Masa berlaku media/tautan penyerahan berkas (hari kalender). */
  fileRetentionDays?: number | string;
  /** Denda keterlambatan per hari, dalam permil (‰) dari nilai pekerjaan. */
  latePenaltyPermil?: number | string;
  /** Batas atas denda keterlambatan, dalam persen dari nilai pekerjaan. */
  latePenaltyCapPercent?: number | string;
  /**
   * Contoh barang disetujui sebelum produksi massal (PO 6.3.2).
   *
   * Bila dimatikan, poinnya tetap tercetak dalam keadaan tercoret agar
   * terbaca sengaja tidak diberlakukan, bukan terlewat.
   */
  sampleApprovalRequired?: boolean;
  // PO-5.1.12 (software) fields
  softwareIsSubscription?: boolean; // true = langganan, false = beli putus
  subscriptionStartDate?: string; // ISO / display date
  subscriptionDuration?: number; // angka durasi
  subscriptionDurationUnit?: string; // 'bulan' | 'tahun'
  autoRenew?: boolean;
  licenseDelivery?: string; // 'email' | 'account' | 'download' | 'other'
  // PO-5.1.2 (maintenance): 'barang' (sparepart) | 'jasa' (perbaikan)
  maintenanceMode?: string;
  // PO-B: termin pembayaran ditulis bebas (bukan kode CR/CBD/dst)
  paymentTermText?: string;
  /** Pemotongan PPh: kode objek pajak, namanya, dan tarifnya. */
  pphCode?: string;
  pphTaxObject?: string;
  pphPercentage?: number | string;
  // PO-B (sewa alat)
  /**
   * Alat disewa lengkap dengan operator dari PIHAK KEDUA.
   *
   * Menentukan siapa menanggung risiko atas alat: yang mengendalikan alat
   * yang menanggung. Bernilai false secara bawaan karena sewa alat tanpa
   * operator adalah pola yang selama ini dipakai.
   */
  operatorByVendor?: boolean;
  /**
   * Pihak yang menanggung keamanan dan keselamatan alat selama masa sewa.
   *
   * Bisa jatuh ke mana saja tergantung hasil negosiasi, sehingga tidak
   * dipatok: sebagian penyedia menanggung sendiri karena alatnya sudah
   * diasuransikan, sebagian lain melimpahkannya ke penyewa. Bawaannya
   * 'kedua' (penyedia), mengikuti pola yang paling sering dipakai.
   */
  equipmentRiskBearer?: 'pertama' | 'kedua';
  /**
   * Sewa dihitung per jam, sehingga dasar perhitungannya hourmeter.
   *
   * Disimpulkan dari satuan baris sewa, bukan diisi manual — supaya tidak
   * mungkin berbeda dari yang benar-benar ditagihkan.
   */
  rentalByHour?: boolean;
  /**
   * Panjang satu periode kuota, dalam hari kalender.
   *
   * Sewa per jam selalu diikat pada periode: kuota 200 jam per 30 hari,
   * misalnya. Tanpa periode, alat bisa menganggur berbulan-bulan sementara
   * jamnya belum terpakai — dan tidak ada penyedia yang mau menanggung itu.
   */
  quotaPeriodDays?: number | string;
  /** Tarif tambahan per jam untuk pemakaian di atas kuota. */
  excessHourRate?: number | string;
  // PO-D (SPK tenaga kerja harian)
  overtimeRate?: number; // upah lembur per jam
  wageSchedules?: string[]; // kalimat jadwal bayar tiap komponen upah
  shiftHours?: number; // jam kerja per shift
  /**
   * PO-D: dua poin pertama tidak selalu berlaku.
   * - shift: sebagian pekerjaan menentukan jam kerja harian
   * - penempatan: tidak semua pekerja bersedia ditempatkan luar kota
   * Bernilai true secara bawaan agar SPK lama tidak berubah.
   */
  includeShiftClause?: boolean;
  /**
   * PO-D, pekerja yang didatangkan dari luar kota. Tiga poin berikut hanya
   * berlaku bila pekerjanya memang dimobilisasi dari kampung halaman, jadi
   * bawaannya mati agar SPK pekerja setempat tidak ikut memuatnya.
   */
  includeTransportHome?: boolean;
  includeHomeLeave?: boolean;
  // ---- PO 6.5.1 (biaya rekrutmen) ----
  /**
   * Bentuk pembelian rekrutmen: 'kuota' atau 'peserta'.
   *
   * Keduanya dipisah karena saat kewajiban membayar timbul berbeda — kuota
   * dibayar di muka lalu dipakai, sedangkan pemeriksaan dibayar atas orang
   * yang benar-benar diperiksa. Perbedaan itulah yang paling sering menjadi
   * sengketa, sehingga tidak dapat diwakili satu rangkaian klausul.
   */
  recruitmentMode?: 'kuota' | 'peserta';
  /** Kuota berlaku sampai tanggal, sudah diformat oleh pemanggil. */
  quotaValidUntil?: string;
  /** Tenggat penyerahan hasil pemeriksaan (hari kerja). */
  resultDueDays?: number | string;
  /** Batas pembatalan peserta sebelum jadwal (hari). */
  participantCancelDays?: number | string;
  // ---- PO 5.1.12 (perangkat lunak & langganan) ----
  /** Tenggat pemberitahuan sebelum perpanjangan otomatis (hari kalender). */
  renewalNoticeDays?: number | string;
  /** Masa pengambilan data setelah langganan berakhir (hari kalender). */
  dataRetrievalDays?: number | string;
  /** Jumlah pengguna (user/seat) yang tercakup; kosong = tidak disebut. */
  userSeatCount?: number | string;
  /**
   * Cetak cakupan harga pengangkutan (upah operator, BBM, retribusi, dst).
   *
   * Hanya berlaku bila dokumen diterbitkan sebagai tipe A: pada sewa alat
   * biasa, hal-hal tersebut belum tentu menjadi tanggungan penyedianya.
   */
  includeTransportCoverage?: boolean;

  /**
   * Sewa alat berat berdurasi singkat — biasanya satu shift.
   *
   * Beberapa ketentuan pada SPK sewa disusun untuk penyewaan berhari-hari:
   * pelaporan BBM, mekanik yang didatangkan, tenggat perbaikan dua hari,
   * berita acara serah terima, dan koordinasi bongkar-muat. Untuk forklift
   * atau crane yang dipakai beberapa jam, ketentuan itu tidak berlaku —
   * unit yang rusak langsung diganti, dan tidak ada yang dibongkar-muat.
   */
  shortTermRental?: boolean;
  /**
   * Jenis barang yang disewa.
   *
   * PO-B tidak terbatas pada alat berat: kendaraan, scaffolding, dan
   * perlengkapan lain juga disewa lewat dokumen yang sama. Yang membedakan
   * bukan istilahnya, melainkan ketentuan yang berlaku — SILO dan SIO hanya
   * mengikat pesawat angkat dan angkut, sehingga meminta keduanya untuk
   * scaffolding berarti meminta dokumen yang memang tidak pernah ada.
   */
  rentalCategory?: 'alat-berat' | 'kendaraan' | 'umum';
  /** Nama proyek; dipakai bila lokasi kerja tidak diisi. */
  projectName?: string;
  /** Jangka waktu perjanjian, sudah diformat oleh pemanggil. */
  contractStartText?: string;
  contractEndText?: string;
  /** Berlaku sampai pekerjaan pada proyek selesai (tanpa tanggal akhir). */
  contractUntilProjectDone?: boolean;
  /** Pekerja yang bertugas mendampingi alat saat mobilisasi/demobilisasi. */
  includeEquipmentEscort?: boolean;
  includePlacementClause?: boolean;
  /**
   * Staf lapangan (mis. staff engineer): penagihan bulanan, wajib FDP.
   * Uraian tugas ditulis sendiri dan hanya tercetak bila diisi.
   */
  isFieldStaff?: boolean;
  payoutDay?: number | string;
  jobDescriptions?: string[];
  /**
   * Sewa alat angkut (dicatat PO-A): mencantumkan poin koordinasi
   * (BBM, upah operator, retribusi, dst) seperti pada SPK transportasi.
   */
  includeTransportCoordination?: boolean;
  includeSundayPolicy?: boolean; // sertakan kebijakan Hari Minggu
}

export interface ClauseTemplate {
  version: string;
  /**
   * Daftar poin perjanjian untuk versi ini.
   *
   * Anggota berupa array menjadi sub-poin bernomor huruf (a, b, c) di bawah
   * poin sebelumnya — dipakai ketika satu ketentuan punya rincian yang perlu
   * dibaca terpisah, seperti ketentuan uji kuat tekan beton.
   */
  build: (ctx: ClauseContext) => (string | string[])[];
}

// ---- shared helpers ------------------------------------------------------

function paymentSentence(ctx: ClauseContext): string {
  const credit = Number(ctx.creditTerm) || 0;
  const prepaid = Number(ctx.prepaidTerm) || 0;
  switch (ctx.paymentTerm) {
    case 'CASH':
      return 'Termin pembayaran adalah tunai (Cash) saat pengambilan barang.';
    case 'COD':
      return 'Termin pembayaran adalah tunai saat barang diterima (Cash on Delivery).';
    case 'CBD':
      return 'Termin pembayaran adalah tunai sebelum barang dikirim (Cash before Delivery).';
    case 'PPD':
    case 'CRD': {
      // Cara pelunasan sisa uang muka: tunai saat serah terima, atau tempo
      // sekian hari. Sebelumnya keduanya selalu ditulis kredit, sehingga
      // termin PPD yang seharusnya lunas tunai ikut tertulis "dalam 0 hari".
      const tempo =
        ctx.settlementMode === 'cash'
          ? 'sisanya dilunasi secara tunai pada saat serah terima pekerjaan'
          : `sisanya dilunasi secara tempo dalam ${
              Number(ctx.settlementDays) || credit
            } hari sejak dokumen penagihan lengkap diterima`;
      return `Termin pembayaran adalah uang muka sebesar ${prepaid}% di muka, ${tempo}.`;
    }
    case 'CR':
      return `Termin pembayaran adalah kredit dalam ${credit} hari.`;
    default:
      // PO lama menyimpan termin sebagai teks bebas ("Tempo 30 hari"), yang
      // tidak cocok dengan satu pun kode di atas. Mencetak teksnya apa adanya
      // jauh lebih baik daripada memunculkan tanda hubung tanpa keterangan.
      return ctx.paymentTerm
        ? `Termin pembayaran adalah ${ctx.paymentTerm}.`
        : 'Termin pembayaran adalah —.';
  }
}

function isLoco(ctx: ClauseContext): boolean {
  return String(ctx.deliveryMethod) === '1';
}

/**
 * Kalimat alamat, mengikuti moda pengirimannya.
 *
 * Sebelumnya selalu berbunyi "alamat pengiriman/pengambilan" untuk keduanya.
 * Pada Franco yang berlaku hanya pengiriman, pada Loco hanya pengambilan —
 * menyebut keduanya membuat pembaca harus menebak mana yang dimaksud, dan
 * pada dokumen yang mengikat, menebak adalah celah.
 */
function deliveryAddressSentence(ctx: ClauseContext): string {
  const alamat = String(ctx.deliveryAddress || '—').trim();
  const judul = isLoco(ctx)
    ? 'Alamat pengambilan barang adalah:'
    : 'Alamat pengiriman barang adalah:';

  /*
   * Alamat ditaruh pada baris tersendiri, bukan menyambung kalimatnya.
   *
   * Alamat sering terdiri atas beberapa baris — nama gudang, jalan, kota.
   * Menyambungnya ke belakang kalimat membuat barisnya patah di tempat yang
   * tidak disengaja dan sulit dibaca ketika dokumen dipakai di lapangan.
   */
  return `${judul}\n${alamat}.`;
}

function joinContact(name?: string, phone?: string): string {
  return [name, phone].filter(Boolean).join(' - ') || '—';
}

/** wrap text in <s>..</s> when a clause is switched off, so it shows struck-through */
function strikeIf(off: boolean, text: string): string {
  return off ? `<s>${text}</s>` : text;
}

// ---- PO-G : Barang / Equipment purchase -----------------------------------

const G_CLAUSES: ClauseTemplate[] = [
  {
    // Mengikuti dokumen PO G yang berlaku: klausul Franco dan Loco keduanya
    // ditampilkan, alamat kantor tidak ditempel di klausul Franco, dan label
    // kontak memakai penamaan pada dokumen.
    version: '1.0',
    build: (ctx) => {
      const loco = isLoco(ctx);
      return [
        paymentSentence(ctx),
        `Termin pengiriman adalah ${loco ? 'Loco (diambil sendiri)' : 'Franco (dikirim ke lokasi)'}.`,
        deliveryAddressSentence(ctx),
        // Sebelumnya memakai istilah pengambil/pengirim/penerima yang mudah
        // tertukar; cukup sebut pemilik kontaknya saja.
        `Kontak penanggung jawab supplier adalah: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab PT. Alpha Konstruksi Nusantara adalah: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
        `PIHAK PENJUAL dan PEMBELI wajib mendokumentasikan (video) serah terima yang berisi pemeriksaan kondisi barang.`,
        `Bila Franco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PENJUAL wajib memberikan detail Kontak Penanggung Jawab Pengiriman, nomor polisi kendaraan pengirim beserta bukti kelengkapan dokumen pengirim (STNK, KIR, SIM) dalam bentuk softcopy melalui e-mail ke ${OFFICE_CONTACT.email};`,
        `Bila Loco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PEMBELI akan memberikan detail Kontak Penanggung Jawab Penerima, dalam bentuk softcopy melalui nomor telepon/fax atau alamat e-mail yang diberikan;`,
        `Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan kontrak jual/beli ini.`,
      ];
    },
  },
];

const C_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const loco = isLoco(ctx);
      const fuelOn = ctx.fuelReportRequired !== false; // default ON

      const points: string[] = [
        paymentSentence(ctx),
        `Termin pengiriman adalah ${loco ? 'Loco (diambil sendiri)' : 'Franco (dikirim ke lokasi)'}.`,
        deliveryAddressSentence(ctx),
        `Kontak penanggung jawab supplier adalah: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab PT. Alpha Konstruksi Nusantara adalah: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
        // 6 & 7 are a linked pair: toggling 6 off strikes both through.
        strikeIf(
          !fuelOn,
          `Fuel Analysis Report dan Sertifikat Kalibrasi harus dikirimkan dan disetujui oleh pihak pembeli sebelum dokumen pembelian ini berlaku.`,
        ),
        strikeIf(
          !fuelOn,
          `Barang yang dikirim harus sesuai dengan Fuel Analysis Report dan dikirim menggunakan kendaraan khusus pengantar BBM dengan Sertifikat Kalibrasi yang sama.`,
        ),
        // --- poin teknis khusus BBM (mutu & kuantitas) ---
        `PIHAK PEMBELI berhak melakukan pengujian mutu dan/atau pengambilan sampel BBM pada saat serah terima. Apabila hasil pengujian tidak sesuai dengan spesifikasi yang disepakati, PIHAK PEMBELI berhak menolak sebagian atau seluruh barang, dan biaya pengembalian menjadi tanggung jawab PIHAK PENJUAL.`,
        `Kuantitas BBM yang menjadi dasar penagihan diukur menggunakan alat ukur tersegel/tertera pada saat serah terima di lokasi PIHAK PEMBELI. Toleransi susut (losses) yang diperkenankan adalah maksimal 0,5% dari volume; selisih kuantitas yang melebihi toleransi tersebut menjadi tanggung jawab PIHAK PENJUAL.`,
        `Volume penagihan adalah volume yang telah disetujui oleh perwakilan pembeli.`,
        `Tata cara penagihan dan pembayaran dapat dilihat di lembar terlampir.`,
      ];
      return points;
    },
  },
];

// ---- PO-5.1.12 : Software --------------------------------------------------

function licenseDeliverySentence(ctx: ClauseContext): string {
  switch (ctx.licenseDelivery) {
    case 'email':
      return 'License key / kredensial dikirim melalui e-mail resmi PIHAK PERTAMA.';
    case 'account':
      return 'Lisensi diaktifkan langsung pada akun yang ditunjuk PIHAK PERTAMA.';
    case 'download':
      return 'Perangkat lunak beserta lisensi disediakan melalui tautan unduhan resmi.';
    default:
      return 'Metode penyerahan lisensi disepakati kedua belah pihak.';
  }
}

/**
 * PO 5.1.12 — perangkat lunak, langganan, dan layanan daring.
 *
 * Memakai penyebutan PIHAK PERTAMA / PIHAK KEDUA, bukan PEMBELI / PENJUAL:
 * yang dibeli lebih sering berupa layanan berjalan — sewa server, domain,
 * langganan aplikasi — sehingga bentuk dokumennya Surat Perintah Kerja, bukan
 * surat pesanan barang.
 *
 * Klausul yang berlaku hanya pada langganan (perpanjangan, pengambilan data)
 * tidak dicetak pada pembelian putus, agar dokumennya tidak memuat ketentuan
 * yang tidak berlaku.
 */
/**
 * PO 6.5.1 — biaya rekrutmen.
 *
 * Dua bentuk yang berbeda kewajiban bayarnya:
 *
 *   kuota   — sejumlah slot dibeli di muka lalu dipakai sampai habis
 *   peserta — pemeriksaan atas orang, dibayar per orang yang diperiksa
 *
 * Jasa pencarian kandidat (headhunter) sengaja belum dibuatkan: bentuknya
 * berbasis hasil dan bergantung pada masa jaminan penggantian, yang tidak
 * dapat dirumuskan dengan tepat sebelum ada kontrak yang benar-benar
 * dijalankan.
 */
const RECRUITMENT_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const perPeserta = ctx.recruitmentMode === 'peserta';
      const points: string[] = [paymentSentence(ctx)];

      if (ctx.pphCode) {
        points.push(
          `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
            ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
          }.`,
        );
      }

      if (perPeserta) {
        const hasil = ctx.resultDueDays ?? 3;
        const batal = ctx.participantCancelDays ?? 1;
        points.push(
          `Hasil pemeriksaan diserahkan selambat-lambatnya ${hasil} (${terbilangHari(hasil)}) hari kerja sejak pelaksanaan, dalam bentuk laporan tertulis untuk setiap peserta.`,
          // Slot yang sudah disiapkan tetap menjadi biaya bagi penyedia;
          // tanpa batas pembatalan, ketidakhadiran menjadi rebutan.
          `Peserta yang tidak hadir pada jadwal yang telah ditentukan tetap diperhitungkan, kecuali pembatalan disampaikan sekurang-kurangnya ${batal} (${terbilangHari(batal)}) hari sebelum jadwal pelaksanaan.`,
          'Penambahan peserta di luar jumlah yang tercantum dalam dokumen ini diperhitungkan sebagai pekerjaan tambahan dan disepakati secara tertulis sebelum dilaksanakan.',
          // Hasil pemeriksaan menyangkut orang per orang; menyerahkannya
          // kepada pihak lain, termasuk kepada pesertanya sendiri, dapat
          // menimbulkan akibat yang tidak dimaksudkan.
          'Hasil pemeriksaan bersifat rahasia dan hanya diserahkan kepada PIHAK PERTAMA. PIHAK KEDUA tidak diperkenankan menyampaikannya kepada pihak lain, termasuk kepada peserta, tanpa persetujuan tertulis dari PIHAK PERTAMA.',
          'Data pribadi peserta hanya digunakan untuk keperluan pemeriksaan sebagaimana tercantum dalam dokumen ini, dan dimusnahkan atau dikembalikan kepada PIHAK PERTAMA setelah pekerjaan dinyatakan selesai.',
        );
      } else {
        points.push(
          ctx.quotaValidUntil
            ? // Kuota yang hangus tanpa disebut di awal adalah kerugian yang
              // tidak pernah tercatat sebagai kerugian.
              `Kuota yang dibeli berlaku sampai dengan tanggal ${ctx.quotaValidUntil}. Kuota yang tidak terpakai sampai dengan tanggal tersebut tidak dapat diuangkan maupun dialihkan, kecuali disepakati lain secara tertulis.`
            : 'Masa berlaku kuota disepakati kedua belah pihak dan dicantumkan secara tertulis sebelum pemakaian dimulai.',
          'PIHAK KEDUA menyediakan laporan pemakaian kuota kepada PIHAK PERTAMA atas permintaan.',
          'Akun beserta kredensialnya didaftarkan atas nama PT. Alpha Konstruksi Nusantara menggunakan alamat surel resmi perusahaan, bukan atas nama perorangan.',
          'Materi lowongan yang akan ditayangkan wajib memperoleh persetujuan tertulis dari PIHAK PERTAMA sebelum penayangan.',
        );
      }

      points.push(
        'PIHAK KEDUA tidak diizinkan mengalihtugaskan pekerjaan ini kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
        'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan dokumen ini.',
      );

      return points;
    },
  },
];

const SOFTWARE_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const isSub = ctx.softwareIsSubscription !== false; // default langganan
      const points: string[] = [paymentSentence(ctx)];

      // Sewa server, domain, dan langganan aplikasi umumnya merupakan objek
      // pemotongan; kodenya dipilih per-PO lewat formulir.
      if (ctx.pphCode) {
        points.push(
          `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
            ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
          }.`,
        );
      }

      if (isSub) {
        const dur =
          ctx.subscriptionDuration && ctx.subscriptionDurationUnit
            ? `${ctx.subscriptionDuration} ${ctx.subscriptionDurationUnit}`
            : '—';
        points.push(
          `Pembelian bersifat langganan (subscription) dengan masa berlaku ${dur}` +
            (ctx.subscriptionStartDate
              ? ` terhitung sejak ${ctx.subscriptionStartDate}.`
              : `.`),
        );
        points.push(
          ctx.autoRenew
            ? `Langganan diperpanjang otomatis (auto-renew) pada akhir periode, kecuali dibatalkan oleh PIHAK PERTAMA sebelum jatuh tempo.`
            : `Langganan tidak diperpanjang otomatis; perpanjangan memerlukan dokumen pembelian baru.`,
        );

        // Pasangan wajib dari perpanjangan otomatis: tanpa pemberitahuan dan
        // persetujuan harga, "otomatis" berarti dapat ditagih pada nilai yang
        // belum pernah disepakati.
        if (ctx.autoRenew) {
          const hari = ctx.renewalNoticeDays ?? 30;
          points.push(
            `PIHAK KEDUA wajib memberitahukan rencana perpanjangan beserta nilainya selambat-lambatnya ${hari} (${terbilangHari(hari)}) hari kalender sebelum periode berjalan berakhir. Tanpa pemberitahuan tersebut, perpanjangan otomatis tidak mengikat PIHAK PERTAMA.`,
            'Perubahan harga pada periode perpanjangan hanya berlaku setelah disetujui secara tertulis oleh PIHAK PERTAMA.',
          );
        }
      } else {
        points.push(
          `Pembelian bersifat beli putus (lisensi perpetual); lisensi berlaku tanpa batas waktu sesuai ketentuan penerbit perangkat lunak.`,
        );
      }

      points.push(licenseDeliverySentence(ctx));

      // Poin yang paling menentukan: akun atas nama perorangan ikut hilang
      // ketika orangnya berhenti, dan biasanya baru ketahuan saat dibutuhkan.
      points.push(
        'Seluruh lisensi dan akun didaftarkan atas nama PT. Alpha Konstruksi Nusantara menggunakan alamat surel resmi perusahaan, bukan atas nama perorangan. Kredensial diserahkan kepada penanggung jawab PIHAK PERTAMA.',
      );

      if (ctx.userSeatCount) {
        points.push(
          `Nilai pekerjaan ini berlaku untuk ${ctx.userSeatCount} pengguna (user/seat). Penambahan pengguna di luar jumlah tersebut diperhitungkan sebagai pembelian tambahan dan disepakati secara tertulis sebelum diaktifkan.`,
        );
      }

      points.push(
        `Kontak penanggung jawab dari PIHAK KEDUA: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
      );
      points.push(
        `Kontak penanggung jawab dari PIHAK PERTAMA: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
      );
      points.push(
        `Lisensi/akun harus aktif dan dapat digunakan selambat-lambatnya 3 (tiga) hari kerja setelah pembayaran diterima, kecuali disepakati lain.`,
      );

      if (isSub) {
        const unduh = ctx.dataRetrievalDays ?? 30;
        points.push(
          `Pada saat langganan berakhir atau dihentikan, PIHAK KEDUA wajib memberikan akses untuk mengunduh seluruh data milik PIHAK PERTAMA dalam format yang lazim terbaca, sekurang-kurangnya ${unduh} (${terbilangHari(unduh)}) hari kalender sejak tanggal berakhir.`,
        );
      }

      points.push(
        'Data yang tersimpan dalam perangkat lunak ini merupakan milik PIHAK PERTAMA dan bersifat rahasia. PIHAK KEDUA tidak diperkenankan mengakses, menggunakan, atau menyerahkannya kepada pihak lain selain untuk keperluan dukungan teknis atas permintaan PIHAK PERTAMA.',
        'PIHAK KEDUA menyediakan dukungan teknis selama masa berlaku lisensi melalui kontak penanggung jawab yang tercantum dalam dokumen ini.',
        `Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan dokumen ini.`,
      );
      return points;
    },
  },
];

// ---- PO-5.1.2 : Maintenance (sparepart / jasa) ----------------------------

const MAINTENANCE_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const isGoods = ctx.maintenanceMode !== 'jasa'; // default barang

      // Mode BARANG (sparepart): pakai klausul G persis (poin 1-8).
      // Sengaja delegasi ke G_CLAUSES v1.0 -> kalau G berubah, barang ikut berubah.
      if (isGoods) {
        return G_CLAUSES[0].build(ctx);
      }

      // Mode JASA (perbaikan): klausul ringkas (verifikasi + garansi).
      const points: string[] = [paymentSentence(ctx)];
      // Jasa perbaikan adalah objek pemotongan PPh; pembelian sparepart
      // tidak. Karena itu poin ini hanya ada di cabang jasa, dan hanya
      // tercetak bila kode objek pajaknya memang dipilih.
      if (ctx.pphCode) {
        points.push(
          `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
            ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
          }.`,
        );
      }
      points.push(
        `Pekerjaan dinyatakan selesai setelah diperiksa dan disetujui oleh perwakilan PIHAK PEMBELI; hasil yang tidak sesuai wajib diperbaiki oleh PIHAK PENJUAL tanpa biaya tambahan.`,
      );
      points.push(
        `PIHAK PENJUAL memberikan garansi atas hasil pekerjaan sesuai kesepakatan kedua belah pihak.`,
      );
      points.push(
        `Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan dokumen pembelian ini.`,
      );
      return points;
    },
  },
];

// ---- registry -------------------------------------------------------------

/**
 * Map of purchase-order type -> its ordered list of template versions.
 * Add other PO types here as their clause templates are defined.
 */

// ---- PO-D: SPK tenaga kerja harian --------------------------------------

function rupiah(value?: number): string {
  const n = Number(value) || 0;
  return 'Rp. ' + n.toLocaleString('id-ID');
}

const D_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const overtime = rupiah(ctx.overtimeRate);
      const shift = Number(ctx.shiftHours) || 8;

      const schedules =
        ctx.wageSchedules && ctx.wageSchedules.length
          ? ctx.wageSchedules
          : ['Upah dibayarkan sesuai kesepakatan.'];

      const lines: string[] = [
        // HAK PEKERJA
        // Jam shift tidak selalu tetap — sebagian pekerjaan menentukannya
        // harian, sehingga poin ini hanya dicetak bila memang disepakati.
        ...(ctx.includeShiftClause !== false
          ? [
              `Shift kerja adalah ${shift} jam per hari. Awal mula jam shift akan diinformasikan oleh penanggung jawab proyek.`,
            ]
          : []),
        ...(ctx.includePlacementClause !== false
          ? [
              'Selama perjanjian kerja sama, PIHAK KEDUA bersedia ditempatkan di seluruh Indonesia sesuai lokasi proyek.',
            ]
          : []),
        `Pekerja berhak mendapatkan uang lembur senilai ${overtime} per jam, terhitung sejak berakhirnya jam shift yang berlaku.`,
        'Pekerja berhak mendapat tempat tinggal sementara yang layak dan disediakan oleh perusahaan.',

        // KEWAJIBAN PEKERJA
        'Pekerja wajib melakukan absensi di mula dan akhir shift.',
        'Pekerja wajib melaksanakan tugas yang dipercayakan oleh penanggung jawab proyek dengan sebaik-baiknya tanpa mengabaikan unsur keselamatan kerja dan kebersihan lingkungan.',
        'Pekerja wajib menjaga peralatan kerja yang digunakan dalam proyek.',
        'Apabila pekerja lalai dan dengan atau tanpa sengaja menghilangkan barang, pekerja wajib melakukan ganti rugi berdasarkan harga barang tersebut.',
        'Apabila pekerja memiliki alat kerja yang rusak, pekerja wajib memberikan informasi tertulis kepada penanggung jawab dan memberikan bukti barang yang rusak. Apabila bukti barang rusak tersebut tidak ada, maka barang tersebut dianggap hilang dan menjadi tanggung jawab pekerja.',
        'Setiap akhir shift dan/atau lembur, pekerja wajib menyimpan seluruh peralatan kerja yang dikumpulkan di satu tempat penyimpanan, dikunci dan ditutup dalam keadaan bersih.',
        'Apabila pekerja tidak menyelesaikan perjanjian kerjasama ini, maka perusahaan berhak untuk tidak memberikan seluruh hak pekerja.',
        'Apabila pekerja meninggalkan utang kepada Pihak Lain selain perusahaan, perusahaan berhak untuk tidak memberikan hak pekerja hingga permasalahan tersebut diselesaikan terlebih dahulu.',
        'Selama perjanjian kontrak kerja ini berlangsung, apabila PIHAK KEDUA ingin mengundurkan diri, PIHAK KEDUA wajib memberikan Surat Pengunduran Diri secara tertulis minimal 30 hari kerja.',

        // LAPORAN LAPANGAN
        'PIHAK KEDUA berkewajiban untuk mengisi Form Data Pekerja (FDP) sebelum pekerjaan dimulai.',

        // TATA CARA PEMBAYARAN
        'Bilamana tidak ditemukan laporan absen pada sebagian/seluruh periode pekan tersebut, perusahaan tidak berkewajiban untuk membayarkan hasil kerja pekerja pada periode tersebut.',
        'Perusahaan berhak untuk memotong sebagian/seluruh hasil pekerjaan apabila ada utang pekerja kepada PIHAK KETIGA yang belum diselesaikan.',
        'Apabila pekerja tidak menyelesaikan pekerjaannya, sisa perhitungan pekerjaan tidak dapat ditagihkan dan/atau dibayarkan.',
      ];

      // Kebijakan Hari Minggu — opsional, disimpan per PO
      if (ctx.includeSundayPolicy) {
        lines.push(
          'Pada prinsipnya Hari Minggu merupakan hari libur lapangan (off).',
          'Apabila karyawan hadir penuh dari hari Senin sampai Sabtu tanpa ada ketidakhadiran, dan tetap masuk pada Hari Minggu, maka gaji Hari Minggu dihitung 2 (dua) kali.',
          'Apabila karyawan hadir penuh dari hari Senin sampai Sabtu, maka berhak mendapatkan gaji Hari Minggu dihitung 1 (satu) kali.',
          'Apabila terdapat ketidakhadiran pada hari Senin sampai dengan Sabtu, maka kehadiran pada Hari Minggu tidak dihitung (0).',
          'Apabila terdapat ketidakhadiran pada hari Senin sampai dengan Sabtu, namun karyawan tetap masuk pada Hari Minggu karena kebutuhan mendesak (urgent), maka kehadiran tersebut dihitung 1 (satu) kali.',
        );
      }

      // Jadwal & periode perhitungan tiap komponen upah ditaruh paling
      // bawah supaya poin baku tidak bergeser saat komponen ditambah.
      lines.push(...schedules);

      return lines;
    },
  },
];

/**
 * Klausul SPK tenaga kerja (PO-D), terbagi empat bagian.
 *
 * Isinya sama persis dengan daftar rata pada `D_CLAUSES` — yang berubah
 * hanya pengelompokannya, sehingga pembaca tahu poin mana mengatur apa.
 * Pengelompokan ini sebelumnya sudah ada sebagai komentar di kode, tetapi
 * tidak pernah sampai ke dokumennya.
 *
 * Beberapa poin dipindahkan ke bagian yang lebih tepat dibanding komentar
 * lama: jam shift dan kesediaan penempatan sebenarnya kewajiban, bukan hak;
 * sedangkan absensi dan pelaporan alat rusak adalah laporan lapangan.
 */
export function buildManpowerClauses(
  ctx: ClauseContext,
  additionalClauses?: string[],
): ClauseSection[] {
  const overtime = rupiah(ctx.overtimeRate);
  const shift = Number(ctx.shiftHours) || 8;

  const hak: string[] = [
    `Pekerja berhak mendapatkan uang lembur senilai ${overtime} per jam, terhitung sejak berakhirnya jam shift yang berlaku.`,
    'Pekerja berhak mendapat tempat tinggal sementara yang layak dan disediakan oleh perusahaan.',
    ...(ctx.includeTransportHome
      ? [
          'Biaya transportasi dari domisili tetap (kampung halaman) pekerja menuju ke domisili perusahaan akan ditanggung oleh perusahaan.',
        ]
      : []),
    ...(ctx.includeHomeLeave
      ? [
          'Selama durasi perjanjian ini berlangsung, pekerja memiliki hak pulang ke domisili tetap (kampung halaman) apabila proyek sudah selesai.',
        ]
      : []),
  ];

  // Kebijakan Hari Minggu mengatur besaran yang diterima pekerja, sehingga
  // tempatnya di bagian hak. Hanya dicetak bila memang diberlakukan.
  if (ctx.includeSundayPolicy) {
    hak.push(
      'Pada prinsipnya Hari Minggu merupakan hari libur lapangan (off).',
      'Apabila karyawan hadir penuh dari hari Senin sampai Sabtu tanpa ada ketidakhadiran, dan tetap masuk pada Hari Minggu, maka gaji Hari Minggu dihitung 2 (dua) kali.',
      'Apabila karyawan hadir penuh dari hari Senin sampai Sabtu, maka berhak mendapatkan gaji Hari Minggu dihitung 1 (satu) kali.',
      'Apabila terdapat ketidakhadiran pada hari Senin sampai dengan Sabtu, maka kehadiran pada Hari Minggu tidak dihitung (0).',
      'Apabila terdapat ketidakhadiran pada hari Senin sampai dengan Sabtu, namun karyawan tetap masuk pada Hari Minggu karena kebutuhan mendesak (urgent), maka kehadiran tersebut dihitung 1 (satu) kali.',
    );
  }

  const kewajiban: string[] = [
    // Jam shift tidak selalu tetap — sebagian pekerjaan menentukannya
    // harian, sehingga poin ini hanya dicetak bila memang disepakati.
    ...(ctx.includeShiftClause !== false
      ? [
          `Shift kerja adalah ${shift} jam per hari. Awal mula jam shift akan diinformasikan oleh penanggung jawab proyek.`,
        ]
      : []),
    ...(ctx.includePlacementClause !== false
      ? [
          'Selama perjanjian kerja sama, PIHAK KEDUA bersedia ditempatkan di seluruh Indonesia sesuai lokasi proyek.',
        ]
      : []),
    'Pekerja wajib melaksanakan tugas yang dipercayakan oleh penanggung jawab proyek dengan sebaik-baiknya tanpa mengabaikan unsur keselamatan kerja dan kebersihan lingkungan.',
    'Pekerja wajib menjaga peralatan kerja yang digunakan dalam proyek.',
    'Apabila pekerja lalai dan dengan atau tanpa sengaja menghilangkan barang, pekerja wajib melakukan ganti rugi berdasarkan harga barang tersebut.',
    'Setiap akhir shift dan/atau lembur, pekerja wajib menyimpan seluruh peralatan kerja yang dikumpulkan di satu tempat penyimpanan, dikunci dan ditutup dalam keadaan bersih.',
    'Selama perjanjian kontrak kerja ini berlangsung, apabila PIHAK KEDUA ingin mengundurkan diri, PIHAK KEDUA wajib memberikan Surat Pengunduran Diri secara tertulis minimal 30 hari kerja.',
    // Dua poin berikut mengatur masa proyek berhenti dan kesiapan dipanggil
    // kembali — keduanya membebani pekerja, sehingga tempatnya di sini.
    'Selama masa non-aktif proyek, pekerja wajib mematuhi instruksi perusahaan dan mengikuti kebijakan yang berlaku sesuai dengan ketentuan yang ditetapkan.',
    'Ketidaksiapan pekerja pada waktu yang telah ditentukan dapat menyebabkan pembatalan kontrak kerja.',
    ...(ctx.includeEquipmentEscort
      ? [
          'Pekerja wajib mendampingi alat pada saat proses mobilisasi dan demobilisasi.',
        ]
      : []),
  ];

  const laporan: string[] = [
    'PIHAK KEDUA berkewajiban untuk mengisi Form Data Pekerja (FDP) sebelum pekerjaan dimulai.',
    'Pekerja wajib melakukan absensi di mula dan akhir shift.',
    'Apabila pekerja memiliki alat kerja yang rusak, pekerja wajib memberikan informasi tertulis kepada penanggung jawab dan memberikan bukti barang yang rusak. Apabila bukti barang rusak tersebut tidak ada, maka barang tersebut dianggap hilang dan menjadi tanggung jawab pekerja.',
  ];

  const pembayaran: string[] = [
    // Jadwal tiap komponen upah disebut lebih dulu agar poin di bawahnya
    // terbaca sebagai pengecualian atas jadwal tersebut.
    ...(ctx.wageSchedules && ctx.wageSchedules.length
      ? ctx.wageSchedules
      : ['Upah dibayarkan sesuai kesepakatan.']),
    'Bilamana tidak ditemukan laporan absen pada sebagian/seluruh periode pekan tersebut, perusahaan tidak berkewajiban untuk membayarkan hasil kerja pekerja pada periode tersebut.',
    'Apabila pekerja tidak menyelesaikan pekerjaannya, sisa perhitungan pekerjaan tidak dapat ditagihkan dan/atau dibayarkan.',
    'Apabila pekerja tidak menyelesaikan perjanjian kerjasama ini, maka perusahaan berhak untuk tidak memberikan seluruh hak pekerja.',
    'Apabila pekerja meninggalkan utang kepada Pihak Lain selain perusahaan, perusahaan berhak untuk tidak memberikan hak pekerja hingga permasalahan tersebut diselesaikan terlebih dahulu.',
    'Perusahaan berhak untuk memotong sebagian/seluruh hasil pekerjaan apabila ada utang pekerja kepada PIHAK KETIGA yang belum diselesaikan.',
  ];

  /*
   * Informasi umum: lokasi kerja dan jangka waktu perjanjian.
   *
   * Sebelumnya jangka waktu tersimpan tetapi tidak pernah dicetak, sehingga
   * mengubahnya di formulir tidak mengubah apa pun pada dokumen. Padahal
   * justru batas waktu inilah yang membedakan perjanjian waktu tertentu dari
   * perjanjian tanpa batas.
   */
  const umum: string[] = [];

  const lokasi = ctx.workLocation || ctx.projectName;
  if (lokasi) {
    umum.push(`Pekerjaan dilaksanakan di ${lokasi}.`);
  }

  if (ctx.contractStartText) {
    umum.push(
      ctx.contractUntilProjectDone || !ctx.contractEndText
        ? // Tanpa tanggal akhir: perjanjian mengikuti selesainya pekerjaan,
          // bukan berarti tanpa batas waktu.
          `Perjanjian ini berlaku sejak tanggal ${ctx.contractStartText} sampai dengan seluruh pekerjaan pada proyek tersebut dinyatakan selesai.`
        : `Perjanjian ini berlaku sejak tanggal ${ctx.contractStartText} sampai dengan tanggal ${ctx.contractEndText}.`,
    );
  }

  const tambahan = (additionalClauses ?? []).filter((x) => !!x && x.trim());

  return [
    ...(umum.length ? [{ title: 'Informasi Umum', items: umum }] : []),
    { title: 'Hak Pekerja', items: hak },
    { title: 'Kewajiban Pekerja', items: kewajiban },
    { title: 'Laporan Lapangan', items: laporan },
    { title: 'Tata Cara Pembayaran', items: pembayaran },
    ...(tambahan.length
      ? [
          {
            title: 'Catatan Tambahan',
            items: tambahan as (string | string[])[],
          },
        ]
      : []),
  ];
}

// ---- PO 6.3.1 : SPK jasa periklanan & produksi materi promosi -------------

/**
 * Jasa periklanan berbeda dari jasa tenaga kerja maupun perbaikan: yang
 * dibeli adalah KARYA — video, foto, desain — bukan waktu kerja orang.
 *
 * Karena itu klausulnya berpusat pada tiga hal yang tidak muncul di SPK
 * lain: berapa kali revisi sudah termasuk harga, siapa pemilik hasil dan
 * berkas mentahnya, dan apa akibat keterlambatan penyerahan.
 */
const ADVERTISING_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const revisi = ctx.revisionCount ?? 2;
      const permil = ctx.latePenaltyPermil ?? 1;
      const cap = ctx.latePenaltyCapPercent ?? 5;
      // Dicoret bila tidak diberlakukan: pembaca tetap tahu ketentuannya ada
      // dan sengaja tidak dipakai, bukan terlewat.
      const dendaMati = ctx.latePenaltyRequired === false;

      const lines: (string | string[])[] = [paymentSentence(ctx)];

      if (ctx.pphCode) {
        lines.push(
          `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
            ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
          }.`,
        );
      }

      lines.push(
        // Batas "selesai" ditetapkan lebih dulu. Tanpa ini, selesai menjadi
        // pendapat: berkas sudah dikirim menurut satu pihak, formatnya belum
        // sesuai menurut pihak lain.
        'Rincian hasil pekerjaan, termasuk durasi, jumlah, resolusi, dan format berkas, mengikuti tabel pada dokumen ini. Pekerjaan dinyatakan selesai setelah seluruh hasil diserahkan dalam format yang disepakati dan diterima secara tertulis oleh PIHAK PERTAMA.',
        // Konsep disetujui lebih dulu: produksi yang terlanjur berjalan
        // dengan arah yang salah tidak dapat diperbaiki lewat revisi.
        'PIHAK KEDUA wajib menyampaikan konsep, naskah, atau rancangan awal kepada PIHAK PERTAMA untuk memperoleh persetujuan tertulis sebelum proses produksi dimulai.',
        `Nilai pekerjaan sudah termasuk ${revisi} (${terbilangHari(revisi)}) kali revisi atas hasil pekerjaan. Revisi selanjutnya diperhitungkan sebagai pekerjaan tambahan dan disepakati tersendiri secara tertulis.`,
        'Permintaan revisi disampaikan secara tertulis dan tidak mengubah lingkup pekerjaan yang telah disepakati.',
        // Revisi memperbaiki yang sudah disepakati; pekerjaan tambahan
        // menambah yang belum pernah disepakati. Bila tidak dibedakan,
        // keduanya menjadi rebutan.
        'Perubahan lingkup yang menambah pekerjaan di luar kesepakatan awal diperhitungkan sebagai pekerjaan tambahan dan disepakati secara tertulis sebelum dikerjakan.',
        'Seluruh biaya talent, perizinan lokasi, properti, dan perlengkapan produksi sudah termasuk dalam nilai pekerjaan, kecuali disepakati lain secara tertulis sebelum produksi dimulai.',
        // Berkas mentah disebut tegas: hasil akhir saja tidak cukup bila
        // suatu saat materinya perlu diolah kembali tanpa vendor semula.
        'Seluruh hasil pekerjaan beserta berkas mentahnya (raw file, file kerja, dan aset pendukung) menjadi milik PIHAK PERTAMA sepenuhnya setelah pembayaran dilunasi, termasuk hak untuk menggunakan, mengubah, dan menggandakannya tanpa batas waktu.',
        'PIHAK KEDUA tidak diperkenankan menggunakan hasil pekerjaan ini untuk keperluan lain, termasuk portofolio dan publikasi, tanpa persetujuan tertulis dari PIHAK PERTAMA.',
        // Penutup risiko yang paling merepotkan: materi sudah tayang lalu
        // harus diturunkan karena klaim atas musik atau rekaman stok.
        'PIHAK KEDUA menjamin seluruh hasil pekerjaan merupakan karya orisinal dan tidak melanggar hak kekayaan intelektual pihak mana pun. Seluruh aset yang digunakan, termasuk musik, rekaman stok, gambar, dan huruf, wajib memiliki lisensi yang sah untuk penggunaan komersial, dan buktinya diserahkan bersama hasil pekerjaan.',
        'Apabila timbul tuntutan atau klaim dari pihak ketiga atas hasil pekerjaan ini, penyelesaiannya menjadi tanggung jawab PIHAK KEDUA sepenuhnya, termasuk segala biaya yang timbul.',
        'Konsep, materi, dan seluruh informasi yang diperoleh dalam pelaksanaan pekerjaan ini bersifat rahasia dan tidak boleh disampaikan kepada pihak lain sebelum PIHAK PERTAMA meluncurkannya. Kewajiban ini tetap berlaku setelah Surat Perintah Kerja ini berakhir.',
        // Tautan yang kedaluwarsa sebulan kemudian, dan berkas mentahnya
        // ikut hilang — kejadian yang lazim, bukan hipotetis.
        `Hasil pekerjaan beserta berkas mentahnya diserahkan melalui media penyimpanan atau tautan unduh yang berlaku sekurang-kurangnya ${
          ctx.fileRetentionDays ?? 30
        } (${terbilangHari(ctx.fileRetentionDays ?? 30)}) hari kalender sejak tanggal penyerahan.`,
        // Tidak diberlakukan berarti tidak dicetak sama sekali. Poin yang
        // dicoret masih terbaca sebagai ketentuan yang pernah dipertimbangkan;
        // untuk denda, keberadaannya di dokumen justru mengundang pertanyaan
        // yang tidak perlu saat penandatanganan.
        ...(dendaMati
          ? []
          : [
              `Keterlambatan penyerahan hasil pekerjaan dikenakan denda sebesar ${permil}‰ (${terbilangHari(permil)} permil) dari nilai pekerjaan untuk setiap hari kalender keterlambatan, dengan denda maksimum sebesar ${cap}% (${terbilangHari(cap)} persen) dari nilai pekerjaan.`,
              'Keterlambatan yang disebabkan oleh tertundanya persetujuan atau permintaan revisi dari PIHAK PERTAMA tidak diperhitungkan sebagai keterlambatan PIHAK KEDUA.',
            ]),
        'PIHAK KEDUA tidak diizinkan mengalihtugaskan pekerjaan ini kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
        'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
      );

      return lines;
    },
  },
];

// ---- PO 6.3.2 : pembelian merchandise -------------------------------------

/**
 * Merchandise adalah pembelian barang biasa, sehingga seluruh klausulnya
 * mengikuti PO-G — satu kebijakan, satu tempat perubahan.
 *
 * Yang ditambahkan hanya satu: persetujuan contoh sebelum produksi massal.
 * Barang promosi dicetak dalam jumlah besar sekaligus, sehingga kesalahan
 * warna atau ukuran baru ketahuan setelah semuanya terlanjur jadi.
 */
const MARKETING_GOODS_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const dasar = G_CLAUSES[G_CLAUSES.length - 1].build(ctx);
      return [
        ...dasar,
        strikeIf(
          ctx.sampleApprovalRequired === false,
          'PIHAK PENJUAL wajib menyerahkan contoh barang untuk memperoleh persetujuan tertulis dari PIHAK PEMBELI sebelum produksi massal dilaksanakan. Barang yang diproduksi wajib sesuai dengan contoh yang telah disetujui.',
        ),
      ];
    },
  },
];

// ---- PO-B: SPK penyewaan alat kerja ke vendor ---------------------------

const B_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      /*
       * Istilah mengikuti apa yang benar-benar disewa.
       *
       * PO-B tidak terbatas pada alat berat — kendaraan, scaffolding, dan
       * perlengkapan lain memakai dokumen yang sama. Menyebut semuanya
       * "alat kerja" membuat dokumen sewa mobil berbunyi janggal, dan
       * ketentuan SILO/SIO di dalamnya menjadi tidak berlaku sama sekali.
       */
      const jenis = ctx.rentalCategory || 'alat-berat';
      const alatBerat = jenis === 'alat-berat';
      const kendaraan = jenis === 'kendaraan';
      const bermesin = alatBerat || kendaraan;
      const barang = alatBerat
        ? 'alat kerja'
        : kendaraan
          ? 'kendaraan'
          : 'barang sewaan';

      // Sub-daftar bersarang dipakai pada cakupan harga pengangkutan.
      const lines: (string | string[])[] = [
        'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
        // Termin memakai kode baku, seragam dengan PO lain. PO-B lama
        // menyimpannya sebagai teks bebas ("Tempo 30 hari"); paymentSentence
        // mencetak teks itu apa adanya bila bukan kode yang dikenal.
        paymentSentence({
          ...ctx,
          paymentTerm: ctx.paymentTerm || ctx.paymentTermText,
        }),
        'Harga sudah termasuk seluruh biaya perpajakan yang berlaku di Republik Indonesia.',
        /*
         * Cakupan harga pada pekerjaan pengangkutan.
         *
         * Menyewa alat berbeda dari mengangkut sesuatu: pada pengangkutan,
         * yang berjalan adalah kendaraan beserta pengemudinya, sehingga upah,
         * bahan bakar, retribusi, dan akibat kelalaian pengemudi ikut melekat
         * pada harganya. Tanpa disebut, hal-hal itu ditagihkan belakangan
         * satu per satu — dan tiap tagihan tampak masuk akal sendiri-sendiri.
         *
         * Menyala sendiri ketika dokumen diterbitkan sebagai tipe A.
         */
        ...(ctx.includeTransportCoverage
          ? [
              'Harga tersebut di atas sudah mencakup koordinasi lain-lain termasuk namun tidak terbatas pada:',
              [
                'upah operator;',
                'bahan bakar minyak (BBM);',
                'biaya koordinasi bongkar dan muat;',
                'retribusi perjalanan;',
                'pengawalan selama perjalanan;',
                'pajak kendaraan/emisi kendaraan;',
                'biaya yang diakibatkan oleh kelalaian dan kesalahan pengendara angkutan;',
                'kecelakaan dalam perjalanan.',
              ],
            ]
          : []),
        'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
        `PIHAK KEDUA wajib memberikan daftar ${barang} dan tenaga kerja yang akan beraktifitas di lingkungan proyek tersebut diatas selambat-lambatnya 7 (tujuh) hari kalender sebelum tanggal tenggat mobilisasi melalui e-mail ke alamat ${OFFICE_CONTACT.email}.`,
        `Hanya ${barang} dan tenaga kerja yang disetujui oleh PIHAK PERTAMA yang diizinkan untuk berada dalam lingkungan proyek.`,
        `PIHAK KEDUA wajib menyewakan ${barang} sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PERTAMA.`,
        // SILO hanya mengikat pesawat angkat dan angkut. Memintanya untuk
        // scaffolding atau kendaraan berarti meminta dokumen yang memang
        // tidak diterbitkan untuk barang tersebut.
        ...(alatBerat
          ? [
              `PIHAK KEDUA wajib mengirimkan dokumen Surat Izin Laik Operasi (SILO) sesuai dengan peraturan dan perundang-undangan yang berlaku di Republik Indonesia untuk ${barang} yang akan disewakan sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PERTAMA. Seluruh dokumen Surat Izin Laik Operasi (SILO) wajib dikirimkan melalui e-mail ke alamat ${OFFICE_CONTACT.email} 7 (tujuh) hari kalender sebelum tanggal tenggat mobilisasi.`,
            ]
          : []),
        // Alat yang disewa lengkap dengan operator: kecakapan dan izin
        // operatornya menjadi tanggung jawab penyedianya.
        ...(ctx.operatorByVendor
          ? [
              alatBerat
                ? 'PIHAK KEDUA wajib menyediakan operator alat kerja yang cakap, handal, dan memiliki Surat Ijin Operasi (SIO) yang masih berlaku setidaknya selama 3 (tiga) bulan sejak tanggal perjanjian.'
                : kendaraan
                  ? 'PIHAK KEDUA wajib menyediakan pengemudi yang cakap, handal, dan memiliki Surat Izin Mengemudi (SIM) sesuai golongan kendaraan yang masih berlaku setidaknya selama 3 (tiga) bulan sejak tanggal perjanjian.'
                  : 'PIHAK KEDUA wajib menyediakan tenaga operasional yang cakap dan handal sesuai kebutuhan pengoperasian barang yang disewakan.',
              'PIHAK KEDUA berkewajiban untuk mengganti operator apabila dianggap tidak handal, tidak dapat mengikuti peraturan yang berlaku, atau tidak dapat berkomunikasi, atau menjalankan instruksi dari PIHAK PERTAMA. Apabila tidak disediakan operator pengganti selambat-lambatnya 3 (tiga) hari kalender sejak surat permintaan pergantian SDM, PIHAK PERTAMA berhak untuk memutus kontrak kerja ini.',
            ]
          : []),
        // Bahan bakar hanya ada pada barang bermesin.
        //
        // Pada sewa singkat, BBM sudah tercakup pada ketentuan harga di
        // atas — pelaporan terpisah hanya menambah kewajiban yang tidak
        // pernah dijalankan untuk pemakaian beberapa jam.
        ...(bermesin && !ctx.shortTermRental
          ? [
              `Seluruh pengambilan dan pengisian Bahan Bakar Minyak (BBM) untuk operasional ${barang} wajib didokumentasikan oleh PIHAK KEDUA dan dilaporkan kepada perwakilan PIHAK PERTAMA.`,
            ]
          : []),
        `PIHAK KEDUA wajib memastikan ${barang} laik untuk digunakan sebelum proses mobilisasi dilaksanakan.`,
        `PIHAK KEDUA wajib melakukan pemeriksaan kondisi ${barang} secara berkala selama perjanjian ini berlangsung.`,
        // Mekanik didatangkan hanya pada sewa berdurasi panjang. Pada sewa
        // singkat, unit yang bermasalah diganti — bukan diperbaiki di
        // tempat.
        ...(ctx.shortTermRental
          ? []
          : [
              `Tim mekanik yang cakap dan handal wajib disediakan oleh PIHAK KEDUA bilamana adanya kerusakan/kendala pada ${barang} tersebut.`,
            ]),
        'Apabila terjadi kerusakan alat kerja, PIHAK PERTAMA berhak untuk mengurangi jumlah hari kerja maksimum pada periode tersebut, sejumlah hari perbaikan terhitung dari laporan kerusakan alat kerja.',
        /*
         * Tenggat perbaikan berbeda menurut lama sewanya.
         *
         * Pada sewa berhari-hari, memperbaiki di tempat masih masuk akal
         * dan dua hari adalah tenggat yang wajar. Pada sewa singkat,
         * menunggu perbaikan berarti kehilangan seluruh masa sewanya —
         * sehingga yang diminta adalah unit pengganti, bukan perbaikan.
         */
        ctx.shortTermRental
          ? `Apabila ${barang} tidak dapat beroperasi, PIHAK KEDUA wajib mengirimkan unit pengganti yang laik pada hari yang sama. Seluruh biaya mobilisasi unit pengganti ditanggung PIHAK KEDUA, dan masa sewa selama unit tidak dapat beroperasi tidak diperhitungkan.`
          : 'Jangka waktu perbaikan maksimum adalah 2 x 24 jam sejak alat kerja tidak dapat beroperasi. Apabila kerusakan tidak dapat ditangani dalam kurun waktu tersebut, PIHAK KEDUA wajib mengganti unit kerja dengan unit cadangan yang beroperasi dengan baik dan laik. Seluruh biaya mobilisasi ditanggung PIHAK KEDUA.',
        'Seluruh peralatan, perlengkapan dan material yang dibutuhkan selama perbaikan merupakan tanggung jawab PIHAK KEDUA.',
        // Risiko mengikuti kendali: alat yang dioperasikan personel PIHAK
        // KEDUA tetap menjadi tanggung jawab mereka. Bila dioperasikan
        // personel PIHAK PERTAMA, tanggung jawabnya dibatasi pada nilai yang
        // sudah disepakati tertulis — tanpa batas ini, nilai penggantian
        // ditentukan sepihak oleh pemilik alat setelah kejadian.
        // Batas nilai selalu disebut agar bila terjadi klaim, angkanya
        // mengacu pada berita acara — bukan ditentukan sepihak setelah
        // kejadian, saat posisi tawar sudah timpang.
        `Keamanan dan keselamatan ${barang} selama berada di lokasi kerja menjadi tanggung jawab ${
          ctx.equipmentRiskBearer === 'pertama'
            ? 'PIHAK PERTAMA'
            : 'PIHAK KEDUA'
        }, sebatas nilai alat kerja yang disepakati kedua belah pihak dan dicantumkan dalam Berita Acara Serah Terima Alat.`,
        // Pengecualiannya mengikuti siapa yang menanggung: yang dikecualikan
        // selalu hal-hal di luar kendali penanggungnya.
        ...(ctx.equipmentRiskBearer === 'pertama'
          ? [
              'Tanggung jawab sebagaimana dimaksud tidak mencakup keausan wajar akibat pemakaian normal, cacat bawaan, kerusakan mekanis yang bukan disebabkan kesalahan pengoperasian, serta kerusakan yang disebabkan oleh kelalaian personel atau mekanik PIHAK KEDUA.',
            ]
          : ctx.operatorByVendor
            ? ['Alat kerja dioperasikan oleh personel PIHAK KEDUA.']
            : [
                // Alat dioperasikan personel PIHAK PERTAMA, sehingga
                // kesalahan pengoperasian tidak dapat dibebankan ke pemilik.
                'Tanggung jawab sebagaimana dimaksud tidak mencakup kerusakan yang disebabkan oleh kesalahan pengoperasian personel PIHAK PERTAMA, di luar keausan wajar akibat pemakaian normal, cacat bawaan, serta kerusakan mekanis yang bukan disebabkan kesalahan pengoperasian.',
              ]),
        // Berita acara dua arah dibuat untuk penyewaan yang menginap di
        // lokasi. Untuk pemakaian beberapa jam, unitnya tidak pernah lepas
        // dari pengawasan pemiliknya.
        ...(ctx.shortTermRental
          ? []
          : [
              'Serah terima alat kerja dituangkan dalam Berita Acara Serah Terima Alat yang memuat kondisi alat beserta dokumentasi foto, ditandatangani kedua belah pihak pada saat mobilisasi dan demobilisasi. Kondisi yang tidak tercatat pada saat mobilisasi tidak dapat ditagihkan pada saat demobilisasi.',
            ]),
        'PIHAK KEDUA wajib mengasuransikan alat kerja miliknya dan menyerahkan salinan polis yang masih berlaku kepada PIHAK PERTAMA sebelum mobilisasi dilaksanakan.',
        // Tidak ada bongkar-muat pada sewa alat singkat: alatnya yang
        // mengangkat, bukan yang diangkat.
        ...(ctx.shortTermRental
          ? []
          : [
              'Harga tersebut termasuk biaya koordinasi bongkar dan muat di area gudang PIHAK KEDUA.',
            ]),
        'Harga dan ketentuan yang tertera di dalam perjanjian ini bersifat mengikat dan tidak dapat berubah hingga volume/waktu perjanjian berakhir.',
        'Barang yang disewakan adalah milik PIHAK KEDUA. PIHAK PERTAMA tidak diizinkan untuk memperjualbelikan, menjadikan jaminan, memindahtangankan, dan/atau memindahkan barang ke lokasi lain tanpa persetujuan dari PIHAK KEDUA.',
        'PIHAK KEDUA tidak bertanggung jawab atas permasalahan PIHAK PERTAMA dengan pihak-pihak lainnya diluar kontrak kerja ini.',
      ];

      // Sewa berbasis jam: dasar perhitungannya hourmeter, sehingga
      // keabsahan dan angka awalnya perlu disepakati sejak mobilisasi.
      // Tanpa acuan awal yang terdokumentasi, selisih jam menjadi
      // perdebatan yang tidak bisa dibuktikan siapa pun.
      if (ctx.rentalByHour) {
        lines.push(
          'Penggunaan alat kerja dihitung berdasarkan hourmeter yang terpasang di dalam alat kerja.',
          'Hourmeter yang terpasang di dalam alat kerja wajib berfungsi dengan baik dan dapat dibuktikan keabsahannya.',
          'Jam awal alat kerja wajib didokumentasikan dan berfungsi sebagai acuan awal penyewaan alat kerja, dan disepakati bersama dengan perwakilan PIHAK PERTAMA.',
        );

        // Kuota jamnya sudah tercantum sebagai volume pada tabel, sehingga
        // tidak diulang di sini. Yang perlu ditegaskan adalah periodenya,
        // sejak kapan dihitung, dan apa yang terjadi bila kurang atau lebih.
        if (ctx.quotaPeriodDays) {
          const hari = ctx.quotaPeriodDays;
          lines.push(
            `Kuota penggunaan alat kerja adalah sejumlah jam yang tercantum dalam tabel di atas, berlaku untuk setiap periode ${hari} (${terbilangHari(
              hari,
            )}) hari kalender, terhitung sejak tanggal alat kerja diterima di lokasi kerja sebagaimana tercatat dalam Berita Acara Serah Terima Alat.`,
            'Pemakaian yang kurang dari kuota dalam satu periode tetap ditagihkan sejumlah kuota periode tersebut, dan sisa jam yang tidak terpakai tidak dapat dialihkan ke periode berikutnya.',
            ...(ctx.excessHourRate
              ? [
                  // rupiah() sudah memuat awalan "Rp. ", jangan ditambah lagi.
                  `Pemakaian di atas kuota dalam satu periode dikenakan tambahan biaya sebesar ${rupiah(
                    Number(ctx.excessHourRate) || 0,
                  )} per jam.`,
                ]
              : []),
            'Pengakhiran sewa sebelum berakhirnya periode yang sedang berjalan tetap ditagihkan sejumlah kuota periode tersebut.',
          );
        }
      }

      // Sewa alat angkut (dicatat sebagai PO-A) memakai template ini juga.
      // Poin berikut hanya muncul bila datanya diisi, sehingga sewa alat
      // biasa tidak ikut berubah.
      if (ctx.shiftHours) {
        lines.push(
          'Penggunaan alat kerja dihitung berdasarkan jam kedatangan alat kerja yang dikonfirmasi oleh perwakilan PIHAK PERTAMA.',
          `Kuota penggunaan alat kerja per shift adalah ${ctx.shiftHours} jam.${
            ctx.overtimeRate
              ? ` Kelebihan pemakaian per alat kerja dikenakan tambahan biaya Rp. ${rupiah(
                  ctx.overtimeRate,
                )} per jam.`
              : ''
          }`,
          'Apabila terjadi kerusakan alat kerja, PIHAK PERTAMA berhak untuk mengurangi jumlah jam kerja secara proporsional.',
        );
      }

      if (ctx.includeTransportCoordination) {
        lines.push(
          'Harga tersebut di atas sudah mencakup koordinasi lain-lain termasuk namun tidak terbatas pada: upah operator; bahan bakar minyak (BBM); biaya koordinasi bongkar dan muat; retribusi perjalanan; pengawalan selama perjalanan; pajak kendaraan/emisi kendaraan; biaya yang diakibatkan oleh kelalaian dan kesalahan pengendara angkutan; serta kecelakaan dalam perjalanan.',
        );
      }

      return lines;
    },
  },
];

// ---- PO-F: pembelian material (beton / material lain) ------------------

const F_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const loco = isLoco(ctx);

      // Beton memakai rangkaian klausul mutu yang khas (mix design & uji
      // kuat tekan). Besi dan material lain mengikuti pola pembelian barang
      // biasa; besi punya tambahan poin uji tarik & tekuk.
      // Jasa pengujian: bukan pembelian barang, melainkan pekerjaan yang
      // dikerjakan laboratorium independen — dokumennya berbentuk SPK.
      if (ctx.materialType === 'ujitekan' || ctx.materialType === 'ujibesi') {
        const besi = ctx.materialType === 'ujibesi';
        const lines: string[] = [
          ctx.sampleCount
            ? `Lingkup pekerjaan adalah ${
                besi ? 'pengujian tarik dan tekuk' : 'pengujian kuat tekan'
              } sebanyak ${ctx.sampleCount} benda uji ${
                besi ? 'besi tulangan' : 'silinder beton'
              }.`
            : `Lingkup pekerjaan adalah ${
                besi ? 'pengujian tarik dan tekuk' : 'pengujian kuat tekan'
              } benda uji ${
                besi ? 'besi tulangan' : 'silinder beton'
              } sesuai rincian pekerjaan.`,
          `PIHAK KEDUA merupakan laboratorium independen yang tidak terafiliasi dengan pemasok ${
            besi ? 'besi' : 'beton'
          } pada proyek ini.`,
          besi
            ? 'Pengujian dilakukan mengikuti SNI 2052 tentang baja tulangan beton, meliputi uji tarik dan uji tekuk.'
            : 'Pengujian dilakukan mengikuti SNI 1974 tentang cara uji kuat tekan beton dengan benda uji silinder.',
          'Seluruh alat uji yang digunakan wajib dalam keadaan terkalibrasi dan bukti kalibrasinya dapat ditunjukkan apabila diminta oleh PIHAK PERTAMA.',
        ];

        if (ctx.sampleHandover) {
          lines.push(`Penyerahan benda uji dilakukan ${ctx.sampleHandover}.`);
        }

        lines.push(
          ctx.testReportDays
            ? `Laporan hasil uji diterbitkan selambat-lambatnya ${ctx.testReportDays} hari kerja setelah benda uji diterima, dalam bentuk laporan resmi bertanda tangan penanggung jawab laboratorium.`
            : 'Laporan hasil uji diterbitkan dalam bentuk laporan resmi bertanda tangan penanggung jawab laboratorium.',
          'Laporan hasil uji disampaikan kepada PIHAK PERTAMA dalam bentuk asli dan salinan lunak (softcopy).',
          paymentSentence(ctx),
          `Kontak penanggung jawab laboratorium adalah: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
          `Kontak penanggung jawab PT. Alpha Konstruksi Nusantara adalah: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
          'Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan surat perintah kerja ini.',
        );

        return lines;
      }

      if (ctx.materialType === 'beton') {
        /*
         * Ketentuan uji kuat tekan dipecah menjadi sub-poin a-e.
         *
         * Sebelumnya seluruhnya ditulis dalam satu kalimat panjang, sehingga
         * jumlah benda uji, usianya, dan siapa yang menanggung biaya
         * bercampur menjadi satu — justru bagian yang paling sering
         * dipersoalkan saat hasil ujinya tidak sesuai.
         *
         * Seluruh poin ini dapat dinonaktifkan. Bila dinonaktifkan, poinnya
         * tetap tercetak dalam keadaan tercoret, bukan dihilangkan, agar
         * pembaca tahu ketentuan itu ada dan sengaja tidak diberlakukan —
         * bukan terlewat saat penyusunan.
         */
        const ujiMati = ctx.concreteTestRequired === false;
        const penanggung =
          ctx.concreteTestCostBearer === 'penjual' ? 'penjual' : 'pembeli';

        return [
          'Volume penagihan adalah volume yang telah disetujui oleh perwakilan pembeli;',
          paymentSentence(ctx),
          'Mix Design harus disetujui oleh pihak pembeli sebelum dokumen pembelian ini berlaku;',
          'Beton yang dikirimkan harus mengikuti Mix Design yang telah disetujui oleh pembeli;',
          'Pihak penjual beton bersedia untuk mengirimkan teknisi yang cakap dalam setiap pengiriman beton;',
          'Pihak penjual beton berkewajiban untuk menyediakan Superplasticizer setiap pengiriman beton;',
          strikeIf(
            ujiMati,
            '4 (empat) benda uji dari setiap kendaraan pengangkut beton akan diambil dan disimpan oleh pihak penjual beton;',
          ),
          strikeIf(
            ujiMati,
            'Uji kuat tekan beton dilakukan dengan ketentuan sebagai berikut:',
          ),
          [
            strikeIf(
              ujiMati,
              'Sebanyak 1 benda uji dengan usia 7 (tujuh) hari dilakukan oleh pihak penjual beton di laboratorium internal;',
            ),
            strikeIf(
              ujiMati,
              'Sebanyak 1 benda uji dengan usia 14 (empat belas) hari dilakukan oleh pihak penjual beton di laboratorium internal;',
            ),
            strikeIf(
              ujiMati,
              'Sebanyak 2 benda uji dengan usia 28 (dua puluh delapan) hari dilakukan oleh pihak penjual beton di laboratorium independen;',
            ),
            strikeIf(
              ujiMati,
              'Pengantaran sampel uji dengan usia 28 (dua puluh delapan) hari ke laboratorium independen dilakukan oleh penjual beton;',
            ),
            strikeIf(
              ujiMati,
              `Biaya untuk pengujian beton di laboratorium independen ditanggung oleh pihak ${penanggung}.`,
            ),
          ],
          strikeIf(
            ujiMati,
            'Penjual wajib melampirkan hasil uji beton yang sudah jatuh tempo umur dan dokumentasi slump test selama periode tersebut;',
          ),
          'Tata cara penagihan dan pembayaran dapat dilihat di lembar terlampir.',
        ];
      }

      // ---- besi & material lain (pola pembelian barang biasa) ----
      const lines: string[] = [
        paymentSentence(ctx),
        `Termin pengiriman adalah ${loco ? 'Loco (diambil sendiri)' : 'Franco (dikirim ke lokasi)'}.`,
        deliveryAddressSentence(ctx),
        `Kontak penanggung jawab supplier adalah: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab PT. Alpha Konstruksi Nusantara adalah: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
      ];

      // Poin tanggal bersifat opsional: hanya muncul bila tanggalnya diisi.
      if (ctx.deliveryDate) {
        lines.push(`Pengiriman dilakukan sebelum tanggal ${ctx.deliveryDate}.`);
      }
      if (ctx.paymentDueDate) {
        lines.push(
          `Pembayaran dilakukan sebelum tanggal ${ctx.paymentDueDate}.`,
        );
      }

      lines.push(
        'PIHAK PENJUAL wajib mengirimkan barang sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PEMBELI.',
      );

      // Khusus besi: poin uji mutu selalu ditampilkan, namun dicoret bila
      // pengujian tidak diberlakukan — sehingga pembaca tetap tahu poin itu
      // ada dan sengaja tidak dipakai, bukan terlewat.
      if (ctx.materialType === 'besi') {
        // Poin penggantian barang tetap ditampilkan walau pengujian tidak
        // diberlakukan — dicoret, agar pembaca tahu poin itu sengaja tidak
        // dipakai. Rincian benda uji tidak dicantumkan di sini; bila perlu,
        // tuliskan lewat Poin Tambahan.
        lines.push(
          strikeIf(
            ctx.materialTestRequired === false,
            'PIHAK PENJUAL bersedia untuk mengirimkan penggantian barang apabila terjadi kegagalan dalam uji mutu.',
          ),
        );
      }

      lines.push(
        'PIHAK PENJUAL dan PEMBELI wajib mendokumentasikan (video) serah terima yang berisi pemeriksaan kondisi barang.',
        `Bila Franco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PENJUAL wajib memberikan detail Kontak Penanggung Jawab Pengiriman, nomor polisi kendaraan pengirim beserta bukti kelengkapan dokumen pengirim (STNK, KIR, SIM) dalam bentuk softcopy melalui e-mail ke ${OFFICE_CONTACT.email};`,
        'Bila Loco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PEMBELI akan memberikan detail Kontak Penanggung Jawab Penerima, dalam bentuk softcopy melalui nomor telepon/fax atau alamat e-mail yang diberikan;',
        'Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan kontrak jual/beli ini.',
      );

      return lines;
    },
  },
];

/**
 * Isi bawaan Pasal 3 dan Pasal 4 pada SPK pekerjaan (PO-H).
 *
 * Disimpan sebagai daftar kalimat, bukan satu blok teks: isinya tetap bisa
 * diubah, ditambah, atau dihapus per poin, sementara penomoran dan
 * pencetakannya tetap ditangani secara otomatis.
 */
export const H_PASAL_3_DEFAULT: string[] = [
  'PIHAK KEDUA berkewajiban untuk mengisi Form Data Pekerja dan Form List Peralatan sebelum pekerjaan dimulai;',
  'PIHAK KEDUA berkewajiban untuk memberikan laporan dan dokumentasi sesuai dengan arahan dan permintaan dari PIHAK PERTAMA;',
  'Dokumentasi tersebut wajib disampaikan kepada Project Manager PIHAK PERTAMA;',
  'PIHAK KEDUA wajib melaporkan kepada PIHAK PERTAMA apabila terdapat perubahan Data Pekerja dan/atau list peralatan selambat-lambatnya 2 x 24 jam sejak terjadinya perubahan tersebut.',
];

export const H_PASAL_4_DEFAULT: string[] = [
  'Material besi dan beton, akses lokasi, persiapan lahan, perataan lokasi pekerjaan, bobokan pondasi eksisting, penentuan titik (survey), keamanan & pengawalan keluar masuk alat, uang bongkar muat, uang kebisingan dan koordinasi lingkungan lainnya menjadi tanggung jawab PIHAK PERTAMA.',
  'Asuransi CAR & TPLL (jika ada) merupakan tanggung jawab PIHAK PERTAMA.',
  'Standby alat karena lahan tidak bisa dikerjakan, menunggu gambar, dan kendala lain persiapan dari pemberi tugas akan dikenakan biaya standby alat sebesar Rp. 5.000.000,- per hari untuk 1 set alat, berlaku setelah standby selama 3 hari berturut-turut.',
];

/** Dokumen penagihan pada Pasal 5 — jadi sub-poin bernomor 5.3.1 dst. */
export const H_PASAL_5_DOCUMENTS: string[] = [
  'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
  'Kwitansi bermaterai (asli);',
  'Faktur pajak;',
  'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
  'Certificate of Payment - CoP (asli).',
];

export interface Pasal5Context {
  /**
   * Siklus penagihan, sama seperti pada SPK mandor.
   *
   * Bila belum dipilih, kalimatnya jatuh ke keterangan bebas
   * (`billingPeriod`) sebagaimana dokumen borongan lama.
   */
  billingCycleMode?:
    'cutoff-tanggal' | 'periode-pekan' | 'selesai-pekerjaan' | 'sejak-mulai';
  weekStartDay?: string;
  weekEndDay?: string;
  /** Periode penagihan, mis. "2 (dua) minggu" atau "bulanan". */
  billingPeriod?: string;
  /**
   * Tanggal-tanggal cutoff penagihan dalam sebulan, mis. [15, 30].
   *
   * Disimpan sebagai daftar tanggal, bukan pasangan awal-akhir: periodenya
   * tersirat dari sehari setelah cutoff sebelumnya sampai cutoff berikutnya,
   * sehingga tidak mungkin ada tanggal yang terlewat maupun tumpang tindih.
   */
  cutoffDays?: number[];
  /** Termin pembayaran sejak dokumen penagihan lengkap diterima (hari). */
  billingTermDays?: number | string;
  /** Tenggat pembayaran setelah dokumen lengkap diterima (hari). */
  paymentDays?: number | string;
  /** Tenggat pembayaran akhir setelah demobilisasi (hari kalender). */
  finalPaymentDays?: number | string;
  /** Uang muka: hanya dicantumkan bila memang disepakati. */
  hasDownPayment?: boolean;
  downPaymentPercent?: number | string;
  downPaymentDays?: number | string;
  /** Retensi: ditahan dari tiap penagihan, dilepas setelah pemeliharaan. */
  hasRetention?: boolean;
  retentionPercent?: number | string;
  retentionReleaseDays?: number | string;
}

/**
 * Rakit Pasal 5 (Penagihan & Pembayaran).
 *
 * Poin ke-3 memuat daftar dokumen sebagai sub-poin, sehingga strukturnya
 * bertingkat: item bertipe string adalah poin biasa, sedangkan array berisi
 * daftar dokumen yang menempel pada poin sebelumnya.
 */
/**
 * Kalimat siklus penagihan, dipakai bersama SPK borongan dan SPK mandor.
 *
 * Ditulis sekali agar tiga bentuknya berbunyi sama di seluruh dokumen —
 * kalimat yang berbeda untuk aturan yang sama membuat pembaca mengira
 * ketentuannya memang berbeda.
 */
// Bagian yang belum diisi ditandai garis bawah agar terlihat saat diperiksa,
// bukan hilang begitu saja.
function isian(v: any): string {
  const t = String(v ?? '').trim();
  return t ? t : '______';
}

function siklusPenagihan(ctx: any): string[] {
  if (ctx.billingCycleMode === 'selesai-pekerjaan') {
    return [
      'Penagihan dilakukan satu kali setelah seluruh pekerjaan dinyatakan selesai dan diterima oleh PIHAK PERTAMA, dibuktikan dengan Berita Acara Serah Terima Pekerjaan yang ditandatangani kedua belah pihak.',
    ];
  }

  if (ctx.billingCycleMode === 'periode-pekan') {
    return [
      `Penagihan dilakukan setiap periode pekan, dengan mula periode pekan hari ${
        ctx.weekStartDay || 'Kamis'
      } dan akhir periode pekan hari ${ctx.weekEndDay || 'Rabu'}.`,
    ];
  }

  if (ctx.billingCycleMode === 'cutoff-tanggal' && ctx.cutoffDays?.length) {
    return [
      `Penagihan dilakukan berdasarkan tanggal cutoff, yaitu setiap ${daftarTanggal(
        ctx.cutoffDays,
      )} pada setiap bulan. Apabila tanggal dimaksud tidak terdapat pada bulan berjalan, cutoff jatuh pada hari terakhir bulan tersebut.`,
      'Setiap penagihan meliputi pekerjaan sejak sehari setelah tanggal cutoff sebelumnya sampai dengan tanggal cutoff yang bersangkutan.',
    ];
  }

  // Belum memilih siklus: pakai keterangan bebas seperti dokumen lama.
  return [`Penagihan dilakukan setiap periode ${isian(ctx.billingPeriod)}.`];
}

export function buildPasal5(
  ctx: Pasal5Context,
  documents: string[] = H_PASAL_5_DOCUMENTS,
): (string | string[])[] {
  const lines: (string | string[])[] = [];

  // Uang muka disebut lebih dulu karena dibayarkan sebelum pekerjaan mulai.
  if (ctx.hasDownPayment) {
    lines.push(
      `Uang muka sebesar ${isian(ctx.downPaymentPercent)}% dari nilai pekerjaan dibayarkan selambat-lambatnya ${isian(ctx.downPaymentDays)} hari sejak Surat Perintah Kerja ditandatangani kedua belah pihak, dan diperhitungkan secara proporsional pada setiap penagihan.`,
    );
  }

  /*
   * Siklus penagihan disamakan dengan SPK mandor: tanggal cutoff, batas
   * pekan tetap, atau sekali di akhir pekerjaan.
   *
   * Bentuk teks bebas (`billingPeriod`) tetap dipakai bila siklusnya belum
   * dipilih — SPK borongan lama tersimpan dengan bentuk itu, dan mengganti
   * kalimatnya berarti mengubah isi dokumen yang sudah ditandatangani.
   */
  lines.push(
    ...siklusPenagihan(ctx),
    'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan mendistribusikannya kepada bagian keuangan.',
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    documents,
    // Termin diambil dari pilihan siklus penagihan bila sudah ditentukan.
    // `paymentDays` adalah bentuk lama yang mengatur hal yang sama; keduanya
    // sempat tampil bersamaan, dan yang tercetak justru bukan yang baru
    // diisi pengguna.
    `Pembayaran dilakukan ${isian(
      ctx.billingTermDays ?? ctx.paymentDays,
    )} hari sejak dokumen penagihan lengkap diterima oleh bagian keuangan PIHAK PERTAMA.`,
  );

  if (ctx.hasRetention) {
    lines.push(
      `Retensi sebesar ${isian(ctx.retentionPercent)}% ditahan dari setiap penagihan dan dibayarkan selambat-lambatnya ${isian(ctx.retentionReleaseDays)} hari kalender setelah masa pemeliharaan berakhir serta seluruh kewajiban PIHAK KEDUA dinyatakan selesai.`,
    );
  }

  lines.push(
    `Pembayaran akhir dilakukan selambat-lambatnya ${isian(ctx.finalPaymentDays)} hari kalender sejak seluruh proses demobilisasi, serah terima, dan pemeriksaan alat kerja disetujui oleh PIHAK PERTAMA.`,
  );

  return lines;
}

/**
 * Klausul SPK pembuangan lumpur/tanah (PO-H ringkas).
 *
 * Sebagian besar poin bersifat baku; yang diambil dari formulir hanya termin
 * pembayaran dan blok keterangan proyek pada poin 6. Nilai balikan bisa berisi
 * array — itu menjadi sub-poin bertingkat pada dokumen.
 */
export interface BuangLumpurContext extends ClauseContext {
  /** Poin 6 — keterangan proyek. */
  scheduleText?: string;
  projectName?: string;
  workLocation?: string;
  officePICName?: string;
  officePICPhoneNumber?: string;
  /** Tenggat pengiriman dokumen sebelum mobilisasi (hari kalender). */
  mobilizationNoticeDays?: number | string;
  /** Pemotongan PPh: kode, nama objek pajak, dan tarifnya. */
  pphCode?: string;
  pphTaxObject?: string;
  pphPercentage?: number | string;
}

export function buildBuangLumpurClauses(
  ctx: BuangLumpurContext,
): (string | string[])[] {
  const n = Number(ctx.mobilizationNoticeDays ?? 7);
  const email = OFFICE_CONTACT.email;

  /**
   * Tenggat pengiriman dokumen. Bila diisi 0, dokumennya boleh menyusul pada
   * hari pelaksanaan — menulis "selambat-lambatnya 0 (nol) hari" justru
   * membingungkan.
   */
  const tenggat =
    n > 0
      ? `selambat-lambatnya ${n} (${terbilangHari(n)}) hari kalender sebelum tanggal tenggat mobilisasi`
      : 'selambat-lambatnya pada hari pelaksanaan pekerjaan';

  return [
    'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
    paymentSentence(ctx),
    'Harga sudah termasuk seluruh biaya perpajakan yang berlaku di Republik Indonesia.',
    // Pemotongan PPh hanya dicantumkan bila kodenya memang dipilih.
    ...(ctx.pphCode
      ? [
          `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
            ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
          }.`,
        ]
      : []),
    'Harga tersebut di atas sudah mencakup koordinasi lain-lain termasuk namun tidak terbatas pada:',
    [
      'retribusi perjalanan;',
      'pengawalan selama perjalanan;',
      'buka/tutup pintu gerbang pada lokasi pembuangan;',
      'pajak kendaraan/emisi kendaraan;',
      'biaya yang diakibatkan oleh kelalaian dan kesalahan pengendara angkutan;',
      'kecelakaan dalam perjalanan.',
    ],
    'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
    // Poin 6 berupa blok keterangan, bukan kalimat.
    'Keterangan pekerjaan:',
    [
      `Jadwal Pekerjaan: ${ctx.scheduleText || '—'}`,
      `Nama Proyek: ${ctx.projectName || '—'}`,
      `Lokasi Pekerjaan: ${ctx.workLocation || '—'}`,
      `Nama Wakil PIHAK PERTAMA: ${ctx.officePICName || '—'}`,
      `Nomor Telepon: ${ctx.officePICPhoneNumber || '—'}`,
    ],
    `PIHAK KEDUA wajib memberikan daftar alat kerja dan tenaga kerja yang akan beraktivitas di lingkungan proyek tersebut di atas ${tenggat} melalui e-mail ke alamat ${email}.`,
    'Hanya alat kerja dan tenaga kerja yang disetujui oleh PIHAK PERTAMA yang diizinkan untuk berada dalam lingkungan proyek.',
    `PIHAK KEDUA wajib mengirimkan dokumen Surat Tanda Nomor Kendaraan (STNK) dan Dokumen Lulus Keur/KIR sesuai dengan peraturan dan perundang-undangan yang berlaku di Republik Indonesia untuk alat kerja yang akan digunakan sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PERTAMA. Seluruh dokumen tersebut wajib dikirimkan melalui e-mail ke alamat ${email} ${tenggat}.`,
    'PIHAK KEDUA wajib menyediakan pengendara yang cakap, handal dan memiliki Surat Izin Mengemudi (SIM) sesuai dengan jenis kelas kendaraan yang digunakan dan masih berlaku setidaknya selama 6 (enam) bulan sejak tanggal perjanjian.',
    'Pembuangan limbah/sampah dilakukan berdasarkan instruksi dan arahan dari perwakilan PIHAK PERTAMA.',
    'Keamanan dan keselamatan alat kerja menjadi tanggung jawab PIHAK KEDUA.',
    'Kebersihan jalan raya selama pekerjaan ini berlangsung menjadi tanggung jawab PIHAK KEDUA.',
    'Harga dan ketentuan yang tertera di dalam perjanjian ini bersifat mengikat dan tidak dapat berubah hingga volume/waktu perjanjian berakhir.',
  ];
}

/** Ejaan angka hari untuk penulisan "7 (tujuh) hari". */
/**
 * Tulis daftar tanggal sebagai kalimat: [15, 30] -> "tanggal 15 dan 30".
 *
 * Diurutkan dan dibuang kembarnya agar dokumen tetap terbaca wajar walau
 * pengisiannya tidak berurutan.
 */
function daftarTanggal(days: number[]): string {
  const urut = [
    ...new Set(days.map(Number).filter((d) => d >= 1 && d <= 31)),
  ].sort((a, b) => a - b);
  if (!urut.length) return '-';
  if (urut.length === 1) return `tanggal ${urut[0]}`;
  const akhir = urut.pop();
  return `tanggal ${urut.join(', ')} dan ${akhir}`;
}

function terbilangHari(n: number | string): string {
  const kata: Record<string, string> = {
    '1': 'satu',
    '2': 'dua',
    '3': 'tiga',
    '4': 'empat',
    '5': 'lima',
    '6': 'enam',
    '7': 'tujuh',
    '8': 'delapan',
    '9': 'sembilan',
    '10': 'sepuluh',
    '14': 'empat belas',
    '30': 'tiga puluh',
  };
  return kata[String(n)] ?? String(n);
}

/** Satu seksi klausul: judul opsional + daftar poin (boleh bertingkat). */
export interface ClauseSection {
  title?: string;
  items: (string | string[])[];
}

// Mewarisi Pasal5Context juga: klausul mandor & grouting memakai periode
// penagihan dan tenggat pembayaran akhir dari sana.
export interface MandorContext extends BuangLumpurContext, Pasal5Context {
  /**
   * Cara menentukan periode penagihan:
   * - 'cutoff-tanggal' → tanggal cutoff tetap dalam sebulan, mis. 15 dan 30
   * - 'periode-pekan'  → batas pekan tetap, mis. Kamis s.d. Rabu
   *
   * 'sejak-mulai' masih dikenali agar PO lama tetap dapat dibaca, tetapi
   * tidak lagi dapat dipilih dan tidak menghasilkan baris apa pun: bentuk
   * itu menyatakan penagihan dihitung sekian minggu sejak pekerjaan dimulai,
   * padahal yang dijalankan adalah tanggal cutoff yang disepakati.
   */
  billingCycleMode?:
    'cutoff-tanggal' | 'periode-pekan' | 'selesai-pekerjaan' | 'sejak-mulai';
  weekStartDay?: string;
  weekEndDay?: string;
  /**
   * Keterangan pemotongan PPh (poin 2) dan penyediaan alat (poin 3).
   *
   * Keduanya berubah menurut jenis vendor — perorangan memakai PPh Final
   * UMKM, badan usaha konstruksi memakai PPh Final Jasa Konstruksi — sehingga
   * dijadikan isian, bukan template terpisah.
   */
  pphNote?: string;
  toolingNote?: string;
}

/** Pilihan baku keterangan PPh pada SPK mandor. */
export const MANDOR_PPH_NOTES: string[] = [
  'PPh Final 2,5% (untuk usaha perorangan)',
  'PPh Final Jasa Konstruksi kelas kecil 1,75% (SBU dilampirkan)',
];

/** Pilihan baku keterangan penyediaan alat kerja. */
export const MANDOR_TOOLING_NOTES: string[] = [
  'Peralatan kerja disediakan oleh pihak pemberi kerja.',
  'Sudah termasuk bar cutter dan mesin rol.',
];

/**
 * Daftar foto dokumentasi yang wajib dikirim, berbeda menurut jenis mandor.
 *
 * Hanya bagian inilah yang membedakan SPK mandor besi, bor, dan cor — sisanya
 * identik, sehingga ketiganya memakai satu template.
 */
export const MANDOR_DOCUMENTATION: Record<string, string[]> = {
  'mandor-besi': [
    'proses persiapan pembesian dan alat bantu pekerjaan tersebut;',
    'hasil kerja pembesian dalam periode hari tersebut; dan',
    'laporan dokumentasi disertai checklist bersama.',
  ],
  'mandor-bor': [
    'proses persiapan pembesian dan alat bantu pekerjaan tersebut;',
    'hasil kerja pembesian dalam periode hari tersebut;',
    'laporan proses persiapan pengecoran (pemasangan tremi dan hopper);',
    'laporan foto hasil pengecoran periode hari tersebut;',
    'PIHAK KEDUA wajib memberikan laporan tremi yang sudah dicuci setiap habis pengecoran;',
    'apabila tremi tidak dicuci dan menyebabkan tremi jatuh/hilang/rusak, maka akan menjadi tanggung jawab PIHAK KEDUA; dan',
    'laporan dokumentasi disertai checklist bersama.',
  ],
  'mandor-cor': [
    'laporan proses persiapan pengecoran (pemasangan tremi dan hopper);',
    'laporan foto hasil pengecoran periode hari tersebut;',
    'PIHAK KEDUA wajib memberikan laporan tremi yang sudah dicuci setiap habis pengecoran;',
    'apabila tremi tidak dicuci dan menyebabkan tremi jatuh/hilang/rusak, maka akan menjadi tanggung jawab PIHAK KEDUA; dan',
    'laporan dokumentasi disertai checklist bersama.',
  ],
};

/**
 * Klausul SPK mandor (besi / bor / cor).
 *
 * Dokumennya terbagi tiga seksi, sehingga dikembalikan sebagai daftar seksi
 * — bukan satu daftar panjang — agar judulnya ikut tercetak. Perbedaan antar
 * jenis mandor hanya pada daftar dokumentasi.
 */
export function buildMandorClauses(
  ctx: MandorContext,
  scope: string = 'mandor-besi',
): ClauseSection[] {
  const pph = String(ctx.pphPercentage ?? '2,5').replace('.', ',');

  return [
    {
      items: [
        'Volume akan dihitung berdasarkan volume teoritis (hasil perhitungan gambar kerja dan volume teoritis tiang bor).',
        // Keterangan PPh mengikuti isian; bila kosong, dirakit dari tarif
        // kode PPh yang dipilih agar angkanya tidak pernah bertentangan.
        `Harga di atas akan dipotong ${
          ctx.pphNote || `PPh Final ${pph}% (untuk usaha perorangan)`
        }.`,
        ctx.toolingNote ||
          'Peralatan kerja disediakan oleh pihak pemberi kerja.',
        'Unit rate di atas tidak termasuk:',
        [
          'biaya akomodasi (ditanggung oleh Perusahaan);',
          'Catatan penting: semua pengeluaran tanpa persetujuan Project Manager tidak akan digantikan oleh Perusahaan.',
        ],
      ],
    },
    {
      title: 'LAPORAN LAPANGAN',
      items: [
        'PIHAK KEDUA berkewajiban untuk mengisi Form Data Pekerja (FDP) sebelum pekerjaan dimulai;',
        'PIHAK KEDUA berkewajiban untuk memberikan laporan foto absensi setiap hari masuk bekerja dan selesai bekerja;',
        'Pekerja berkewajiban untuk memberikan laporan foto dokumentasi pada saat:',
        MANDOR_DOCUMENTATION[scope] ?? MANDOR_DOCUMENTATION['mandor-besi'],
        'Dokumentasi tersebut wajib disampaikan kepada Field Supervisor (FS) dan Project Engineer (PE).',
      ],
    },
    {
      title: 'TATA CARA PEMBAYARAN',
      items: [
        /*
         * Dua bentuk siklus penagihan.
         *
         * Bentuk lama "penagihan dapat dilakukan N setelah pekerjaan dimulai"
         * dibuang: yang terjadi di lapangan bukan hitungan sejak pekerjaan
         * mulai, melainkan tanggal cutoff yang sudah disepakati. Menuliskan
         * yang tidak dijalankan membuat seluruh dokumen kehilangan wibawa.
         *
         * PO lama yang tersimpan dengan bentuk itu tidak menampilkan baris
         * ini sama sekali — lebih baik hilang daripada mencetak ketentuan
         * yang tidak pernah dipakai.
         */
        ...(ctx.billingCycleMode === 'periode-pekan'
          ? [
              `Mula periode pekan adalah hari ${
                ctx.weekStartDay || 'Kamis'
              }, akhir periode pekan adalah hari ${ctx.weekEndDay || 'Rabu'};`,
            ]
          : ctx.billingCycleMode === 'selesai-pekerjaan'
            ? [
                'Penagihan dilakukan satu kali setelah seluruh pekerjaan dinyatakan selesai dan diterima oleh PIHAK PERTAMA, dibuktikan dengan Berita Acara Serah Terima Pekerjaan yang ditandatangani kedua belah pihak;',
                ...(ctx.billingTermDays
                  ? [
                      `Pembayaran dilakukan dalam ${ctx.billingTermDays} (${terbilangHari(
                        ctx.billingTermDays,
                      )}) hari sejak dokumen penagihan lengkap diterima oleh PIHAK PERTAMA;`,
                    ]
                  : []),
              ]
            : ctx.billingCycleMode === 'cutoff-tanggal' &&
                ctx.cutoffDays?.length
              ? [
                  `Penagihan dilakukan berdasarkan tanggal cutoff, yaitu setiap ${daftarTanggal(
                    ctx.cutoffDays,
                  )} pada setiap bulan. Apabila tanggal dimaksud tidak terdapat pada bulan berjalan, cutoff jatuh pada hari terakhir bulan tersebut;`,
                  'Setiap penagihan meliputi pekerjaan sejak sehari setelah tanggal cutoff sebelumnya sampai dengan tanggal cutoff yang bersangkutan;',
                  ...(ctx.billingTermDays
                    ? [
                        `Pembayaran dilakukan dalam ${ctx.billingTermDays} (${terbilangHari(
                          ctx.billingTermDays,
                        )}) hari sejak dokumen penagihan lengkap diterima oleh PIHAK PERTAMA;`,
                      ]
                    : []),
                ]
              : []),
        'Penagihan pertama harus meliputi transportasi kedatangan tim;',
        ...commonPaymentClauses(ctx).slice(0, 3),
        // Khas SPK mandor: pembayaran mingguan tiap Sabtu.
        'Pembayaran dilakukan setiap hari Sabtu berdasarkan CoP yang sudah diterima PIHAK PERTAMA;',
        ...commonPaymentClauses(ctx).slice(3),
      ],
    },
  ];
}

/**
 * Poin tata cara pembayaran yang berlaku sama pada SPK mandor maupun
 * subkontraktor. Dipisahkan agar revisi redaksinya cukup sekali.
 */
function commonPaymentClauses(ctx: MandorContext): string[] {
  const hari = ctx.finalPaymentDays || 7;
  return [
    'Dari data yang diterima FS dan PE setiap harinya, PIHAK PERTAMA akan memberikan rangkuman kemajuan pekerjaan di periode pekan tersebut;',
    'Bilamana tidak ditemukan laporan pada sebagian/seluruh periode pekan tersebut, PIHAK PERTAMA tidak berkewajiban untuk membayarkan hasil kerja PIHAK KEDUA;',
    'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan mendistribusikannya kepada bagian keuangan;',
    `Pembayaran akhir dilakukan selambat-lambatnya ${hari} (${terbilangHari(hari)}) hari kalender sejak seluruh proses demobilisasi, serah terima, dan pemeriksaan alat kerja disetujui oleh PIHAK PERTAMA;`,
    'PIHAK PERTAMA berhak untuk memotong sebagian/seluruh hasil pekerjaan apabila ada hutang pekerja kepada PIHAK KETIGA yang belum diselesaikan;',
    'Apabila PIHAK KEDUA tidak menyelesaikan pekerjaannya, sisa perhitungan pekerjaan tidak dapat ditagihkan dan/atau dibayarkan.',
  ];
}

/**
 * Klausul SPK subkontraktor grouting.
 *
 * Bagian pembayarannya sebagian besar sama dengan SPK mandor, sehingga
 * memakai `commonPaymentClauses`; yang khas hanya termin di poin pertama.
 */
export function buildGroutingClauses(ctx: MandorContext): ClauseSection[] {
  const common = commonPaymentClauses(ctx);

  return [
    {
      title: 'LAPORAN LAPANGAN',
      items: [
        'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
        'Pekerja berkewajiban untuk memberikan laporan foto dokumentasi pada saat:',
        [
          'proses persiapan grouting (pembobokan area);',
          'proses injeksi grouting;',
          'hasil kerja grouting dalam periode hari tersebut; dan',
          'laporan dokumentasi disertai checklist bersama.',
        ],
        'Dokumentasi tersebut wajib disampaikan kepada Field Supervisor (FS) dan Project Engineer (PE).',
        'Pekerjaan di atas sudah termasuk biaya mobilisasi dan demobilisasi serta penggunaan alat bantu (scaffolding, dan lain-lain).',
        `Waktu pekerjaan adalah ${ctx.scheduleText || '—'}.`,
      ],
    },
    {
      title: 'TATA CARA PEMBAYARAN',
      items: [
        // Termin diambil dari formulir; sisanya memakai poin bersama.
        `${paymentSentence(ctx).replace(/\.$/, '')} setelah data-data penagihan lengkap kami terima;`,
        ...common.slice(0, 3),
        ...common.slice(3),
      ],
    },
  ];
}

/**
 * Butir lampiran tata cara penagihan.
 *
 * Bisa berupa kalimat, daftar bertingkat (array), atau blok alamat yang
 * dicetak rata tengah — strukturnya bersarang hingga tiga tingkat.
 */
export type BillingItem = string | BillingItem[] | { block: string[] };

/**
 * Lampiran "Tata Cara Penagihan dan Pembayaran — Penyedia Jasa".
 *
 * Dipakai pada SPK pekerjaan jasa (PO-H). Berbeda dengan lampiran pembelian
 * barang: penagihannya berbasis periode pekan dan wajib disertai Certificate
 * of Payment.
 */
export function buildServiceBillingTerms(
  ctx: MandorContext = {},
): BillingItem[] {
  const mulai = ctx.weekStartDay || 'Kamis';
  const akhir = ctx.weekEndDay || 'Rabu';

  return [
    'Penagihan dilakukan dengan cara:',
    [
      `Mula periode pekan adalah hari ${mulai}, akhir periode pekan adalah hari ${akhir};`,
      `PIHAK KEDUA memberikan progres pekerjaan paling lambat pada hari ${mulai} sebelum pukul 12.00 waktu setempat kepada perwakilan PIHAK PERTAMA, yang berisi:`,
      [
        'Laporan Kemajuan Pekerjaan periode pekan (mula periode pekan hingga akhir periode pekan);',
        'Dokumentasi Pekerjaan;',
        'Laporan Pekerjaan yang sudah diperiksa dan disetujui perwakilan PIHAK PERTAMA.',
      ],
    ],
    'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan menyerahkannya kepada PIHAK KEDUA sebagai salah satu persyaratan penagihan.',
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    [
      'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
      'Kwitansi bermaterai (asli);',
      'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
      'Certificate of Payment (CoP);',
      'Faktur pajak (bila ada).',
    ],
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    {
      block: [
        'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
        'RUKO ASIA TROPIS AT 12 NO. 21',
        'KOTA HARAPAN INDAH - BEKASI',
      ],
    },
    'Proses pembayaran tagihan vendor dilakukan melalui transfer bank ke nomor rekening yang tercantum dalam dokumen penagihan (wajib sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor wajib memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan metode pembayaran dan tarif Bank Indonesia yang berlaku (bila ada).',
    'Khusus untuk vendor yang berada di luar JABODETABEK, pengiriman dokumen penagihan dapat dilakukan melalui jasa kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
  ];
}

/** Pihak yang menanggung risiko: penerima jasa (Alpha) atau penyedia jasa. */
export type RiskBearer = 'penerima' | 'penyedia';

export interface TransportContext extends MandorContext {
  /**
   * Jenis pekerjaan PO-A:
   * - 'pengiriman' → jasa angkut barang antar lokasi
   * - 'sewa-alat'  → sewa alat kerja berikut operator
   */
  workKind?: 'pengiriman' | 'sewa-alat';
  /** Moda angkutan; menentukan seksi tambahan pada klausul. */
  transportMode?: 'darat' | 'laut' | 'udara';
  /**
   * Moda yang dipakai pada baris pengiriman; boleh lebih dari satu sehingga
   * satu SPK dapat memuat klausul darat sekaligus udara.
   */
  transportModes?: string[];
  /** Cetak klausul dokumen asuransi? false berarti diurus PIHAK PERTAMA. */
  requireInsuranceDoc?: boolean;
  /** Nilai pertanggungan yang disepakati; kosong berarti "sesuai kesepakatan". */
  insuranceValue?: number | string;
  /** Udara: cakupan layanan yang tercetak pada poin pertama. */
  airService?: 'door-to-door' | 'port-to-door' | 'port-to-port';
  /**
   * Laut: jadwal kapal per pengiriman. Satu SPK bisa memuat dua keberangkatan
   * dengan jadwal berbeda.
   */
  shipmentSchedules?: {
    mode?: string;
    from?: string;
    to?: string;
    deliveryDateText?: string;
    unloadingDateText?: string;
    closingDateText?: string;
    etdText?: string;
    etaText?: string;
  }[];
  /** Dipertahankan untuk PO lama yang jadwalnya masih di tingkat kontrak. */
  closingDateText?: string;
  etdText?: string;
  etaText?: string;
  /** Laut: nilai pertanggungan per kontainer; 0 berarti klausul dilewati. */
  containerInsuranceValue?: number | string | null;
  /** Nama & telepon penerima di titik tujuan. */
  destinationPICName?: string;
  destinationPICPhone?: string;
  /**
   * Pemotongan PPh. Sudah dipakai pada klausul sejak awal namun belum pernah
   * dideklarasikan di sini.
   */
  pphCode?: string;
  pphTaxObject?: string;
  pphPercentage?: number | string;
  /** Jadwal & titik pengiriman (jenis 'pengiriman'). */
  deliveryDateText?: string;
  unloadingDateText?: string;
  originName?: string;
  originAddress?: string;
  destinationName?: string;
  destinationAddress?: string;
  /**
   * Jenis 'sewa-alat' memakai template PO-B; field ketentuan alatnya
   * mengikuti ClauseContext milik B (shiftHours, overtimeRate, dst).
   */
  /** Tenggat penyerahan dokumen asuransi sebelum pengiriman (hari). */
  insuranceDays?: number | string;
  /**
   * Tenggat PIHAK PERTAMA menyerahkan daftar barang sebelum proses muat
   * (hari) — khusus pengiriman laut.
   *
   * Dulu ikut memakai `insuranceDays`. Keduanya kebetulan sama-sama
   * berjangka beberapa hari, tetapi tidak berkaitan: kewajiban ini tetap
   * berlaku walau asuransi diurus sendiri oleh PIHAK PERTAMA. Karena
   * berbagi satu field, tenggatnya ikut hilang begitu asuransi dimatikan.
   */
  cargoListDays?: number | string;
  /** Tenggat penyerahan consignment note setelah barang diterima (hari). */
  consignmentDays?: number | string;
  /** Penanggung risiko proses pengiriman dan proses bongkar. */
  deliveryRisk?: RiskBearer;
  unloadingRisk?: RiskBearer;
}

const RISK_LABEL: Record<RiskBearer, string> = {
  penerima: 'Penerima jasa',
  penyedia: 'Penyedia jasa',
};

const MODE_TITLE: Record<string, string> = {
  darat: 'Darat',
  laut: 'Laut',
  udara: 'Udara',
};

/** Cakupan layanan pengiriman udara, tercetak pada poin pertama. */
const AIR_SERVICE_LABEL: { [k: string]: string } = {
  'door-to-door': 'door-to-door',
  'port-to-door': 'port-to-door',
  'port-to-port': 'port-to-port',
};

/**
 * Sewa alat untuk keperluan transportasi dicatat sebagai PO-A, tetapi isi
 * perjanjiannya sama dengan sewa alat biasa (PO-B): kelaikan alat, kuota jam
 * per shift, dan kewajiban operator. Karena itu dokumennya memakai template
 * dan tata letak PO-B — bukan template transportasi.
 *
 * Kategorinya tetap 'A' agar pelaporannya tidak berubah.
 */
export function transportUsesRentalLayout(workKind?: string): boolean {
  return workKind === 'sewa-alat';
}

/**
 * Klausul SPK jasa transportasi (PO-A).
 *
 * Terbagi dua seksi: ketentuan umum dan ketentuan per moda angkutan.
 * Pada dokumen asli, penanggung risiko ditulis "Penerima jasa/Penyedia jasa"
 * lalu dicoret manual — di sini dipilih lewat formulir agar tercetak tegas.
 */
export function buildTransportClauses(
  ctx: TransportContext,
  additionalClauses?: string[],
): ClauseSection[] {
  /*
   * Satu SPK bisa memuat pengiriman lewat moda berbeda (mis. sebagian darat,
   * sebagian udara). Klausul yang dicetak mengikuti moda yang benar-benar
   * dipakai pada baris — satu bagian untuk tiap moda, bukan satu bagian
   * yang dipilih di muka.
   */
  /*
   * Bila belum ada baris pengiriman, tidak ada moda yang bisa dipastikan.
   * Sebelumnya keadaan ini jatuh ke 'darat', sehingga pratinjau menampilkan
   * klausul darat pada SPK yang ternyata lewat udara — menyesatkan pembaca
   * sebelum apa pun diisi.
   */
  const modes: string[] =
    ctx.transportModes && ctx.transportModes.length
      ? [...new Set<string>(ctx.transportModes)]
      : ctx.transportMode
        ? [ctx.transportMode]
        : [];
  const asuransi = ctx.insuranceDays ?? 3;
  const consignment = ctx.consignmentDays ?? 3;
  // PO lama tidak menyimpan field ini; nilainya dulu memang diambil dari
  // insuranceDays, sehingga cetak ulangnya tetap menghasilkan angka sama.
  const daftarBarang = ctx.cargoListDays ?? ctx.insuranceDays ?? 3;

  const umum: (string | string[])[] = [
    'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
    paymentSentence(ctx),
    'Harga sudah termasuk seluruh biaya perpajakan yang berlaku di Republik Indonesia.',
  ];

  if (ctx.pphCode) {
    umum.push(
      `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
        ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
      }.`,
    );
  }

  umum.push(
    'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
    'Keamanan dan keselamatan alat kerja beserta kargo yang diangkut bersama alat kerja tersebut menjadi tanggung jawab PIHAK KEDUA.',
    'Harga dan ketentuan yang tertera di dalam perjanjian ini bersifat mengikat dan tidak dapat berubah hingga volume/waktu perjanjian berakhir.',
    ...(ctx.requireInsuranceDoc === false
      ? []
      : [
          // Sebagian pengiriman diasuransikan sendiri oleh PIHAK PERTAMA;
          // klausul ini hanya dicetak bila vendor yang menanggung. Nilai
          // pertanggungan disebut bila sudah disepakati.
          `PIHAK KEDUA wajib menyerahkan dokumen asuransi ${
            // Nilai dari kolom bertopeng berupa teks; 0 dan kosong sama-sama
            // berarti nominalnya belum ditentukan.
            Number(String(ctx.insuranceValue ?? '').replace(/[^\d.-]/g, '')) > 0
              ? `dengan nilai pertanggungan ${rupiah(
                  Number(String(ctx.insuranceValue).replace(/[^\d.-]/g, '')),
                )}`
              : 'dengan nominal yang telah disepakati oleh PIHAK PERTAMA'
          } selambat-lambatnya ${asuransi} (${terbilangHari(asuransi)}) hari sebelum barang dikirimkan.`,
        ]),
    `PIHAK KEDUA wajib menyerahkan dokumen consignment note selambat-lambatnya ${consignment} (${terbilangHari(consignment)}) hari setelah barang diterima oleh PIHAK PERTAMA.`,
    `Rencana keterlambatan pengiriman barang oleh PIHAK KEDUA wajib diinformasikan kepada PIHAK PERTAMA melalui e-mail ke alamat ${OFFICE_CONTACT.email}.`,
  );

  /*
   * Isi bagian moda berbeda-beda: darat merinci biaya perjalanan, udara
   * menyebut cakupan layanan pintu-ke-pintu, laut memakai jadwal kapal dan
   * nilai pertanggungan per kontainer.
   */
  const bagianModa = (mode: string): ClauseSection => {
    const rincianModa: (string | string[])[] =
      mode === 'udara'
        ? [
            `Harga di atas merupakan harga dengan layanan ${
              AIR_SERVICE_LABEL[ctx.airService || 'door-to-door']
            }.`,
            'Harga tersebut di atas sudah mencakup koordinasi lain-lain termasuk namun tidak terbatas pada:',
            [
              'asuransi;',
              'biaya yang diakibatkan oleh kelalaian dan kesalahan pengendara angkutan;',
              'kecelakaan dalam perjalanan.',
            ],
          ]
        : mode === 'laut'
          ? (() => {
              /*
               * Nilainya datang dari kolom bertopeng, sehingga berupa teks
               * ("200 000 000"), bukan angka. Perbandingan langsung dengan 0
               * tidak pernah terpenuhi — nilainya harus diubah dulu.
               *
               * Kosong berarti memakai nilai bawaan; 0 berarti klausulnya
               * sengaja dihilangkan.
               */
              const nilai =
                ctx.containerInsuranceValue === undefined ||
                ctx.containerInsuranceValue === null ||
                ctx.containerInsuranceValue === ''
                  ? 200000000
                  : Number(
                      String(ctx.containerInsuranceValue).replace(
                        /[^\d.-]/g,
                        '',
                      ),
                    ) || 0;

              return nilai === 0
                ? []
                : [
                    `Harga sudah mencakup asuransi dengan nilai pertanggungan ${rupiah(
                      nilai,
                    )} per kontainer.`,
                  ];
            })()
          : [
              'Harga tersebut di atas sudah mencakup koordinasi lain-lain termasuk namun tidak terbatas pada:',
              [
                'asuransi;',
                'upah pengendara;',
                'bahan bakar minyak (BBM);',
                'biaya koordinasi bongkar dan muat;',
                'retribusi perjalanan;',
                'pengawalan selama perjalanan;',
                'pajak kendaraan/emisi kendaraan;',
                'biaya yang diakibatkan oleh kelalaian dan kesalahan pengendara angkutan;',
                'kecelakaan dalam perjalanan.',
              ],
            ];

    /*
     * Laut memakai jadwal kapal (closing, ETD, ETA) dan hanya menyebut titik
     * tujuan; darat dan udara menyebut jadwal kirim/bongkar beserta titik asal.
     */
    /*
     * Jadwal, titik asal, dan titik tujuan tidak lagi ditulis sebagai klausul:
     * ketiganya sudah tercatat pada tiap baris pengiriman, sehingga menulisnya
     * dua kali justru berisiko berbeda isi. Pengiriman laut tetap memakai
     * jadwal kapal karena tidak punya padanan di baris.
     */
    /*
     * Tiap pengiriman ditulis sebagai blok jadwalnya sendiri, berikut rutenya.
     * Ini penting pada SPK rapelan: tanpa penyebutan rute, sepuluh pengiriman
     * dalam satu dokumen tidak bisa dibedakan satu sama lain.
     */
    const jadwalBaris = (ctx.shipmentSchedules ?? []).filter(
      (j) => (j.mode || 'darat') === mode,
    );

    const jadwalDanTitik: (string | string[])[] = jadwalBaris.length
      ? jadwalBaris.flatMap((j, i) => [
          jadwalBaris.length > 1
            ? `Jadwal pekerjaan pengiriman ${i + 1} (dari ${j.from || '—'} ke ${j.to || '—'}):`
            : 'Jadwal pekerjaan:',
          mode === 'laut'
            ? [
                `Jadwal Closing Container: ${j.closingDateText || '—'}`,
                `Estimated Time of Departure: ${j.etdText || '—'}`,
                `Estimated Time of Arrival: ${j.etaText || '—'}`,
              ]
            : [
                // Rute hanya perlu disebut di sini bila judul bloknya belum
                // memuatnya (yakni saat pengirimannya tunggal).
                ...(jadwalBaris.length > 1
                  ? []
                  : [`Rute: dari ${j.from || '—'} ke ${j.to || '—'}`]),
                `Jadwal Pengiriman: ${j.deliveryDateText || '—'}`,
                `Jadwal Pembongkaran: ${j.unloadingDateText || j.deliveryDateText || '—'}`,
              ],
        ])
      : mode === 'laut'
        ? [
            // Jalur lama: PO yang jadwalnya masih tersimpan di tingkat kontrak.
            'Jadwal pekerjaan:',
            [
              `Jadwal Closing Container: ${ctx.closingDateText || '—'}`,
              `Estimated Time of Departure: ${ctx.etdText || '—'}`,
              `Estimated Time of Arrival: ${ctx.etaText || '—'}`,
            ],
          ]
        : [];

    const risiko: string[] = [
      `Proses pengiriman barang dan seluruh risiko yang termasuk di dalam proses tersebut akan menjadi tanggung jawab ${
        RISK_LABEL[ctx.deliveryRisk || 'penyedia']
      }.`,
      `Proses bongkar barang dan seluruh risiko yang termasuk di dalam proses tersebut akan menjadi tanggung jawab ${
        RISK_LABEL[ctx.unloadingRisk || 'penerima']
      }.`,
    ];

    /* Dua kewajiban dokumen di bawah hanya berlaku pada pengiriman laut. */
    const tambahanLaut: string[] =
      mode === 'laut'
        ? [
            `PIHAK PERTAMA wajib memberikan daftar barang yang akan dikirimkan selambat-lambatnya ${daftarBarang} (${terbilangHari(
              daftarBarang,
            )}) hari sebelum proses muat.`,
            `PIHAK KEDUA wajib memberikan salinan sebagian manifest kapal (kontainer yang disewakan) selambat-lambatnya ${consignment} (${terbilangHari(
              consignment,
            )}) hari setelah proses muat selesai.`,
          ]
        : [];

    return {
      title: MODE_TITLE[mode] || 'Darat',
      items: [...rincianModa, ...jadwalDanTitik, ...risiko, ...tambahanLaut],
    };
  };

  // Urutan tetap darat -> udara -> laut agar susunan dokumen konsisten.
  const URUTAN = ['darat', 'udara', 'laut'];
  const terpakai = URUTAN.filter((m) => modes.includes(m));
  const lainnya = modes.filter((m) => !URUTAN.includes(m));

  const tambahan = (additionalClauses ?? []).filter((x) => !!x && x.trim());

  return [
    { title: 'Umum', items: umum },
    ...[...terpakai, ...lainnya].map(bagianModa),
    /*
     * Berdiri sebagai bagian sendiri. Bila ditempelkan ke bagian moda
     * terakhir, poin yang mengikat seluruh pekerjaan bisa terbaca seolah
     * hanya berlaku bagi moda itu.
     */
    ...(tambahan.length
      ? [
          {
            title: 'Catatan Tambahan',
            items: tambahan as (string | string[])[],
          },
        ]
      : []),
  ];
}

/**
 * Lampiran "Tata Cara Penagihan dan Pembayaran — Jasa Transportasi".
 *
 * Berbeda dengan lampiran jasa borongan: dokumen wajibnya menyertakan
 * surat jalan/manifest, bukan Certificate of Payment.
 */
export function buildTransportBillingTerms(): BillingItem[] {
  return [
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    [
      'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
      'Kwitansi bermaterai (asli);',
      'Faktur pajak (asli);',
      'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
      'Surat Jalan/Manifest yang sudah ditandatangani oleh perwakilan PIHAK PERTAMA.',
    ],
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    {
      block: [
        'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
        'RUKO ASIA TROPIS AT 12 NO. 21',
        'KOTA HARAPAN INDAH - BEKASI',
      ],
    },
    'Proses pembayaran tagihan vendor dilakukan melalui transfer bank ke nomor rekening yang tercantum dalam dokumen penagihan (wajib sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor wajib memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan metode pembayaran dan tarif Bank Indonesia yang berlaku (bila ada).',
    'Khusus untuk vendor yang berada di luar JABODETABEK, pengiriman dokumen penagihan dapat dilakukan melalui jasa kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
    'Tata cara pembayaran ini merupakan satu kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
  ];
}

/**
 * Lampiran "Tata Cara Penagihan dan Pembayaran — Jasa Perbaikan & Perawatan"
 * (PO 5.1.2 mode jasa).
 *
 * Berbeda dengan lampiran pembelian barang: jasa ditagih setelah pekerjaan
 * selesai, bukti selesainya Berita Acara Serah Terima (bukan Surat Jalan),
 * dan nilainya dipotong PPh.
 *
 * Berbeda pula dengan lampiran jasa borongan: perbaikan berjalan sekali
 * selesai, sehingga tidak memakai Certificate of Payment, periode penagihan,
 * maupun retensi.
 */
export function buildMaintenanceBillingTerms(): BillingItem[] {
  return [
    'PIHAK KEDUA berhak menagihkan hasil pekerjaannya setelah pekerjaan dinyatakan selesai dan Berita Acara Serah Terima Pekerjaan ditandatangani oleh perwakilan PIHAK PERTAMA.',
    'Dokumen penagihan yang wajib dikirimkan adalah sebagai berikut:',
    [
      'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
      'Kwitansi bermaterai (asli);',
      'Faktur Pajak (bila PIHAK KEDUA merupakan Pengusaha Kena Pajak);',
      'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
      'Berita Acara Serah Terima Pekerjaan yang telah ditandatangani oleh perwakilan PIHAK PERTAMA (asli);',
      'Dokumentasi (foto/video) kondisi sebelum dan sesudah pekerjaan;',
      'Daftar sparepart yang diganti beserta merek dan tipenya (bila pekerjaan mencakup penggantian sparepart);',
      'Sertifikat garansi (bila ada).',
    ],
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    {
      block: [
        'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
        'RUKO ASIA TROPIS AT 12 NO. 21',
        'KOTA HARAPAN INDAH - BEKASI',
      ],
    },
    // Pengaman khas pekerjaan perawatan: tanpa ini sulit membuktikan
    // sparepart benar-benar diganti dan bukan dibersihkan lalu ditagih baru.
    'Sparepart atau komponen yang diganti wajib diserahkan kembali kepada PIHAK PERTAMA pada saat serah terima pekerjaan, kecuali disepakati lain secara tertulis.',
    // Tarif tidak disebut di sini: kode objek pajak dan tarifnya sudah
    // tercantum pada catatan perjanjian, dipilih per-PO lewat formulir.
    'Atas jasa ini PIHAK PERTAMA melakukan pemotongan Pajak Penghasilan sesuai peraturan perpajakan yang berlaku. Bukti potong diserahkan kepada PIHAK KEDUA sesuai jangka waktu yang diatur dalam peraturan tersebut.',
    'Pembayaran dilakukan sesuai termin yang tercantum dalam Surat Perintah Kerja, terhitung sejak dokumen penagihan lengkap diterima oleh bagian keuangan PIHAK PERTAMA.',
    'Proses pembayaran tagihan vendor dilakukan melalui transfer bank ke nomor rekening yang tercantum dalam dokumen penagihan (wajib sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor wajib memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan metode pembayaran dan tarif Bank Indonesia yang berlaku (bila ada).',
    'Khusus untuk vendor yang berada di luar JABODETABEK, pengiriman dokumen penagihan dapat dilakukan melalui jasa kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
    'Pembayaran yang telah dilakukan tidak membebaskan PIHAK KEDUA dari kewajiban garansi atas hasil pekerjaan.',
    'Tata cara pembayaran ini merupakan satu kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
  ];
}

// ---- PO 6.4.1: SPK jasa pengurusan legalitas & perizinan ------------------

/**
 * Penanggung biaya resmi yang hangus bila pengajuan ditolak bukan karena
 * kelalaian PIHAK KEDUA.
 */
export type RejectionCostBearer = 'pertama' | 'kedua' | 'kesepakatan';

/*
 * Ditulis sebagai lanjutan kalimat (huruf kecil di awal), karena dipakai
 * setelah anak kalimat "Bila pengajuan ditolak bukan karena kelalaian
 * PIHAK KEDUA, ...".
 */
const REJECTION_COST_SENTENCE: Record<RejectionCostBearer, string> = {
  pertama:
    'biaya resmi yang telah disetorkan dan tidak dapat ditarik kembali menjadi tanggung jawab PIHAK PERTAMA.',
  kedua:
    'biaya resmi yang telah disetorkan dan tidak dapat ditarik kembali menjadi tanggung jawab PIHAK KEDUA.',
  kesepakatan:
    'biaya resmi yang telah disetorkan dan tidak dapat ditarik kembali ditanggung berdasarkan kesepakatan tertulis kedua belah pihak.',
};

export interface TrainingContext extends ClauseContext {
  /** Diselenggarakan di tempat penyedia, atau di lokasi PIHAK PERTAMA. */
  trainingVenue?: 'penyedia' | 'lokasi';
  /** Batas pembatalan peserta sebelum jadwal (hari). */
  participantCancelDays?: number | string;
  /** Tenggat penyerahan sertifikat asli sejak pelatihan selesai (hari). */
  certificateDueDays?: number | string;
  /** Penanggung biaya ujian ulang bagi peserta yang tidak lulus. */
  retakeCostBearer?: 'pertama' | 'kedua' | 'kesepakatan';
}

const RETAKE_COST_SENTENCE: Record<string, string> = {
  pertama: 'ditanggung PIHAK PERTAMA.',
  kedua: 'ditanggung PIHAK KEDUA tanpa biaya tambahan.',
  kesepakatan: 'disepakati kedua belah pihak secara tertulis.',
};

/**
 * Klausul SPK penyelenggaraan pelatihan (PO 6.5.2).
 *
 * Berbeda dari pemeriksaan peserta pada PO 6.5.1: yang dituju bukan keputusan
 * atas seseorang, melainkan kemampuan beserta bukti resminya. Karena itu tiga
 * hal menjadi pokok, dan ketiganya tidak muncul pada jenis PO lain:
 *
 *   kelulusan  — peserta dapat tidak lulus, dan ujian ulangnya berbiaya
 *   sertifikat — punya penerbit yang harus berwenang, dan masa berlaku
 *   masa laku  — sertifikat yang kedaluwarsa membuat orangnya tidak boleh
 *                bekerja, dan itu biasanya baru ketahuan saat pemeriksaan
 */
export function buildTrainingClauses(
  ctx: TrainingContext,
  additionalClauses?: string[],
): ClauseSection[] {
  const batal = ctx.participantCancelDays ?? 3;
  const sertifikat = ctx.certificateDueDays ?? 30;
  const diLokasi = ctx.trainingVenue === 'lokasi';

  const umum: (string | string[])[] = [paymentSentence(ctx)];

  if (ctx.pphCode) {
    umum.push(
      `Harga di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
        ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
      }.`,
    );
  }

  umum.push(
    'Biaya yang tercantum dalam dokumen ini sudah mencakup materi, modul, sertifikat, dan biaya ujian. Biaya di luar hal tersebut disepakati secara tertulis sebelum dikeluarkan.',
    'PIHAK KEDUA tidak diizinkan mengalihtugaskan pekerjaan ini kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
    'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
  );

  const pelaksanaan: (string | string[])[] = [
    'Pelatihan dilaksanakan pada tanggal dan tempat sebagaimana tercantum dalam dokumen ini.',
    // Tempat yang sudah disiapkan tetap menjadi biaya bagi penyelenggara;
    // tanpa batas pembatalan, ketidakhadiran menjadi rebutan.
    `Peserta yang tidak hadir pada jadwal yang telah ditentukan tetap diperhitungkan, kecuali pembatalan disampaikan sekurang-kurangnya ${batal} (${terbilangHari(batal)}) hari sebelum jadwal pelaksanaan.`,
    'Penambahan peserta di luar jumlah yang tercantum dalam dokumen ini diperhitungkan sebagai pekerjaan tambahan dan disepakati secara tertulis sebelum dilaksanakan.',
    'PIHAK KEDUA menyediakan instruktur yang memiliki kualifikasi sesuai dengan materi pelatihan.',
  ];

  if (diLokasi) {
    pelaksanaan.push(
      'PIHAK PERTAMA menyediakan ruang dan sarana pendukung, sedangkan PIHAK KEDUA menyediakan materi, peralatan peraga, dan instruktur.',
      'Keselamatan selama praktik di lokasi PIHAK PERTAMA menjadi tanggung jawab bersama sesuai pengaturan yang disepakati sebelum pelaksanaan.',
    );
  }

  const dokumen: (string | string[])[] = [
    // Sertifikat dari penyelenggara yang tidak berwenang tidak berlaku di
    // lapangan, sementara biayanya sudah keluar.
    'PIHAK KEDUA menjamin sertifikat diterbitkan oleh lembaga yang berwenang sesuai peraturan yang berlaku, dan sah digunakan untuk keperluan pekerjaan konstruksi.',
    `Sertifikat asli beserta nomor registrasinya diserahkan kepada PIHAK PERTAMA selambat-lambatnya ${sertifikat} (${terbilangHari(sertifikat)}) hari kalender sejak pelatihan dinyatakan selesai.`,
    // Sertifikat yang kedaluwarsa diam-diam baru ketahuan saat pemeriksaan
    // proyek — dan pada saat itu orangnya tidak boleh bekerja.
    'PIHAK KEDUA memberitahukan masa berlaku setiap sertifikat kepada PIHAK PERTAMA pada saat penyerahan.',
    'Apabila sertifikat tidak diterbitkan bukan karena kelalaian peserta, PIHAK PERTAMA berhak meminta pengembalian biaya untuk peserta yang bersangkutan.',
  ];

  const kelulusan: (string | string[])[] = [
    `Peserta yang tidak lulus dapat mengikuti ujian ulang. Biaya ujian ulang ${
      RETAKE_COST_SENTENCE[ctx.retakeCostBearer || 'kesepakatan']
    }`,
    'Hasil penilaian setiap peserta disampaikan kepada PIHAK PERTAMA.',
    'Data pribadi peserta hanya digunakan untuk keperluan pelatihan sebagaimana tercantum dalam dokumen ini, dan dimusnahkan atau dikembalikan setelah pekerjaan dinyatakan selesai.',
  ];

  const tambahan = (additionalClauses ?? []).filter((x) => !!x && x.trim());

  return [
    { title: 'Umum', items: umum },
    { title: 'Pelaksanaan', items: pelaksanaan },
    { title: 'Sertifikat', items: dokumen },
    { title: 'Kelulusan & Data Peserta', items: kelulusan },
    ...(tambahan.length
      ? [{ title: 'Catatan Tambahan', items: tambahan }]
      : []),
  ];
}

export interface InsuranceContext extends ClauseContext {
  /** Ditutup lewat broker, atau langsung ke perusahaan asuransi. */
  insuranceChannel?: 'broker' | 'langsung';
  /** Ada baris premi yang dititipkan lewat PIHAK KEDUA. */
  hasPremium?: boolean;
  /** Tenggat penyerahan polis asli sejak premi dibayarkan (hari kalender). */
  policyDeliveryDays?: number | string;
  /** Dokumen yang diterbitkan berupa jaminan (surety bond/bank garansi). */
  isSuretyBond?: boolean;
}

/**
 * Klausul SPK penutupan pertanggungan (PO 6.4.2).
 *
 * Berbeda dari SPK jasa lain karena yang dibeli adalah DOKUMEN, bukan
 * pekerjaan: begitu polis terbit, yang menanggung risiko adalah polis itu —
 * bukan PIHAK KEDUA. Karena itu poin intinya bukan mutu pengerjaan,
 * melainkan bahwa polis yang sah benar-benar sampai ke tangan PIHAK PERTAMA.
 *
 * Kejadian yang paling sering merugikan: cover note terbit, premi dibayar,
 * lalu polis asli tidak pernah diserahkan — dan baru ketahuan saat klaim,
 * ketika posisi tawar sudah habis.
 *
 * Premi dipisahkan tegas dari nilai jasa, mengikuti pola biaya resmi pada
 * PO 6.4.1: premi hanya dititipkan untuk diteruskan kepada penanggung,
 * sehingga tidak boleh ikut menjadi dasar pemotongan pajak.
 */
export function buildInsuranceClauses(
  ctx: InsuranceContext,
  additionalClauses?: string[],
): ClauseSection[] {
  const lewatBroker = ctx.insuranceChannel !== 'langsung';
  const polis = ctx.policyDeliveryDays ?? 14;

  const umum: (string | string[])[] = [paymentSentence(ctx)];

  // Pemotongan hanya atas imbalan jasa; premi bukan penghasilan PIHAK KEDUA.
  if (lewatBroker && ctx.pphCode) {
    umum.push(
      `Harga jasa akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
        ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
      }. Pemotongan tidak dikenakan atas premi.`,
    );
  }

  if (ctx.hasPremium) {
    umum.push(
      'Premi bukan merupakan bagian dari nilai jasa. Premi ditagihkan sesuai jumlah yang sebenarnya disetorkan kepada perusahaan asuransi, tanpa penambahan, dan wajib disertai bukti setor atau kuitansi resmi dari perusahaan asuransi atas nama PT. Alpha Konstruksi Nusantara.',
      'Nilai premi yang tercantum dalam dokumen ini merupakan perkiraan. Selisih terhadap jumlah sebenarnya diperhitungkan pada saat penagihan.',
    );
  }

  umum.push(
    'PIHAK KEDUA tidak diizinkan mengalihtugaskan pekerjaan ini kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
    'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
  );

  const penerbitan: (string | string[])[] = [
    // Poin inti dokumen ini.
    `PIHAK KEDUA wajib menyerahkan polis asli beserta seluruh lampirannya kepada PIHAK PERTAMA selambat-lambatnya ${polis} (${terbilangHari(polis)}) hari kalender sejak premi dibayarkan. Cover note hanya berlaku sementara dan tidak menggantikan polis.`,
    `Apabila polis asli tidak diserahkan dalam jangka waktu sebagaimana dimaksud, PIHAK PERTAMA berhak meminta pengembalian premi secara penuh.`,
    'PIHAK KEDUA menjamin polis diterbitkan oleh perusahaan asuransi yang memiliki izin usaha yang sah dari Otoritas Jasa Keuangan.',
    'Masa pertanggungan, nilai pertanggungan, risiko yang dijamin, serta risiko sendiri (deductible/own risk) mengikuti rincian sebagaimana tercantum dalam dokumen ini.',
    // Celah yang sering terlewat: alat sudah berangkat, polis baru aktif
    // beberapa hari kemudian, dan kejadian di antaranya tidak tertanggung.
    'Masa pertanggungan wajib sudah berlaku sebelum pekerjaan atau pengiriman dimulai. Keterlambatan berlakunya pertanggungan menjadi tanggung jawab PIHAK KEDUA.',
  ];

  if (lewatBroker) {
    penerbitan.push(
      'Imbalan jasa PIHAK KEDUA sebagaimana tercantum dalam dokumen ini merupakan satu-satunya imbalan yang menjadi beban PIHAK PERTAMA. Komisi atau imbalan lain yang diterima PIHAK KEDUA dari perusahaan asuransi bukan menjadi beban PIHAK PERTAMA.',
    );
  }

  const klaim: (string | string[])[] = [
    'Perubahan lingkup, perpanjangan waktu proyek, atau penambahan objek pertanggungan dituangkan dalam endorsement resmi. Biaya tambahan yang timbul disepakati secara tertulis sebelum endorsement diterbitkan.',
    'PIHAK KEDUA wajib mendampingi PIHAK PERTAMA dalam pengurusan klaim, termasuk penyiapan berkas dan komunikasi dengan perusahaan asuransi, tanpa biaya jasa tambahan sepanjang masa pertanggungan.',
    'PIHAK KEDUA wajib memberitahukan tata cara dan tenggat pelaporan klaim kepada PIHAK PERTAMA pada saat penyerahan polis.',
    'Apabila pertanggungan berakhir lebih cepat dari masa yang diperjanjikan, PIHAK KEDUA membantu mengurus pengembalian premi sesuai ketentuan perusahaan asuransi.',
  ];

  const keterbukaan: (string | string[])[] = [
    'PIHAK PERTAMA memberikan keterangan yang benar mengenai objek pertanggungan. PIHAK KEDUA wajib menyampaikan seluruh syarat, pengecualian, dan kewajiban yang melekat pada polis kepada PIHAK PERTAMA sebelum premi dibayarkan.',
    'Data proyek dan dokumen yang diserahkan PIHAK PERTAMA bersifat rahasia dan hanya digunakan untuk keperluan penutupan pertanggungan sebagaimana tercantum dalam Surat Perintah Kerja ini.',
  ];

  if (ctx.isSuretyBond) {
    keterbukaan.push(
      'Jaminan diterbitkan dalam bentuk dan redaksi yang disyaratkan oleh pemilik proyek atau instansi penerima jaminan.',
      'Dokumen jaminan asli diserahkan langsung kepada PIHAK PERTAMA, dan salinannya tidak boleh diserahkan kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
      'Setelah masa jaminan berakhir, PIHAK KEDUA membantu pengurusan pengembalian dokumen jaminan dan pencairan agunan apabila ada.',
    );
  }

  const tambahan = (additionalClauses ?? []).filter((x) => !!x && x.trim());

  return [
    { title: 'Umum', items: umum },
    { title: 'Penerbitan Polis', items: penerbitan },
    { title: 'Perubahan & Klaim', items: klaim },
    {
      title: ctx.isSuretyBond
        ? 'Keterbukaan, Kerahasiaan & Jaminan'
        : 'Keterbukaan & Kerahasiaan',
      items: keterbukaan,
    },
    ...(tambahan.length
      ? [{ title: 'Catatan Tambahan', items: tambahan }]
      : []),
  ];
}

export interface LegalServiceContext extends ClauseContext {
  /** Ada baris berkategori biaya resmi pada dokumen ini. */
  hasOfficialFee?: boolean;
  /** Penanggung biaya resmi bila pengajuan ditolak di luar kelalaian vendor. */
  rejectionCostBearer?: RejectionCostBearer;
  /** Tenggat pengembalian dokumen asli setelah selesai/batal (hari kerja). */
  documentReturnDays?: number | string;
  /** Interval pelaporan perkembangan pengurusan (hari). */
  reportingIntervalDays?: number | string;
}

/**
 * Klausul SPK jasa pengurusan legalitas (PO 6.4.1).
 *
 * Berbeda dari SPK jasa lain karena hasil akhirnya tidak berada dalam kendali
 * PIHAK KEDUA: yang menerbitkan akta, SBU, atau izin adalah instansi/lembaga.
 * Karena itu klausulnya memisahkan dengan tegas kewajiban yang bisa dituntut
 * (kelengkapan berkas, ketepatan pengajuan, tenggat) dari hasil yang tidak
 * bisa dijanjikan siapa pun.
 *
 * Terbagi empat seksi supaya pembacanya tahu poin mana mengatur apa.
 */
export function buildLegalServiceClauses(
  ctx: LegalServiceContext,
  additionalClauses?: string[],
): ClauseSection[] {
  const kembali = ctx.documentReturnDays ?? 7;
  const lapor = ctx.reportingIntervalDays ?? 7;

  const umum: (string | string[])[] = [paymentSentence(ctx)];

  if (ctx.pphCode) {
    // Hanya nilai jasa yang dipotong; biaya resmi bukan penghasilan vendor.
    umum.push(
      `Nilai jasa di atas akan dipotong PPh sebesar ${ctx.pphPercentage ?? 0}% berdasarkan kode objek pajak ${ctx.pphCode}${
        ctx.pphTaxObject ? ` (${ctx.pphTaxObject})` : ''
      }. Pemotongan tidak dikenakan atas biaya resmi.`,
    );
  }

  if (ctx.hasOfficialFee) {
    umum.push(
      'Biaya resmi (Penerimaan Negara Bukan Pajak, retribusi, dan iuran lembaga sertifikasi/asosiasi) bukan merupakan bagian dari nilai jasa. Biaya tersebut ditagihkan sesuai jumlah yang sebenarnya disetorkan, tanpa penambahan, dan wajib disertai bukti setor asli atas nama PT. Alpha Konstruksi Nusantara.',
      'Nilai biaya resmi yang tercantum dalam dokumen ini merupakan perkiraan. Selisih terhadap jumlah sebenarnya diperhitungkan pada saat penagihan.',
    );
  }

  umum.push(
    'PIHAK KEDUA tidak diizinkan mengalihtugaskan pekerjaan ini kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
    'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
  );

  const pelaksanaan: (string | string[])[] = [
    'PIHAK KEDUA bertanggung jawab atas kelengkapan berkas, ketepatan pengisian, dan ketepatan waktu pengajuan kepada instansi atau lembaga penerbit.',
    // Poin inti dokumen ini: memisahkan usaha dari hasil.
    'Keputusan penerbitan berada pada instansi atau lembaga penerbit. Keterlambatan yang bersumber dari instansi atau lembaga tersebut tidak dihitung sebagai kelalaian PIHAK KEDUA, sepanjang PIHAK KEDUA dapat menunjukkan bukti pengajuan.',
    'Target penyelesaian sebagaimana tercantum dalam tabel dihitung dalam hari kerja, terhitung sejak seluruh berkas dinyatakan lengkap oleh PIHAK KEDUA.',
    `PIHAK KEDUA wajib melaporkan perkembangan pengurusan kepada PIHAK PERTAMA sekurang-kurangnya setiap ${lapor} (${terbilangHari(lapor)}) hari, dan segera bila terdapat permintaan perbaikan dari instansi atau lembaga penerbit.`,
    'Bila pengajuan ditolak atau dikembalikan karena kelalaian PIHAK KEDUA, perbaikan dan pengajuan ulang dilakukan tanpa biaya jasa tambahan.',
  ];

  if (ctx.hasOfficialFee) {
    pelaksanaan.push(
      `Bila pengajuan ditolak bukan karena kelalaian PIHAK KEDUA, ${
        REJECTION_COST_SENTENCE[ctx.rejectionCostBearer || 'pertama']
      }`,
    );
  }

  const dokumen: (string | string[])[] = [
    'Dokumen milik PIHAK PERTAMA yang diserahkan hanya boleh digunakan untuk keperluan pengurusan sebagaimana tercantum dalam Surat Perintah Kerja ini, dan tidak boleh digandakan atau diserahkan kepada pihak lain tanpa persetujuan tertulis dari PIHAK PERTAMA.',
    `Seluruh dokumen asli wajib dikembalikan kepada PIHAK PERTAMA selambat-lambatnya ${kembali} (${terbilangHari(kembali)}) hari kerja setelah pengurusan dinyatakan selesai atau dibatalkan.`,
    'Data perusahaan, keuangan, dan personel yang diperoleh dalam pelaksanaan pekerjaan ini bersifat rahasia. Kewajiban menjaga kerahasiaan tetap berlaku setelah Surat Perintah Kerja ini berakhir.',
    'Hasil pengurusan diserahkan dalam bentuk dokumen asli beserta salinan digital, disertai keterangan masa berlaku bagi dokumen yang berjangka waktu.',
  ];

  const integritas: (string | string[])[] = [
    'PIHAK KEDUA dilarang memberikan, menjanjikan, atau memfasilitasi pemberian dalam bentuk apa pun kepada pejabat atau pegawai instansi maupun lembaga penerbit, di luar biaya resmi yang berlaku. Pelanggaran atas ketentuan ini menjadi tanggung jawab PIHAK KEDUA sepenuhnya dan menjadi dasar bagi PIHAK PERTAMA untuk membatalkan Surat Perintah Kerja ini.',
  ];

  const tambahan = (additionalClauses ?? []).filter((x) => !!x && x.trim());

  return [
    { title: 'Umum', items: umum },
    { title: 'Pelaksanaan', items: pelaksanaan },
    { title: 'Dokumen & Kerahasiaan', items: dokumen },
    { title: 'Integritas', items: integritas },
    ...(tambahan.length
      ? [
          {
            title: 'Catatan Tambahan',
            items: tambahan as (string | string[])[],
          },
        ]
      : []),
  ];
}

/**
 * Lampiran "Tata Cara Penagihan dan Pembayaran — Jasa Pengurusan Legalitas".
 *
 * Perbedaan utama dari lampiran jasa lain: tagihan memuat dua komponen yang
 * berbeda sifat, sehingga wajib dirinci terpisah beserta bukti setornya.
 */
export function buildLegalServiceBillingTerms(
  hasOfficialFee: boolean = true,
): BillingItem[] {
  const dokumen = [
    'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
    'Kwitansi bermaterai (asli);',
    'Faktur Pajak (bila PIHAK KEDUA merupakan Pengusaha Kena Pajak);',
    'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
    'Salinan dokumen hasil pengurusan yang telah terbit;',
    'Berita Acara Serah Terima dokumen yang ditandatangani oleh perwakilan PIHAK PERTAMA (asli).',
  ];

  if (hasOfficialFee) {
    dokumen.splice(
      3,
      0,
      'Rincian biaya resmi yang dipisahkan dari nilai jasa, disertai bukti setor asli atas nama PT. Alpha Konstruksi Nusantara;',
    );
  }

  return [
    'PIHAK KEDUA berhak menagihkan hasil pekerjaannya setelah dokumen hasil pengurusan diterbitkan dan diserahkan kepada PIHAK PERTAMA.',
    'Dokumen penagihan yang wajib dikirimkan adalah sebagai berikut:',
    dokumen,
    ...(hasOfficialFee
      ? [
          'Nilai jasa dan biaya resmi wajib dicantumkan sebagai baris terpisah pada invoice. Biaya resmi ditagihkan sesuai jumlah yang sebenarnya disetorkan, tanpa penambahan, dan tidak dikenakan pemotongan Pajak Penghasilan.',
        ]
      : []),
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    {
      block: [
        'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
        'RUKO ASIA TROPIS AT 12 NO. 21',
        'KOTA HARAPAN INDAH - BEKASI',
      ],
    },
    'Pembayaran dilakukan sesuai termin yang tercantum dalam Surat Perintah Kerja, terhitung sejak dokumen penagihan lengkap diterima oleh bagian keuangan PIHAK PERTAMA.',
    'Proses pembayaran tagihan vendor dilakukan melalui transfer bank ke nomor rekening yang tercantum dalam dokumen penagihan (wajib sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor wajib memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan metode pembayaran dan tarif Bank Indonesia yang berlaku (bila ada).',
    'Khusus untuk vendor yang berada di luar JABODETABEK, pengiriman dokumen penagihan dapat dilakukan melalui jasa kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
    'Tata cara pembayaran ini merupakan satu kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
  ];
}

/**
 * Lampiran "Tata Cara Penagihan dan Pembayaran — Penyewaan Alat Kerja"
 * (PO-B).
 *
 * Dua versi, sama seperti lampiran pembelian barang:
 *
 *   tempo  — pekerjaan berjalan dulu, ditagih per periode pekan berdasarkan
 *            time sheet dan Certificate of Payment
 *   cash   — dibayar di muka, sehingga penagihannya memakai Proforma Invoice
 *            sebelum mobilisasi; time sheet tetap wajib sebagai pembuktian
 *            pemakaian dan dasar perhitungan selisih
 */
/** Alamat kantor pada seluruh lembar tata cara penagihan. */
const BILLING_OFFICE_ADDRESS: BillingItem = {
  block: [
    'KANTOR PT. ALPHA KONSTRUKSI NUSANTARA',
    'RUKO ASIA TROPIS AT 12 NO. 21',
    'KOTA HARAPAN INDAH - BEKASI',
  ],
};

/**
 * Empat poin penutup yang berlaku pada seluruh lembar penagihan.
 *
 * Disatukan agar tidak berbeda tanpa disengaja: ketentuan rekening, biaya
 * transfer, dan pengiriman dokumen luar Jabodetabek berlaku sama untuk semua
 * jenis pekerjaan.
 */
const BILLING_CLOSING_TERMS: BillingItem[] = [
    'Proses pembayaran tagihan vendor dilakukan melalui Transfer Bank ke nomor rekening yang tercantum dalam dokumen penagihan (wajib sesuai dengan nama penandatangan kontrak kerja). Bilamana ditemukan perbedaan nama penerima, vendor wajib memberikan surat kuasa asli dan bermaterai yang ditandatangani oleh penerima kontrak.',
    'Biaya administrasi pembayaran melalui transfer bank dibebankan kepada vendor sesuai dengan metode pembayaran dan tarif Bank Indonesia yang berlaku (bila ada).',
    'Khusus untuk vendor yang berada di luar JABODETABEK, pengiriman dokumen penagihan dapat dilakukan melalui jasa Kurir dan dilakukan khusus di antara hari Senin dan Rabu. PIHAK PERTAMA tidak bertanggung jawab atas kehilangan dokumen pada saat proses pengiriman.',
    'Tata cara pembayaran ini merupakan sebuah kesatuan dengan kontrak yang diterima dan menjadi syarat dalam pengajuan pembayaran.',
];

/**
 * Tata cara penagihan sewa alat yang diterbitkan sebagai tipe A.
 *
 * Lebih ringkas daripada sewa alat biasa, dan itu mengikuti cara kerjanya:
 * pada pengangkutan tidak ada periode pekan, hour meter, maupun Certificate
 * of Payment. Yang membuktikan pekerjaan adalah time sheet yang sudah
 * ditandatangani perwakilan PIHAK PERTAMA di lapangan.
 *
 * Alamat dan empat poin penutupnya sama persis dengan sewa alat — keduanya
 * dipakai bersama agar tidak berbeda tanpa disengaja.
 */
export function buildTransportRentalBillingTerms(): BillingItem[] {
  return [
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    [
      'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
      'Kwitansi bermaterai (asli);',
      'Faktur Pajak (asli);',
      'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
      'Time Sheet yang sudah ditandatangani oleh perwakilan PIHAK PERTAMA.',
    ],
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    BILLING_OFFICE_ADDRESS,
    ...BILLING_CLOSING_TERMS,
  ];
}

export function buildEquipmentRentalBillingTerms(
  tempo: boolean = true,
): BillingItem[] {
  const timeSheetIsi: BillingItem = [
    'Time sheet periode pekan (mula periode pekan hingga akhir periode pekan);',
    'Dokumentasi Hour Meter pada mula periode pekan dan akhir periode pekan;',
    'Dokumentasi pengambilan BBM selama periode pekan;',
    'Dokumentasi perbaikan kerusakan selama periode pekan (bila ada).',
  ];

  const alamat: BillingItem = BILLING_OFFICE_ADDRESS;

  const penutup: BillingItem[] = BILLING_CLOSING_TERMS;

  if (!tempo) {
    // Dibayar di muka: tagihan terbit sebelum alat bekerja, sehingga
    // dokumen awalnya Proforma Invoice. Time sheet tetap diminta — tanpa itu
    // pemakaian sebenarnya tidak bisa dibuktikan dan selisih terhadap kuota
    // tidak bisa dihitung.
    return [
      'Mula periode pekan adalah hari Kamis, akhir periode pekan adalah hari Rabu.',
      'PIHAK KEDUA berhak menagihkan sewa alat kerja sebelum mobilisasi dilaksanakan dengan mengirimkan dokumen-dokumen sebagai berikut:',
      [
        `Proforma Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (soft copy) via e-mail ke ${OFFICE_CONTACT.email} atau hard copy ke alamat yang tertera di bawah;`,
        'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan).',
      ],
      'Penagihan pertama harus meliputi penagihan mobilisasi dan demobilisasi.',
      'PIHAK KEDUA berkewajiban untuk mengirimkan dokumen-dokumen asli selambat-lambatnya 3 (tiga) hari kerja setelah transaksi pembayaran dilakukan. Adapun dokumen yang diperlukan adalah sebagai berikut:',
      [
        'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
        'Kwitansi bermaterai (asli);',
        'Faktur Pajak (asli);',
        'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan).',
      ],
      'PIHAK KEDUA tetap wajib memberikan time sheet paling lambat pada hari Kamis sebelum pukul 12.00 waktu setempat kepada perwakilan PIHAK PERTAMA sebagai pembuktian pemakaian alat kerja, yang berisi:',
      timeSheetIsi,
      'Selisih antara pemakaian yang telah dibayarkan di muka dengan pemakaian yang sebenarnya diperhitungkan pada penagihan periode berikutnya atau pada saat demobilisasi.',
      'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
      alamat,
      ...penutup,
    ];
  }

  return [
    'Mula periode pekan adalah hari Kamis, akhir periode pekan adalah hari Rabu.',
    'Penagihan pertama harus meliputi penagihan mobilisasi dan demobilisasi.',
    'PIHAK KEDUA memberikan time sheet paling lambat pada hari Kamis sebelum pukul 12.00 waktu setempat kepada perwakilan PIHAK PERTAMA yang berisi:',
    timeSheetIsi,
    'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan menyerahkan kepada PIHAK KEDUA sebagai salah satu persyaratan penagihan.',
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    [
      'Invoice yang menyatakan jumlah yang harus dibayar dan nomor rekening penerima (asli);',
      'Kwitansi bermaterai (asli);',
      'Faktur Pajak (asli);',
      'Surat Perintah Kerja yang telah ditandatangani kedua belah pihak (salinan);',
      'Certificate of Payment (CoP).',
    ],
    'Dokumen dapat dikirimkan ke alamat kantor PT. Alpha Konstruksi Nusantara, yaitu:',
    alamat,
    ...penutup,
  ];
}

/**
 * Klausul tambahan SPK tenaga kerja untuk staf lapangan (PO-D).
 *
 * Berbeda dengan pekerja harian: staf proyek (mis. staff engineer) menagih
 * bulanan dan wajib mengisi Form Data Pekerja. Karena itu poinnya
 * dikembalikan sebagai seksi terpisah dan hanya dipakai bila ditandai.
 */
export function buildStaffClauses(ctx: ClauseContext = {}): ClauseSection[] {
  const tanggal = ctx.payoutDay ?? 10;

  const seksi: ClauseSection[] = [];

  if (ctx.jobDescriptions?.length) {
    seksi.push({
      title: 'URAIAN TUGAS',
      items: ctx.jobDescriptions
        .map((x) => (x || '').trim())
        .filter((x) => x.length > 0),
    });
  }

  seksi.push(
    {
      title: 'LAPORAN LAPANGAN',
      items: [
        'PIHAK KEDUA berkewajiban untuk mengisi Form Data Pekerja (FDP) sebelum pekerjaan dimulai;',
        'PIHAK KEDUA berkewajiban untuk memberikan laporan foto absensi setiap hari masuk bekerja dan selesai bekerja.',
      ],
    },
    {
      title: 'TATA CARA PEMBAYARAN',
      items: [
        `Pembayaran dilakukan setiap tanggal ${tanggal} dengan cut off setiap bulannya;`,
        'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan mendistribusikannya kepada bagian keuangan;',
        'PIHAK PERTAMA berhak untuk memotong sebagian/seluruh hasil pekerjaan apabila ada hutang pekerja kepada PIHAK KETIGA yang belum diselesaikan;',
        'Apabila pekerja tidak menyelesaikan pekerjaannya, sisa perhitungan pekerjaan tidak dapat ditagihkan dan/atau dibayarkan.',
      ],
    },
  );

  return seksi;
}

// ---- PO-H: pekerjaan borongan / jasa pelaksanaan -----------------------

const H_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const lines: string[] = [];

      if (ctx.workLocation) {
        lines.push(`Lokasi pekerjaan: ${ctx.workLocation}.`);
      }
      if (ctx.jobType) {
        lines.push(`Jenis pekerjaan: ${ctx.jobType}.`);
      }

      // Tanggal selesai boleh kosong: pekerjaan berjalan sampai tuntas.
      if (ctx.startDate) {
        lines.push(
          ctx.endDate
            ? `Waktu pelaksanaan: ${ctx.startDate} sampai dengan ${ctx.endDate}.`
            : `Waktu pelaksanaan: ${ctx.startDate} sampai dengan pekerjaan selesai.`,
        );
      }

      lines.push(
        ctx.rateType === 'lumpsum'
          ? 'Nilai pekerjaan bersifat lump sum (borongan) untuk seluruh lingkup pekerjaan yang tercantum.'
          : 'Nilai pekerjaan dihitung berdasarkan harga satuan sesuai volume pekerjaan yang terlaksana dan disetujui.',
      );

      lines.push(
        // Termin & tata cara pembayaran seluruhnya diatur pada Pasal 5,
        // sehingga tidak diulang di sini.
        'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
        'PIHAK KEDUA bertanggung jawab atas keselamatan kerja seluruh personil yang dikerahkan pada pekerjaan ini.',
        'Pekerjaan dinyatakan selesai setelah diperiksa dan disetujui oleh perwakilan PIHAK PERTAMA.',
      );

      return lines;
    },
  },
];

export const CLAUSE_TEMPLATES: { [poType: string]: ClauseTemplate[] } = {
  G: G_CLAUSES,
  D: D_CLAUSES,
  B: B_CLAUSES,
  C: C_CLAUSES,
  F: F_CLAUSES,
  H: H_CLAUSES,
  '5.1.12': SOFTWARE_CLAUSES,
  '6.5.1': RECRUITMENT_CLAUSES,
  '5.1.2': MAINTENANCE_CLAUSES,
  // 5.1.6 sengaja berbagi template dengan G — ubah G = ubah 5.1.6 juga (satu kebijakan).
  // 5.1.1 (pembelian aset) dan 5.1.6 sama-sama pembelian barang, sehingga
  // berbagi template dengan G — satu kebijakan, satu tempat perubahan.
  '5.1.1': G_CLAUSES,
  '5.1.6': G_CLAUSES,
  '6.3.1': ADVERTISING_CLAUSES,
  '6.3.2': MARKETING_GOODS_CLAUSES,
};

/** Latest version string for a PO type (what a new PO should store). */
export function latestClauseVersion(poType: string): string {
  const list = CLAUSE_TEMPLATES[poType];
  return list && list.length ? list[list.length - 1].version : '1.0';
}

/** Resolve a specific template; falls back to the latest if not found. */
function resolveTemplate(
  poType: string,
  version?: string,
): ClauseTemplate | null {
  const list = CLAUSE_TEMPLATES[poType];
  if (!list || !list.length) return null;
  if (version) {
    const match = list.find((t) => t.version === version);
    if (match) return match;
  }
  return list[list.length - 1];
}

/** Ordered clause lines for a PO type + version. */
export function buildClauseLines(
  poType: string,
  ctx: ClauseContext,
  version?: string,
  additional?: string[],
): (string | string[])[] {
  const template = resolveTemplate(poType, version);
  const base = template ? template.build(ctx) : [];
  // user-supplied points are appended AFTER the baked-in ones (nomor lanjutan).
  const extra = (additional || [])
    .map((x) => (x || '').trim())
    .filter((x) => x.length > 0);
  return [...base, ...extra];
}

/** Same as above, rendered as an ordered-list HTML string for notes/preview. */
export function buildClauseHtml(
  poType: string,
  ctx: ClauseContext,
  version?: string,
  additional?: string[],
): string {
  const lines = buildClauseLines(poType, ctx, version, additional);
  if (!lines.length) return '';
  return `<ol>${lines.map((p) => `<li>${p}</li>`).join('')}</ol>`;
}
