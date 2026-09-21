#!/usr/bin/env python3
"""
Kepala dialog: SATU bentuk, bukan seratus tujuh belas.

KENAPA PEMERIKSA INI ADA

Repo ini punya bentuk kepala dialog yang sudah mapan — acuannya
`bank-create`: pita berwarna lembut, lencana 42px berisi SVG sebaris,
judul dengan anak judul di sebelahnya, dan `appDialogGeser` supaya
dialognya dapat digeser saat menutupi sesuatu di belakangnya.

Yang menulis dialog baru kerap tidak tahu bentuk itu ada, lalu menulis
`<h2 mat-dialog-title>` polos berisi `<mat-icon>` dan sebaris teks. Hasilnya
sah, bersih, dan terlihat seperti layar dari aplikasi yang berbeda. Yang
memakainya menyadarinya seketika; yang menulisnya tidak pernah.

Sudah terjadi dua kali pada layar rekrutmen, dan dilaporkan pemakainya,
bukan oleh satu pun uji.

DUA HAL YANG DIPERIKSA pada elemen pembawa `mat-dialog-title`:

  1. `appDialogGeser` — dialognya dapat digeser.
  2. Judul `<h2>` DAN anak judul (kelas berakhiran `-sub` atau `__sub` ala BEM) di dalamnya.

Yang TIDAK diperiksa, dan sebaiknya diketahui: warna pitanya, ukuran
lencananya, dan apakah ikonnya SVG. Menuntut itu dari kode berarti
membaca SCSS tiap dialog, dan yang dijaga di sini bentuk pokoknya.

GARIS DASAR. Dialog lama yang belum mengikuti bentuk ini dicatat apa
adanya; gerbangnya hanya menolak bila jumlahnya BERTAMBAH. Menyeragamkan
seratus tujuh belas dialog sekaligus bukan pekerjaan yang dapat diperiksa
siapa pun dalam satu kiriman.

CARA PAKAI

    python3 scripts/pemeriksa/dialogkepalacek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

#: Tag pembuka yang membawa `mat-dialog-title`.
TAG = re.compile(r"<(\w[\w-]*)\b([^>]*\bmat-dialog-title\b[^>]*)>", re.S)


def _elemen(teks: str, mulai: int, tag: str) -> str:
    """
    Isi elemen dari `mulai`, dibaca sampai tag penutup yang SEIMBANG.

    Berhenti pada `</tag>` pertama akan memotong elemen yang menyarangkan
    tag sejenis — dan potongan itu membuat judul atau anak judulnya tidak
    terlihat, yaitu temuan keliru yang membuat pemeriksa berhenti dibaca.
    """
    buka = re.compile(rf"<{tag}\b", re.I)
    tutup = re.compile(rf"</{tag}\s*>", re.I)
    i = mulai
    dalam = 1
    while dalam and i < len(teks):
        b = buka.search(teks, i)
        t = tutup.search(teks, i)
        if t is None:
            return teks[mulai:]
        if b is not None and b.start() < t.start():
            dalam += 1
            i = b.end()
        else:
            dalam -= 1
            i = t.end()
    return teks[mulai:i]


def periksa() -> list[str]:
    masalah: list[str] = []

    for html in sorted(SUMBER.rglob("*.html")):
        teks = html.read_text(encoding="utf-8")
        m = TAG.search(teks)
        if m is None:
            continue

        tag, atribut = m.group(1), m.group(2)
        isi = _elemen(teks, m.end(), tag)
        nama = html.relative_to(AKAR)

        if "appDialogGeser" not in atribut:
            masalah.append(
                f"{nama}: kepala dialog tanpa `appDialogGeser` — dialognya "
                f"tidak dapat digeser saat menutupi isi di belakangnya"
            )

        punya_judul = re.search(r"<h2\b", isi) is not None or tag.lower() == "h2"
        punya_sub = re.search(r'class="[^"]*[-_]sub\b', isi) is not None
        if not (punya_judul and punya_sub):
            kurang = []
            if not punya_judul:
                kurang.append("judul `<h2>`")
            if not punya_sub:
                kurang.append("anak judul (kelas `*-sub`)")
            masalah.append(
                f"{nama}: kepala dialog tanpa {' dan '.join(kurang)} — "
                f"bentuknya menyimpang dari `bank-create`"
            )

    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"kepala dialog: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"kepala dialog: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
