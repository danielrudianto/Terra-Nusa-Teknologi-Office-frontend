"""
Arus kas proyek: penjaga izin dan bentuk perhitungannya.

DUA HAL DI SINI TIDAK DAPAT DIJAGA OLEH UJI

1. PENJAGA IZIN RUTENYA.

   Rute arus kas dijaga `payment_outgoing` (level 3), bukan `purchase`
   (level 1) seperti rute laporan proyek di sebelahnya. Menurunkannya ke
   `purchase` akan membuat seluruh uji tetap hijau — dan membuka tanggal serta
   nominal uang keluar dari rekening kepada lapangan dan pengadaan, yang oleh
   matriks izin justru sengaja dijauhkan dari data kas.

   Uji backend memeriksanya, tetapi hanya dari sisi backend. Pemeriksa ini
   menjaganya dari sisi repo secara keseluruhan, termasuk bila rutenya
   dipindah ke berkas lain.

2. ZONA WAKTU PADA PENGEMBERAN BULAN.

   `titikKas()` memotong tanggal sebagai TEKS (`slice(0, 7)`), bukan lewat
   `new Date(...)`. Karma di repo ini berjalan pada zona UTC, sehingga uji
   yang membandingkan hasil keduanya TIDAK dapat gagal di sana — `new Date`
   memberi jawaban yang sama persis. Bentuk kodenyalah yang menjaga, jadi
   bentuk kodenya yang diperiksa di sini.
"""

import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KOMPONEN = os.path.join(
    AKAR, 'src', 'app', 'pages', 'project', 'project-report',
    'project-report.component.ts',
)


def _tanpa_komentar_ts(s: str) -> str:
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    s = re.sub(r'(?m)//.*$', '', s)
    return s


def _tanpa_komentar_py(s: str) -> str:
    return "\n".join(b for b in s.splitlines() if not b.lstrip().startswith('#'))


def _cari_rute_backend():
    """Berkas rute backend, bila repo backend ada di sebelah repo ini."""
    for calon in (
        os.path.join(AKAR, '..', 'tnt-be', 'routes', 'project_routes.py'),
        os.path.join(AKAR, '..', 'backend', 'routes', 'project_routes.py'),
    ):
        p = os.path.abspath(calon)
        if os.path.exists(p):
            return p
    return None


def periksa():
    masalah = []

    # ---------------- frontend ----------------
    if not os.path.exists(KOMPONEN):
        return ['project-report.component.ts tidak ditemukan']

    ts = _tanpa_komentar_ts(open(KOMPONEN, errors='ignore').read())

    m = re.search(r'export function titikKas\([^)]*\)[^{]*\{(.*?)\n\}', ts, re.S)
    if not m:
        masalah.append('project-report: `titikKas()` tidak ada')
    else:
        badan = m.group(1)
        if 'new Date(' in badan:
            masalah.append(
                'project-report: `titikKas()` memakai `new Date(...)` — '
                'pengemberan bulannya jadi bergantung zona waktu, dan Karma '
                'di repo ini berjalan pada UTC sehingga ujinya TIDAK akan '
                'menangkapnya'
            )
        if 'slice(0, 7)' not in badan:
            masalah.append(
                'project-report: `titikKas()` tidak lagi memotong tanggal '
                "sebagai teks (`slice(0, 7)`) — lihat catatan di atas"
            )
        if 'Math.abs(' not in badan:
            masalah.append(
                'project-report: `titikKas()` tidak lagi memakai `Math.abs` '
                'pada nominalnya — pembayaran bertanda negatif akan MENAMBAH '
                'saldo, arah yang berlawanan dan tanpa galat'
            )

    if 'arusKasTerkunci' not in ts:
        masalah.append(
            'project-report: `arusKasTerkunci` hilang — 403 akan tampil '
            'sebagai kartu kosong, bukan tab yang disembunyikan'
        )
    elif not re.search(r'arusKasTerkunci\.set\(\s*err\?\.status === 403', ts):
        masalah.append(
            'project-report: `arusKasTerkunci` tidak lagi disetel dari status '
            '403 — galat lain ikut menyembunyikan tabnya, atau 403 tidak'
        )

    if not re.search(r'tabAktif\s*=\s*computed', ts):
        masalah.append(
            'project-report: `tabAktif` hilang — pilihan tab yang terkunci '
            'akan menghasilkan kartu kosong tanpa penjelasan'
        )

    # ---------------- backend, bila ada ----------------
    rute = _cari_rute_backend()
    if rute:
        py = _tanpa_komentar_py(open(rute, errors='ignore').read())
        m = re.search(
            r'@router\.get\("/\{project_name\}/cashflow"\)(.*?)(?=@router\.|\Z)',
            py, re.S,
        )
        if not m:
            masalah.append(
                'project_routes.py: rute `/{project_name}/cashflow` tidak '
                'ditemukan'
            )
        elif 'require("payment_outgoing", "read")' not in m.group(1):
            masalah.append(
                'project_routes.py: rute arus kas TIDAK dijaga '
                '`payment_outgoing` — bila diturunkan ke `purchase` (level 1), '
                'tanggal dan nominal uang keluar terbuka bagi lapangan dan '
                'pengadaan, dan seluruh uji tetap hijau'
            )

    return masalah


if __name__ == '__main__':
    h = periksa()
    print(f'arus kas proyek: {len(h)}')
    print()
    for x in h:
        print(f'  {x}')
    sys.exit(1 if h else 0)
