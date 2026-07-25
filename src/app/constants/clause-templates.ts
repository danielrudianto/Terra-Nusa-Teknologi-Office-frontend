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

// ---- registry -------------------------------------------------------------

/**
 * Map of purchase-order type -> its ordered list of template versions.
 * Add other PO types here as their clause templates are defined.
 */
export const CLAUSE_TEMPLATES: { [poType: string]: ClauseTemplate[] } = {
  G: G_CLAUSES,
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
): string[] {
  const template = resolveTemplate(poType, version);
  return template ? template.build(ctx) : [];
}

/** Same as above, rendered as an ordered-list HTML string for notes/preview. */
export function buildClauseHtml(
  poType: string,
  ctx: ClauseContext,
  version?: string,
): string {
  const lines = buildClauseLines(poType, ctx, version);
  if (!lines.length) return '';
  return `<ol>${lines.map((p) => `<li>${p}</li>`).join('')}</ol>`;
}
