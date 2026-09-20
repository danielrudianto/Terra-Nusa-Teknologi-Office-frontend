#!/usr/bin/env python3
"""
Palet halaman ujian: TIGA daftar warna yang harus sepakat, dan terbaca.

KENAPA PEMERIKSA INI ADA

Warna palet ujian disebut di tiga tempat sekaligus:

    src/app/pages/exam/palet-ujian.service.ts          (sumbernya)
    src/app/pages/exam/exam-landing/...component.scss  (halaman depan)
    src/app/pages/exam/exam-work/...component.scss     (halaman pengerjaan)

Tidak dapat disatukan: gaya Angular tercakup per komponen, jadi variabel
yang disetel di satu komponen tidak menembus ke komponen lain, dan warna
yang dipakai TypeScript untuk menggambar bulatan pemilihnya harus ada di
TypeScript.

Yang terjadi bila ketiganya berpisah: pelamar menekan bulatan hijau, halaman
depannya berubah hijau, lalu halaman pengerjaannya tetap oranye — atau
bulatan di pemilihnya menampilkan warna yang bukan warna yang akan ia
dapatkan. Tidak ada galat apa pun; CSS-nya sah, build bersih, uji hijau.

DUA HAL YANG DIPERIKSA

  1. KESEPAKATAN. Ketiga daftar memuat kode palet yang sama, dengan nilai
     heksa yang sama persis.

  2. KETERBACAAN. Tiap palet diukur:
       * `ink` di atas PUTIH  >= 4.5:1  (teks kecil, WCAG AA)
       * `gelap` di atas teks PUTIH >= 4.5:1
     `aksen` SENGAJA tidak dituntut memenuhi ambang apa pun — ia memang
     hanya untuk isian dan garis. Oranye AKN berkontras 2,74:1 dengan
     putih; menuntutnya lolos berarti membuang warna perusahaannya sendiri.

Pemilih warna dipasang untuk menunjukkan kerapian. Pemilih warna yang
menghasilkan teks tak terbaca menunjukkan kebalikannya.

CARA PAKAI

    python3 scripts/pemeriksa/paletujiancek.py
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UJIAN = os.path.join(AKAR, "src", "app", "pages", "exam")

LAYANAN = os.path.join(UJIAN, "palet-ujian.service.ts")
SCSS = {
    "depan": os.path.join(UJIAN, "exam-landing", "exam-landing.component.scss"),
    "kerja": os.path.join(UJIAN, "exam-work", "exam-work.component.scss"),
}

#: WCAG AA untuk teks kecil.
AMBANG = 4.5


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _luminansi(h):
    h = h.lstrip("#")
    r, g, b = (_lin(int(h[i : i + 2], 16)) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _kontras(a, b):
    l1, l2 = sorted((_luminansi(a), _luminansi(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def _dari_layanan(teks):
    """{kode: {aksen, ink, gelap}} dari larik `PALET`."""
    palet = {}
    for m in re.finditer(
        r"\{\s*kode:\s*'([\w-]+)',\s*aksen:\s*'(#[0-9a-fA-F]{6})',\s*"
        r"ink:\s*'(#[0-9a-fA-F]{6})',\s*gelap:\s*'(#[0-9a-fA-F]{6})'",
        teks,
    ):
        palet[m.group(1)] = {
            "aksen": m.group(2).lower(),
            "ink": m.group(3).lower(),
            "gelap": m.group(4).lower(),
        }
    return palet


def _dari_scss(teks, bawaan_kode):
    """{kode: {aksen, ink, gelap}} dari blok `:host` dan `:host([data-palet=...])`."""
    palet = {}

    def _isi(blok):
        nilai = {}
        for nama, kunci in (("--akn", "aksen"), ("--akn-ink", "ink"), ("--akn-dark", "gelap")):
            m = re.search(rf"{nama}:\s*(#[0-9a-fA-F]{{6}})\s*;", blok)
            if m:
                nilai[kunci] = m.group(1).lower()
        return nilai

    # SELURUH blok `:host` ditelusuri, bukan yang pertama saja.
    #
    # Berkas halaman depan punya dua: satu untuk tata letak (`display`,
    # `min-height`) dan satu lagi untuk variabel warnanya. Mengambil yang
    # pertama membuat pemeriksa ini melaporkan palet bawaan sebagai hilang
    # padahal ada — temuan palsu, yang lebih buruk daripada tidak memeriksa
    # sama sekali karena ia mengajari pembacanya mengabaikan keluarannya.
    for m in re.finditer(r":host\s*\{([^}]*)\}", teks):
        isi = _isi(m.group(1))
        if len(isi) == 3:
            palet[bawaan_kode] = isi
            break

    for m in re.finditer(
        r":host\(\[data-palet='([\w-]+)'\]\)\s*\{([^}]*)\}", teks
    ):
        isi = _isi(m.group(2))
        if len(isi) == 3:
            palet[m.group(1)] = isi
    return palet


def periksa():
    masalah = []

    if not os.path.exists(LAYANAN):
        return [f"{os.path.relpath(LAYANAN, AKAR)} tidak ditemukan"]
    teks_layanan = open(LAYANAN, encoding="utf-8").read()

    m = re.search(r"PALET_BAWAAN\s*=\s*'([\w-]+)'", teks_layanan)
    bawaan = m.group(1) if m else "akn"

    acuan = _dari_layanan(teks_layanan)
    if not acuan:
        return [
            "larik `PALET` di palet-ujian.service.ts tidak terbaca — "
            "bentuknya berubah, dan pemeriksa ini berhenti menjaga apa pun"
        ]
    if bawaan not in acuan:
        masalah.append(
            f"PALET_BAWAAN '{bawaan}' tidak ada di dalam larik PALET"
        )

    # 1. kesepakatan
    for nama, p in SCSS.items():
        if not os.path.exists(p):
            masalah.append(f"{os.path.relpath(p, AKAR)} tidak ditemukan")
            continue
        punya = _dari_scss(open(p, encoding="utf-8").read(), bawaan)

        hilang = sorted(set(acuan) - set(punya))
        if hilang:
            masalah.append(
                f"[{nama}] palet {', '.join(hilang)} ada di layanan tetapi "
                f"tidak punya blok warnanya di SCSS — pelamar yang "
                f"memilihnya mendapat halaman yang tidak berubah"
            )
        lebih = sorted(set(punya) - set(acuan))
        if lebih:
            masalah.append(
                f"[{nama}] palet {', '.join(lebih)} ada di SCSS tetapi tidak "
                f"ditawarkan layanannya — warna mati yang tidak dapat dipilih"
            )
        for kode in sorted(set(acuan) & set(punya)):
            for kunci in ("aksen", "ink", "gelap"):
                a, b = acuan[kode][kunci], punya[kode][kunci]
                if a != b:
                    masalah.append(
                        f"[{nama}] palet '{kode}' nilai `{kunci}` berbeda: "
                        f"layanan {a}, SCSS {b} — bulatan pemilihnya "
                        f"menampilkan warna yang bukan warna yang didapat"
                    )

    # 2. keterbacaan
    for kode, w in sorted(acuan.items()):
        k_ink = _kontras(w["ink"], "#ffffff")
        if k_ink < AMBANG:
            masalah.append(
                f"palet '{kode}': `ink` {w['ink']} berkontras {k_ink:.2f}:1 "
                f"dengan putih, di bawah {AMBANG}:1 — teksnya sulit dibaca"
            )
        k_gelap = _kontras(w["gelap"], "#ffffff")
        if k_gelap < AMBANG:
            masalah.append(
                f"palet '{kode}': `gelap` {w['gelap']} berkontras "
                f"{k_gelap:.2f}:1 dengan teks putih, di bawah {AMBANG}:1"
            )

    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"palet halaman ujian: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"palet halaman ujian: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
