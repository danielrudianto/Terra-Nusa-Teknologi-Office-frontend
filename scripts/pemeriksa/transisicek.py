"""
Transisi halaman: kelas kerusakan yang TIDAK menghasilkan galat.

Animasi Angular yang salah pasang tidak melempar apa pun. Ia hanya diam — dan
"diam" persis sama tampaknya dengan "memang belum dibuat". Empat cara
kehilangannya, semuanya tanpa satu pun pesan:

1. TRIGGER DIPASANG PADA `<router-outlet>`.

   `<router-outlet>` tidak merender isinya sendiri; komponen halaman
   disisipkan sebagai SAUDARA di sebelahnya, bukan sebagai anaknya. Trigger di
   sana tidak akan menyentuh isi halaman sama sekali. Ini kekeliruan yang
   paling sering, karena secara pembacaan justru terlihat paling benar.

2. KUNCINYA TIDAK PERNAH BERUBAH.

   Beberapa rute di aplikasi ini ber-`path: ''`. Memakai
   `routeConfig.path` sebagai kunci membuat perpindahan di antara keduanya
   menghasilkan nilai yang sama, dan Angular tidak menganggapnya perubahan.
   Animasinya jalan di sebagian halaman dan tidak di sebagian lain — bentuk
   kegagalan yang paling membingungkan, karena "kadang jalan" terbaca sebagai
   masalah kecepatan, bukan sebagai kekeliruan kunci.

3. QUERY TANPA `optional: true`.

   `query('app-header-title', ...)` pada halaman yang tidak memakainya akan
   MELEMPAR, dan galatnya menyebut selectornya — bukan halamannya. Satu
   halaman tanpa header menjatuhkan animasi seluruh aplikasi.

4. LAYOUT BERSARANG MEMAINKAN ANIMASI KEDUA.

   Membuka Data Master menjalankan animasi kerangka utama DAN animasi outlet
   di dalam Master. Keduanya memudar dari nol, jadi opasitasnya berkalian dan
   isinya sampai lebih lambat daripada yang dimaksudkan keduanya. Tidak rusak,
   hanya terasa berat — dan "terasa berat" tidak pernah muncul di keluaran uji
   mana pun.

Ditambah satu hal yang bukan soal kerusakan melainkan soal orang:
`prefers-reduced-motion`. Angular tidak membacanya sendiri.
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ANIM = os.path.join(AKAR, 'src', 'app', 'animations', 'transisi-rute.ts')
MAIN_HTML = os.path.join(AKAR, 'src', 'app', 'pages', 'main', 'main.component.html')
MAIN_TS = os.path.join(AKAR, 'src', 'app', 'pages', 'main', 'main.component.ts')
MASTER_TS = os.path.join(AKAR, 'src', 'app', 'pages', 'master', 'master.component.ts')
SETELAN_SVC = os.path.join(AKAR, 'src', 'app', 'services', 'setting.service.ts')


def _baca(p: str) -> str:
    return open(p, errors='ignore').read() if os.path.exists(p) else ''


def _panggilan(s: str, nama: str):
    """Seluruh isi tiap panggilan `nama(...)`, dengan kurung berimbang.

    Regex `nama\(([^)]*)\)` BERHENTI di `)` pertama — dan `query()` di sini
    berisi `style({ ... })`, jadi yang tertangkap cuma potongan awalnya dan
    `optional: true` di ekornya tidak pernah terlihat. Penjaganya jadi hijau
    apa pun isinya: dicabut pun tidak ketahuan.

    Saya menemukannya karena mencoba merusaknya dengan sengaja, bukan karena
    membacanya ulang.
    """
    hasil = []
    for m in re.finditer(re.escape(nama) + r'\(', s):
        i, dalam = m.end(), 1
        while i < len(s) and dalam:
            if s[i] == '(':
                dalam += 1
            elif s[i] == ')':
                dalam -= 1
            i += 1
        hasil.append(s[m.end():i - 1])
    return hasil


def _tanpa_komentar(s: str) -> str:
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'(?m)//.*$', '', s)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    return s


def periksa():
    masalah = []

    anim = _tanpa_komentar(_baca(ANIM))
    html = _tanpa_komentar(_baca(MAIN_HTML))
    main = _tanpa_komentar(_baca(MAIN_TS))
    master = _tanpa_komentar(_baca(MASTER_TS))
    main_html = html
    setelan_svc = _tanpa_komentar(_baca(SETELAN_SVC))

    if not anim:
        return ['src/app/animations/transisi-rute.ts tidak ada']

    # --- 1. trigger tidak boleh menempel pada router-outlet ---------------
    if re.search(r'<router-outlet[^>]*\[@', html):
        masalah.append(
            'main.component.html: trigger dipasang pada `<router-outlet>` — '
            'halaman disisipkan sebagai SAUDARA outlet, bukan anaknya, jadi '
            'animasinya tidak akan menyentuh isi halaman sama sekali'
        )
    if '[@transisiRute]' not in html:
        masalah.append(
            'main.component.html: `[@transisiRute]` tidak terpasang — '
            'perpindahan lewat menu samping kembali tanpa transisi'
        )
    if 'animations: [transisiRute]' not in main:
        masalah.append(
            'main.component.ts: `transisiRute` tidak didaftarkan di '
            '`animations` — bindingnya di template diam-diam tidak berfungsi'
        )

    # --- 2. kuncinya berubah tiap halaman ---------------------------------
    if 'kunciRute' not in main:
        masalah.append('main.component.ts: `kunciRute` hilang')
    elif not re.search(r'kunciRute\.set\(\s*this\.router\.url', main):
        masalah.append(
            'main.component.ts: `kunciRute` tidak diisi dari `router.url` — '
            "beberapa rute ber-`path: ''`, jadi kunci dari `routeConfig.path` "
            'tidak berubah di antara keduanya dan animasinya tidak menyala'
        )

    # --- 3. query wajib optional ------------------------------------------
    panggilan_query = _panggilan(anim, 'query')
    if not panggilan_query:
        masalah.append(
            'transisi-rute.ts: tidak ada `query(...)` sama sekali — ketukan '
            'kedua (judul halaman menyusul) hilang, dan yang tersisa cuma '
            'fade biasa'
        )
    for isi in panggilan_query:
        if 'optional: true' not in isi:
            masalah.append(
                'transisi-rute.ts: ada `query(...)` tanpa `optional: true` — '
                'satu halaman tanpa elemen itu akan MELEMPAR dan menjatuhkan '
                'animasi seluruh aplikasi'
            )
            break

    # --- 4. layout bersarang tidak memainkan animasi keduanya -------------
    if 'transisiRuteBersarang' not in anim:
        masalah.append('transisi-rute.ts: `transisiRuteBersarang` hilang')
    else:
        blok = anim[anim.index('transisiRuteBersarang'):]
        if not re.search(r"transition\(\s*'void => \*'\s*,\s*\[\s*\]\s*\)", blok):
            masalah.append(
                "transisi-rute.ts: `transisiRuteBersarang` tidak menonaktifkan "
                "`void => *` — membuka Data Master akan memainkan DUA animasi "
                'sekaligus, opasitasnya berkalian, dan halamannya terasa berat'
            )
    if 'transisiRuteBersarang' not in master:
        masalah.append(
            'master.component.ts: tidak memakai `transisiRuteBersarang` — '
            'kalau ia punya definisi animasinya sendiri, dua definisi yang '
            '"mirip" akan berbeda dalam sebulan dan bedanya terasa tanpa '
            'dapat ditunjuk'
        )

    # --- 5. prefers-reduced-motion, DAN pilihan penggunanya ----------------
    #
    # Setelan sistem hanya menentukan NILAI AWAL. Dulu ia memaksa durasi 0,
    # dan akibatnya tidak dapat dibedakan dari animasi yang rusak: halamannya
    # berganti begitu saja, tanpa apa pun di layar maupun di konsol yang
    # menjelaskannya. Tiga kiriman berturut-turut terbuang karenanya.
    if 'prefers-reduced-motion' not in anim:
        masalah.append(
            'transisi-rute.ts: `prefers-reduced-motion` tidak dihormati — '
            'bagi yang menyalakannya, gerakan halaman bukan soal selera'
        )

    if re.search(r'durasi:\s*0\b', anim) and 'none' not in anim:
        masalah.append(
            'transisi-rute.ts: durasi 0 dipakai di luar pilihan "none" — '
            'transisi yang dimatikan diam-diam tidak dapat dibedakan dari '
            'animasi yang rusak'
        )

    if 'gerakDikurangi' not in setelan_svc:
        masalah.append(
            'setting.service.ts: tidak membaca `gerakDikurangi()` — setelan '
            '"kurangi gerak" tidak lagi menentukan nilai awalnya'
        )

    for kunci, sebab in (
        (
            'transisiParams',
            'parameternya tidak datang dari SettingsService, jadi pilihan di '
            'halaman Pengaturan tidak berpengaruh',
        ),
    ):
        if kunci not in main:
            masalah.append(f'main.component.ts: {sebab}')

    # Pilihan pengguna harus benar-benar sampai ke templatenya.
    if 'setelan().mulai' not in main_html:
        masalah.append(
            'main.component.html: pemicu tidak menerima `mulai` dari setelan — '
            'jenis gerakan yang dipilih pengguna tidak akan berpengaruh'
        )

    # --- 6. tidak ada :leave / position absolute --------------------------
    if ':leave' in anim:
        masalah.append(
            'transisi-rute.ts: memakai `:leave` — halaman lama ditahan di DOM '
            'bersama yang baru, dua kali kerja render pada saat paling sibuk, '
            'dan penumpukannya merusak tinggi halaman serta posisi gulir'
        )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'transisi halaman: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
