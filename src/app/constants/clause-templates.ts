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
    version: '1.0',
    build: (ctx) => {
      const loco = isLoco(ctx);
      const points: string[] = [
        paymentSentence(ctx),
        `Termin pengiriman adalah ${loco ? 'Loco (diambil sendiri)' : 'Franco (dikirim ke lokasi)'}.`,
        `Alamat pengiriman / pengambilan barang: ${ctx.deliveryAddress || '—'}.`,
        `Kontak penanggung jawab pengambil / pengirim: ${joinContact(ctx.supplierPICName, ctx.supplierPICPhoneNumber)}.`,
        `Kontak penanggung jawab pengambil / penerima: ${joinContact(ctx.officePICName, ctx.officePICPhoneNumber)}.`,
        `PIHAK PENJUAL dan PEMBELI wajib mendokumentasikan (video) serah terima yang berisi pemeriksaan kondisi barang.`,
      ];
      if (!loco) {
        points.push(
          `Bila Franco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PENJUAL wajib memberikan detail Kontak Penanggung Jawab Pengiriman, nomor polisi kendaraan pengirim beserta bukti kelengkapan dokumen pengirim (STNK, KIR, SIM) dalam bentuk softcopy melalui e-mail ke ${OFFICE_CONTACT.email}; Office: ${OFFICE_CONTACT.address}.`,
        );
      } else {
        points.push(
          `Bila Loco, selambat-lambatnya 1 hari sebelum dilakukan pengiriman, PIHAK PEMBELI akan memberikan detail Kontak Penanggung Jawab Penerima, dalam bentuk softcopy melalui nomor telepon/fax atau alamat e-mail yang diberikan.`,
        );
      }
      points.push(
        `Tata cara penagihan dan/atau pembayaran dilampirkan dalam lembar terpisah yang menjadi kesatuan dengan kontrak jual/beli ini.`,
      );
      return points;
    },
  },
  // To add version 2.0: copy the block above, bump `version`, edit the text.
  // New POs will use it automatically; old POs stay on 1.0.
];

// ---- PO-C : Fuel ----------------------------------------------------------

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
      const points: string[] = [paymentSentence(ctx)];

      if (isGoods) {
        points.push(
          `Barang/sparepart diperiksa oleh PIHAK PEMBELI pada saat serah terima dan harus sesuai dengan spesifikasi yang disepakati; barang yang tidak sesuai dapat ditolak dan menjadi tanggung jawab PIHAK PENJUAL.`,
        );
        points.push(
          `Garansi barang mengikuti ketentuan yang berlaku dari PIHAK PENJUAL / penerbit barang.`,
        );
      } else {
        points.push(
          `Pekerjaan dinyatakan selesai setelah diperiksa dan disetujui oleh perwakilan PIHAK PEMBELI; hasil yang tidak sesuai wajib diperbaiki oleh PIHAK PENJUAL tanpa biaya tambahan.`,
        );
        points.push(
          `PIHAK PENJUAL memberikan garansi atas hasil pekerjaan sesuai kesepakatan kedua belah pihak.`,
        );
      }

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
export const CLAUSE_TEMPLATES: { [poType: string]: ClauseTemplate[] } = {
  G: G_CLAUSES,
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
function resolveTemplate(poType: string, version?: string): ClauseTemplate | null {
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