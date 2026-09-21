#!/usr/bin/env python3
"""
Kunci terjemahan yang DIRANGKAI di dalam templat HTML.

KENAPA PEMERIKSA INI ADA

`terjemahcek` hanya melihat kunci yang tertulis utuh. `labelkuncicek`
menangani yang dirangkai di dalam TypeScript dari nama kendali formulir.
Di antara keduanya ada celah yang sudah memakan korban tiga kali:

    {{ "hrCandidate.status_" + s | translate }}

Kuncinya baru terbentuk saat berjalan, dari isi sebuah daftar di
komponennya. Menambah satu anggota ke daftar itu menambah satu kunci
baru — dan tidak ada apa pun yang mengingatkan bahwa kuncinya belum
ditulis. ngx-translate tidak dipasangi penangan kunci hilang, jadi yang
tercetak di layar adalah kuncinya sendiri: "hrCandidate.status_dinilai".

Build bersih. Uji hijau. Yang melihatnya cuma pemakai.

Kejadian yang melahirkan pemeriksa ini: tangga status pelamar ditambah
dua anak tangga (`dinilai`, `diwawancara`). Penyaringnya memakai
`hrCandidate.status_` + anggota daftar, menunya memakai `status.` +
anggota daftar LAIN — dua awalan untuk satu hal — dan tak satu pun dari
keduanya lengkap. Layar menampilkan "Selesai", lalu
"hrCandidate.status_dinilai", lalu "Diterima", berurutan.

CARA KERJANYA

Cari `"<awalan>" + <daftar>` di dalam templat, lacak `<daftar>` ke
sebuah larik string di komponen yang sama, lalu pastikan tiap anggotanya
punya `<awalan><anggota>` pada KETIGA berkas bahasa.

BATASNYA, dinyatakan supaya tidak disangka lebih kuat daripada adanya:
rangkaian yang sumbernya bukan larik harfiah — `"x." + p.status`, yang
isinya datang dari basis data — tidak dapat ditebak dari kode dan
dilewati diam-diam. Di layar pelamar keduanya kebetulan memakai daftar
yang sama, jadi yang harfiah sudah cukup menjaganya.

CARA PAKAI

    python3 scripts/pemeriksa/kuncirangkaicek.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"
BAHASA = AKAR / "src" / "assets" / "i18n"

KODE = ("id", "en", "zh")

#: `"awalan" + sesuatu` — tanda petik apa pun, spasi bebas.
#:
#: Awalannya dituntut memuat TITIK, supaya penggabungan teks biasa
#: (`"Rp " + nilai`) tidak ikut terjaring, dan dibiarkan berakhir dengan
#: titik atau garis bawah — `"status."` persis sebanyak `"user.level"`.
#:
#: Versi pertama pemeriksa ini menuntut awalannya berakhir pada aksara
#: kata, dan karena itu BUTA terhadap `"status." + st` — yaitu bentuk
#: kekeliruan yang melahirkannya. Ia hijau, dan hijaunya bohong.
#:
#: Sisi kanannya ditangkap UTUH sampai batas ungkapannya, termasuk titik.
#: Menangkap `p` saja dari `p.status` membuat pemeriksa ini menyangka telah
#: memeriksa sesuatu padahal `p` bukan nama daftar mana pun — dan diam
#: seperti itu justru kegagalan yang hendak dicegahnya.
RANGKAI = re.compile(
    r"""['"]((?=[\w.]*\.)[A-Za-z][\w.]*)['"]\s*\+\s*([A-Za-z_$][\w$.]*)"""
)

#: Sejauh mana `| translate` dicari sesudah rangkaiannya.
#:
#: Tanpa syarat ini setiap `"a.b" + x` ikut terjaring, termasuk yang
#: merangkai alamat rute atau nama berkas — temuan keliru yang membuat
#: pemeriksa berhenti dibaca, dan pemeriksa yang tidak dibaca sama saja
#: dengan tidak ada.
JANGKAUAN = 160

#: `@for (x of daftar; ...)` — sintaks aliran kendali Angular 17+.
FOR_BARU = re.compile(r"@for\s*\(\s*([A-Za-z_$][\w$]*)\s+of\s+([^;)]+)")

#: `*ngFor="let x of daftar"` — sintaks lama, masih dipakai sebagian layar.
FOR_LAMA = re.compile(
    r"""\*ngFor\s*=\s*['"]\s*let\s+([A-Za-z_$][\w$]*)\s+of\s+([^;'"]+)"""
)


def _datar(o: dict, pre: str = "") -> dict:
    hasil = {}
    for k, v in o.items():
        if isinstance(v, dict):
            hasil.update(_datar(v, f"{pre}{k}."))
        else:
            hasil[f"{pre}{k}"] = v
    return hasil


