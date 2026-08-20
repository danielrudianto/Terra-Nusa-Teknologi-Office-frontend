#!/usr/bin/env python3
"""
Lampiran berkop, dan ruang untuk kopnya benar-benar disediakan.

SPK dan surat pengalihan yang menempel di belakang invoice dirakit dari
`content` dokumen PO saja. Kop suratnya BUKAN bagian dari `content` — ia
dipasang docDefinition PO sebagai `header`, dan yang disalin ke invoice hanya
isinya. Akibatnya lembar yang mengikat pekerja terbit tanpa satu pun penanda
dari perusahaan mana ia berasal, dan tidak ada galat apa pun yang
menyertainya.

Tiga hal harus benar bersamaan, dan dua di antaranya tidak terlihat dari
kode yang membaca sepintas:

  1. `header` terdaftar dan mengembalikan `documentHeader()` pada lampiran.
  2. Margin ATAS berkasnya menyediakan ruang kop itu. pdfmake memakai satu
     margin untuk seluruh halaman; header yang digambar tanpa ruangnya
     menimpa isi halaman.
  3. Margin BAWAHnya menyediakan ruang footer lampiran — yang lebih tinggi
     daripada footer invoice. Dengan margin bawah invoice yang lama, footer
     lampiran tercetak melewati tepi kertas.

    python3 scripts/pemeriksa/kopcek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

INVOICE = AKAR / "src/app/helpers/invoice.helper.ts"
BERSAMA = AKAR / "src/app/helpers/purchase-order-shared.helper.ts"


def margin_dokumen_po() -> tuple[int, int] | None:
    """Margin atas dan bawah `DOCUMENT_PAGE` — ukuran yang harus diikuti."""
    m = re.search(
        r"DOCUMENT_PAGE\s*=\s*\{[^}]*?pageMargins:\s*\[\s*\d+\s*,\s*(\d+)\s*,"
        r"\s*\d+\s*,\s*(\d+)\s*\]",
        BERSAMA.read_text(),
        re.S,
    )
    return (int(m.group(1)), int(m.group(2))) if m else None


def main() -> int:
    if not INVOICE.is_file() or not BERSAMA.is_file():
        print("GAGAL MEMBACA: berkasnya tidak ditemukan.")
        return 2

    isi = INVOICE.read_text()
    po = margin_dokumen_po()
    if po is None:
        print("GAGAL MEMBACA: `DOCUMENT_PAGE` tidak terbaca; perbaiki pemeriksanya.")
        return 2
    atas_po, bawah_po = po

    temuan: list[str] = []

    if "documentHeader" not in isi:
        temuan.append(
            "kop surat tidak dipasang sama sekali — lampiran terbit tanpa kop."
        )
    elif not re.search(r"header:\s*\(", isi):
        temuan.append(
            "`documentHeader` diimpor tetapi tidak ada `header:` pada dokumennya."
        )

    m = re.search(
        r"pageMargins:\s*\[\s*\d+\s*,\s*([A-Z_0-9]+)\s*,\s*\d+\s*,\s*([A-Z_0-9]+)\s*\]",
        isi,
    )
    if not m:
        temuan.append(
            "margin halaman invoice tidak terbaca sebagai tetapan bernama; "
            "angka telanjang di sana tidak dapat dijaga."
        )
    else:
        for nama, harus, sisi in (
            (m.group(1), atas_po, "atas"),
            (m.group(2), bawah_po, "bawah"),
        ):
            if nama.isdigit():
                nilai = int(nama)
            else:
                t = re.search(rf"const {re.escape(nama)}\s*=\s*(\d+)\s*;", isi)
                nilai = int(t.group(1)) if t else None
            if nilai is None:
                temuan.append(f"nilai margin {sisi} (`{nama}`) tidak terbaca.")
            elif nilai < harus:
                temuan.append(
                    f"margin {sisi} {nilai} lebih kecil daripada {harus} yang "
                    f"dipakai dokumen PO — {'kop' if sisi == 'atas' else 'footer'} "
                    f"lampiran akan {'menimpa isi' if sisi == 'atas' else 'melewati tepi kertas'}."
                )

    print("kopcek: lampiran invoice diperiksa")
    if not temuan:
        print(
            "bersih — lampiran berkop, dan ruang atas serta bawahnya "
            "sama dengan dokumen PO."
        )
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
