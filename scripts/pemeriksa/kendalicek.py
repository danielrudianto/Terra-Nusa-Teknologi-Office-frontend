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



# ---------------------------------------------------------------------------
# Kendali yang dipakai di KONTEKS FormGroup yang keliru
# ---------------------------------------------------------------------------
#
# Pemeriksaan di atas membandingkan nama terhadap SELURUH kendali di berkas
# itu, tanpa memandang kelompok mana yang sedang berlaku. Nama yang benar
# tetapi dipasang pada kelompok yang salah karena itu lolos begitu saja.
#
# Sudah terjadi pada PO-B: isian `pphCode` berada di dalam perulangan baris
# sewa, yang terikat `[formGroup]="getFormGroupAt(i)"`. `pphCode` hanya ada
# pada kelompok DOKUMEN, bukan pada barisnya, sehingga Angular melempar
# begitu satu baris dirender:
#
#     Cannot find control with name: 'pphCode'
#
# Nama itu ada di berkasnya — hanya di kelompok yang lain — sehingga
# pemeriksaan di atas menyatakan cocok. Gejalanya terbaca sebagai "isiannya
# tidak ada", bukan sebagai galat.

#: Kelompok DOKUMEN: `x: FormGroup = new FormGroup({...})`.
POLA_KELOMPOK_DOKUMEN = re.compile(r"new\s+FormGroup\s*\(\s*\{")

#: Kelompok BARIS: dirakit `formBuilder.group({...})` di dalam sebuah fungsi.
POLA_KELOMPOK_BARIS = re.compile(r"\.group\s*\(\s*\{")


def _isi_kurawal(teks: str, mulai: int) -> str:
    """Isi `{...}` yang dibuka pada posisi `mulai`."""
    dalam = 0
    for i in range(mulai, len(teks)):
        if teks[i] == '{':
            dalam += 1
        elif teks[i] == '}':
            dalam -= 1
            if dalam == 0:
                return teks[mulai + 1:i]
    return ''


def _nama_kendali(blok: str) -> set:
    """Nama kendali pada TINGKAT PERTAMA sebuah objek literal."""
    hasil = set()
    dalam = 0
    i = 0
    kunci = re.compile(r"['\"]?(\w+)['\"]?\s*:")
    while i < len(blok):
        c = blok[i]
        if c in '{[(':
            dalam += 1
        elif c in '}])':
            dalam -= 1
        elif dalam == 0:
            m = kunci.match(blok, i)
            if m and re.match(r"\s*(new\s+Form|\[)", blok[m.end():m.end() + 12]):
                hasil.add(m.group(1))
                i = m.end()
                continue
        i += 1
    return hasil


def kelompok_dokumen_dan_baris(isi_ts: str):
    """Pisahkan kendali milik kelompok dokumen dari milik kelompok baris."""
    dokumen, baris = set(), set()
    for m in POLA_KELOMPOK_DOKUMEN.finditer(isi_ts):
        dokumen |= _nama_kendali(_isi_kurawal(isi_ts, isi_ts.index('{', m.end() - 1)))
    for m in POLA_KELOMPOK_BARIS.finditer(isi_ts):
        baris |= _nama_kendali(_isi_kurawal(isi_ts, isi_ts.index('{', m.end() - 1)))
    return dokumen, baris


