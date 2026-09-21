#!/usr/bin/env python3
"""
Setiap formulir PO yang MENYIMPAN UBAHAN harus mengirim versi barisnya.

Server menolak (409) penyimpanan yang versinya tertinggal — dua orang
membuka PO yang sama, yang kedua menyimpan formulir lamanya dan diam-diam
menimpa pekerjaan yang pertama. Penjaganya ada di server sejak lama, tetapi
TIDAK MENYALA bila layar tidak mengirim `rowVersion`: permintaan tanpa versi
disimpan tanpa penjagaan (supaya jeda deploy tidak menghentikan pekerjaan).

Enam belas formulir PO sempat tidak satu pun mengirimnya. Kini semuanya
lewat `AdendumService.denganVersi()`. Pemeriksa ini menjaga agar formulir
ketujuh belas — atau salinan dari salah satunya — tidak lupa.

    python3 scripts/pemeriksa/versipocek.py
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
FORMULIR = AKAR / "src/app/pages/purchase-order/purchase-order-create"
LAYANAN = AKAR / "src/app/services/adendum.service.ts"

SIMPAN = re.compile(
    r"`purchase-orders/\$\{ubahId\}`\s*:\s*'purchase-orders',\s*\n\s*(?P<muatan>[^\n]+)"
)


def periksa() -> list[str]:
    masalah: list[str] = []

    layanan = LAYANAN.read_text(encoding="utf-8") if LAYANAN.exists() else ""
    # Isi fungsinya yang dibaca, bukan tanda tangannya: tipe kembaliannya
    # (`T & { rowVersion?: number }`) sudah memuat kata `rowVersion`, jadi
    # mencarinya di mana saja meloloskan fungsi yang tidak mengirim apa pun.
    # Perilakunya sendiri diuji `adendum-versi.spec.ts`.
    m = re.search(r"denganVersi<.*?\): [^\n]*\{\n(.*?)\n  \}", layanan, re.S)
    if not m or "rowVersion:" not in m.group(1):
        masalah.append(
            "adendum.service.ts: `denganVersi()` tidak ada atau tidak "
            "menyertakan `rowVersion` — keenam belas formulir PO berhenti "
            "mengirim versinya sekaligus"
        )

    berkas = sorted(FORMULIR.glob("purchase-order-create-*/*.component.ts"))
    if not berkas:
        masalah.append(f"tidak ada formulir PO ditemukan di {FORMULIR}")
    for f in berkas:
        isi = f.read_text(encoding="utf-8")
        for s in SIMPAN.finditer(isi):
            if "denganVersi(" not in s.group("muatan"):
                baris = isi.count("\n", 0, s.start()) + 1
                masalah.append(
                    f"{f.relative_to(AKAR)}:{baris}: penyimpanan ubahan tanpa "
                    f"`denganVersi()` — dua orang yang menyunting PO ini "
                    f"dapat saling menimpa tanpa peringatan"
                )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"versi PO: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"versi PO: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
