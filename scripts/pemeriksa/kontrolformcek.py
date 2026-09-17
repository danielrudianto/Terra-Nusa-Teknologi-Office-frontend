#!/usr/bin/env python3
"""
Setiap `formControlName` di markup harus ada di form group-nya.

KEKELIRUAN YANG DIJAGA

Angular melempar "Cannot find control with name" ketika markup memakai
`formControlName` yang tidak ada pada form group-nya — dan formulirnya tidak
dapat dibuka sama sekali.

Kekeliruan ini tidak tertangkap kompilasi: `formControlName` adalah teks biasa
bagi TypeScript. Ia baru muncul ketika halamannya dibuka, sehingga dapat lolos
ke pengguna bila formulir itu jarang dipakai.

Pernah terjadi pada PO 6.5.1: delapan kontrol hilang dari form group sementara
markup dan kodenya tetap memakainya.

KENAPA INI PEMERIKSA, BUKAN LAGI UJI KARMA

Sebelumnya ini `src/app/pages/purchase-order/form-controls.spec.ts`, yang
membaca berkas sumber lewat `require.context` — API **webpack**. Proyek ini
memakai builder `@angular/build:karma` (esbuild), yang tidak menyediakan
fungsi itu. Berkas itu melempar `TypeError` di dalam `describe()`, Jasmine
melaporkannya sebagai "error thrown in afterAll", dan SELURUH SESI KARMA
terputus — 974 uji tidak pernah selesai dijalankan, bukan cuma yang satu ini.

Jadi satu berkas uji membuat seluruh suite tidak dapat dipakai, dan karena
yang terlihat cuma "DISCONNECTED", sebabnya tidak menunjuk ke berkas mana pun.

Membaca berkas sumber memang bukan pekerjaan peramban. Di sini ia berjalan
dalam hitungan milidetik, tanpa Chrome, dan tidak dapat menjatuhkan apa pun.

CARA PAKAI

    python3 scripts/pemeriksa/kontrolformcek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
INDUK = AKAR / "src" / "app" / "pages" / "purchase-order" / "purchase-order-create"

# Sengaja tidak dijalankan atas SELURUH aplikasi.
#
# Formulir PO disusun dari satu pola yang sama berulang kali, sehingga
# form group-nya dapat dikenali dengan andal. Formulir lain di aplikasi ini
# membangun kendalinya dengan cara yang beragam, dan pemeriksa yang salah
# menuduh di sana akan segera dilewati orang — termasuk saat ia benar.
POLA_GRUP = re.compile(
    r"formGroup(?:\s*:\s*FormGroup)?\s*=\s*new FormGroup\(\{([\s\S]*?)\n {2}\}\);"
)
POLA_KENDALI = re.compile(r"^\s*(\w+):\s*new Form(?:Control|Array)", re.M)
# `\s*` antara `group(` dan `{` BUKAN kerapian — ia menentukan benar salahnya.
#
# Versi Karma-nya menuntut keduanya menempel (`group({`). PO B menulisnya
# `this.formBuilder.group(\n      {`, jadi seluruh kendali barisnya tidak
# terbaca dan sepuluh di antaranya dituduh hilang — untuk formulir yang
# dipakai setiap hari.
#
# Cacat itu tidak pernah ketahuan karena berkasnya memang tidak pernah
# berhasil dijalankan. Pemeriksa yang tidak pernah jalan tidak pernah salah.
POLA_BUILDER = re.compile(r"\.group\(\s*\{([\s\S]*?)\n\s*\}\s*[,)]")
POLA_KUNCI = re.compile(r"^\s*(\w+):", re.M)
POLA_MARKUP = re.compile(r'formControlName="(\w+)"')


def periksa() -> list[str]:
    masalah: list[str] = []

    if not INDUK.exists():
        return [f"{INDUK} tidak ada"]

    folder = sorted(d for d in INDUK.iterdir() if d.is_dir())

    if len(folder) <= 10:
        masalah.append(
            f"hanya menemukan {len(folder)} folder formulir PO — pemeriksa ini "
            f"mungkin menunjuk tempat yang salah, dan pemeriksa yang tidak "
            f"menemukan apa-apa selalu hijau"
        )

    for d in folder:
        nama = d.name.replace("purchase-order-create-", "")
        ts = d / f"{d.name}.component.ts"
        html = d / f"{d.name}.component.html"
        if not ts.exists() or not html.exists():
            continue

        isi_ts = ts.read_text(encoding="utf-8")
        isi_html = html.read_text(encoding="utf-8")

        grup = POLA_GRUP.search(isi_ts)
        if not grup:
            # Formulir yang tidak memakai pola itu dilewati, sama seperti
            # versi Karma-nya. Menuduhnya berarti pemeriksa ini merah untuk
            # bentuk yang sah.
            continue

        punya = set(POLA_KENDALI.findall(grup.group(1)))

        # Kontrol baris dibuat lewat FormBuilder; namanya ikut dikumpulkan
        # agar tidak dianggap hilang.
        for m in POLA_BUILDER.finditer(isi_ts):
            punya.update(POLA_KUNCI.findall(m.group(1)))

        hilang = []
        for m in POLA_MARKUP.finditer(isi_html):
            if m.group(1) not in punya and m.group(1) not in hilang:
                hilang.append(m.group(1))

        if hilang:
            masalah.append(
                f"PO {nama}: {len(hilang)} kontrol dipakai markup tetapi "
                f"tidak ada di form group — {', '.join(hilang)}. "
                f"Formulir ini akan melempar \"Cannot find control with name\" "
                f"dan tidak dapat dibuka sama sekali."
            )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"kelengkapan kontrol formulir: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
