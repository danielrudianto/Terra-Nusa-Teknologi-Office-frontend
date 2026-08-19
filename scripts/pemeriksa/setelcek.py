#!/usr/bin/env python3
"""
Periksa `FormGroup.reset({...})` yang TIDAK menyebut seluruh kendalinya.

Kenapa ini perlu dijaga.

`reset(nilai)` pada Angular memberi `null` kepada setiap kendali yang tidak
disebut di dalam `nilai` — bukan mengembalikannya ke nilai yang dipasang saat
`new FormControl(...)`. Bacaan sepintasnya terbalik: yang tertulis terbaca
seperti "kembalikan yang ini, biarkan sisanya", padahal artinya "kembalikan
yang ini, KOSONGKAN sisanya".

Akibatnya tidak pernah berupa galat. Yang terjadi pada formulir pembelian:

  createPayment   dibuat menyala sejak awal supaya slip pembayaran tidak
                  terlewat; sesudah satu pembelian tersimpan ia menjadi
                  `null`, dan pemeriksaannya memakai `=== true`. Pembelian
                  BERIKUTNYA tersimpan tanpa slip, tanpa satu pun peringatan.
  bankAccountID   validatornya memanggil `.toString()` atas nilainya;
                  `null.toString()` melempar TypeError, dan formulirnya
                  berhenti di tengah pengisian.

Keduanya baru ketahuan dari pembacaan ulang, bukan dari layar.

Cara kerjanya: kendali dikumpulkan dari `xFormGroup = new FormGroup({...})`,
lalu dibandingkan dengan kunci pada tiap `xFormGroup.reset({...})` di berkas
yang sama. Yang disebut hanya kunci pada tingkat pertama; nilai bersarang
tidak diperiksa.

Batasnya jelas: `reset()` tanpa argumen memang bermaksud mengosongkan
semuanya dan dilewati, begitu pula grup yang kendalinya disusun secara
dinamis (`FormArray`, atau `addControl` di luar deklarasinya).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2] / "src" / "app"


def tanpa_komentar(teks: str) -> str:
    """Ganti komentar dan isi string dengan spasi, panjangnya dipertahankan.

    Panjang dijaga agar posisi karakter tetap sama, sehingga indeks hasil
    pencarian pada teks bersih masih menunjuk tempat yang sama pada aslinya.
    """
    keluar = []
    i = 0
    n = len(teks)
    while i < n:
        c = teks[i]
        dua = teks[i : i + 2]
        if dua == "//":
            j = teks.find("\n", i)
            j = n if j < 0 else j
            keluar.append(" " * (j - i))
            i = j
        elif dua == "/*":
            j = teks.find("*/", i + 2)
            j = n if j < 0 else j + 2
            # Baris baru dipertahankan supaya nomor barisnya tidak bergeser.
            keluar.append(
                "".join("\n" if x == "\n" else " " for x in teks[i:j])
            )
            i = j
        elif c in "\"'`":
            j = i + 1
            while j < n:
                if teks[j] == "\\":
                    j += 2
                    continue
                if teks[j] == c:
                    j += 1
                    break
                j += 1
            keluar.append(
                "".join("\n" if x == "\n" else " " for x in teks[i:j])
            )
            i = j
        else:
            keluar.append(c)
            i += 1
    return "".join(keluar)


def blok(teks: str, mulai: int) -> tuple[str, int]:
    """Isi kurung kurawal yang dibuka pada `mulai`, beserta posisi penutupnya."""
    dalam = 0
    for i in range(mulai, len(teks)):
        if teks[i] == "{":
            dalam += 1
        elif teks[i] == "}":
            dalam -= 1
            if dalam == 0:
                return teks[mulai + 1 : i], i
    return "", len(teks)


def kunci_tingkat_pertama(isi: str) -> list[str]:
    """Nama kunci pada tingkat pertama sebuah objek literal."""
    hasil = []
    dalam = 0
    baris_kunci = re.compile(r"([A-Za-z_$][\w$]*)\s*:")
    i = 0
    while i < len(isi):
        c = isi[i]
        if c in "{[(":
            dalam += 1
        elif c in "}])":
            dalam -= 1
        elif dalam == 0:
            m = baris_kunci.match(isi, i)
            if m:
                hasil.append(m.group(1))
                i = m.end()
                continue
        i += 1
    return hasil


def periksa(berkas: Path) -> list[str]:
    asli = berkas.read_text(encoding="utf-8", errors="ignore")
    teks = tanpa_komentar(asli)

    # Deklarasi grup: `namaFormGroup = new FormGroup({`
    grup: dict[str, list[str]] = {}
    # Nama yang dideklarasikan, BUKAN anotasi tipenya. `metaFormGroup:
    # FormGroup = new FormGroup(` memuat dua kata yang berakhiran "FormGroup",
    # dan yang benar adalah yang pertama.
    deklarasi = re.compile(
        r"(?:readonly\s+)?(\w+)\s*(?::\s*FormGroup(?:<[^=]*?>)?\s*)?"
        r"=\s*new FormGroup\s*\(\s*\{"
    )
    for m in re.finditer(deklarasi, teks):
        isi, _ = blok(teks, teks.index("{", m.end() - 1))
        grup[m.group(1)] = kunci_tingkat_pertama(isi)

    temuan = []
    for m in re.finditer(r"this\.(\w+)\.reset\s*\(\s*\{", teks):
        nama = m.group(1)
        if nama not in grup:
            continue
        isi, _ = blok(teks, teks.index("{", m.end() - 1))
        disebut = set(kunci_tingkat_pertama(isi))
        hilang = [k for k in grup[nama] if k not in disebut]
        if hilang:
            baris = teks[: m.start()].count("\n") + 1
            temuan.append(
                f"{berkas.relative_to(AKAR.parent.parent)}:{baris}: "
                f"{nama}.reset() tidak menyebut {', '.join(hilang)} "
                f"— kendali itu akan menjadi null, bukan kembali ke bawaannya"
            )
    return temuan


def main() -> int:
    semua = []
    for berkas in sorted(AKAR.rglob("*.ts")):
        if berkas.name.endswith(".spec.ts"):
            continue
        semua.extend(periksa(berkas))

    if semua:
        print("setelcek: reset() yang meninggalkan kendali menjadi null")
        for t in semua:
            print("  " + t)
        return 1

    print("setelcek: semua reset() menyebut seluruh kendalinya")
    return 0


if __name__ == "__main__":
    sys.exit(main())
