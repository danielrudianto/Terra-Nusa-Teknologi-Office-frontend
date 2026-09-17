#!/usr/bin/env python3
"""
Nilai dari datepicker TIDAK boleh dipakai mentah-mentah.

KELUHANNYA, dari konsol peramban:

    TypeError: c.getFullYear is not a function

SEBABNYA

`app.module.ts` mendaftarkan `provideMomentDateAdapter(...)`. Artinya SETIAP
datepicker Material di aplikasi ini memancarkan objek **Moment**, bukan
`Date`. Moment tidak punya `getFullYear()`; ia punya `year()`.

Dialog unduh kalender menyimpan nilai itu apa adanya ke `signal<Date | null>`
lalu memanggil `getFullYear()` atasnya. Aplikasinya jatuh di tempat yang sama
sekali tidak menyebut tanggal maupun datepicker — yang muncul di jejaknya
adalah nama `computed` yang kebetulan pertama membaca signal itu.

KENAPA HARUS PEMERIKSA, BUKAN CUKUP UJI

Dua lapis yang biasanya menangkap hal ini sama-sama DIAM:

  * TypeScript. `(ngModelChange)` memancarkan `any`. Menuliskan
    `signal<Date | null>` hanyalah janji yang tidak pernah ditagih siapa pun —
    tidak ada satu pun galat kompilasi.
  * Uji. Uji yang ada memanggil fungsi tanggalnya dengan `Date` sungguhan,
    karena itu yang tertulis di tipenya. Ia menguji fungsinya, bukan APA YANG
    SAMPAI ke fungsinya.

Yang perlu dijaga adalah datepicker BERIKUTNYA — yang ditulis bulan depan,
untuk formulir yang belum ada. Uji tidak dapat menjaga kode yang belum
ditulis; pembacaan seluruh template setiap kali bisa.

CARA PAKAI

    python3 scripts/pemeriksa/tanggalcek.py

Keluar dengan kode 1 bila ada temuan.
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

# Nama penormal yang sah. Ditulis di satu tempat supaya menambah yang baru
# tidak perlu menyunting pola di bawah.
PENORMAL = ("keTanggal", "tanggalLokal", "toDate", "keDate")

# Satu elemen `<input ...>` — dipakai untuk memeriksa ngModelChange dan
# matDatepicker pada elemen yang SAMA, bukan sekadar berdekatan di berkas.
ELEMEN = re.compile(r"<(?:input|mat-[a-z-]+)\b[^>]*>", re.S)

NGMODEL_CHANGE = re.compile(r"\(ngModelChange\)\s*=\s*\"([^\"]*)\"")
DATE_CHANGE = re.compile(r"\((?:dateChange|dateInput)\)\s*=\s*\"([^\"]*)\"")


def _buang_komentar(teks: str) -> str:
    return re.sub(r"<!--.*?-->", "", teks, flags=re.S)


def periksa() -> list[str]:
    masalah: list[str] = []

    for berkas in sorted(SUMBER.rglob("*.html")):
        isi = _buang_komentar(berkas.read_text(encoding="utf-8"))
        if "matDatepicker" not in isi and "matEndDate" not in isi:
            continue

        rel = berkas.relative_to(SUMBER)

        for m in ELEMEN.finditer(isi):
            elemen = m.group(0)
            if "matDatepicker" not in elemen and "matStartDate" not in elemen \
                    and "matEndDate" not in elemen:
                continue

            baris = isi[: m.start()].count("\n") + 1

            for pola, nama in ((NGMODEL_CHANGE, "ngModelChange"),
                               (DATE_CHANGE, "dateChange/dateInput")):
                for p in pola.finditer(elemen):
                    ungkapan = p.group(1)

                    # Yang diperiksa hanya yang benar-benar MENYIMPAN nilainya.
                    #
                    # `(ngModelChange)="ubah()"` tidak menyentuh `$event` sama
                    # sekali — ia cuma memberi tahu bahwa sesuatu berubah, dan
                    # menandainya berarti pemeriksa ini menuduh kode yang
                    # benar. Pemeriksa yang sering keliru adalah pemeriksa yang
                    # akhirnya dimatikan orang.
                    if "$event" not in ungkapan:
                        continue

                    if any(f in ungkapan for f in PENORMAL):
                        continue
                    # `$event.value` dari dateChange masih Moment juga.
                    masalah.append(
                        f"{rel}:{baris}: `({nama})=\"{ungkapan.strip()}\"` "
                        f"menyimpan nilai datepicker MENTAH. Adapter aplikasi "
                        f"ini Moment, jadi yang masuk objek Moment — bukan "
                        f"`Date` — dan `getFullYear()` atasnya melempar di "
                        f"peramban tanpa satu pun galat kompilasi. Bungkus "
                        f"dengan `keTanggal(...)`."
                    )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"tanggal datepicker: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
