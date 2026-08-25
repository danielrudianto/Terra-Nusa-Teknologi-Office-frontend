#!/usr/bin/env python3
"""
Keseragaman halaman DAFTAR.

Ditulis karena keseragaman layar tidak pernah gagal dengan bersuara: sebuah
tombol yang letaknya berpindah, kotak pencarian yang menempel kiri, atau
kepala kolom yang bentuknya lain sama sekali tidak menghasilkan galat, tidak
menggagalkan build, dan tidak menyentuh satu pun uji. Ia hanya ditemukan
orang yang memakainya sepanjang hari — satu layar per keluhan, berbulan-bulan.

Tiga aturan yang diperiksa, ketiganya diambil dari daftar Pembelian dan
Purchase Order yang menjadi acuan:

  1. Tombol "buat baru" berada di slot `app-header-title`, bukan di bilah
     alat. Bilah alat hanya berisi penyaring, pencarian, dan muat ulang.

  2. Bila ada keping penyaring, urutannya keping → pencarian → muat ulang.

  3. Tombol muat ulang berhenti di TEPI KANAN — entah lewat dorongan
     `margin-left: auto` atau karena pencariannya memang memanjang
     (`flex: 1`). Tanpa salah satunya ia menggerombol di kiri.

Keluar dengan kode 1 bila ada yang menyimpang, sehingga dapat dipasang di
alur pemeriksaan.
"""

from __future__ import annotations

import glob
import os
import re
import sys

AKAR = os.path.join(os.path.dirname(__file__), "..", "..")


def tanpa_komentar(teks: str) -> str:
    """Kelas yang disebut di dalam penjelasan bukan markah."""
    return re.sub(r"<!--.*?-->", "", teks, flags=re.S)


def halaman_daftar() -> list[tuple[str, str, str]]:
    """(html, scss, nama) untuk tiap layar daftar yang punya tombol muat ulang."""
    keluar = []
    pola = os.path.join(AKAR, "src", "app", "pages", "**", "*.component.html")
    for html in sorted(glob.glob(pola, recursive=True)):
        isi = open(html, encoding="utf-8").read()
        if "app-refresh-button" not in isi or "mat-table" not in isi:
            continue
        scss = html.replace(".html", ".scss")
        if not os.path.exists(scss):
            continue
        nama = html.split("pages/", 1)[1].replace(".component.html", "")
        keluar.append((html, scss, nama))
    return keluar


