#!/usr/bin/env python3
"""
`*ngFor` / `@for` yang sumbernya MEMBUAT LARIK BARU tiap putaran.

KENAPA PEMERIKSA INI ADA

Templat memanggil sumber perulangan pada SETIAP putaran deteksi perubahan —
tiap ketikan, tiap gerakan tetikus di atas tombol, tiap detak timer. Bila
sumbernya getter atau metode yang berisi `.map()`, `.filter()`, `.slice()`,
`.sort()` atau sebaran `[...]`, yang keluar SELALU larik baru meski isinya
sama persis. Angular melihat objek berbeda, lalu membongkar dan menyusun
ulang seluruh baris.

Ini bukan sekadar boros. Di menu samping, larik baru tiap putaran bertemu
`routerLinkActive` — yang menandai putaran berikutnya — dan keduanya saling
memicu sampai halamannya membeku. Gejalanya dilaporkan pemakainya sebagai
"mengetik di kotak cari bikin aplikasi mati, refresh pun tidak menolong".
Tidak ada satu pun uji yang menangkapnya, dan tidak ada galat di konsol.

OBATNYA `memoLarik` / `memoPerBaris` (`src/app/utils/memo-larik.ts`), atau
`computed()` bila komponennya sudah memakai signal: hasilnya diingat selama
sumbernya belum berganti, sehingga Angular menerima larik yang SAMA.

YANG DIPERIKSA: ekspresi perulangan yang menunjuk anggota kelas, lalu badan
anggota itu di `.ts` pasangannya. Yang sudah memanggil `memo…()` atau sebuah
signal (`sesuatu()`) tidak ditandai.

GARIS DASAR: berkas yang memang tidak dapat diingat — sumbernya objek yang
DISUNTING di tempat, bukan diganti — didaftar di `DIKECUALIKAN` beserta
alasannya. Gerbangnya menolak bila ada temuan BARU di luar daftar itu.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

#: Penanda bahwa badan anggota merakit larik baru.
MERAKIT = (
    ".filter(", ".map(", ".slice(", ".sort(", ".concat(", "[...",
    "Object.keys(", "Object.values(", "Object.entries(", ".reverse(",
)

#: Sudah diingat: hasilnya larik yang sama selama sumbernya tetap.
SUDAH_DIINGAT = ("memoLarik", "memoPerBaris", "computed(")

#: Yang sengaja dibiarkan, beserta alasannya.
DIKECUALIKAN = {
    # `jawaban` disunting di tempat oleh ngModel, sehingga identitasnya tidak
    # pernah berubah — ingatan berbasis identitas justru akan basi. Daftarnya
    # sependek jumlah soal satu paket ujian.
    ("pages/exam/exam-work/exam-work.component.html", "belumDijawab"),
}

POLA_NG = re.compile(r'\*ngFor\s*=\s*"let\s+\w+\s+of\s+([^";]+)', re.S)
POLA_AT = re.compile(r"@for\s*\(\s*\w+\s+of\s+([^;]+);", re.S)


def _badan(kode: str, nama: str, dipanggil: bool) -> str:
    """Badan getter (dan metode, bila ekspresinya memanggilnya)."""
    g = re.search(
        r"\bget\s+%s\s*\(\)[^{]*\{(.{0,800}?)\n  \}" % re.escape(nama), kode, re.S
    )
    f = re.search(
        r"\n  (?:public |private |protected )?%s\s*\([^)]*\)[^{]*\{(.{0,800}?)\n  \}"
        % re.escape(nama),
        kode,
        re.S,
    )
    return (g.group(1) if g else "") + (f.group(1) if f and dipanggil else "")


def periksa() -> list[str]:
    masalah: list[str] = []
    for akar, _, berkas in os.walk(SUMBER):
        for b in berkas:
            if not b.endswith(".html"):
                continue
            p = Path(akar) / b
            rel = p.relative_to(SUMBER).as_posix()
            html = p.read_text(encoding="utf-8")
            ts = p.with_suffix(".ts")
            kode = ts.read_text(encoding="utf-8") if ts.exists() else ""
            if not kode:
                continue
            for m in list(POLA_NG.finditer(html)) + list(POLA_AT.finditer(html)):
                ekspr = " ".join(m.group(1).split())
                nama = re.match(r"^([A-Za-z_]\w*)", ekspr)
                if not nama:
                    continue
                n = nama.group(1)
                badan = _badan(kode, n, ekspr.startswith(n + "("))
                if not badan or not any(k in badan for k in MERAKIT):
                    continue
                if any(k in badan for k in SUDAH_DIINGAT):
                    continue
                if (rel, n) in DIKECUALIKAN:
                    continue
                masalah.append(
                    f"{rel}: `{ekspr}` merakit larik baru tiap putaran "
                    f"deteksi perubahan — bungkus dengan `memoLarik`/"
                    f"`memoPerBaris`, atau jadikan `computed()`"
                )
    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"sumber perulangan yang merakit larik: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
