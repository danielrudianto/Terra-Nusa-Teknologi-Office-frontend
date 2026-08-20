#!/usr/bin/env python3
"""
Biaya proyek dihitung di SATU tempat.

Layar laporan proyek pernah menjumlahkan `dpp + PPN + PBBKB + nilai lain`
sementara daftar margin dan servernya menjumlahkan `dpp` saja. Keduanya
menyebut hasilnya "margin", keduanya tidak pernah menimbulkan galat, dan
bedanya baru ketahuan ketika satu proyek dibuka dari daftarnya: 55.308.999 di
daftar, 4.936.467 di dalamnya — pada proyek yang sama, di hari yang sama.

Penjaga ini memastikan tidak ada layar proyek yang menghitungnya sendiri lagi,
dan bahwa rumus bersamanya memang masih DPP saja.

    python3 scripts/pemeriksa/nilaibiayacek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]

HELPER = "src/app/helpers/nilai-biaya.helper.ts"

#: Layar dan pembangun berkas yang menghitung biaya atau margin proyek.
CAKUPAN = [
    "src/app/pages/project",
    "src/app/helpers/project-report-download.ts",
]

#: DPP dikalikan PPN — persis rumus yang menyebabkan selisihnya.
PPN_ATAS_DPP = re.compile(
    r"(dpp[^;\n]{0,60}\*[^;\n]{0,60}ppn|ppn[^;\n]{0,60}\*[^;\n]{0,60}dpp)",
    re.I,
)

#: PBBKB dan nilai lain ditambahkan sebagai biaya tersendiri.
TAMBAHAN_BIAYA = re.compile(r"\b(pbbkb|otherValue)\b")

#: Yang MEMANG boleh memuatnya: nilai kontrak dan faktur ditampilkan berikut
#: PPN-nya di sebelah nilai DPP-nya, dan itu memang dua angka yang berbeda —
#: yang dilarang adalah memakainya sebagai BIAYA.
DIKECUALIKAN = {
    # Nilai kontrak kotor, ditampilkan berdampingan dengan DPP-nya.
    "src/app/pages/project/contract-view/contract-view.component.ts",
    "src/app/pages/project/project-view/project-view.component.ts",
}


def berkas_dalam_cakupan() -> list[Path]:
    hasil: list[Path] = []
    for c in CAKUPAN:
        p = AKAR / c
        if p.is_dir():
            hasil.extend(sorted(p.rglob("*.ts")))
        elif p.is_file():
            hasil.append(p)
    return hasil


#: Satu-satunya rumus di helper yang BOLEH memuat PPN: nominal tagihan kotor,
#: yang hanya ditampilkan dan tidak pernah dibandingkan dengan biaya.
BOLEH_BER_PPN = {"nilaiTagihanKotor"}

DEKLARASI = re.compile(r"^export function (\w+)")


def periksa_helper() -> list[str]:
    """Rumus BIAYA-nya masih DPP saja, bukan sesuatu yang lain."""
    f = AKAR / HELPER
    if not f.is_file():
        return [f"{HELPER}: rumus bersamanya hilang."]

    salah: list[str] = []
    fungsi = ""
    diperiksa = 0
    for no, baris in enumerate(f.read_text().split("\n"), 1):
        d = DEKLARASI.match(baris)
        if d:
            fungsi = d.group(1)
            diperiksa += 1
        telanjang = baris.lstrip()
        if telanjang.startswith(("*", "//", "/*")):
            continue
        if fungsi in BOLEH_BER_PPN:
            continue
        if PPN_ATAS_DPP.search(baris) or TAMBAHAN_BIAYA.search(baris):
            salah.append(f"{HELPER}:{no}: {baris.strip()[:80]} [{fungsi}]")

    if diperiksa < 4:
        salah.append(
            f"{HELPER}: hanya {diperiksa} rumus terbaca; perbaiki pemeriksanya."
        )
    return salah


def main() -> int:
    temuan: list[str] = []
    diperiksa = 0

    for f in berkas_dalam_cakupan():
        rel = str(f.relative_to(AKAR))
        if rel.endswith(".spec.ts") or rel in DIKECUALIKAN:
            continue
        diperiksa += 1
        for no, baris in enumerate(f.read_text().split("\n"), 1):
            telanjang = baris.lstrip()
            if telanjang.startswith(("*", "//", "/*")):
                continue
            if PPN_ATAS_DPP.search(baris) or TAMBAHAN_BIAYA.search(baris):
                temuan.append(f"{rel}:{no}: {baris.strip()[:80]}")

    rusak = periksa_helper()

    print(f"nilaibiayacek: {diperiksa} berkas layar proyek diperiksa")
    if diperiksa < 5:
        print("\nGAGAL MEMBACA: terlalu sedikit berkas; perbaiki pemeriksanya.")
        return 2

    if rusak:
        print("\nRumus bersamanya sendiri tidak lagi DPP saja:\n")
        for t in rusak:
            print(f"  - {t}")
        print(
            "\nBila dasarnya memang hendak diubah, ubah di situ — dan ubah pula\n"
            "`margin_summary` di server, kalau tidak keduanya berbeda lagi."
        )
        return 1

    if not temuan:
        print("bersih — seluruh biaya proyek lewat `nilai-biaya.helper.ts`.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        "\nPakai `biayaPembelian()`, `biayaDraft()`, `biayaReimbursement()`,\n"
        "dan `nilaiTagihan()` dari `helpers/nilai-biaya.helper.ts`. PPN masukan\n"
        "dapat dikreditkan, jadi ia bukan biaya proyek; PBBKB dan nilai lain\n"
        "sudah termasuk pada DPP-nya."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