def periksa(html: str, scss: str, nama: str) -> list[str]:
    mentah = open(html, encoding="utf-8").read()
    s = tanpa_komentar(mentah)
    css = open(scss, encoding="utf-8").read()
    galat: list[str] = []

    m = re.search(r'class="([a-z]+)-toolbar', s)
    if not m:
        return galat
    p = m.group(1)

    # --- 1. tombol buat baru ---------------------------------------------
    tanpa_kepala = re.sub(
        r"<app-header-title\b.*?(?:/>|</app-header-title>)", "", s, flags=re.S
    )
    if re.search(r'class="[a-z-]*\badd\b[^"]*"|class="[a-z]+-btn--brand"', tanpa_kepala):
        galat.append('tombol "buat baru" masih di bilah alat, bukan di header-title')

    # --- 2. urutan bilah alat --------------------------------------------
    i = s.index(m.group(0))
    batas = s.find(f"{p}-card", i)
    blok = s[i : batas if batas > i else i + 4000]
    urut = [
        x.group(1)
        for x in re.finditer(
            r"<(mat-chip-listbox|mat-form-field|app-refresh-button)\b", blok
        )
    ]
    # Urutan LENGKAP, tombol ikut dihitung.
    #
    # `urut` di atas sengaja tidak memuat `<button>` karena hanya dipakai
    # membandingkan kedudukan keping terhadap pencarian. Untuk memeriksa
    # apakah pencarian benar-benar BERSEBELAHAN dengan muat ulang, tombol
    # harus ikut: tanpa itu sebuah bilah alat berisi pencarian, dua tombol,
    # lalu muat ulang terbaca seolah pencarian dan muat ulang berdampingan
    # — dan susunan yang keliru lolos tanpa satu pun keluhan.
    urut_penuh = [
        x.group(1)
        for x in re.finditer(
            r"<(mat-chip-listbox|mat-form-field|app-refresh-button|button)\b", blok
        )
    ]
    ada_tombol_lain = "button" in urut_penuh
    # Yang dihitung sebagai PENCARIAN hanya isian yang memang bernama
    # demikian. Interpayment memakai `ip-range` — sebuah rentang tanggal,
    # yaitu penyaring, dan penyaring tempatnya di KIRI.
    ada_kotak_cari = f'class="{p}-search' in blok
    if "mat-chip-listbox" in urut and "mat-form-field" in urut:
        if urut.index("mat-chip-listbox") > urut.index("mat-form-field"):
            galat.append(
                "pencarian mendahului keping penyaring; urutannya harus "
                "keping → pencarian → muat ulang"
            )

    # --- 3. pencarian di kanan, muat ulang di kanannya lagi ---------------
    #
    # Dorongannya harus dipasang pada KOTAK PENCARIAN, bukan pada tombol
    # muat ulang.
    #
    # Keduanya sama-sama menghasilkan "ada yang menempel tepi kanan",
    # sehingga pemeriksaan yang menerima keduanya lulus untuk susunan yang
    # justru keliru — itu yang terjadi pada putaran sebelumnya. Dipasang di
    # tombolnya, hanya tombol itu yang terbang ke kanan; kotak pencarian
    # tertinggal di kiri dan keduanya terpisah ruang kosong selebar layar.
    #
    # Berlaku untuk SETIAP bilah alat yang punya kotak pencarian, termasuk
    # yang di dalamnya ada tombol lain. Membatasinya pada bilah alat
    # sesederhana "pencarian lalu muat ulang" membuat Master Barang — yang
    # punya tombol saring dan impor — lolos tanpa diperiksa sama sekali,
    # padahal di situlah pencariannya tertinggal paling jauh di kiri.
    pakai_campuran = "@include daftar.daftar" in css
    punya_pencarian = ada_kotak_cari and "app-refresh-button" in urut

    # Bilah alat yang isiannya PENYARING, bukan pencarian: penyaringnya
    # tinggal di kiri dan tombol muat ulanglah yang didorong ke kanan.
    if not pakai_campuran and not ada_kotak_cari and not ada_tombol_lain:
        if not re.search(
            rf"\.{p}-toolbar\s+app-refresh-button[^{{]*\{{[^}}]*margin-left:\s*auto",
            css,
        ) and not re.search(rf"\.{p}-toolbar\s*>\s*\*:nth-child\(2\)", css):
            galat.append(
                "tombol muat ulang tidak terdorong ke tepi kanan (bilah alat "
                "ini berisi penyaring, bukan pencarian)"
            )

    if not pakai_campuran and punya_pencarian:
        # Pencarian harus BERSEBELAHAN dengan muat ulang. Tombol lain boleh
        # ada, tetapi tempatnya sebelum pencarian — bukan menyelip di antara
        # keduanya, yang membuat dua kendali yang dipakai berurutan
        # terpisah oleh tombol yang tidak ada hubungannya.
        if urut_penuh[-2:] != ["mat-form-field", "app-refresh-button"]:
            galat.append(
                "pencarian tidak berdiri tepat sebelum tombol muat ulang; "
                f"urutan bilah alat: {' → '.join(urut_penuh)}"
            )

        # SELURUH aturan yang selektornya persis `.{p}-search` dikumpulkan,
        # bukan yang pertama ditemukan. Kelas itu muncul berkali-kali —
        # antara lain pada `:host ::ng-deep .el-search .mat-mdc-...` yang
        # menata bagian dalam kotaknya — dan mengambil yang pertama
        # membuat halaman yang sudah benar dilaporkan menyimpang.
        badan_cari = "\n".join(
            m.group(1)
            for m in re.finditer(rf"(?m)^\s*\.{p}-search\s*\{{([^}}]*)\}}", css)
        )
        # `flex: 1 …` berarti kotaknya TUMBUH mengisi sisa ruang, sehingga
        # muat ulang terdorong ke kanan dengan sendirinya. `flex: 0 1 400px`
        # tidak tumbuh — halaman semacam itu memerlukan `margin-left: auto`.
        cari_didorong = bool(re.search(r"margin-left:\s*auto", badan_cari))
        cari_memanjang = bool(re.search(r"flex:\s*1\b", badan_cari))

        # Cara ketiga: mendorong lewat urutan anak, seperti campuran
        # `daftar` dan beberapa halaman yang menyalinnya. Sah, selama yang
        # didorong bukan tombol muat ulangnya.
        lewat_urutan = bool(re.search(rf"\.{p}-toolbar\s*>\s*\*:nth-child\(\d+\)", css))

        segar_didorong = bool(
            re.search(
                rf"\.{p}-toolbar\s+app-refresh-button[^{{]*\{{[^}}]*margin-left:\s*auto",
                css,
            )
        )

        if segar_didorong and not (cari_didorong or cari_memanjang):
            galat.append(
                "dorongan kanan dipasang pada tombol muat ulang, bukan pada "
                "kotak pencarian — tombolnya terbang ke kanan sendirian dan "
                "pencarian tertinggal di kiri"
            )
        elif not (cari_didorong or cari_memanjang or lewat_urutan):
            galat.append(
                "kotak pencarian tidak terdorong ke tepi kanan; muat ulang "
                "seharusnya mengikutinya"
            )

    return galat


def main() -> int:
    total = 0
    menyimpang = 0
    for html, scss, nama in halaman_daftar():
        total += 1
        galat = periksa(html, scss, nama)
        if galat:
            menyimpang += 1
            print(f"\n{nama}")
            for g in galat:
                print(f"  - {g}")

    print(f"\n{total} halaman daftar diperiksa, {menyimpang} menyimpang.")
    return 1 if menyimpang else 0


if __name__ == "__main__":
    sys.exit(main())
