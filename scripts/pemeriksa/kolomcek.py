#!/usr/bin/env python3
"""
Setiap kolom yang disebut daftar kolom harus punya `matColumnDef`-nya.

KEKELIRUAN YANG DIJAGA

Angular Material MELEMPAR ketika `displayedColumns` menyebut nama yang tidak
punya `<ng-container matColumnDef="...">` padanannya:

    Could not find column with id "dueDate".

Tetapi galatnya baru muncul KETIKA HALAMANNYA DIBUKA, bukan saat dibangun —
`matColumnDef` adalah teks biasa bagi TypeScript. Jadi ia lolos build, lolos
`ng test` untuk halaman yang tidak dirakit di uji, dan sampai ke pengguna
sebagai halaman yang gagal digambar sama sekali.

Kebalikannya lebih sunyi lagi: `matColumnDef` yang TIDAK disebut di daftar
kolomnya sekadar tidak tergambar. Tidak ada galat, tidak ada yang merah —
kolomnya hanya hilang dari layar, dan yang menambahkannya menyangka
perubahannya belum ter-deploy.

KENAPA PEMERIKSA, BUKAN UJI KARMA

Untuk membandingkan keduanya, ujinya harus membaca BERKAS TEMPLATE. Di dalam
peramban itu berarti `require.context` — API webpack yang tidak ada di builder
esbuild proyek ini, dan yang sekali waktu memutus SELURUH sesi Karma sehingga
974 uji tidak pernah selesai dijalankan. Di sini pekerjaannya sepele: dua
berkas dibaca, dua himpunan dibandingkan.

CARA PAKAI

    python3 scripts/pemeriksa/kolomcek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

POLA_DEF = re.compile(r'matColumnDef="([\w.-]+)"')

# Daftar kolom ditulis dengan beberapa nama di repo ini.
POLA_DAFTAR = re.compile(
    r"(?:readonly\s+)?(?:kolom|displayedColumns|columns)\s*"
    r"(?::\s*[\w<>\[\]|\s]+)?\s*=\s*\[([^\]]*)\]"
)
POLA_TEKS = re.compile(r"['\"]([\w.-]+)['\"]")


def _tanpa_komentar(s: str) -> str:
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r"(?m)//.*$", "", s)
    return re.sub(r"<!--.*?-->", "", s, flags=re.S)


def periksa() -> list[str]:
    masalah: list[str] = []
    diperiksa = 0

    for html in sorted(SUMBER.rglob("*.html")):
        isi_html = _tanpa_komentar(html.read_text(encoding="utf-8"))
        didefinisikan = set(POLA_DEF.findall(isi_html))
        if not didefinisikan:
            continue

        ts = html.with_suffix(".ts")
        if not ts.exists():
            continue
        isi_ts = _tanpa_komentar(ts.read_text(encoding="utf-8"))

        daftar = POLA_DAFTAR.search(isi_ts)
        if not daftar:
            # Sebagian tabel menyusun kolomnya secara dinamis (mis. menurut
            # izin). Itu bentuk yang sah, dan pemeriksa ini tidak dapat
            # menilainya tanpa menjalankan kodenya — jadi dilewati, bukan
            # dituduh. Pemeriksa yang salah menuduh akan segera dilewati
            # orang, termasuk saat ia benar.
            continue

        disebut = [
            t
            for t in POLA_TEKS.findall(daftar.group(1))
            # Baris seperti `...KOLOM_DASAR` tidak menghasilkan teks; yang
            # tertangkap hanya yang benar-benar ditulis sebagai teks.
            if t
        ]
        if not disebut:
            continue

        diperiksa += 1
        rel = html.relative_to(SUMBER)

        hilang = [k for k in disebut if k not in didefinisikan]
        if hilang:
            masalah.append(
                f"{rel}: kolom {', '.join(hilang)} disebut di daftar kolom "
                f"tetapi tidak punya `matColumnDef` — Material melempar "
                f'"Could not find column with id", dan halamannya tidak '
                f"tergambar sama sekali"
            )

        nganggur = [k for k in sorted(didefinisikan) if k not in disebut]
        if nganggur:
            masalah.append(
                f"{rel}: `matColumnDef` {', '.join(nganggur)} tidak disebut "
                f"di daftar kolomnya — kolomnya tidak tergambar, tanpa galat "
                f"apa pun, dan yang menambahkannya akan menyangka "
                f"perubahannya belum ter-deploy"
            )

    if diperiksa == 0:
        masalah.append(
            "tidak ada satu pun tabel yang dapat diperiksa — pemeriksa ini "
            "mungkin menunjuk tempat yang salah, dan pemeriksa yang tidak "
            "menemukan apa-apa selalu hijau"
        )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"kelengkapan kolom tabel: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
