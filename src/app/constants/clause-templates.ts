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
    case 'CRD':
      return `Termin pembayaran adalah prepaid sebesar ${prepaid}% di muka, sisanya dibayarkan secara kredit dalam ${credit} hari.`;
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
        `Kontak penanggung jawab penerima/pemberi barang adalah: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab pengirim/pengambil adalah: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
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
        `Kontak penanggung jawab pengambil / pengirim: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab pengambil / penerima: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
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
        `Shift kerja adalah ${shift} jam per hari. Awal mula jam shift akan diinformasikan oleh penanggung jawab proyek.`,
        'Selama perjanjian kerjasama, PIHAK KEDUA bersedia ditempatkan di seluruh Indonesia sesuai lokasi proyek.',
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

      return lines;
    },
  },
];

export const CLAUSE_TEMPLATES: { [poType: string]: ClauseTemplate[] } = {
  G: G_CLAUSES,
  D: D_CLAUSES,
  B: B_CLAUSES,
  C: C_CLAUSES,
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
