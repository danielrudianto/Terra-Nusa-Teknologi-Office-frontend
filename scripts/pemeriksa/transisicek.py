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
import pathlib
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ANIM = os.path.join(AKAR, 'src', 'app', 'animations', 'transisi-rute.ts')
MAIN_HTML = os.path.join(AKAR, 'src', 'app', 'pages', 'main', 'main.component.html')
MAIN_TS = os.path.join(AKAR, 'src', 'app', 'pages', 'main', 'main.component.ts')
KERANGKA_MOBILE_HTML = os.path.join(
    AKAR, 'src', 'app', 'mobile', 'kerangka', 'kerangka.component.html'
)
MASTER_TS = os.path.join(AKAR, 'src', 'app', 'pages', 'master', 'master.component.ts')
MASTER_HTML = os.path.join(AKAR, 'src', 'app', 'pages', 'master', 'master.component.html')
DIREKTIF = os.path.join(
    AKAR, 'src', 'app', 'animations', 'transisi-halaman.directive.ts'
)
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
    dirtif = _tanpa_komentar(_baca(DIREKTIF))
    html = _tanpa_komentar(_baca(MAIN_HTML))
    main = _tanpa_komentar(_baca(MAIN_TS))
    master = _tanpa_komentar(_baca(MASTER_TS))
    main_html = html
    setelan_svc = _tanpa_komentar(_baca(SETELAN_SVC))

    if not anim:
        return ['src/app/animations/transisi-rute.ts tidak ada']

    # --- 1. TIDAK ADA pemicu animasi pada induk <router-outlet> ----------
    #
    # ATURAN YANG PALING MENENTUKAN DI BERKAS INI.
    #
    # Mesin animasi Angular MENUNDA pembuangan simpul anak selama induknya
    # masih punya animasi yang berjalan. Pembungkus `<router-outlet>` adalah
    # induk komponen halaman, jadi pemicu di sana menunda pembuangan halaman
    # LAMA sampai animasinya rampung.
    #
    # Akibatnya dua, dan keduanya pernah dilaporkan sebagai keluhan terpisah:
    #
    #   * halaman lama tergambar di atas yang baru — dua halaman bertumpuk;
    #   * komponennya TIDAK PERNAH DIHANCURKAN, jadi pendeteksi perubahannya
    #     masih ikut setiap putaran dan setiap perpindahan menambah satu lagi.
    #     Itulah "makin lama makin lambat".
    #
    # Pada durasi 300ms nyaris tidak terlihat; sejak durasinya dapat disetel
    # sampai 1,5 detik ia terbaca sebagai kerusakan. Gerakannya sekarang
    # dijalankan `TransisiHalamanDirective` lewat Web Animations API, yang
    # tidak tahu apa-apa tentang penyisipan maupun pembuangan simpul.
    #
    # Disapu SELURUH template, bukan hanya dua yang dikenal: yang menambah
    # layout beroutlet berikutnya tidak akan tahu aturan ini ada.
    for berkas in sorted(pathlib.Path(AKAR, 'src/app').rglob('*.html')):
        isi = _tanpa_komentar(berkas.read_text(encoding='utf-8'))
        if '<router-outlet' not in isi:
            continue
        for m in re.finditer(r'\[@[A-Za-z0-9_]+\]', isi):
            masalah.append(
                f'{berkas.relative_to(pathlib.Path(AKAR, "src/app"))}: '
                f'`{m.group(0)}` dipasang di template yang berisi '
                '`<router-outlet>` — mesin animasi Angular akan menunda '
                'pembuangan halaman lama, jadi halamannya bertumpuk dan '
                'komponennya tidak pernah dihancurkan. Pakai '
                '`[appTransisiHalaman]`'
            )

    if '[appTransisiHalaman]' not in html:
        masalah.append(
            'main.component.html: `[appTransisiHalaman]` tidak terpasang — '
            'perpindahan lewat menu samping kembali tanpa transisi'
        )
    if 'TransisiHalamanDirective' not in main:
        masalah.append(
            'main.component.ts: `TransisiHalamanDirective` tidak diimpor — '
            'bindingnya di template diam-diam tidak berfungsi'
        )
    if re.search(r'animations:\s*\[', main):
        masalah.append(
            'main.component.ts: masih punya `animations: [...]` — lihat '
            'alasannya di atas'
        )

    # Animasi sebelumnya WAJIB dibatalkan sebelum yang baru dimulai.
    #
    # Tanpa itu, delapan perpindahan beruntun meninggalkan sembilan animasi
    # pada elemen yang sama — diukur, bukan dikira. Lihat
    # `transisi-halaman.directive.spec.ts`.
    if '.cancel()' not in dirtif:
        masalah.append(
            'transisi-halaman.directive.ts: animasi sebelumnya tidak '
            'dibatalkan — perpindahan yang cepat menumpuk animasi pada elemen '
            'yang sama'
        )
    if "fill: 'backwards'" not in dirtif:
        masalah.append(
            "transisi-halaman.directive.ts: ketukan kedua tanpa "
            "`fill: 'backwards'` — judulnya tergambar penuh selama jedanya "
            'lalu melompat ke nol; kedipan itu lebih terlihat daripada '
            'gerakan yang dimaksudkan'
        )

    # --- 2. kuncinya berubah tiap halaman ---------------------------------
    if 'kunciRute' not in main:
        masalah.append('main.component.ts: `kunciRute` hilang')
    elif not re.search(r'kunciRute\.set\(\s*this\.hitungKunciTransisi\(\)', main):
        masalah.append(
            'main.component.ts: `kunciRute` tidak diisi dari '
            '`hitungKunciTransisi()` — kuncinya harus dipotong di batas '
            'layout bersarang, dan `router.url` mentah menyalakan animasi '
            'kerangka utama untuk perpindahan yang terjadi di dalam Data '
            'Master'
        )

    # Kuncinya tetap harus BERASAL dari URL, bukan dari `routeConfig.path`.
    #
    # Beberapa rute di aplikasi ini ber-`path: ''`, jadi kunci dari
    # `routeConfig.path` tidak berubah di antara keduanya dan animasinya
    # diam-diam tidak pernah jalan. Pemotongannya membuang EKOR url, bukan
    # menggantinya dengan sumber lain.
    if 'this.router.url' not in main:
        masalah.append(
            'main.component.ts: kunci transisi tidak lagi berasal dari '
            "`router.url` — beberapa rute ber-`path: ''`, dan kunci dari "
            '`routeConfig.path` tidak berubah di antara keduanya'
        )

    # --- 4. layout bersarang tidak memainkan animasi keduanya -------------
    #
    # Tanpa `transisiLewatiPertama`, membuka Data Master dari menu samping
    # memainkan DUA animasi sekaligus — kerangka utama menganimasikan seluruh
    # halaman Master sementara outlet di dalamnya menganimasikan isinya.
    # Keduanya memudar dari nol, jadi opasitasnya berkalian: isinya sampai
    # lebih lambat daripada yang dimaksudkan keduanya, dan terbaca sebagai
    # halaman yang berat. Tidak ada galat; hanya terasa lambat.
    master_html = _tanpa_komentar(_baca(MASTER_HTML))
    if '[transisiLewatiPertama]="true"' not in master_html:
        masalah.append(
            'master.component.html: `transisiLewatiPertama` tidak disetel — '
            'membuka Data Master akan memainkan DUA animasi sekaligus, '
            'opasitasnya berkalian, dan halamannya terasa berat'
        )
    # Setiap layout bersarang WAJIB menyatakan dirinya di rutenya.
    #
    # `transisiLewatiPertama` hanya menutup perpindahan PERTAMA — saat layout
    # itu baru dibuka. Perpindahan DI DALAMNYA sesudah itu tetap menyalakan
    # kerangka utama, karena URL-nya berubah: dua animasi berlapis pada isi
    # yang sama, yang terbaca sebagai dua halaman yang dibalik berurutan.
    #
    # Itu persis yang dilaporkan untuk Data Master, dan tidak ada satu pun uji
    # maupun galat yang dapat menyebutkannya — yang terjadi hanya "terasa
    # aneh". Penjaganya karena itu harus statis.
    #
    # Yang memasang layout beroutlet berikutnya tidak akan tahu aturan ini
    # ada, jadi yang disapu SELURUH template, bukan Data Master saja.
    rute_ts = _tanpa_komentar(
        _baca(os.path.join(AKAR, 'src', 'app', 'app-routing.module.ts'))
    )
    for berkas in sorted(pathlib.Path(AKAR, 'src/app').rglob('*.html')):
        # Kerangka aplikasi MOBILE adalah padanan MainComponent di aplikasinya
        # sendiri: layout terluar (akarnya hanya `<router-outlet />` polos),
        # rutenya di mobile.routes.ts, dan tidak ada layout beroutlet di
        # bawahnya. Tidak ada yang bersarang, jadi tidak ada yang ditandai.
        if berkas == pathlib.Path(KERANGKA_MOBILE_HTML):
            continue
        if berkas == pathlib.Path(MAIN_HTML):
            continue
        isi = _tanpa_komentar(berkas.read_text(encoding='utf-8'))
        if '[appTransisiHalaman]' not in isi:
            continue

        ts = berkas.with_suffix('.ts')
        kelas = re.search(r'export class (\w+)', _baca(str(ts)) or '')
        nama = kelas.group(1) if kelas else berkas.stem

        # Rute yang memuat komponen ini harus membawa penandanya. Dicari
        # dalam jendela di sekitar penyebutan kelasnya: `data` dapat ditulis
        # sebelum maupun sesudah `loadComponent`.
        pakai = [m.start() for m in re.finditer(re.escape(nama), rute_ts)]
        bertanda = any(
            'transisiBersarang' in rute_ts[max(0, i - 2000):i + 2000]
            for i in pakai
        )
        if not pakai:
            masalah.append(
                f'{berkas.relative_to(pathlib.Path(AKAR, "src/app"))}: '
                f'memakai `[appTransisiHalaman]` tetapi `{nama}` tidak '
                f'ditemukan di app-routing.module.ts — pemeriksa ini tidak '
                f'dapat memastikan `transisiBersarang` terpasang'
            )
        elif not bertanda:
            masalah.append(
                f'{berkas.relative_to(pathlib.Path(AKAR, "src/app"))}: '
                f'layout bersarang tanpa `transisiBersarang: true` pada '
                f'rutenya. Kerangka utama akan ikut menganimasikan seluruh '
                f'layout ini setiap kali anak rutenya berganti — dua animasi '
                f'berlapis pada isi yang sama, dan satu perpindahan terbaca '
                f'sebagai dua halaman yang dibalik berurutan.'
            )

    if 'TransisiHalamanDirective' not in master:
        masalah.append(
            'master.component.ts: tidak memakai `TransisiHalamanDirective` — '
            'kalau ia punya definisi animasinya sendiri, dua definisi yang '
            '"mirip" akan berbeda dalam sebulan dan bedanya terasa tanpa '
            'dapat ditunjuk'
        )
    if 'transisiParams' not in master:
        masalah.append(
            'master.component.ts: setelannya tidak datang dari '
            'SettingsService — jenis gerakan yang dipilih pengguna berlaku di '
            'seluruh aplikasi KECUALI di dalam Data Master, tanpa ada yang '
            'menjelaskan kenapa'
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
    if 'setelan()' not in main_html:
        masalah.append(
            'main.component.html: pemicu tidak menerima `mulai` dari setelan — '
            'jenis gerakan yang dipilih pengguna tidak akan berpengaruh'
        )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'transisi halaman: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
