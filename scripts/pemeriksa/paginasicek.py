#!/usr/bin/env python3
"""
Pilihan "baris per halaman" tidak ditulis ulang di tiap daftar.

KENAPA PEMERIKSA INI ADA

Setiap daftar dulu menuliskan pilihannya sendiri di templat. Tiga ejaan
berbeda hidup berdampingan tanpa ada yang menyadarinya: 22 daftar
10/25/50, Certificate of Payment 10/20/50, dan Audit 10/25/100. Yang
memakainya membacanya sebagai setelan yang tidak bekerja — ia memilih 25 di
Pengaturan, lalu menemukan daftar yang menawarkan 20.

Dilaporkan pemakainya, bukan oleh satu pun uji.

YANG DIPERIKSA: `[pageSizeOptions]` harus menunjuk `pilihanBaris`
(`constants/paginasi.constant.ts`), bukan larik yang diketik di templat.

Keluar dengan kode 1 bila ada yang menyimpang.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

POLA = re.compile(r'\[pageSizeOptions\]="([^"]+)"')
DIIZINKAN = {"pilihanBaris"}


def periksa() -> list[str]:
    masalah: list[str] = []
    for akar, _, berkas in os.walk(SUMBER):
        for b in berkas:
            if not b.endswith(".html"):
                continue
            p = Path(akar) / b
            for m in POLA.finditer(p.read_text(encoding="utf-8")):
                nilai = m.group(1).strip()
                if nilai in DIIZINKAN:
                    continue
                masalah.append(
                    f"{p.relative_to(SUMBER).as_posix()}: `[pageSizeOptions]="
                    f"\"{nilai}\"` ditulis sendiri — pakai `pilihanBaris` "
                    f"(constants/paginasi.constant.ts) supaya seluruh daftar "
                    f"menawarkan pilihan yang sama"
                )
    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"pilihan baris per halaman seragam: {len(h)} menyimpang")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
