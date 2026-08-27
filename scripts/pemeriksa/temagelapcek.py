#!/usr/bin/env python3
"""
Warna TERANG yang ditulis langsung pada dialog.

Tema gelap tidak pernah gagal dengan bersuara. Sebuah latar `#eef2fe` yang
ditulis langsung tetap sah, tetap lolos build, tetap lolos seluruh uji — ia
hanya menyala putih kebiruan di tengah layar gelap, dan baru ketahuan ketika
seseorang membukanya malam hari lalu melaporkannya.

Bentuk yang DITERIMA:

    background: var(--surface-2, #f6f8ff);

Nilai tetapnya berada di dalam `var()` sebagai CADANGAN. Tema terang memakai
angka yang sama persis seperti sebelumnya, sementara tema gelap mengambil
tokennya. Itulah sebabnya pemeriksa ini membuang isi `var(...)` lebih dulu
sebelum menilai — cadangan bukan pelanggaran, dan menandainya akan membuat
seluruh berkas yang sudah benar dilaporkan menyimpang.

Bentuk yang DITOLAK:

    background: linear-gradient(135deg, #eef2fe 0%, #f6f8ff 100%);
    border-bottom: 1px solid #e4e9fb;

Dibatasi pada DIALOG. Layar seperti pratinjau PDF memang meniru kertas dan
warnanya sengaja putih; menyapu semuanya akan menghasilkan daftar panjang
berisi hal-hal yang justru benar.

Keluar dengan kode 1 bila ada yang menyimpang.
"""

from __future__ import annotations

import glob
import os
import re
import sys

AKAR = os.path.join(os.path.dirname(__file__), "..", "..")

#: Rata-rata RGB di atas ini dianggap "terang" — nyaris putih.
AMBANG = 200

PROPERTI = r"(background(?:-color)?|border(?:-\w+)?)"


def _terang(hexs: str) -> bool:
    x = hexs.lstrip("#")
    if len(x) == 3:
        x = "".join(c * 2 for c in x)
    if len(x) != 6:
        return False
    r, g, b = int(x[0:2], 16), int(x[2:4], 16), int(x[4:6], 16)
    return (r + g + b) / 3 > AMBANG


def _dialog(scss: str) -> bool:
    html = scss.replace(".scss", ".html")
    if not os.path.exists(html):
        return False
    return "mat-dialog" in open(html, encoding="utf-8").read()


def periksa(scss: str) -> list[str]:
    s = re.sub(r"/\*.*?\*/", "", open(scss, encoding="utf-8").read(), flags=re.S)
    galat = []
    for m in re.finditer(rf"{PROPERTI}\s*:\s*([^;{{]+);", s):
        prop, nilai = m.group(1), m.group(2)
        # Cadangan di dalam `var()` SAH — lihat catatan di atas.
        tanpa_var = re.sub(r"var\([^)]*\)", "", nilai)
        for h in re.findall(r"#[0-9a-fA-F]{3,6}", tanpa_var):
            if _terang(h):
                galat.append(
                    f"{prop}: {h} ditulis langsung; bungkus dengan "
                    f"`var(--token, {h})` supaya tema gelap punya pasangannya"
                )
    return galat


def main() -> int:
    pola = os.path.join(AKAR, "src", "app", "**", "*.component.scss")
    total = menyimpang = 0
    for scss in sorted(set(glob.glob(pola, recursive=True))):
        if not _dialog(scss):
            continue
        total += 1
        galat = periksa(scss)
        if galat:
            menyimpang += 1
            print(f"\n{scss.split('src/app/', 1)[-1]}")
            for g in galat:
                print(f"  - {g}")

    print(f"\n{total} dialog diperiksa, {menyimpang} menyimpang.")
    return 1 if menyimpang else 0


if __name__ == "__main__":
    sys.exit(main())
