#!/usr/bin/env python3
"""
Nama ikon yang TIDAK ADA di berkas fontnya.

KENAPA PEMERIKSA INI ADA

`index.html` memuat SATU keluarga ikon:

    https://fonts.googleapis.com/icon?family=Material+Icons

Itu himpunan "Material Icons" yang klasik — bukan "Material Symbols" yang
lebih baru dan jauh lebih besar. Contoh ikon yang hanya ada di Symbols
sangat mudah ditemukan lewat pencarian, dan menyalinnya ke sini
menghasilkan kegagalan yang paling tenang di repo ini:

    <mat-icon>database</mat-icon>

Tidak ada galat. Build bersih. Uji hijau. Yang tercetak di layar adalah
KOTAK KOSONG, dan hanya terlihat oleh yang membuka halamannya. Ia berdiri
di halaman sambutan Master Data — layar pertama yang dilihat orang saat
membuka menu itu — entah sejak kapan.

Dua yang ditemukan saat pemeriksa ini ditulis: `database` dan
`event_upcoming`, dari 175 nama ikon yang dipakai seluruh repo.

SUMBER DAFTARNYA

`data/ikon-material-icons.txt`, 2276 nama, diambil dari berkas codepoint
paket npm `material-icons`. Disimpan sebagai berkas, bukan diunduh saat
pemeriksaan: gerbang yang menuntut jaringan akan merah pada hari jaringan
sedang bermasalah, dan gerbang yang merah tanpa sebab adalah gerbang yang
dimatikan.

Memperbaruinya, bila suatu hari `index.html` berpindah ke Material
Symbols:

    npm pack material-icons
    tar xzf material-icons-*.tgz package/css/_codepoints.scss
    grep -oE '^\\s*"[a-z0-9_]+"' package/css/_codepoints.scss \\
        | tr -d ' "' | sort -u > scripts/pemeriksa/data/ikon-material-icons.txt

YANG TIDAK DIPERIKSA

Ikon yang namanya dirangkai saat berjalan — `{{ ikonEmber(e) }}` atau
`{{ item.icon }}`. Isinya tidak dapat diketahui dari templat, dan menebak
akan menghasilkan temuan keliru. Yang tertulis apa adanya sudah mencakup
hampir seluruhnya.

CARA PAKAI

    python3 scripts/pemeriksa/ikonadacek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src"
DAFTAR = Path(__file__).resolve().parent / "data" / "ikon-material-icons.txt"

#: `<mat-icon ...>nama</mat-icon>` dengan nama HARFIAH.
#:
#: Interpolasi (`{{ ... }}`) sengaja tidak cocok: isinya baru diketahui
#: saat berjalan.
IKON = re.compile(r"<mat-icon\b[^>]*>\s*([a-z0-9_]+)\s*</mat-icon>")


def periksa() -> list[str]:
    if not DAFTAR.exists():
        return [
            f"daftar nama ikon tidak ditemukan di {DAFTAR.relative_to(AKAR)} "
            f"— lihat cara memperbaruinya di kepala berkas ini"
        ]

    sah = {
        b.strip()
        for b in DAFTAR.read_text(encoding="utf-8").splitlines()
        if b.strip()
    }
    if len(sah) < 500:
        return [
            f"daftar nama ikon hanya berisi {len(sah)} nama — terlalu "
            f"sedikit untuk Material Icons; berkasnya kemungkinan terpotong"
        ]

    masalah: list[str] = []
    for html in sorted(SUMBER.rglob("*.html")):
        teks = html.read_text(encoding="utf-8")
        for m in IKON.finditer(teks):
            nama = m.group(1)
            if nama in sah:
                continue
            baris = teks.count("\n", 0, m.start()) + 1
            masalah.append(
                f"{html.relative_to(AKAR)}:{baris}: `{nama}` bukan ikon "
                f"Material Icons — yang tercetak KOTAK KOSONG, tanpa galat "
                f"apa pun"
            )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"nama ikon: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"nama ikon: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
