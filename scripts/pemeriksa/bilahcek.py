#!/usr/bin/env python3
"""
Halaman yang BERPASANGAN harus punya bilah alat yang sama.

KEKELIRUAN YANG DIJAGA

Pemasukan dan Beban adalah dua sisi dari satu pekerjaan, dan orang berpindah
di antara keduanya sepanjang hari. Kotak pencarian di Pemasukan ditulis
`flex: 1 1 320px` TANPA `max-width`, sementara di Beban `flex: 1 1 220px;
min-width: 160px; max-width: 320px`.

Akibatnya kotak pencarian Pemasukan memakan seluruh sisa baris sementara yang
di Beban berhenti di 320px. Tidak ada galat, tidak ada uji yang merah — dua
halaman yang seharusnya kembar hanya terasa berbeda, dan yang berpindah di
antara keduanya membacanya sebagai salah satunya belum selesai dikerjakan.

Kekeliruan seperti ini SELALU masuk lewat perubahan yang benar di satu sisi.
Yang memperbaiki Beban tidak punya alasan membuka berkas Pemasukan.

CARA PAKAI

    python3 scripts/pemeriksa/bilahcek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

# (nama pasangan, [(label, scss, kelas), ...])
#
# Menambah pasangan di sini adalah cara menyatakan "kedua halaman ini kembar",
# dan sejak saat itu pemeriksanya menjaga agar tidak menyimpang.
PASANGAN = [
    (
        "pencarian Pemasukan vs Beban",
        [
            (
                "Pemasukan",
                "pages/income/income-list/income-list.component.scss",
                "il-search",
            ),
            (
                "Beban",
                "pages/expense/expense-list/expense-list.component.scss",
                "ex-search",
            ),
        ],
    ),
]

# Sifat yang menentukan LEBARNYA. Sisanya (warna, radius) boleh berbeda.
SIFAT = ("flex", "min-width", "max-width", "width")


def _tanpa_komentar(isi: str) -> str:
    """Komentar DIBUANG sebelum diurai.

    Tanpa ini, `/* ... */` yang mendahului sebuah deklarasi ikut terbawa ke
    dalam nama sifatnya (pemisahnya `;`, dan komentar tidak punya `;`), lalu
    namanya tidak dikenali dan sifatnya dilaporkan HILANG. Pemeriksanya lalu
    merah untuk perbedaan yang tidak ada — dan penjaga yang merah tanpa sebab
    adalah penjaga yang dimatikan orang.
    """
    isi = re.sub(r"/\*.*?\*/", "", isi, flags=re.S)
    return re.sub(r"(?m)//.*$", "", isi)


def _blok(isi: str, kelas: str) -> dict[str, str] | None:
    """Gabungan seluruh deklarasi `.kelas { ... }` di berkas itu.

    DIGABUNG, bukan diambil yang pertama: `.ex-search` dideklarasikan DUA KALI
    di berkasnya, dan yang belakangan menimpa yang duluan. Pemeriksa yang
    membaca satu saja akan membandingkan aturan yang tidak berlaku.
    """
    hasil: dict[str, str] = {}
    ketemu = False
    for m in re.finditer(
        r"(?m)^\s*\." + re.escape(kelas) + r"\s*\{([^}]*)\}", isi
    ):
        ketemu = True
        for baris in m.group(1).split(";"):
            if ":" not in baris:
                continue
            nama, _, nilai = baris.partition(":")
            nama = nama.strip().lower()
            if nama in SIFAT:
                hasil[nama] = " ".join(nilai.split())
    return hasil if ketemu else None


def periksa() -> list[str]:
    masalah: list[str] = []

    for nama, sisi in PASANGAN:
        terbaca = []
        for label, jalur, kelas in sisi:
            berkas = SUMBER / jalur
            if not berkas.exists():
                masalah.append(f"{nama}: {jalur} tidak ada")
                terbaca = []
                break
            blok = _blok(_tanpa_komentar(berkas.read_text(encoding="utf-8")), kelas)
            if blok is None:
                masalah.append(
                    f"{nama}: `.{kelas}` tidak ada lagi di {jalur} — "
                    f"pemeriksa ini tidak dapat membandingkan apa pun, dan "
                    f"diam-diam akan selalu hijau"
                )
                terbaca = []
                break
            terbaca.append((label, kelas, blok))

        if len(terbaca) < 2:
            continue

        (la, ka, a), (lb, kb, b) = terbaca[0], terbaca[1]
        beda = [s for s in SIFAT if a.get(s) != b.get(s)]
        if beda:
            rinci = "; ".join(
                f"{s}: {la} `{a.get(s, '—')}` vs {lb} `{b.get(s, '—')}`"
                for s in beda
            )
            masalah.append(
                f"{nama}: lebarnya berbeda — {rinci}. Keduanya halaman yang "
                f"berpasangan; bilah alat yang bentuknya berbeda terbaca "
                f"sebagai salah satunya belum selesai dikerjakan."
            )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"bilah alat halaman berpasangan: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
