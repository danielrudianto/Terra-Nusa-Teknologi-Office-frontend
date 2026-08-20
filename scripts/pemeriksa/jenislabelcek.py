#!/usr/bin/env python3
"""
Nama jenis purchase order harus mengikuti BAHASA APLIKASI.

Ada dua sumber nama jenis, dan hanya salah satunya benar untuk dipakai:

    PURCHASE_TYPE_LABELS   peta tetap berbahasa INGGRIS
    purchaseTypeLabel(t,k) terjemahan, mengikuti bahasa yang sedang dipakai

Yang pertama memang perlu ada — ia cadangan bagi kode jenis yang belum punya
terjemahan, sehingga yang muncul teks Inggris alih-alih kunci mentah seperti
"poType.tG". Tetapi memakainya LANGSUNG membuat satu kolom berbunyi "Project
supporting equipment and supplies" di tengah dokumen yang seluruhnya
berbahasa Indonesia.

Sudah terjadi pada rekap purchase order: seluruh judul, kolom, dan
keterangannya berbahasa Indonesia, sementara kolom "Jenis" — satu-satunya
yang isinya berasal dari peta itu — berbahasa Inggris pada setiap baris.
Berkasnya terbit dengan wajar, dan tidak ada galat apa pun.

Dua hal diperiksa:

  1. di luar berkas konstantanya sendiri, `PURCHASE_TYPE_LABELS` tidak boleh
     disebut sama sekali;
  2. setiap kode jenis yang ada di peta itu HARUS punya terjemahannya di
     ketiga bahasa. Satu kode yang terlewat tidak membuat apa pun gagal —
     hanya baris berkode itu yang berbahasa Inggris, di tengah kolom yang
     seluruhnya berbahasa Indonesia, dan itu justru yang paling sukar
     terlihat.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

#: Berkas yang MEMANG berhak menyebut peta Inggris itu.
#:
#: Hanya konstantanya sendiri: di sanalah `purchaseTypeLabel` memakainya
#: sebagai cadangan, dan di sanalah satu-satunya tempat yang benar.
DIKECUALIKAN = {"purchase-type-label.constant.ts"}

PEMAKAIAN = re.compile(r"\bPURCHASE_TYPE_LABELS\b")

KONSTANTA = SUMBER / "constants" / "purchase-type-label.constant.ts"
I18N = AKAR / "src" / "assets" / "i18n"
BAHASA = ("en", "id", "zh")


def kode_jenis() -> list[str]:
    """Seluruh kode jenis yang dikenal, dibaca dari konstantanya."""
    teks = KONSTANTA.read_text(encoding="utf-8")
    awal = teks.index("PURCHASE_TYPE_LABELS")
    akhir = teks.index("};", awal)
    badan = teks[awal:akhir]
    # Bentuknya dua macam: `A: '...'` dan `'5.1.1': '...'`
    return re.findall(r"^\s*'?([A-Za-z0-9._]+)'?\s*:\s*'", badan, re.M)


def kunci_terjemahan(kode: str) -> str:
    """Cerminan `purchaseTypeKey` di sisi TypeScript."""
    return "t" + kode.replace(".", "_")


def periksa_terjemahan() -> list[str]:
    kode = kode_jenis()
    if not kode:
        return [
            "tidak satu pun kode jenis terbaca dari "
            f"{KONSTANTA.relative_to(AKAR)} — pemeriksa ini tidak dapat "
            "memastikan apa pun"
        ]

    temuan = []
    for bahasa in BAHASA:
        berkas = I18N / f"{bahasa}.json"
        if not berkas.exists():
            temuan.append(f"{berkas.relative_to(AKAR)}: tidak ditemukan")
            continue
        peta = json.loads(berkas.read_text(encoding="utf-8")).get("poType", {})
        kurang = [k for k in kode if kunci_terjemahan(k) not in peta]
        if kurang:
            temuan.append(
                f"{berkas.relative_to(AKAR)}: {len(kurang)} kode jenis tanpa "
                f"terjemahan -> {', '.join(sorted(kurang))}"
            )
    return temuan


def tanpa_komentar(teks: str) -> str:
    """Buang komentar sebelum memeriksa.

    Berkas rekap kini MENJELASKAN mengapa peta itu tidak dipakai, dan
    penjelasannya menyebut namanya. Tanpa pembuangan ini, berkas yang justru
    sudah diperbaiki yang ditandai sebagai pelanggaran — dan pemeriksa yang
    menuduh keterangannya sendiri akan dimatikan orang, bukan diperbaiki.
    """
    teks = re.sub(r"/\*.*?\*/", "", teks, flags=re.S)
    return re.sub(r"//.*$", "", teks, flags=re.M)


def periksa(berkas: Path) -> list[str]:
    if berkas.name in DIKECUALIKAN:
        return []

    teks = tanpa_komentar(berkas.read_text(encoding="utf-8", errors="ignore"))
    temuan = []
    for m in PEMAKAIAN.finditer(teks):
        baris = teks[: m.start()].count("\n") + 1
        temuan.append(
            f"{berkas.relative_to(AKAR)}:{baris}: `PURCHASE_TYPE_LABELS` "
            f"berbahasa Inggris — pakai `purchaseTypeLabel(t, kode)` supaya "
            f"namanya mengikuti bahasa aplikasi"
        )
    return temuan


def main() -> int:
    semua = []
    for berkas in sorted(SUMBER.rglob("*.ts")):
        if berkas.name.endswith(".spec.ts"):
            continue
        semua.extend(periksa(berkas))
    semua.extend(periksa_terjemahan())

    if semua:
        print("jenislabelcek: nama jenis PO dipakai dalam bahasa Inggris")
        for t in semua:
            print("  " + t)
        return 1

    print(
        f"jenislabelcek: {len(kode_jenis())} kode jenis PO mengikuti bahasa "
        f"aplikasi, lengkap di {len(BAHASA)} bahasa"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
