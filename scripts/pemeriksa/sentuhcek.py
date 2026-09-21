#!/usr/bin/env python3
"""
Sasaran sentuh di halaman ujian: 44px, diukur bukan ditaksir.

KENAPA PEMERIKSA INI ADA

Halaman ujian adalah SATU-SATUNYA halaman sistem ini yang dipakai orang
luar, di peranti mereka sendiri, sekali seumur hidup, dengan hitungan
mundur berjalan. Yang salah menekan tombol di sini tidak mengeluh ke
siapa pun — ia mengulang ketukannya, kehilangan beberapa detik, dan
tidak ada satu pun galat yang tercatat.

Dua tombolnya sempat berukuran 22px: bulatan pemilih warna di halaman
depan, dan tombol "coba lagi" pada penanda simpan di halaman pengerjaan.
Keduanya diukur di viewport ponsel sungguhan (Playwright, 320-430px),
bukan ditaksir dari kode. 22px kurang dari separuh 44px yang disarankan
Apple dan 48dp yang disarankan Android.

Keduanya diperbaiki dengan cara yang MUDAH TERURAI kembali: bidang
sentuhnya diperbesar, sedangkan yang terlihat tetap kecil. Siapa pun
yang kelak merapikan CSS-nya akan melihat tombol 44px yang isinya hanya
bulatan 22px, menyangka 44px itu sisa, lalu mengecilkannya. Tampilannya
tidak berubah sedikit pun. Tidak ada uji yang gagal. Yang berubah hanya
nasib pelamar yang memakai ponsel.

Karena itu ukurannya dikunci di sini.

YANG DIPERIKSA

  1. `.exl-palet__tombol` berukuran >= 44px pada kedua sisinya.
  2. Warnanya digambar pada anak `.exl-palet__bulat`, BUKAN pada
     tombolnya — bila ia pindah ke tombolnya, bulatan 22px itu menjadi
     bidang 44px berwarna, dan pemilihnya berubah rupa.
  3. `.exw-simpan__ulang` punya `min-height` >= 44px di dalam blok
     `@media (pointer: coarse)`.

CARA PAKAI

    python3 scripts/pemeriksa/sentuhcek.py
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UJIAN = os.path.join(AKAR, "src", "app", "pages", "exam")

DEPAN_SCSS = os.path.join(UJIAN, "exam-landing", "exam-landing.component.scss")
DEPAN_HTML = os.path.join(UJIAN, "exam-landing", "exam-landing.component.html")
KERJA_SCSS = os.path.join(UJIAN, "exam-work", "exam-work.component.scss")

#: Saran Apple (44px). Android menyarankan 48dp; 44 dipilih sebagai
#: ambang terendah yang masih dapat dipertahankan di bilah yang padat.
AMBANG = 44.0

#: Ukuran huruf akar peramban. `rem` di berkas ini tidak pernah disetel
#: ulang, jadi 1rem = 16px.
REM = 16.0


def _px(nilai: str) -> float | None:
    """Ubah satu nilai CSS menjadi px; None bila satuannya tidak terukur."""
    nilai = nilai.strip()
    m = re.fullmatch(r"(-?[\d.]+)(px|rem|em)?", nilai)
    if not m:
        return None
    angka = float(m.group(1))
    satuan = m.group(2) or "px"
    if satuan == "px":
        return angka
    # `em` diperlakukan seperti `rem`: keduanya hanya muncul pada elemen
    # yang tidak mengubah ukuran hurufnya sendiri di berkas ini.
    return angka * REM


def _blok(teks: str, pemilih: str) -> str | None:
    """
    Isi blok pertama untuk `pemilih`, dibaca sampai kurung SEIMBANG.

    Berhenti di kurung pertama akan memotong blok yang memuat sarang
    seperti `&:hover` — dan pemotongan itu membuat deklarasi sesudahnya
    tidak pernah terlihat, yaitu persis kegagalan diam yang hendak
    dicegah pemeriksa ini.
    """
    pola = re.compile(r"(?m)^\s*" + re.escape(pemilih) + r"\s*\{")
    m = pola.search(teks)
    if m is None:
        return None
    i = m.end()
    dalam = 1
    while i < len(teks) and dalam:
        if teks[i] == "{":
            dalam += 1
        elif teks[i] == "}":
            dalam -= 1
        i += 1
    return teks[m.end(): i - 1]


def _dek(blok: str, nama: str) -> str | None:
    """Nilai deklarasi `nama` di dalam satu blok."""
    m = re.search(r"(?m)^\s*" + re.escape(nama) + r"\s*:\s*([^;]+);", blok)
    return m.group(1).strip() if m else None


def _media(teks: str, kondisi: str) -> str:
    """Isi seluruh blok `@media` yang kondisinya memuat `kondisi`."""
    hasil = []
    for m in re.finditer(r"@media\s*\(([^)]*)\)\s*\{", teks):
        if kondisi not in m.group(1).replace(" ", ""):
            continue
        i = m.end()
        dalam = 1
        while i < len(teks) and dalam:
            if teks[i] == "{":
                dalam += 1
            elif teks[i] == "}":
                dalam -= 1
            i += 1
        hasil.append(teks[m.end(): i - 1])
    return "\n".join(hasil)


def periksa() -> list[str]:
    masalah: list[str] = []

    depan = open(DEPAN_SCSS, encoding="utf-8").read()
    html = open(DEPAN_HTML, encoding="utf-8").read()
    kerja = open(KERJA_SCSS, encoding="utf-8").read()

    # 1. bulatan pemilih warna
    blok = _blok(depan, ".exl-palet__tombol")
    if blok is None:
        masalah.append(
            "`.exl-palet__tombol` tidak ditemukan di exam-landing SCSS — "
            "pemilih warnanya berganti nama, dan ukuran sentuhnya tidak "
            "lagi terjaga"
        )
    else:
        for sisi in ("width", "height"):
            mentah = _dek(blok, sisi)
            if mentah is None:
                masalah.append(
                    f"`.exl-palet__tombol` tidak menyatakan `{sisi}` — "
                    f"ukurannya kembali mengikuti isinya (bulatan 22px)"
                )
                continue
            px = _px(mentah)
            if px is None:
                masalah.append(
                    f"`.exl-palet__tombol` `{sisi}: {mentah}` tidak dapat "
                    f"diukur dari kode; ukurlah di peramban lalu ganti "
                    f"nilainya menjadi px/rem"
                )
            elif px < AMBANG:
                masalah.append(
                    f"`.exl-palet__tombol` `{sisi}: {mentah}` = {px:.0f}px, "
                    f"di bawah {AMBANG:.0f}px — terlalu kecil untuk jari"
                )

    # 2. warnanya pada anaknya, bukan pada tombolnya
    m = re.search(
        r"<button[^>]*class=\"exl-palet__tombol\"(.*?)</button>",
        html,
        re.S,
    )
    if m is None:
        masalah.append(
            "tombol `.exl-palet__tombol` tidak ditemukan di exam-landing "
            "HTML"
        )
    else:
        isi = m.group(1)
        atribut = isi.split(">", 1)[0]
        if "[style.background]" in atribut:
            masalah.append(
                "warna palet diikat pada TOMBOLNYA (`[style.background]`) — "
                "bidang sentuh 44px itu ikut berwarna, dan bulatan kecilnya "
                "hilang; ikatkan pada `span.exl-palet__bulat` di dalamnya"
            )
        if "exl-palet__bulat" not in isi:
            masalah.append(
                "`span.exl-palet__bulat` tidak ada di dalam tombol palet — "
                "tanpa itu, bidang sentuh 44px tidak punya bulatan untuk "
                "diwarnai"
            )

    # 3. tombol "coba lagi" pada peranti sentuh
    kasar = _media(kerja, "pointer:coarse")
    if not kasar:
        masalah.append(
            "exam-work SCSS tidak punya blok `@media (pointer: coarse)` — "
            "tombol `coba lagi` kembali seukuran teksnya di ponsel"
        )
    else:
        blok_ulang = _blok(kasar, ".exw-simpan__ulang")
        if blok_ulang is None:
            masalah.append(
                "`.exw-simpan__ulang` tidak disebut di dalam "
                "`@media (pointer: coarse)` — sasaran sentuhnya tidak "
                "diperbesar di ponsel"
            )
        else:
            mentah = _dek(blok_ulang, "min-height")
            px = _px(mentah) if mentah else None
            if mentah is None:
                masalah.append(
                    "`.exw-simpan__ulang` tidak menyatakan `min-height` di "
                    "peranti sentuh"
                )
            elif px is None:
                masalah.append(
                    f"`.exw-simpan__ulang` `min-height: {mentah}` tidak "
                    f"dapat diukur dari kode"
                )
            elif px < AMBANG:
                masalah.append(
                    f"`.exw-simpan__ulang` `min-height: {mentah}` = "
                    f"{px:.0f}px, di bawah {AMBANG:.0f}px"
                )

    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"sasaran sentuh halaman ujian: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"sasaran sentuh halaman ujian: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
