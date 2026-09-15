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
"""

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"

# `Chart.register(...registerables)` — spasi bebas, dan boleh ada argumen
# lain di sekitarnya.
DAFTAR = re.compile(r"Chart\s*\.\s*register\s*\(\s*\.\.\.\s*registerables")
# Impor nilai `Chart` dan `registerables` dari chart.js. Sekadar memanggil
# `Chart.register` tidak cukup kalau yang diimpor ternyata cuma tipe:
# `import { type Chart }` menghilang saat dikompilasi.
IMPOR = re.compile(r"from\s+['\"]chart\.js['\"]")


def _impor_chartjs(isi: str) -> str:
    """Isi kurung kurawal pada baris impor dari 'chart.js', digabung."""
    potongan = []
    for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s+['\"]chart\.js['\"]", isi):
        potongan.append(m.group(1))
    return ",".join(potongan)


def periksa() -> list[str]:
    temuan: list[str] = []

    for html in sorted(AKAR.rglob("*.component.html")):
        isi_html = html.read_text(encoding="utf-8")
        if "baseChart" not in isi_html:
            continue

        ts = html.with_suffix(".ts")
        if not ts.exists():
            temuan.append(f"{html.relative_to(AKAR)}: memakai baseChart tetapi berkas .ts pasangannya tidak ada")
            continue

        isi_ts = ts.read_text(encoding="utf-8")
        rel = ts.relative_to(AKAR)

        if not DAFTAR.search(isi_ts):
            temuan.append(
                f"{rel}: templatenya memakai `baseChart` tetapi tidak ada "
                f"`Chart.register(...registerables)`. Kanvasnya akan KOSONG "
                f"tanpa galat pada halaman yang dibuka tanpa halaman grafik "
                f"lain disentuh lebih dulu."
            )
            continue

        if not IMPOR.search(isi_ts):
            temuan.append(f"{rel}: memanggil `Chart.register` tetapi tidak mengimpor apa pun dari 'chart.js'")
            continue

        impor = _impor_chartjs(isi_ts)
        for nama in ("Chart", "registerables"):
            # `type Chart` / `type registerables` menghilang saat dikompilasi;
            # yang tersisa adalah panggilan ke sesuatu yang tidak ada.
            if re.search(rf"\btype\s+{nama}\b", impor):
                temuan.append(f"{rel}: `{nama}` diimpor sebagai TIPE; nilainya tidak ikut terbawa ke hasil kompilasi")
            elif not re.search(rf"\b{nama}\b", impor):
                temuan.append(f"{rel}: `{nama}` tidak diimpor dari 'chart.js'")

    return temuan


def main() -> int:
    temuan = periksa()
    if temuan:
        print("Pendaftaran chart.js yang hilang:\n")
        for t in temuan:
            print(f"  - {t}")
        print(
            "\nTambahkan di tingkat modul (di luar kelas), sesudah impornya:\n"
            "\n    import { Chart, registerables } from 'chart.js';\n"
            "    Chart.register(...registerables);\n"
        )
        return 1

    print("Pendaftaran chart.js: semua komponen grafik mendaftarkannya sendiri.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
