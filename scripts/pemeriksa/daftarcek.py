#!/usr/bin/env python3
"""
Pemeriksa halaman DAFTAR.

Dua kekeliruan yang ditemukan pada daftar Tender, dan keduanya tidak
menimbulkan galat apa pun — layarnya terbuka, hanya bentuknya berbeda dari
daftar sebelah:

  1. `animation: tl-indeterminate …` merujuk gerakan yang TIDAK PERNAH
     dituliskan. Peramban mengabaikan nama yang tidak dikenal tanpa berkata
     apa-apa, sehingga bilah muatnya diam di tempat sementara kode yang
     menyalakannya terlihat benar.

  2. Bilah alatnya bertumpuk selamanya. Bawaan `flex-direction: column`
     dimaksudkan untuk layar sempit dan dibalik menjadi `row` oleh kaidah
     lebar layar; salinan yang berhenti sebelum kaidah itu membuat halaman
     lebar tetap tampak seperti tampilan telepon genggam — kotak pencarian
     selebar layar, tombol muat ulang sendirian di bawahnya.

Diperiksa pada CSS HASIL KOMPILASI, bukan pada berkas `.scss`-nya. Nama
gerakan di kerangka bersama dirangkai dengan interpolasi (`#{$p}-indeterminate`)
dan hanya berwujud setelah dikompilasi; memeriksa sumbernya berarti menebak.

    python3 scripts/pemeriksa/daftarcek.py
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SASS = AKAR / "node_modules" / ".bin" / "sass"

# Kata yang boleh muncul pada nilai `animation` dan BUKAN nama gerakan.
KATA_ANIMASI = {
    "normal", "reverse", "alternate", "alternate-reverse",
    "none", "forwards", "backwards", "both",
    "running", "paused",
    "infinite",
    "linear", "ease", "ease-in", "ease-out", "ease-in-out",
    "step-start", "step-end",
    "initial", "inherit", "unset", "revert",
}

ANGKA = re.compile(r"^-?[\d.]+(s|ms|%)?$")
FUNGSI = re.compile(r"\b(cubic-bezier|steps|linear)\([^)]*\)")


def kompilasi(scss: Path) -> str | None:
    """
    CSS hasil kompilasi, atau None bila sass menolak berkasnya.

    Komentarnya DIBUANG.

    Percobaan pertama membiarkannya, dan pemeriksanya lalu diam pada berkas
    yang justru menjelaskan kekeliruannya: komentar yang berbunyi "@keyframes
    tl-indeterminate yang dirujuknya tidak pernah ditulis" ikut terbaca sebagai
    gerakan yang sudah ditulis. Penjaganya hijau persis di tempat yang paling
    perlu dijaga.
    """
    hasil = subprocess.run(
        [str(SASS), "--no-source-map", "--stdin", "--load-path", str(scss.parent)],
        input=scss.read_text(),
        capture_output=True,
        text=True,
    )
    if hasil.returncode != 0:
        return None
    return re.sub(r"/\*.*?\*/", " ", hasil.stdout, flags=re.S)


def gerakan_dipakai(css: str) -> set[str]:
    dipakai: set[str] = set()
    for nilai in re.findall(r"animation(?:-name)?\s*:\s*([^;}]+)", css):
        nilai = FUNGSI.sub(" ", nilai)
        for kata in re.split(r"[,\s]+", nilai.strip()):
            kata = kata.strip()
            if not kata or kata in KATA_ANIMASI or ANGKA.match(kata):
                continue
            if kata.startswith("var(") or kata.startswith("--"):
                continue
            dipakai.add(kata)
    return dipakai


def gerakan_ditulis(css: str) -> set[str]:
    return set(re.findall(r"@(?:-\w+-)?keyframes\s+([\w-]+)", css))


def toolbar_bertumpuk(css: str) -> set[str]:
    """Selektor `*-toolbar` yang bawaannya `column`, di LUAR blok @media."""
    hasil: set[str] = set()
    for sel, isi in re.findall(r"([^{}]*-toolbar[^{}]*)\{([^{}]*)\}", css):
        if "flex-direction: column" in isi:
            for s in sel.split(","):
                cocok = re.search(r"\.[\w-]*-toolbar", s)
                if cocok:
                    hasil.add(cocok.group(0))
    return hasil


def toolbar_dibalik(css: str) -> set[str]:
    """Selektor `*-toolbar` yang dijadikan `row` di dalam blok @media."""
    hasil: set[str] = set()
    for blok in re.findall(r"@media[^{]*\{(.*?)\n\}", css, flags=re.S):
        for sel, isi in re.findall(r"([^{}]*-toolbar[^{}]*)\{([^{}]*)\}", blok):
            if "flex-direction: row" in isi:
                cocok = re.search(r"\.[\w-]*-toolbar", sel)
                if cocok:
                    hasil.add(cocok.group(0))
    return hasil


def main() -> int:
    if not SASS.exists():
        print(f"sass tidak ditemukan di {SASS}; jalankan `npm install` dahulu.")
        return 2

    # Gerakan yang ditulis di lembar gaya global tersedia bagi semua komponen.
    global_css = ""
    for g in [AKAR / "src" / "styles.scss"]:
        if g.exists():
            global_css += kompilasi(g) or ""
    gerakan_global = gerakan_ditulis(global_css)

    temuan: list[str] = []
    diperiksa = 0

    for scss in sorted((AKAR / "src" / "app").rglob("*.component.scss")):
        css = kompilasi(scss)
        if css is None:
            continue
        diperiksa += 1
        rel = scss.relative_to(AKAR)

        hantu = gerakan_dipakai(css) - gerakan_ditulis(css) - gerakan_global
        for nama in sorted(hantu):
            temuan.append(
                f"{rel}: gerakan `{nama}` dipakai tetapi @keyframes-nya tidak "
                f"pernah ditulis — yang menggerakkannya diam tanpa galat"
            )

        dibalik = toolbar_dibalik(css)
        for sel in sorted(toolbar_bertumpuk(css) - dibalik):
            temuan.append(
                f"{rel}: `{sel}` bertumpuk (column) tanpa kaidah lebar layar "
                f"yang membalikkannya menjadi row — pada layar lebar bilah "
                f"alatnya tetap tampak seperti tampilan telepon genggam"
            )

    print(f"daftarcek: {diperiksa} berkas .scss diperiksa")
    if not temuan:
        print("bersih.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