def _peubah_ulang(teks: str) -> dict[str, str]:
    """
    Peubah perulangan -> nama daftar yang diulangnya.

    Inilah mata rantai yang hilang. Yang dirangkai di templat hampir selalu
    peubah perulangan (`st`), bukan medan komponen — dan `st` tidak pernah
    muncul sebagai larik di TypeScript. Tanpa pemetaan ini pemeriksanya
    menemukan sepuluh rangkaian lalu menyelesaikan NOL, yaitu hijau yang
    tidak berarti apa-apa.
    """
    peta: dict[str, str] = {}
    for pola in (FOR_BARU, FOR_LAMA):
        for m in pola.finditer(teks):
            sumber = m.group(2).strip()
            sumber = re.sub(r"^this\.", "", sumber)
            # Hanya nama polos; `a.b()` atau `x | async` tidak dapat dilacak.
            if re.fullmatch(r"[A-Za-z_$][\w$]*", sumber):
                peta[m.group(1)] = sumber
    return peta


def _larik(teks: str, nama: str) -> list[str] | None:
    """
    Anggota larik string bernama `nama` di dalam satu berkas TypeScript.

    None bila namanya tidak ditemukan sebagai larik harfiah — itu BUKAN
    temuan, melainkan batas pemeriksa ini.
    """
    # Batas kata di depan namanya WAJIB. Tanpa `(?<![\w$])`, nama sependek
    # `t` cocok dengan huruf terakhir pengenal lain — `const set: any[] = [`
    # dibaca sebagai larik bernama `t`, dan pemeriksanya melaporkan temuan
    # atas daftar yang tidak pernah ada.
    pola = re.compile(
        r"(?:readonly\s+)?(?<![\w$])" + re.escape(nama)
        + r"\s*(?::[^=]+)?=\s*\[",
    )
    m = pola.search(teks)
    if m is None:
        return None
    i = m.end()
    dalam = 1
    while i < len(teks) and dalam:
        if teks[i] == "[":
            dalam += 1
        elif teks[i] == "]":
            dalam -= 1
        i += 1
    isi = teks[m.end(): i - 1]
    # Angka ikut diambil: `levels = [1, 2, 3, 4, 5]` membentuk
    # `user.level1` .. `user.level5`, dan lima kunci itu sama mudahnya
    # tertinggal seperti kunci berupa kata.
    anggota = re.findall(r"""['"]([\w-]+)['"]|(?<![\w.'"])(\d+)(?![\w.])""", isi)
    rata = [a or b for a, b in anggota]
    return rata or None


def periksa() -> list[str]:
    kamus = {}
    for k in KODE:
        with open(BAHASA / f"{k}.json", encoding="utf-8") as f:
            kamus[k] = _datar(json.load(f))

    masalah: list[str] = []

    for html in sorted(SUMBER.rglob("*.html")):
        teks = html.read_text(encoding="utf-8")
        ts = html.with_suffix(".ts")
        if not ts.exists():
            continue
        sumber_ts = ts.read_text(encoding="utf-8")

        ulang = _peubah_ulang(teks)

        for m in RANGKAI.finditer(teks):
            awalan, ungkapan = m.group(1), m.group(2)
            if "translate" not in teks[m.end(): m.end() + JANGKAUAN]:
                continue
            ungkapan = re.sub(r"^this\.", "", ungkapan).strip()
            # Medan dari sebuah objek (`p.status`) tidak dapat ditebak dari
            # kode — lihat BATASNYA di docstring.
            if not re.fullmatch(r"[A-Za-z_$][\w$]*", ungkapan):
                continue
            # Panggilan fungsi (`keadaan(c)`) bukan nama daftar; isinya
            # ditentukan saat berjalan.
            if re.search(
                r"['\"]" + re.escape(awalan) + r"['\"]\s*\+\s*"
                + re.escape(ungkapan) + r"\s*\(",
                teks,
            ):
                continue
            nama = ulang.get(ungkapan, ungkapan)
            anggota = _larik(sumber_ts, nama)
            if anggota is None:
                continue  # batas pemeriksa; lihat docstring
            for a in anggota:
                kunci = f"{awalan}{a}"
                hilang = [k for k in KODE if kunci not in kamus[k]]
                if hilang:
                    masalah.append(
                        f"{html.relative_to(AKAR)}: `\"{awalan}\" + {ungkapan}` "
                        f"membentuk `{kunci}`, tidak ada di "
                        f"{', '.join(hilang)} — yang tercetak di layar "
                        f"adalah kuncinya sendiri"
                    )

    # Satu kunci yang sama dapat dirangkai di dua baris berbeda pada satu
    # templat; yang membacanya cukup diberi tahu sekali.
    return sorted(set(masalah))


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"kunci terjemahan dirangkai: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"kunci terjemahan dirangkai: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
