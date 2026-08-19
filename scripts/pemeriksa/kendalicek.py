"""
`formControlName` yang tidak ada di FormGroup-nya.

Nama yang salah ketik membuat direktifnya memegang `null`, dan Angular
melempar saat merakit formulirnya:

    Cannot read properties of null (reading '_rawValidators')

Galat itu tidak menyebut nama isian yang salah, tidak menyebut berkasnya, dan
tidak muncul saat build — hanya di peramban, ketika layarnya dibuka. Seluruh
layar berhenti di situ, sehingga gejalanya terbaca sebagai "tidak bisa
membuat" dan yang menelusurinya mencari-cari di sekitar izin.

Sudah terjadi pada formulir aset: `deacription` untuk kendali bernama
`description`. Satu huruf tertukar, satu layar mati, dan tidak ada satu pun
tahap sebelum peramban yang menyebutnya.

Jalankan dari akar frontend:

    python3 scripts/pemeriksa/kendalicek.py

Keluar dengan kode 1 bila ada yang tidak cocok.
"""

import os
import re
import sys
from glob import glob

FE = 'src/app'

#: Nama kendali yang dideklarasikan di berkas komponen.
#
# Ditangkap dari empat bentuk yang dipakai di proyek ini. Bentuk lain
# (kendali yang dirakit dari perulangan, misalnya) tidak tertangkap — dan
# karena itu berkas yang memuatnya sengaja dilewati, lihat `_dilewati`.
POLA_KENDALI = (
    re.compile(r"""^\s*(\w+)\s*:\s*new\s+Form(Control|Array|Group)\b""", re.M),
    re.compile(r"""^\s*['"](\w+)['"]\s*:\s*new\s+Form(Control|Array|Group)\b""", re.M),
    re.compile(r"""addControl\(\s*['"](\w+)['"]"""),
    re.compile(r"""setControl\(\s*['"](\w+)['"]"""),
)

#: Pemakaian pada templat. Hanya yang DITULIS TETAP; yang terikat
#: (`[formControlName]="i"`) memang tidak dapat diperiksa dari sini.
POLA_PAKAI = re.compile(r"""formControlName\s*=\s*["'](\w+)["']""")

#: Berkas yang kendalinya tidak dirakit di komponennya sendiri.
#
# Formulir yang diterima sebagai `@Input`, atau yang isinya berada di dalam
# `formGroupName`/`formArrayName` milik induknya. Memeriksanya dari sini
# hanya menghasilkan temuan palsu.
def _dilewati(isi_ts: str, isi_html: str) -> bool:
    if 'new FormGroup(' not in isi_ts and '.group(' not in isi_ts:
        return True
    # Kelompok bersarang: nama kendalinya milik kelompok anak, bukan kelompok
    # yang dideklarasikan di komponen ini.
    if 'formGroupName' in isi_html or 'formArrayName' in isi_html:
        return True
    return False


def kendali(isi_ts: str) -> set:
    hasil = set()
    for pola in POLA_KENDALI:
        for m in pola.finditer(isi_ts):
            hasil.add(m.group(1))
    return hasil


def main() -> int:
    temuan = []
    for html in sorted(glob(os.path.join(FE, '**', '*.component.html'), recursive=True)):
        ts = html[: -len('.html')] + '.ts'
        if not os.path.exists(ts):
            continue

        isi_html = open(html, encoding='utf-8').read()
        dipakai = set(POLA_PAKAI.findall(isi_html))
        if not dipakai:
            continue

        isi_ts = open(ts, encoding='utf-8').read()
        if _dilewati(isi_ts, isi_html):
            continue

        ada = kendali(isi_ts)
        if not ada:
            continue

        for nama in sorted(dipakai - ada):
            baris = next(
                (
                    i + 1
                    for i, b in enumerate(isi_html.splitlines())
                    if f'formControlName="{nama}"' in b or f"formControlName='{nama}'" in b
                ),
                0,
            )
            temuan.append((html, baris, nama, sorted(ada)))

    if not temuan:
        print('kendalicek: semua formControlName cocok')
        return 0

    for berkas, baris, nama, ada in temuan:
        print(f'{berkas}:{baris}  formControlName="{nama}" tidak ada di FormGroup-nya')
        dekat = [k for k in ada if k.lower()[:4] == nama.lower()[:4]]
        if dekat:
            print(f'    mirip: {", ".join(dekat)}')
    print(f'\nkendalicek: {len(temuan)} tidak cocok')
    return 1


if __name__ == '__main__':
    sys.exit(main())
