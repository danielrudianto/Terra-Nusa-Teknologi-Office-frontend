#!/usr/bin/env python3
"""
Layar yang punya DUA cakupan tidak boleh menyebut angkanya tanpa cakupan.

Laporan proyek sekarang memuat dua angka biaya yang bentuknya sama persis:

    biayaSeumurProyek — pasangan margin, tidak pernah disaring tahun;
    biayaPeriode      — biaya tahun terpilih, yang tampil sebagai aktivitas.

Keduanya rupiah, keduanya positif, keduanya besar. Tidak ada yang terlihat
salah bila tertukar — margin sepotong tahun terhadap kontrak utuh menghasilkan
angka yang menyenangkan dan tidak berarti apa pun, dan tidak ada galat yang
muncul untuk memberitahunya.

Sebelum saringan tahun ada, keduanya satu angka bernama `totalBiaya`. Nama itu
tidak menyebutkan cakupannya, dan itulah yang membuat tertukarnya mungkin:
setiap pemakaian harus ditebak dari sekitarnya. Nama itu karena itu DILARANG
kembali di layar ini.

Tiga aturan:

  1. `totalBiaya` tidak boleh muncul lagi di komponen maupun templatnya;
  2. batang "kontrak terpakai" dan margin harus memakai `biayaSeumurProyek`,
     tidak pernah `biayaPeriode`;
  3. muatan unduhan harus membawa `periode` DAN `biayaPeriode` — berkas yang
     beredar tidak membawa konteks layar, dan rincian yang tersaring tanpa
     keterangan periode terbaca sebagai rincian seumur proyek.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
LAPORAN = AKAR / "src" / "app" / "pages" / "project" / "project-report"

TS = LAPORAN / "project-report.component.ts"
HTML = LAPORAN / "project-report.component.html"

#: Nama yang tidak menyebutkan cakupannya.
#:
#: Dicari sebagai kata utuh: `biayaSeumurProyek` dan `biayaPeriode` tidak
#: boleh ikut tertangkap, dan begitu pula `totalBiayaLain` kalau kelak ada.
TANPA_CAKUPAN = re.compile(r"\btotalBiaya\b")

#: Angka yang berpasangan dengan kontrak; selalu seumur proyek.
BERPASANGAN_KONTRAK = re.compile(r"persenKontrak\(\s*biayaPeriode\(\)")


def tanpa_komentar(teks: str) -> str:
    """Buang komentar sebelum memeriksa.

    Berkas ini penuh penjelasan yang MENYEBUT `totalBiaya` sebagai nama lama.
    Tanpa pembuangan ini, penjelasan itu sendiri yang ditandai sebagai
    pelanggaran — dan pemeriksa yang menuduh komentarnya sendiri akan
    dimatikan orang, bukan diperbaiki.
    """
    teks = re.sub(r"/\*.*?\*/", "", teks, flags=re.S)
    teks = re.sub(r"<!--.*?-->", "", teks, flags=re.S)
    return re.sub(r"//.*$", "", teks, flags=re.M)


def periksa_nama(berkas: Path) -> list[str]:
    if not berkas.exists():
        return [f"{berkas.relative_to(AKAR)}: berkas tidak ditemukan"]

    teks = tanpa_komentar(berkas.read_text(encoding="utf-8", errors="ignore"))
    temuan = []
    for m in TANPA_CAKUPAN.finditer(teks):
        baris = teks[: m.start()].count("\n") + 1
        temuan.append(
            f"{berkas.relative_to(AKAR)}:{baris}: `totalBiaya` tidak "
            f"menyebutkan cakupannya — pakai `biayaSeumurProyek` (pasangan "
            f"margin) atau `biayaPeriode` (tahun terpilih)"
        )
    return temuan


def periksa_pasangan_kontrak() -> list[str]:
    if not HTML.exists():
        return []
    teks = tanpa_komentar(HTML.read_text(encoding="utf-8", errors="ignore"))

    temuan = []
    for m in BERPASANGAN_KONTRAK.finditer(teks):
        baris = teks[: m.start()].count("\n") + 1
        temuan.append(
            f"{HTML.relative_to(AKAR)}:{baris}: porsi terhadap NILAI KONTRAK "
            f"dihitung dari biaya tahun terpilih — kontraknya utuh, jadi "
            f"porsinya tidak pernah mendekati 100% dan peringatan "
            f"'melampaui kontrak' tidak pernah muncul"
        )

    # Batang kontrak terpakai harus benar-benar ada dan memakai angka seumur
    # proyek; hilangnya bukan sekadar berubah, melainkan peringatannya lenyap.
    if "persenKontrak(biayaSeumurProyek())" not in teks:
        temuan.append(
            f"{HTML.relative_to(AKAR)}: batang 'kontrak terpakai' tidak lagi "
            f"dihitung dari `biayaSeumurProyek()` — periksa apakah "
            f"peringatan melampaui kontrak masih bisa muncul"
        )
    return temuan


def periksa_unduhan() -> list[str]:
    if not TS.exists():
        return []
    teks = tanpa_komentar(TS.read_text(encoding="utf-8", errors="ignore"))

    m = re.search(r"dataUnduhan\(\)\s*:\s*DataLaporanProyek\s*\{", teks)
    if not m:
        return [
            f"{TS.relative_to(AKAR)}: `dataUnduhan()` tidak ditemukan — "
            f"pemeriksa ini tidak dapat memastikan berkas unduhannya membawa "
            f"keterangan periode"
        ]

    # Badan fungsinya diambil dengan menghitung kurung kurawal; memotong pada
    # `}` pertama akan berhenti di objek bersarang di dalamnya.
    i = teks.index("{", m.start())
    dalam = 0
    for j in range(i, len(teks)):
        if teks[j] == "{":
            dalam += 1
        elif teks[j] == "}":
            dalam -= 1
            if dalam == 0:
                badan = teks[i : j + 1]
                break
    else:
        return [f"{TS.relative_to(AKAR)}: badan `dataUnduhan()` tidak utuh"]

    temuan = []
    for kunci, sebab in (
        ("periode:", "berkasnya tidak menyebutkan periode mana yang dimuatnya"),
        (
            "biayaPeriode:",
            "porsi kategori di berkasnya dibagi biaya seumur proyek, sehingga "
            "jumlah seluruh porsinya tidak lagi seratus persen",
        ),
    ):
        if kunci not in badan:
            temuan.append(
                f"{TS.relative_to(AKAR)}: `dataUnduhan()` tidak mengirim "
                f"`{kunci.rstrip(':')}` — {sebab}"
            )
    return temuan


def main() -> int:
    semua = []
    semua.extend(periksa_nama(TS))
    semua.extend(periksa_nama(HTML))
    semua.extend(periksa_pasangan_kontrak())
    semua.extend(periksa_unduhan())

    if semua:
        print("cakupancek: angka biaya dipakai tanpa cakupan yang jelas")
        for t in semua:
            print("  " + t)
        return 1

    print("cakupancek: kedua angka biaya laporan proyek menyebut cakupannya")
    return 0


if __name__ == "__main__":
    sys.exit(main())
