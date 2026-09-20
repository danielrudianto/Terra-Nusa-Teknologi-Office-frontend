#!/usr/bin/env python3
"""
Persetujuan SPK harus lewat DIALOG, bukan satu klik di dalam menu.

KELAS KEGAGALAN YANG DIJAGA

Menyetujui adalah satu-satunya tindakan di daftar purchase order yang
MENGIKAT perusahaan kepada pihak luar, dan ia tidak dapat dikembalikan lewat
layar itu: yang sudah disetujui hanya dapat dibatalkan, bukan dijadikan draf
lagi.

Ia sebelumnya terjadi dari SATU KLIK di dalam menu titik tiga — tanpa satu
pun angka terlihat pada saat memutuskan. Dan menu itu berganti menampilkan
"Setujui" tepat di tempat "Periksa" barusan ditekan, jadi dua tindakan yang
sangat berbeda berada di bawah kursor yang sama.

Mengembalikannya ke bentuk itu TIDAK menghasilkan galat apa pun: `approve()`
yang memanggil `ubahStatus` langsung tetap bekerja sempurna, seluruh uji
tetap hijau, dan yang berubah hanya bahwa SPK dapat terbit tanpa ada yang
membacanya. Bentuk kodenyalah yang menjaga, jadi bentuk kodenya yang
diperiksa di sini.

KENAPA BUKAN UJI BIASA

`purchase-order-list` tidak punya berkas uji: komponennya menarik belasan
layanan dan membangunnya di Karma memerlukan tiruan yang lebih panjang
daripada yang diujinya. Pemeriksa ini menutup celah itu untuk satu hal yang
paling berakibat di seluruh layar tersebut.

CARA PAKAI

    python3 scripts/pemeriksa/setujuipocek.py
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DAFTAR = os.path.join(
    AKAR, 'src', 'app', 'pages', 'purchase-order', 'purchase-order-list',
    'purchase-order-list.component.ts',
)
DIALOG = os.path.join(
    AKAR, 'src', 'app', 'pages', 'purchase-order', 'setujui-po-dialog',
    'setujui-po-dialog.component.ts',
)
DIALOG_HTML = os.path.join(
    AKAR, 'src', 'app', 'pages', 'purchase-order', 'setujui-po-dialog',
    'setujui-po-dialog.component.html',
)

#: Yang HARUS terbaca di dialognya sebelum tombolnya ditekan.
#:
#: Bukan daftar hiasan: nomor dan pemasok adalah dua hal yang paling sering
#: tertukar antar-dokumen, dan nilai adalah satu-satunya angka yang mengikat.
WAJIB_TAMPIL = ('nomor', 'pemasok', 'proyek', 'total')


def _tanpa_komentar(s: str) -> str:
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'(?m)//.*$', '', s)
    return s


def periksa():
    masalah = []

    for jalur, nama in ((DAFTAR, 'purchase-order-list'),
                        (DIALOG, 'setujui-po-dialog'),
                        (DIALOG_HTML, 'setujui-po-dialog.html')):
        if not os.path.exists(jalur):
            masalah.append(f'{nama}: berkasnya tidak ada')
    if masalah:
        return masalah

    ts = _tanpa_komentar(open(DAFTAR, errors='ignore').read())

    m = re.search(r'\n  approve\([^)]*\)[^{]*\{(.*?)\n  \}', ts, re.S)
    if not m:
        masalah.append('purchase-order-list: `approve()` tidak ditemukan')
        return masalah

    badan = m.group(1)

    if 'SetujuiPoDialogComponent' not in badan:
        masalah.append(
            'purchase-order-list: `approve()` tidak lagi membuka dialog '
            'konfirmasi — SPK dapat terbit dari satu klik di dalam menu '
            'titik tiga, tanpa satu pun angka terlihat saat memutuskan, dan '
            'persetujuan itu tidak dapat dikembalikan lewat layar ini'
        )
    elif re.search(r"ubahStatus\([^)]*'approved'", badan):
        # Ada dialognya DAN ada pemanggilan langsung: pastikan yang langsung
        # itu berada di dalam cabang hasil dialognya, bukan di luar.
        sesudah_dialog = badan.split('SetujuiPoDialogComponent', 1)[1]
        if "aksi === 'setujui'" not in sesudah_dialog:
            masalah.append(
                "purchase-order-list: `approve()` memanggil `ubahStatus` "
                "tanpa memeriksa hasil dialognya — dialog yang ditutup atau "
                "dibatalkan akan tetap menyetujui, dan dari sisi pengguna "
                "tombol Batal menjadi tombol Setujui"
            )

    dts = _tanpa_komentar(open(DIALOG, errors='ignore').read())

    if 'sudahBaca' not in dts:
        masalah.append(
            'setujui-po-dialog: penahan `sudahBaca` hilang — dialognya '
            'kembali menjadi satu klik, hanya dengan satu langkah tambahan'
        )
    elif not re.search(r'if\s*\(\s*!this\.sudahBaca\.value\s*\)\s*return', dts):
        masalah.append(
            'setujui-po-dialog: `setujui()` tidak lagi menolak saat kotaknya '
            'belum dicentang — tombol yang hanya dimatikan di template tetap '
            'dapat dipanggil dari kode, dan penjaganya harus ada di keduanya'
        )

    html = _tanpa_komentar(open(DIALOG_HTML, errors='ignore').read())
    hilang = [b for b in WAJIB_TAMPIL if f'data.{b}' not in html]
    if hilang:
        masalah.append(
            f'setujui-po-dialog.html: tidak lagi menampilkan '
            f'{", ".join(hilang)} — dialog yang tidak menunjukkan angkanya '
            f'hanyalah pertanyaan "yakin?", dan pertanyaan itu dijawab "ya" '
            f'oleh refleks'
        )

    return masalah


if __name__ == '__main__':
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f'persetujuan SPK: pemeriksa gagal — {e}')
        sys.exit(1)
    print(f'persetujuan SPK: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