def _konteks_bersarang(isi_html: str) -> list:
    """`formControlName` yang berada di dalam FormGroup BUKAN akar.

    Mengembalikan pasangan (baris, nama). Namanya diambil dari ATRIBUT yang
    diurai, bukan dicari lagi per baris: satu `<input>` kerap ditulis
    berbilang baris, sehingga nomor baris tag pembukanya bukan baris tempat
    `formControlName` tertulis — dan mencocokkan per baris melewatkannya.

    Ditelusuri dengan pengurai HTML sungguhan, bukan dengan menghitung baris.
    Percobaan pertama menandai seluruh blok `@for`/`@if` sebagai bersarang;
    itu keliru — satu `@if` yang membungkus seluruh formulir lalu memuat satu
    pengikatan di kedalaman mana pun membuat SETIAP isian di dalamnya
    tertuduh. Yang menentukan lingkup ELEMEN, dan lingkup elemen hanya dapat
    diketahui dari sarang tagnya.

    Blok `@for`/`@if` sendiri tidak mengganggu: bagi pengurai ia teks biasa di
    antara tag, sedangkan yang dibutuhkan justru sarang tagnya.
    """
    from html.parser import HTMLParser

    #: Tag yang tidak pernah punya penutup; bila diperlakukan sebagai
    #: berpasangan, sarangnya ikut salah sesudahnya.
    TUNGGAL = {'input', 'img', 'br', 'hr', 'meta', 'link', 'source'}

    class Penelusur(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.tumpukan = []          # (tag, apakah_membuka_konteks_baris)
            self.bersarang = []         # (baris, nama kendali)

        def _dalam_baris(self) -> bool:
            return any(x for _, x in self.tumpukan)

        def handle_starttag(self, tag, attrs):
            atr = dict(attrs)
            konteks_baris = False
            if 'formarrayname' in atr or 'formgroupname' in atr:
                konteks_baris = True
            ikat = atr.get('[formgroup]')
            if ikat is not None and tag != 'form':
                # `[formGroup]="formGroup"` pada elemen selain <form> tetap
                # menunjuk kelompok akar; yang lain kelompok lain.
                konteks_baris = ikat.strip() != 'formGroup'

            if 'formcontrolname' in atr and self._dalam_baris():
                self.bersarang.append((self.getpos()[0], atr['formcontrolname']))

            if tag not in TUNGGAL:
                self.tumpukan.append((tag, konteks_baris))

        def handle_startendtag(self, tag, attrs):
            atr = dict(attrs)
            if 'formcontrolname' in atr and self._dalam_baris():
                self.bersarang.append((self.getpos()[0], atr['formcontrolname']))

        def handle_endtag(self, tag):
            for i in range(len(self.tumpukan) - 1, -1, -1):
                if self.tumpukan[i][0] == tag:
                    del self.tumpukan[i:]
                    break

    penelusur = Penelusur()
    try:
        penelusur.feed(isi_html)
    except Exception:
        # Templat yang tidak dapat diurai dilewati, bukan ditebak.
        return []
    return penelusur.bersarang


def periksa_konteks(html: str, isi_html: str, isi_ts: str) -> list:
    dokumen, baris_kendali = kelompok_dokumen_dan_baris(isi_ts)
    # Hanya berarti bila berkasnya memang punya DUA jenis kelompok.
    if not dokumen or not baris_kendali:
        return []

    # Nama yang HANYA milik dokumen; yang ada di keduanya tidak dapat
    # disimpulkan salah tempat.
    khusus_dokumen = dokumen - baris_kendali
    if not khusus_dokumen:
        return []

    temuan = []
    for baris, nama in _konteks_bersarang(isi_html):
        if nama in khusus_dokumen:
            temuan.append((html, baris, nama))
    return temuan


def main() -> int:
    temuan = []
    salah_konteks = []
    for html in sorted(glob(os.path.join(FE, '**', '*.component.html'), recursive=True)):
        ts = html[: -len('.html')] + '.ts'
        if not os.path.exists(ts):
            continue

        isi_html = open(html, encoding='utf-8').read()
        dipakai = set(POLA_PAKAI.findall(isi_html))
        if not dipakai:
            continue

        isi_ts = open(ts, encoding='utf-8').read()

        # Pemeriksaan KONTEKS dijalankan lebih dulu, dan tidak ikut dilewati.
        #
        # `_dilewati` menyingkirkan berkas yang memuat `formArrayName` —
        # tepat berkas yang punya dua jenis kelompok, dan tepat tempat salah
        # konteks itu mungkin terjadi. Menaruhnya sesudah penyaring berarti
        # ia tidak pernah berjalan di tempat yang justru dituju.
        salah_konteks.extend(periksa_konteks(html, isi_html, isi_ts))

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

    if not temuan and not salah_konteks:
        print('kendalicek: semua formControlName cocok')
        return 0

    for berkas, baris, nama, ada in temuan:
        print(f'{berkas}:{baris}  formControlName="{nama}" tidak ada di FormGroup-nya')
        dekat = [k for k in ada if k.lower()[:4] == nama.lower()[:4]]
        if dekat:
            print(f'    mirip: {", ".join(dekat)}')

    for berkas, baris, nama in salah_konteks:
        print(
            f'{berkas}:{baris}  formControlName="{nama}" milik FormGroup '
            f'DOKUMEN, tetapi dipasang di dalam [formGroup] baris'
        )
        print('    Angular melempar "Cannot find control with name" saat '
              'barisnya dirender')

    print(f'\nkendalicek: {len(temuan) + len(salah_konteks)} tidak cocok')
    return 1


if __name__ == '__main__':
    sys.exit(main())
