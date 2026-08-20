#!/usr/bin/env python3
"""
Nilai baris dokumen dihitung di SATU tempat.

Sejak sebuah baris boleh membawa jumlah yang ditulis sendiri — pembetulan
pembulatan, paling banyak beberapa rupiah — perkalian `quantity * price` tidak
lagi selalu benar. Helper yang masih menghitungnya sendiri akan mencetak angka
yang berbeda dari helper sebelahnya, PADA DOKUMEN YANG SAMA: nilai baris di
tabel tidak cocok dengan subtotalnya, dan tidak ada satu pun galat yang
menyertainya.

Sebelum penjaga ini ada, perkalian itu tersebar di dua belas tempat pada tujuh
berkas.

    python3 scripts/pemeriksa/nilaibariscek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

#: Perkalian volume kali harga, dalam urutan mana pun.
POLA = re.compile(
    r"(quantity[^;\n]{0,40}\*[^;\n]{0,40}price|price[^;\n]{0,40}\*[^;\n]{0,40}quantity)",
    re.I,
)

#: Berkas yang MEMANG berhak menghitungnya — sumber kebenarannya sendiri.
DIKECUALIKAN = {"src/app/helpers/nilai-baris.helper.ts"}


def main() -> int:
    temuan: list[str] = []
    diperiksa = 0

    for f in sorted((AKAR / "src/app").rglob("*.ts")):
        rel = str(f.relative_to(AKAR))
        if rel in DIKECUALIKAN or rel.endswith(".spec.ts"):
            continue
        # Hanya helper cetak dan pembangun dokumen: formulir memang menghitung
        # sendiri saat mengisi, dan angkanya tidak pernah sampai ke kertas.
        if "/helpers/" not in rel:
            continue
        diperiksa += 1
        isi = f.read_text()
        for baris_no, baris in enumerate(isi.split("\n"), 1):
            if baris.lstrip().startswith(("*", "//")):
                continue
            if POLA.search(baris):
                temuan.append(f"{rel}:{baris_no}: {baris.strip()[:80]}")

    print(f"nilaibariscek: {diperiksa} helper diperiksa")
    if diperiksa < 5:
        print("\nGAGAL MEMBACA: terlalu sedikit berkas; perbaiki pemeriksanya.")
        return 2
    if not temuan:
        print("bersih — seluruhnya lewat `nilaiBaris()`.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        "\nPakai `nilaiBaris(baris)` dari `helpers/nilai-baris.helper.ts`;\n"
        "ia menghormati jumlah yang ditulis, dan jatuh ke perkalian bila kosong."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
