#!/usr/bin/env python3
"""
Setiap komponen yang menggambar grafik WAJIB mendaftarkan chart.js sendiri.

Kekeliruan yang dijaga di sini sudah terjadi, dan tidak menghasilkan galat
apa pun.

chart.js v4 tidak mendaftarkan apa-apa dengan sendirinya. Tanpa
`Chart.register(...registerables)`, `type: 'line'` tidak punya controller:
kanvasnya tetap dipasang, tingginya tetap seperti yang diatur CSS, dan yang
terlihat adalah KOTAK KOSONG. Tidak ada pesan di layar, tidak ada galat di
konsol, dan build-nya bersih — karena yang diimpor komponen itu hanya
TIPE-nya (`ChartConfiguration`, `ChartData`), dan tipe menghilang saat
dikompilasi.

Yang membuatnya menipu: pendaftaran itu berlaku untuk seluruh aplikasi.
Begitu satu halaman grafik pernah dibuka, modulnya termuat dan grafik di
halaman lain ikut jalan. Jadi komponen yang lupa mendaftarkannya TETAP
tampak benar selama diuji sesudah membuka halaman grafik yang lain — dan
kosong hanya bagi orang yang membuka halamannya lebih dulu. Persis yang
terjadi pada kartu proyeksi kas di kalender.

Uji Karma pun tidak dapat menangkapnya: yang gagal bukan datanya melainkan
penggambarannya, dan tidak ada yang melempar.

DI TINGKAT MODUL, bukan di dalam kelas. Panggilan di `ngOnInit` berjalan
SESUDAH Angular membuat direktif grafiknya, jadi grafik pertama tetap
digambar tanpa controller.
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"
PEMBANTU = AKAR / "helpers" / "chart-dasar.helper.ts"

# Pendaftaran langsung, atau lewat pembantu bersama.
LANGSUNG = re.compile(r"^Chart\s*\.\s*register\s*\(\s*\.\.\.\s*registerables", re.M)
PEMBANTU_PANGGIL = re.compile(r"^pastikanChart\s*\(\s*\)\s*;", re.M)

IMPOR_CHARTJS = re.compile(r"import\s*\{([^}]*)\}\s*from\s+['\"]chart\.js['\"]")
IMPOR_PEMBANTU = re.compile(
    r"import\s*\{([^}]*)\}\s*from\s+['\"][^'\"]*chart-dasar\.helper['\"]"
)


def _tanpa_komentar(isi: str) -> str:
    """
    Membuang komentar `/* */` dan `//`, mempertahankan jumlah barisnya.

    Wajib. Berkas-berkas ini MENJELASKAN pendaftaran chart.js di dalam
    komentarnya — `Tanpa \\`Chart.register(...registerables)\\`, ...` — dan
    pencarian teks biasa menganggap penjelasan itu sebagai pendaftarannya.
    Pemeriksa yang membaca komentar selalu hijau, dan pemeriksa yang selalu
    hijau tidak menjaga apa pun.
    """
    keluar = []
    i = 0
    n = len(isi)
    while i < n:
        dua = isi[i : i + 2]
        if dua == "/*":
            j = isi.find("*/", i + 2)
            j = n if j == -1 else j + 2
            keluar.append("\n" * isi.count("\n", i, j))
            i = j
        elif dua == "//":
            j = isi.find("\n", i)
            i = n if j == -1 else j
        elif isi[i] in "'\"`":
            kutip = isi[i]
            keluar.append(isi[i])
            i += 1
            while i < n and isi[i] != kutip:
                if isi[i] == "\\" and i + 1 < n:
                    keluar.append(isi[i])
                    keluar.append(isi[i + 1])
                    i += 2
                    continue
                if isi[i] == "\n" and kutip != "`":
                    break
                keluar.append(isi[i])
                i += 1
            if i < n:
                keluar.append(isi[i])
                i += 1
        else:
            keluar.append(isi[i])
            i += 1
    return "".join(keluar)


def _gabung(pola: re.Pattern, isi: str) -> str:
    return ",".join(m.group(1) for m in pola.finditer(isi))


def _periksa_impor_nilai(isi_impor: str, nama: str, rel, temuan: list[str]) -> None:
    """`import { type X }` menghilang saat dikompilasi — nilainya tidak terbawa."""
    if re.search(rf"\btype\s+{nama}\b", isi_impor):
        temuan.append(
            f"{rel}: `{nama}` diimpor sebagai TIPE; nilainya tidak ikut "
            f"terbawa ke hasil kompilasi, dan panggilannya jadi tidak ada."
        )
    elif not re.search(rf"\b{nama}\b", isi_impor):
        temuan.append(f"{rel}: `{nama}` tidak diimpor")


def periksa() -> list[str]:
    temuan: list[str] = []

    # Pembantunya sendiri harus benar-benar mendaftarkan; kalau tidak,
    # seluruh komponen yang memanggilnya lolos pemeriksaan tanpa pernah
    # mendaftarkan apa pun.
    if PEMBANTU.exists():
        isi_p = _tanpa_komentar(PEMBANTU.read_text(encoding="utf-8"))
        if not re.search(r"Chart\s*\.\s*register\s*\(\s*\.\.\.\s*registerables", isi_p):
            temuan.append(
                "helpers/chart-dasar.helper.ts: `pastikanChart()` tidak "
                "memanggil `Chart.register(...registerables)`; setiap "
                "komponen yang memakainya akan menggambar kanvas kosong."
            )

    for html in sorted(AKAR.rglob("*.component.html")):
        if "baseChart" not in html.read_text(encoding="utf-8"):
            continue

        ts = html.with_suffix(".ts")
        if not ts.exists():
            temuan.append(
                f"{html.relative_to(AKAR)}: memakai baseChart tetapi berkas "
                f".ts pasangannya tidak ada"
            )
            continue

        isi = _tanpa_komentar(ts.read_text(encoding="utf-8"))
        rel = ts.relative_to(AKAR)

        lewat_pembantu = bool(PEMBANTU_PANGGIL.search(isi))
        langsung = bool(LANGSUNG.search(isi))

        if not lewat_pembantu and not langsung:
            # Dipanggil, tetapi tidak di tingkat modul?
            if re.search(r"pastikanChart\s*\(\s*\)", isi) or re.search(
                r"Chart\s*\.\s*register", isi
            ):
                temuan.append(
                    f"{rel}: pendaftaran chart.js ada tetapi TIDAK di tingkat "
                    f"modul (barisnya menjorok, jadi ia di dalam kelas atau "
                    f"fungsi). Panggilan di dalam `ngOnInit` berjalan sesudah "
                    f"direktif grafiknya dibuat — grafik pertamanya tetap "
                    f"kosong."
                )
            else:
                temuan.append(
                    f"{rel}: templatenya memakai `baseChart` tetapi tidak "
                    f"mendaftarkan chart.js. Kanvasnya akan KOSONG tanpa galat "
                    f"pada halaman yang dibuka tanpa halaman grafik lain "
                    f"disentuh lebih dulu."
                )
            continue

        if lewat_pembantu:
            impor = _gabung(IMPOR_PEMBANTU, isi)
            if not impor:
                temuan.append(
                    f"{rel}: memanggil `pastikanChart()` tetapi tidak "
                    f"mengimpornya dari `chart-dasar.helper`"
                )
            else:
                _periksa_impor_nilai(impor, "pastikanChart", rel, temuan)

        if langsung:
            impor = _gabung(IMPOR_CHARTJS, isi)
            if not impor:
                temuan.append(
                    f"{rel}: memanggil `Chart.register` tetapi tidak mengimpor "
                    f"apa pun dari 'chart.js'"
                )
            else:
                for nama in ("Chart", "registerables"):
                    _periksa_impor_nilai(impor, nama, rel, temuan)

    return temuan


def main() -> int:
    temuan = periksa()
    if temuan:
        print("Pendaftaran chart.js yang hilang:\n")
        for t in temuan:
            print(f"  - {t}")
        print(
            "\nTambahkan di tingkat modul (kolom pertama, di luar kelas):\n"
            "\n    import { pastikanChart } from 'src/app/helpers/chart-dasar.helper';\n"
            "    pastikanChart();\n"
        )
        return 1

    print("Pendaftaran chart.js: semua komponen grafik mendaftarkannya sendiri.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
