#!/usr/bin/env python3
"""
Titik cetak dokumen yang LUPA membawa nama penyetujunya.

KELAS KEGAGALAN YANG DIJAGA

Blok tanda tangan pada purchase order diisi `signerLines(approvedByName,
approvedByPosition)`. Ketika namanya kosong, `signerLines` menggambar
penunjuk abu-abu "Sign Here" / "Nama" / "Jabatan" — dan itu BENAR untuk
dokumen yang belum disetujui.

Karena itu titik cetak yang lupa meneruskan `approvedByName` tidak
menghasilkan galat apa pun. Yang keluar dari pencetak adalah lembar yang
tampak sah sepenuhnya, lengkap dengan garis tanda tangannya, hanya tidak
menyebut siapa yang mengesahkannya — pada dokumen yang justru diedarkan
untuk ditandatangani vendor.

RIWAYATNYA

Daftar PO menyusun satu muatan bersama (`printData`) yang memuat
`approvedByName` dan `approvedByPosition`, lalu bercabang ke belasan helper
menurut jenis dokumennya. Cabang yang MENYEBAR muatan itu (`...printData`)
ikut membawanya; cabang yang menulis bidangnya satu per satu tidak.

Sudah dua kali ketahuan dari dokumen yang sudah beredar:

  * SPK pekerjaan (PO-H) — diperbaiki lebih dulu;
  * SPK transportasi (tipe A), jasa legal (6.4.1), dan sewa alat (form B) —
    ketahuan dari dua PDF yang sudah disetujui tetapi kolom namanya kosong.

Pemeriksa ini menutup kelasnya, bukan ketiga kasusnya.

CARA MEMERIKSANYA

Setiap pemanggilan `printPurchaseOrderX({...})` dibaca objek argumennya.
Objek itu HARUS salah satu dari:

  * menyebut `approvedByName` sendiri; atau
  * menyebarkan variabel yang menyebutnya (`...printData`, `...data512`).

CARA PAKAI

    python3 scripts/pemeriksa/cetakpenyetujucek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

#: Nama bidang yang harus sampai ke helper cetaknya.
BIDANG = "approvedByName"

#: Pemanggilan helper cetak dokumen yang blok tanda tangannya memakai
#: `signerLines`. Dicari dari HELPER-nya, bukan dari daftar nama yang ditulis
#: tangan: helper baru yang ditambahkan kelak ikut terjaga dengan sendirinya.
_PANGGIL = re.compile(r"\b(print[A-Z]\w*)\(\s*\{")

#: `const nama = { ... }` — untuk menelusuri `...nama`.
_VARIABEL = re.compile(r"\bconst\s+(\w+)\s*(?::[^=]+)?=\s*\{")

#: Komentar — DIBUANG sebelum apa pun diperiksa.
#:
#: Ini bukan kerapian. Perbaikan atas bug ini menyertakan komentar yang
#: MENYEBUTKAN `approvedByName` sebagai penjelasan; tanpa membuangnya,
#: pemeriksa ini menemukan namanya di dalam komentar itu lalu melaporkan
#: hijau — termasuk ketika kodenya kemudian dirusak kembali. Penjaga yang
#: hijau karena komentarnya sendiri lebih buruk daripada tidak ada penjaga,
#: dan itu ketahuan justru saat pemeriksa ini sengaja dicoba dirusak.
_KOMENTAR = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)


def _tanpa_komentar(teks: str) -> str:
    """Ganti komentar dengan spasi sebanyak aslinya, agar nomor baris tetap."""
    return _KOMENTAR.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), teks)


def _objek(teks: str, mulai: int) -> tuple[str, int]:
    """Isi objek `{ ... }` yang dimulai pada `mulai`, beserta akhirnya."""
    depth = 0
    i = mulai
    while i < len(teks):
        if teks[i] == "{":
            depth += 1
        elif teks[i] == "}":
            depth -= 1
            if depth == 0:
                return teks[mulai : i + 1], i + 1
        i += 1
    return teks[mulai:], len(teks)


def _helper_pakai_signerlines() -> set[str]:
    """Nama fungsi cetak yang blok tanda tangannya memakai `signerLines`."""
    nama = set()
    for f in (AKAR / "src" / "app" / "helpers").glob("*.ts"):
        isi = _tanpa_komentar(f.read_text(encoding="utf-8"))
        if "signerLines(" not in isi:
            continue
        nama.update(re.findall(r"export function (print[A-Z]\w*)", isi))
    return nama


def periksa() -> list[str]:
    helper = _helper_pakai_signerlines()
    if not helper:
        # Penjaga atas penjaganya sendiri: bila `signerLines` berganti nama,
        # pemeriksa ini akan menemukan nol helper dan melaporkan hijau atas
        # pemeriksaan yang tidak pernah berjalan.
        return [
            "tidak ada satu pun helper cetak yang memakai `signerLines` — "
            "pemeriksa ini kehilangan sasarannya, dan hijau di sini berarti "
            "tidak ada yang diperiksa"
        ]

    masalah: list[str] = []
    for f in sorted(SUMBER.rglob("*.ts")):
        if f.name.endswith(".spec.ts") or "/helpers/" in str(f):
            continue
        # FORMULIR PEMBUATAN DIKECUALIKAN, dan alasannya disebut.
        #
        # Layar `purchase-order-create-*` mencetak dokumen yang BARU SAJA
        # dibuat. Pada saat itu ia draf: belum ada yang menyetujuinya, dan
        # blok tanda tangan yang kosong justru keadaan yang benar — malah
        # capnya bertuliskan DRAFT. Menuntut `approvedByName` di sana berarti
        # pemeriksa ini merah atas kode yang sudah benar, dan pemeriksa yang
        # merah atas kode yang benar akan dimatikan orang.
        #
        # Yang dijaga adalah jalur CETAK ULANG: daftar PO, faktur, dan layar
        # lain yang mencetak dokumen yang sudah punya riwayat persetujuan.
        if "purchase-order-create" in str(f):
            continue
        isi = _tanpa_komentar(f.read_text(encoding="utf-8"))
        if not any(h in isi for h in helper):
            continue

        # Variabel yang MEMUAT bidangnya, supaya `...muatan` terhitung sah.
        aman: set[str] = set()
        for m in _VARIABEL.finditer(isi):
            tubuh, _ = _objek(isi, m.end() - 1)
            if BIDANG in tubuh:
                aman.add(m.group(1))
        # Dua putaran: variabel yang menyebarkan variabel aman ikut aman.
        for _ in range(3):
            for m in _VARIABEL.finditer(isi):
                if m.group(1) in aman:
                    continue
                tubuh, _ = _objek(isi, m.end() - 1)
                if any(f"...{a}" in tubuh for a in aman):
                    aman.add(m.group(1))

        for m in _PANGGIL.finditer(isi):
            if m.group(1) not in helper:
                continue
            tubuh, _ = _objek(isi, m.end() - 1)
            if BIDANG in tubuh:
                continue
            if any(f"...{a}" in tubuh for a in aman):
                continue
            baris = isi[: m.start()].count("\n") + 1
            masalah.append(
                f"{f.relative_to(AKAR)}:{baris}: `{m.group(1)}` dipanggil "
                f"tanpa `{BIDANG}` — dokumen yang SUDAH disetujui tetap "
                f"tercetak dengan blok tanda tangan kosong, tanpa galat "
                f"apa pun"
            )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"nama penyetuju pada cetakan: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"nama penyetuju pada cetakan: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
