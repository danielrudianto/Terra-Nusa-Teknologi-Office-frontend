#!/usr/bin/env python3
"""
Pratinjau dan CETAK harus merakit klausul dari sumber yang sama.

Sejak pemeriksaan dokumen memakai dialog tampilan — bukan lagi PDF hasil
rakitan — yang dibaca pemeriksa adalah layar ini. Karena itu layar ini harus
memuat persis apa yang akan tertulis di kertas.

Keduanya dirakit di dua tempat yang berbeda:

  * layar   -> `helpers/klausul-dokumen.helper.ts`, `susunKlausulDokumen()`
             (dipakai layar desktop DAN persetujuan dari ponsel)
  * kertas  -> `purchase-order-list.component.ts`, saat mencetak ulang

Keduanya bercabang menurut jenis PO, dan tiap cabang memanggil penyusun
klausulnya sendiri. Cabang yang tertinggal saat salah satunya berubah TIDAK
menimbulkan galat apa pun: dokumennya tetap terbuka, tetapi satu pasal hilang
dari layar sementara tetap tercetak di kertas — dan "sudah membaca"
ditandatangani atas sesuatu yang belum pernah terlihat.

Sudah pernah terjadi: PO-H merakit empat pasal saat dicetak, sementara
pratinjau hanya menyusun Pasal 1.

Yang diperiksa: untuk setiap jenis PO, kumpulan penyusun klausul yang dipanggil
pada kedua sisi harus SAMA.

    python3 scripts/pemeriksa/pratinjaucek.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
# Logika klausul layar kini di helper BERSAMA (dipakai desktop dan mobile),
# bukan lagi di dalam komponennya. Sejak itu, "sisi layar" berarti helper ini.
LAYAR = AKAR / "src/app/helpers/klausul-dokumen.helper.ts"
KERTAS = AKAR / "src/app/pages/purchase-order/purchase-order-list/purchase-order-list.component.ts"

#: Penyusun klausul yang dikenali. Nama di luar daftar ini diabaikan supaya
#: pemanggilan pembantu biasa tidak terbaca sebagai penyusun.
PENYUSUN = {
    "buildClauseLines",
    "buildManpowerClauses",
    "buildInsuranceClauses",
    "buildPasal5",
    "bangunPasal4",
    "buildRentalClauses",
    "buildDeliveryClauses",
    "buildTransportClauses",
}

#: Jenis yang memang TIDAK punya cabang tersendiri di salah satu sisi, dan
#: alasannya. Dikosongkan berarti tidak ada yang dikecualikan.
DIKECUALIKAN: dict[str, str] = {}


def _blok_switch(teks: str, awal: str) -> str:
    """Isi `switch` yang dimulai pada penanda `awal`, sampai kurungnya tutup."""
    i = teks.find(awal)
    if i == -1:
        return ""
    i = teks.index("{", i)
    dalam = 0
    for j in range(i, len(teks)):
        if teks[j] == "{":
            dalam += 1
        elif teks[j] == "}":
            dalam -= 1
            if dalam == 0:
                return teks[i : j + 1]
    return teks[i:]


def _per_jenis(blok: str) -> dict[str, set[str]]:
    """
    Peta jenis PO -> penyusun klausul yang dipanggil pada cabangnya.

    Cabang `case 'X':` boleh bertumpuk (beberapa case untuk satu badan);
    seluruhnya menerima kumpulan penyusun yang sama.
    """
    hasil: dict[str, set[str]] = {}
    potongan = re.split(r"\bcase\s+", blok)[1:]
    menunggu: list[str] = []
    for bagian in potongan:
        cocok = re.match(r"['\"]([^'\"]+)['\"]\s*:", bagian)
        if not cocok:
            continue
        jenis = cocok.group(1).upper()
        badan = bagian[cocok.end() :]
        # Badan berhenti di `case` berikutnya — sudah dipotong oleh split.
        dipakai = {n for n in PENYUSUN if re.search(rf"\b{n}\s*\(", badan)}
        if not dipakai:
            # Cabang kosong: menumpuk ke cabang berikutnya.
            menunggu.append(jenis)
            continue
        for tertunda in menunggu:
            hasil[tertunda] = set(dipakai)
        menunggu.clear()
        hasil[jenis] = dipakai
    return hasil


def main() -> int:
    for berkas in (LAYAR, KERTAS):
        if not berkas.exists():
            print(f"berkas tidak ditemukan: {berkas}")
            return 2

    layar = _per_jenis(_blok_switch(LAYAR.read_text(), "switch (jenisEfektifDokumen(data))"))
    isi_kertas = KERTAS.read_text()

    # Sisi cetak tidak memakai satu `switch`; cabangnya rantai `if/else if`
    # atas `data.purchaseType`. Dibaca per potongan pembanding — dan tiap
    # potongan sudah berakhir tepat di cabang berikutnya.
    #
    # `clauseContext` DIHITUNG SEBAGAI `buildClauseLines`.
    #
    # Percobaan pertama membandingkan nama fungsi yang dipanggil di kedua
    # sisi apa adanya, dan hampir seluruh jenis tampak berbeda — bukan karena
    # klausulnya berbeda, melainkan karena sisi cetak menyerahkan perakitannya
    # kepada helper cetaknya: ia meneruskan `clauseContext`, dan
    # `printPurchaseOrderX` yang memanggil `buildClauseLines` di dalam. Sisi
    # layar memanggilnya langsung. Keduanya memakai penyusun yang sama;
    # yang berbeda hanya siapa yang memanggilnya.
    kertas: dict[str, set[str]] = {}
    #
    # DUA bentuk cabang dikenali. Sebagian jenis dibandingkan dengan `===`,
    # sebagian lain dengan `startsWith` — PO H misalnya, sebab nomornya dapat
    # berakhiran huruf lain. Membaca satu bentuk saja membuat jenis yang
    # memakai bentuk satunya terbaca "tidak punya cabang", lalu jatuh ke
    # penyusun bawaan — dan pemeriksanya melaporkan selisih yang tidak ada.
    potongan = re.split(
        r"data\.purchaseType\s*(?:\|\|\s*['\"]['\"]\s*\)?\s*)?(?:===|\)\.startsWith\(|\.startsWith\()\s*",
        isi_kertas,
    )[1:]
    for bagian in potongan:
        cocok = re.match(r"['\"]([^'\"]+)['\"]", bagian)
        if not cocok:
            continue
        jenis = cocok.group(1).upper()
        dipakai = {n for n in PENYUSUN if re.search(rf"\b{n}\s*\(", bagian)}

        # `clauseContext` hanya berarti bila `sections` TIDAK diberikan.
        #
        # Helper cetak memakai `sections` bila ada, dan mengabaikan
        # `clauseContext`. Menghitung keduanya membuat setiap jenis yang
        # memakai penyusun khusus tampak "memakai dua penyusun" — temuan
        # yang tidak pernah benar.
        # `clauseContext` TIDAK dianggap sebagai `buildClauseLines`.
        #
        # Percobaan sebelumnya menyimpulkan begitu, dan salah pada PO D:
        # helper cetaknya meneruskan konteks itu ke `buildManpowerClauses`,
        # bukan ke penyusun bawaan. Yang tahu penyusun mana yang benar-benar
        # dipanggil adalah helpernya sendiri — dibaca di bawah.
        pakai_sections = bool(re.search(r"\bsections\s*:", bagian))

        # Penyusun yang dipanggil DI DALAM helper cetaknya ikut dihitung.
        #
        # Sebagian jenis tidak merakit klausul di berkas ini sama sekali —
        # ia memanggil `printPurchaseOrderH`, dan helper itulah yang menyusun
        # Pasal 3, 4, dan 5. Membaca berkas daftar saja membuat jenis seperti
        # itu tampak kehilangan pasal yang sebenarnya ada.
        # Hanya bila klausulnya memang dirakit di dalam helper.
        #
        # Ketika `sections` diberikan, helper memakai daftar itu apa adanya —
        # `buildClauseLines` yang ada di dalam helper tidak pernah berjalan.
        # Menghitungnya membuat setiap jenis berpenyusun khusus tampak
        # memakai dua penyusun sekaligus.
        for nama in (
            set()
            if pakai_sections
            else set(re.findall(r"printPurchaseOrder([A-Za-z0-9]+)\s*\(", bagian))
        ):
            berkas = AKAR / f"src/app/helpers/purchase-order-{nama.lower()}.helper.ts"
            if berkas.exists():
                isi = berkas.read_text()
                dipakai |= {n for n in PENYUSUN if re.search(rf"\b{n}\s*\(", isi)}

        if dipakai:
            kertas.setdefault(jenis, set()).update(dipakai)

    # Jenis yang TIDAK punya cabang sendiri memakai penyusun bawaan.
    #
    # Di sisi layar, `switch` hanya memuat jenis yang perlakuannya khusus;
    # sisanya jatuh ke `return buildClauseLines(...)` di bawahnya. Membaca
    # ketiadaan cabang sebagai "tidak ada klausul" membuat pemeriksa ini
    # melewati justru jenis yang paling banyak dipakai.
    BAWAAN = {"buildClauseLines"}

    temuan: list[str] = []
    for jenis in sorted(set(layar) | set(kertas)):
        if jenis in DIKECUALIKAN:
            continue
        a, b = layar.get(jenis, BAWAAN), kertas.get(jenis, BAWAAN)
        if a != b:
            temuan.append(
                f"PO {jenis}: layar memakai {sorted(a) or '—'}, "
                f"kertas memakai {sorted(b) or '—'}"
            )

    print(f"pratinjaucek: {len(layar)} cabang layar, {len(kertas)} cabang kertas")

    # Hijau tanpa membaca apa pun adalah kegagalan, bukan kelulusan.
    #
    # Percobaan pertama menunjuk penanda yang salah, sehingga sisi layar
    # terbaca NOL cabang — dan pemeriksanya melaporkan "bersih" justru karena
    # tidak menemukan apa-apa untuk dibandingkan.
    if len(kertas) < 5:
        print(
            "\nGAGAL MEMBACA: terlalu sedikit cabang yang dikenali. "
            "Penanda cabangnya kemungkinan berubah — perbaiki pemeriksanya, "
            "jangan percayai hijaunya."
        )
        return 2
    if not temuan:
        print("bersih — keduanya merakit klausul dari penyusun yang sama.")
        return 0

    print(f"\n{len(temuan)} temuan:\n")
    for t in temuan:
        print(f"  - {t}")
    print(
        "\nSatu pasal yang hanya ada di kertas tidak pernah terbaca pemeriksa;\n"
        "satu pasal yang hanya ada di layar tidak pernah sampai ke vendor."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
