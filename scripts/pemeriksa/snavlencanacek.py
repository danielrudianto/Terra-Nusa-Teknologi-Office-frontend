"""
Jalur kanan butir menu samping: pin, lencana, dan label tidak boleh berebut.

KENAPA PENJAGA INI ADA

Pin butir menu diposisikan `absolute` di tepi kanan, jadi ia TIDAK ikut
menghitung ruang. Supaya isi tombolnya tidak tertimpa, ruang itu harus dipesan
dengan tangan — dan selama bertahun-tahun pesanan itu ditulis begini:

    .side-navigation-button__wrapper span { padding-right: 22px; }

Yang menuliskannya tahu persis apa yang ia maksud: "labelnya". Saat itu label
memang satu-satunya span di dalam tombol, jadi aturannya benar — secara
kebetulan.

Lalu lencana masuk, dan kebetulan itu habis. Aturan yang sama sekarang
mengenai TIGA elemen dengan tiga akibat berbeda:

  * ikon (`<span class="snav-ico">`) membengkak 18px -> 40px: 22px ruang mati
    di setiap baris menu, tanpa gejala apa pun;
  * label mendapat jarak yang dimaksud;
  * lencana TIDAK, karena `.snav-badge` menyetel `padding`-nya sendiri dengan
    kekhususan lebih tinggi — sehingga justru elemen paling kanan, satu-satunya
    yang benar-benar bersinggungan dengan pin, adalah yang luput.

Hasilnya lencana bertindihan 21px dengan pin, dan tidak ada satu pun galat.

Pelajarannya bukan "jangan lupa lencana". Pelajarannya: pesanan ruang tidak
boleh ditempelkan pada TEBAKAN tentang elemen mana yang paling kanan. Ia
ditempelkan pada TOMBOLNYA, supaya berlaku untuk apa pun yang ada di sana
sekarang maupun nanti.

YANG DIJAGA

  1. Jalur pin dipesan pada tombolnya, bukan pada span di dalamnya.
  2. Lebar pesanan >= jangkauan pin (`right` + `width`). Ini yang membuat
     penjaga ini tidak sekadar mencocokkan teks: menggeser pinnya tanpa
     melebarkan jalurnya akan tertangkap.
  3. Tidak ada lagi aturan `span { ... }` bertelanjang di dalam tombolnya yang
     menyetel jarak — kelas kerusakan yang sama, bentuk apa pun.
  4. Labelnya punya kelas sendiri, supaya aturan label tidak perlu menebak.
"""

import os
import re
import sys

AKAR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'src', 'app', 'components', 'side-nav', 'side-nav-item',
)
SCSS = os.path.join(AKAR, 'side-nav-item.component.scss')
HTML = os.path.join(AKAR, 'side-nav-item.component.html')


def _tanpa_komentar(s: str) -> str:
    """Komentar dibuang dulu.

    Tanpa ini penjaga bisa hijau hanya karena aturan yang dicarinya tertulis
    di dalam penjelasan tentang aturan itu — persis cara uji migrasi mobilisasi
    dulu lolos padahal saringannya sudah dicabut.
    """
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'(?m)^\s*//.*$', '', s)
    return s


def _blok(s: str, pemilih: str):
    """Isi blok sebuah pemilih; `None` bila pemilihnya tidak ada."""
    m = re.search(re.escape(pemilih) + r'\s*\{', s)
    if not m:
        return None
    i, dalam = m.end(), 1
    while i < len(s) and dalam:
        if s[i] == '{':
            dalam += 1
        elif s[i] == '}':
            dalam -= 1
        i += 1
    return s[m.end():i - 1]


def periksa():
    masalah = []

    if not os.path.exists(SCSS) or not os.path.exists(HTML):
        return ['side-nav-item: berkas komponennya tidak ditemukan']

    scss = _tanpa_komentar(open(SCSS, errors='ignore').read())
    html = _tanpa_komentar(open(HTML, errors='ignore').read())

    # --- 1. jangkauan pin -------------------------------------------------
    pin = _blok(scss, '.snav-pin')
    kanan = lebar = None
    if pin is None:
        masalah.append('side-nav-item.component.scss: `.snav-pin` tidak ada')
    else:
        mk = re.search(r'\bright:\s*(\d+(?:\.\d+)?)px', pin)
        ml = re.search(r'\bwidth:\s*(\d+(?:\.\d+)?)px', pin)
        if not mk or not ml:
            masalah.append(
                'side-nav-item.component.scss: `.snav-pin` tanpa `right`/`width` '
                'px yang terbaca — jangkauannya tidak dapat dihitung, jadi '
                'lebar jalurnya tidak dapat dijamin'
            )
        else:
            kanan, lebar = float(mk.group(1)), float(ml.group(1))

    # --- 2. pesanan jalur ada, dan ada DI TOMBOLNYA ------------------------
    pesan = re.search(
        r'\.snav-row\.punya-pin\s+\.side-navigation-button__wrapper\s*\{'
        r'[^}]*?\bpadding-right:\s*(\d+(?:\.\d+)?)px',
        scss, re.S,
    )
    if not pesan:
        masalah.append(
            'side-nav-item.component.scss: jalur pin tidak dipesan pada '
            '`.snav-row.punya-pin .side-navigation-button__wrapper` — isi '
            'tombol paling kanan (hari ini lencana) akan tertimpa pin'
        )
    elif kanan is not None:
        perlu = kanan + lebar
        punya = float(pesan.group(1))
        if punya < perlu:
            masalah.append(
                f'side-nav-item.component.scss: jalur pin {punya:g}px, '
                f'sedangkan pin menjangkau {perlu:g}px dari tepi '
                f'(right {kanan:g} + width {lebar:g}) — kurang '
                f'{perlu - punya:g}px, isinya akan bertindihan'
            )

    # --- 3. tidak ada lagi `span` bertelanjang yang menyetel jarak ---------
    for m in re.finditer(
        r'\.side-navigation-button__wrapper\s+span\s*\{([^}]*)\}', scss, re.S
    ):
        if re.search(r'\b(padding|margin)(-\w+)?:', m.group(1)):
            baris = scss[:m.start()].count('\n') + 1
            masalah.append(
                f'side-nav-item.component.scss:{baris}: aturan `span` '
                'bertelanjang di dalam tombol menyetel jarak — ia mengenai '
                'ikon dan lencana juga, bukan hanya label. Pakai `.snav-label`, '
                'atau pesan ruangnya pada tombolnya'
            )

    # --- 4. label punya kelasnya sendiri ----------------------------------
    if 'snav-label' not in html:
        masalah.append(
            'side-nav-item.component.html: label tidak punya kelas '
            '`snav-label` — aturan label terpaksa menebak lewat `span`, dan '
            'tebakan itu ikut mengenai ikon serta lencana'
        )
    if 'punya-pin' not in html:
        masalah.append(
            'side-nav-item.component.html: `.snav-row` tidak menandai '
            '`punya-pin` — jalur pin akan dipesan juga pada baris yang '
            'memakai `showPin=false`, dan ruangnya hilang tanpa penghuni'
        )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'jalur kanan menu samping: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
