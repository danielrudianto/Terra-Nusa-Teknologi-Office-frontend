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
  /** returns the ordered list of clause lines for this version */
  build: (ctx: ClauseContext) => string[];
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
      return 'Termin pembayaran adalah —.';
  }
}

function isLoco(ctx: ClauseContext): boolean {
  return String(ctx.deliveryMethod) === '1';
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
        `Alamat pengiriman/pengambilan barang adalah: ${ctx.deliveryAddress || '—'}.`,
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
        `Alamat pengiriman / pengambilan barang: ${ctx.deliveryAddress || '—'}.`,
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
      return 'License key / kredensial dikirim melalui e-mail resmi PIHAK PEMBELI.';
    case 'account':
      return 'Lisensi diaktifkan langsung pada akun yang ditunjuk PIHAK PEMBELI.';
    case 'download':
      return 'Perangkat lunak beserta lisensi disediakan melalui tautan unduhan resmi.';
    default:
      return 'Metode penyerahan lisensi disepakati kedua belah pihak.';
  }
}

const SOFTWARE_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      const isSub = ctx.softwareIsSubscription !== false; // default langganan
      const points: string[] = [paymentSentence(ctx)];

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
            ? `Langganan diperpanjang otomatis (auto-renew) pada akhir periode, kecuali dibatalkan oleh PIHAK PEMBELI sebelum jatuh tempo.`
            : `Langganan tidak diperpanjang otomatis; perpanjangan memerlukan dokumen pembelian baru.`,
        );
      } else {
        points.push(
          `Pembelian bersifat beli putus (lisensi perpetual); lisensi berlaku tanpa batas waktu sesuai ketentuan penerbit perangkat lunak.`,
        );
      }

      points.push(licenseDeliverySentence(ctx));
      points.push(
        `Kontak penanggung jawab dari PIHAK PENJUAL: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
      );
      points.push(
        `Kontak penanggung jawab dari PIHAK PEMBELI: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
      );
      points.push(
        `Lisensi/akun harus aktif dan dapat digunakan selambat-lambatnya 3 (tiga) hari kerja setelah pembayaran diterima, kecuali disepakati lain.`,
      );
      points.push(
        `Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan dokumen pembelian ini.`,
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

// ---- PO-B: SPK penyewaan alat kerja ke vendor ---------------------------

const B_CLAUSES: ClauseTemplate[] = [
  {
    version: '1.0',
    build: (ctx) => {
      // Termin PO-B ditulis bebas karena bervariasi ("Tempo 30 hari",
      // "sewa bulan pertama cash, berikutnya tempo 14 hari", dst).
      const term = (ctx.paymentTermText || '').trim();

      const lines: string[] = [
        'PIHAK KEDUA tidak diizinkan untuk mengalihtugaskan pekerjaan ini kepada pihak lain.',
        term
          ? `Termin pembayaran adalah ${term}`.replace(/\.?$/, '.')
          : 'Termin pembayaran adalah sesuai kesepakatan.',
        'Harga sudah termasuk seluruh biaya perpajakan yang berlaku di Republik Indonesia.',
        'Tata cara penagihan dan pembayaran terlampir di lembar terpisah dan menjadi kesatuan dengan Surat Perintah Kerja ini.',
        `PIHAK KEDUA wajib memberikan daftar alat kerja dan tenaga kerja yang akan beraktifitas di lingkungan proyek tersebut diatas selambat-lambatnya 7 (tujuh) hari kalender sebelum tanggal tenggat mobilisasi melalui e-mail ke alamat ${OFFICE_CONTACT.email}.`,
        'Hanya alat kerja dan tenaga kerja yang disetujui oleh PIHAK PERTAMA yang diizinkan untuk berada dalam lingkungan proyek.',
        'PIHAK KEDUA wajib menyewakan alat kerja sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PERTAMA.',
        `PIHAK KEDUA wajib mengirimkan dokumen Surat Izin Laik Operasi (SILO) sesuai dengan peraturan dan perundang-undangan yang berlaku di Republik Indonesia untuk alat kerja yang akan disewakan sesuai dengan spesifikasi yang telah disetujui oleh PIHAK PERTAMA. Seluruh dokumen Surat Izin Laik Operasi (SILO) wajib dikirimkan melalui e-mail ke alamat ${OFFICE_CONTACT.email} 7 (tujuh) hari kalender sebelum tanggal tenggat mobilisasi.`,
        'Seluruh pengambilan dan pengisian Bahan Bakar Minyak (BBM) untuk operasional alat kerja wajib didokumentasikan oleh PIHAK KEDUA dan dilaporkan kepada perwakilan PIHAK PERTAMA.',
        'PIHAK KEDUA wajib memastikan alat kerja laik untuk digunakan sebelum proses mobilisasi dilaksanakan.',
        'PIHAK KEDUA wajib melakukan pemeriksaan kondisi alat kerja secara berkala selama perjanjian ini berlangsung.',
        'Tim mekanik yang cakap dan handal wajib disediakan oleh PIHAK KEDUA bilamana adanya kerusakan/kendala pada alat kerja tersebut.',
        'Apabila terjadi kerusakan alat kerja, PIHAK PERTAMA berhak untuk mengurangi jumlah hari kerja maksimum pada periode tersebut, sejumlah hari perbaikan terhitung dari laporan kerusakan alat kerja.',
        'Jangka waktu perbaikan maksimum adalah 2 x 24 jam sejak alat kerja tidak dapat beroperasi. Apabila kerusakan tidak dapat ditangani dalam kurun waktu tersebut, PIHAK KEDUA wajib mengganti unit kerja dengan unit cadangan yang beroperasi dengan baik dan laik. Seluruh biaya mobilisasi ditanggung PIHAK KEDUA.',
        'Seluruh peralatan, perlengkapan dan material yang dibutuhkan selama perbaikan merupakan tanggung jawab PIHAK KEDUA.',
        'Keamanan dan keselamatan alat kerja menjadi tanggung jawab PIHAK PERTAMA.',
        'Harga tersebut termasuk biaya koordinasi bongkar dan muat di area gudang PIHAK KEDUA.',
        'Harga dan ketentuan yang tertera di dalam perjanjian ini bersifat mengikat dan tidak dapat berubah hingga volume/waktu perjanjian berakhir.',
        'Barang yang disewakan adalah milik PIHAK KEDUA. PIHAK PERTAMA tidak diizinkan untuk memperjualbelikan, menjadikan jaminan, memindahtangankan, dan/atau memindahkan barang ke lokasi lain tanpa persetujuan dari PIHAK KEDUA.',
        'PIHAK KEDUA tidak bertanggung jawab atas permasalahan PIHAK PERTAMA dengan pihak-pihak lainnya diluar kontrak kerja ini.',
      ];

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
        return [
          'Volume penagihan adalah volume yang telah disetujui oleh perwakilan pembeli;',
          paymentSentence(ctx),
          'Mix Design harus disetujui oleh pihak pembeli sebelum dokumen pembelian ini berlaku;',
          'Beton yang dikirimkan harus mengikuti Mix Design yang telah disetujui oleh pembeli;',
          'Pihak penjual beton bersedia untuk mengirimkan teknisi yang cakap dalam setiap pengiriman beton;',
          'Pihak penjual beton berkewajiban untuk menyediakan Superplasticizer setiap pengiriman beton;',
          '4 (empat) benda uji dari setiap kendaraan pengangkut beton akan diambil dan disimpan oleh pihak penjual beton;',
          'Uji kuat tekan beton dilakukan dengan ketentuan sebagai berikut: sebanyak 1 benda uji dengan usia 7 (tujuh) hari dan 1 benda uji dengan usia 14 (empat belas) hari dilakukan oleh pihak penjual beton di laboratorium internal; sebanyak 2 benda uji dengan usia 28 (dua puluh delapan) hari dilakukan di laboratorium independen;',
          'Pengantaran sampel uji dengan usia 28 (dua puluh delapan) hari ke laboratorium independen dilakukan oleh penjual beton;',
          'Biaya untuk pengujian beton di laboratorium independen ditanggung oleh pihak pembeli;',
          'Penjual wajib melampirkan hasil uji beton yang sudah jatuh tempo umur dan dokumentasi slump test selama periode tersebut;',
          'Tata cara penagihan dan pembayaran dapat dilihat di lembar terlampir.',
        ];
      }

      // ---- besi & material lain (pola pembelian barang biasa) ----
      const lines: string[] = [
        paymentSentence(ctx),
        `Termin pengiriman adalah ${loco ? 'Loco (diambil sendiri)' : 'Franco (dikirim ke lokasi)'}.`,
        `Alamat pengiriman/pengambilan barang adalah: ${ctx.deliveryAddress || '—'}.`,
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
  /** Periode penagihan, mis. "2 (dua) minggu" atau "bulanan". */
  billingPeriod?: string;
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
export function buildPasal5(
  ctx: Pasal5Context,
  documents: string[] = H_PASAL_5_DOCUMENTS,
): (string | string[])[] {
  // Bagian yang belum diisi ditandai garis bawah agar terlihat saat diperiksa,
  // bukan hilang begitu saja.
  const isian = (v: any) => {
    const t = String(v ?? '').trim();
    return t ? t : '______';
  };

  const lines: (string | string[])[] = [];

  // Uang muka disebut lebih dulu karena dibayarkan sebelum pekerjaan mulai.
  if (ctx.hasDownPayment) {
    lines.push(
      `Uang muka sebesar ${isian(ctx.downPaymentPercent)}% dari nilai pekerjaan dibayarkan selambat-lambatnya ${isian(ctx.downPaymentDays)} hari sejak Surat Perintah Kerja ditandatangani kedua belah pihak, dan diperhitungkan secara proporsional pada setiap penagihan.`,
    );
  }

  lines.push(
    `Penagihan dilakukan setiap periode ${isian(ctx.billingPeriod)}.`,
    'PIHAK PERTAMA wajib membuatkan Certificate of Payment (CoP) dan mendistribusikannya kepada bagian keuangan.',
    'PIHAK KEDUA berhak menagihkan hasil kerjanya dengan mengirimkan dokumen-dokumen sebagai berikut:',
    documents,
    `Pembayaran dilakukan ${isian(ctx.paymentDays)} hari sejak dokumen penagihan lengkap diterima oleh bagian keuangan PIHAK PERTAMA.`,
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
   * - 'sejak-mulai'  → dihitung sekian minggu sejak pekerjaan dimulai
   * - 'periode-pekan' → batas pekan tetap, mis. Kamis s.d. Rabu
   *
   * Hanya poin ini yang membedakan SPK mandor perorangan dan perusahaan,
   * sehingga keduanya memakai satu template yang sama.
   */
  billingCycleMode?: 'sejak-mulai' | 'periode-pekan';
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
        ctx.billingCycleMode === 'periode-pekan'
          ? `Mula periode pekan adalah hari ${
              ctx.weekStartDay || 'Kamis'
            }, akhir periode pekan adalah hari ${ctx.weekEndDay || 'Rabu'};`
          : `Penagihan dapat dilakukan ${
              ctx.billingPeriod || '2 (dua) minggu'
            } setelah pekerjaan dimulai;`,
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
            ? `Jadwal pekerjaan pengiriman ${i + 1} (${j.from || '—'} ke ${j.to || '—'}):`
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
                  : [`Rute: ${j.from || '—'} ke ${j.to || '—'}`]),
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
            `PIHAK PERTAMA wajib memberikan daftar barang yang akan dikirimkan selambat-lambatnya ${asuransi} (${terbilangHari(
              asuransi,
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
  '5.1.2': MAINTENANCE_CLAUSES,
  // 5.1.6 sengaja berbagi template dengan G — ubah G = ubah 5.1.6 juga (satu kebijakan).
  '5.1.6': G_CLAUSES,
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
): string[] {
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
