/** Satu ubin jenis PO pada pemilih. */
export interface PurchaseTypeTile {
  /** Kode jenis PO, mis. 'G' atau '5.1.1'. */
  type: string;
  title: string;
  description?: string;
  link: string;
}
