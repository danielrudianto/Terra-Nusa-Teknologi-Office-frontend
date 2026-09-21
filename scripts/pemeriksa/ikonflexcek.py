#!/usr/bin/env python3
"""
Ikon di dalam wadah flex tidak boleh menciut.

KELAS KEGAGALAN YANG DIJAGA

`mat-icon` berukuran tetap 24px, tetapi `flex-shrink` bawaannya 1. Di dalam
wadah `display: flex`, begitu teks di sebelahnya panjang, ikonnya ikut
dipersempit — dan yang terlihat cuma irisan tipis di tepi kiri.

Tidak ada galat apa pun. CSS-nya sah, build bersih, seluruh uji hijau.

Terjadi pada spanduk keterangan di halaman KPI, yang teksnya memang panjang
dengan sengaja. Diukur di Chromium headless: ikonnya **7,08px**, bukan 24 —
menciut jadi 29% dan terpotong. Setelah `flex: 0 0 auto`: 24px.

CARA MEMERIKSANYA

Untuk tiap pasangan komponen (`*.component.html` + `*.component.scss`):

  1. cari kelas yang di HTML-nya LANGSUNG memuat `<mat-icon>`;
  2. cari kelas yang di SCSS-nya `display: flex`;
  3. irisan keduanya wajib punya aturan yang menyetel `flex` atau
     `flex-shrink` pada ikonnya.

Yang diperiksa hanya wadah yang BENAR-BENAR memuat ikon — kelas flex tanpa
ikon tidak berisiko apa pun, dan melaporkannya hanya membuat pemeriksa ini
diabaikan.

CARA PAKAI

    python3 scripts/pemeriksa/ikonflexcek.py
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SUMBER = os.path.join(AKAR, "src")

#: Ikon yang ukurannya memang sudah dikunci lewat `width`/`height` di
#: aturannya sendiri TIDAK dianggap aman: lebar tetap tidak menghalangi
#: `flex-shrink` mengecilkannya. Hanya `flex`/`flex-shrink` yang menahannya.
POLA_AMAN = re.compile(r"\bflex(-shrink)?\s*:", re.I)


def _kelas_berikon(html: str) -> set:
    """Kelas yang elemennya langsung memuat `<mat-icon>` sebagai anak pertama."""
    kelas = set()
    for m in re.finditer(
        r'class="([^"]+)"[^>]*>\s*(?:<!--.*?-->\s*)?<mat-icon', html, re.S
    ):
        kelas.update(m.group(1).split())
    return kelas


def _aturan(scss: str, nama: str):
    return re.search(rf"^\.{re.escape(nama)}\s*\{{([^}}]*)\}}", scss, re.M)


def _punya_penahan(scss: str, nama: str) -> bool:
    # `.kelas mat-icon { ... }` maupun `.kelas > mat-icon { ... }`,
    # termasuk bila kelasnya disebut di dalam daftar selektor bersama.
    for m in re.finditer(r"([^{}]+)\{([^}]*)\}", scss):
        selektor, isi = m.group(1), m.group(2)
        if "mat-icon" not in selektor:
            continue
        if not re.search(rf"\.{re.escape(nama)}\s*>?\s*mat-icon", selektor):
            continue
        if POLA_AMAN.search(isi):
            return True
    return False


#: Aturan global yang menahan SEMUA ikon sekaligus (src/styles.scss).
POLA_GLOBAL = re.compile(r"^\.mat-icon\s*\{[^}]*flex-shrink\s*:\s*0", re.M)


def ada_penahan_global() -> bool:
    jalur = os.path.join(SUMBER, "styles.scss")
    return os.path.exists(jalur) and bool(
        POLA_GLOBAL.search(open(jalur, encoding="utf-8").read())
    )


def periksa():
    # Sejak ada `.mat-icon { flex-shrink: 0 }` global, tiap komponen sudah
    # aman; yang dijaga tinggal aturan global itu sendiri. Bila ia hilang,
    # pemeriksaan per komponen di bawah berjalan lagi dan memerahkan gerbang.
    if ada_penahan_global():
        return []
    masalah = []
    for dirpath, _, files in os.walk(SUMBER):
        for f in files:
            if not f.endswith(".component.html"):
                continue
            html_p = os.path.join(dirpath, f)
            scss_p = html_p[: -len(".html")] + ".scss"
            if not os.path.exists(scss_p):
                continue
            html = open(html_p, encoding="utf-8").read()
            if "<mat-icon" not in html:
                continue
            scss = open(scss_p, encoding="utf-8").read()

            for nama in sorted(_kelas_berikon(html)):
                aturan = _aturan(scss, nama)
                if not aturan or "display: flex" not in aturan.group(1):
                    continue
                if _punya_penahan(scss, nama):
                    continue
                masalah.append(
                    f"{os.path.relpath(scss_p, AKAR)}: `.{nama}` wadah flex "
                    f"yang memuat `mat-icon`, tetapi ikonnya tidak ditahan "
                    f"`flex: 0 0 auto` — begitu teks di sebelahnya panjang, "
                    f"ikonnya menciut dan terpotong, tanpa galat apa pun"
                )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"ikon di wadah flex: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"ikon di wadah flex: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
