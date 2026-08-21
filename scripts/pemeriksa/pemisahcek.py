#!/usr/bin/env python3
"""
Pemisah ribuan pada kolom bermask harus SPASI, bukan titik.

MENGAPA

ngx-mask memakai satu penanda desimal bawaan `['.', ',']` — titik maupun
koma diterima sebagai desimal. Bila pemisah RIBUAN diset titik juga
(`thousandSeparator="."`), titik tidak dapat lagi berarti desimal: pada kolom
harga, yang mengetik "300.000,50" tidak dapat memasukkan bagian desimalnya
sama sekali, dan mengetik koma pun berperilaku aneh.

Karena itu seluruh kolom memakai pemisah ribuan SPASI (`thousandSeparator=" "`)
— desimal tetap boleh titik atau koma. Pemeriksa ini menolak titik agar kasus
itu tidak kembali diam-diam pada formulir baru.

    python3 scripts/pemeriksa/pemisahcek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
POLA = re.compile(r'thousandSeparator="\."')


def main() -> int:
    berkas = sorted((AKAR / "src").rglob("*.html"))
    temuan: list[str] = []
    for f in berkas:
        for no, baris in enumerate(f.read_text().split("\n"), 1):
            if POLA.search(baris):
                temuan.append(f"{f.relative_to(AKAR)}:{no}")

    print(f"pemisahcek: {len(berkas)} templat diperiksa")
    if len(berkas) < 50:
        print("\nGAGAL MEMBACA: terlalu sedikit templat; perbaiki pemeriksanya.")
        return 2
    if not temuan:
        print('bersih — semua pemisah ribuan memakai spasi.')
        return 0

    print(f"\n{len(temuan)} kolom memakai titik sebagai pemisah ribuan:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        '\nGanti `thousandSeparator="."` menjadi `thousandSeparator=" "`. '
        "Titik bertabrakan dengan titik desimal dan mengunci input desimal."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
