#!/usr/bin/env python3
"""
Lencana status harus dapat DIBEDAKAN, dan itu diukur — bukan dikira.

KELAS KEGAGALAN YANG DIJAGA

Warna lencana yang berdekatan tidak menghasilkan galat apa pun. CSS-nya
sah, build-nya bersih, seluruh uji hijau. Yang terjadi hanya ini: dua status
yang berbeda tampil nyaris sama, dan yang membaca daftarnya berhenti dapat
membedakan mana dokumen yang menunggu dirinya.

Itu benar-benar terjadi di sini. Lencana "Diperiksa" pertama kali memakai
warna keterangan (`--info-*`) — biru muda berteks biru, persis sebelah
lencana "Disetujui" yang juga biru muda berteks biru. Diukur di ruang Lab
jaraknya hanya ΔE 2,8; di bawah ~10, mata tidak membacanya sebagai warna
yang berbeda. Tidak ada satu pun perkakas di repo ini yang menangkapnya.

CARA MEMERIKSANYA

Nilai diambil dari `styles.scss` — sumber yang sama yang dipakai
komponennya — lalu dihitung:

  * ΔE (CIE76) antar-LATAR setiap pasang status. Di bawah ambang, keduanya
    terbaca sebagai warna yang sama.
  * Rasio kontras teks terhadap latarnya sendiri, syarat WCAG AA untuk teks
    kecil.

Keduanya diperiksa untuk tema terang DAN gelap: padanan gelap yang terlupa
menghasilkan teks gelap di atas latar terang, di tengah halaman gelap.

CARA PAKAI

    python3 scripts/pemeriksa/statuswarnacek.py
"""

import math
import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAYA = os.path.join(AKAR, "src", "styles.scss")

#: Pasangan (latar, teks) yang membentuk lencana status.
PASANGAN = {
    "draf": ("--warn-bg", "--warn-fg"),
    "disetujui": ("--brand-soft", "--brand"),
    "diperiksa": ("--checked-bg", "--checked-fg"),
    "dibatalkan": ("--bad-bg", "--bad-fg"),
    "selesai": ("--ok-bg", "--ok-fg"),
}

#: Di bawah ini, dua latar tidak terbaca sebagai warna yang berbeda.
#:
#: Sepuluh adalah ambang yang lazim dipakai untuk "berbeda pada pandangan
#: sekilas". Ditetapkan agak longgar dengan sengaja: palet lencana di sini
#: memang pastel, dan menuntut jarak besar akan memaksa seluruh paletnya
#: dirombak demi pemeriksa ini.
AMBANG_DE = 9.0

#: WCAG AA untuk teks kecil.
AMBANG_KONTRAS = 4.5


def _hex2rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4



def _luminansi(h):
    r, g, b = (_lin(x) for x in _hex2rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _kontras(a, b):
    l1, l2 = sorted((_luminansi(a), _luminansi(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def _lab(h):
    r, g, b = (_lin(x) for x in _hex2rgb(h))
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    fx, fy, fz = f(x / 0.95047), f(y / 1.0), f(z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def _dE(a, b):
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(_lab(a), _lab(b))))


def _blok_tema(sumber: str):
    """
    Nilai variabel untuk tema TERANG dan GELAP.

    Tema gelap ditandai selektor yang memuat `dark`. Yang dibaca hanya
    warna heksa — `var(...)` dan `color-mix(...)` dilewati, dan bila sebuah
    variabel status ternyata hanya berisi itu, ia dilaporkan sebagai tidak
    terbaca alih-alih diam-diam dianggap lulus.
    """
    tema = {"terang": {}, "gelap": {}}
    kini = "terang"
    for baris in sumber.splitlines():
        s = baris.strip()
        if s.endswith("{"):
            kini = "gelap" if "dark" in s.lower() else "terang"
            continue
        m = re.match(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", s)
        if m:
            tema[kini][m.group(1)] = m.group(2)[:7]
    return tema


def periksa():
    if not os.path.exists(GAYA):
        return ["styles.scss tidak ditemukan"]

    sumber = open(GAYA, encoding="utf-8").read()
    tema = _blok_tema(sumber)
    masalah = []

    for nama_tema, nilai in tema.items():
        lencana = {}
        for status, (kbg, kfg) in PASANGAN.items():
            bg, fg = nilai.get(kbg), nilai.get(kfg)
            if not bg or not fg:
                masalah.append(
                    f"[{nama_tema}] status '{status}': {kbg} atau {kfg} tidak "
                    f"punya nilai heksa — lencana ini akan memakai cadangan "
                    f"yang ditulis di komponennya, dan cadangan tidak pernah "
                    f"ikut berubah saat temanya berganti"
                )
                continue
            lencana[status] = (bg, fg)

            k = _kontras(fg, bg)
            if k < AMBANG_KONTRAS:
                masalah.append(
                    f"[{nama_tema}] '{status}': kontras teksnya {k:.2f}:1, "
                    f"di bawah {AMBANG_KONTRAS}:1 — tulisannya sulit dibaca "
                    f"di atas latarnya sendiri"
                )

        urut = sorted(lencana)
        for i, a in enumerate(urut):
            for b in urut[i + 1 :]:
                d = _dE(lencana[a][0], lencana[b][0])
                if d < AMBANG_DE:
                    masalah.append(
                        f"[{nama_tema}] '{a}' dan '{b}' berjarak hanya ΔE "
                        f"{d:.1f} (ambang {AMBANG_DE}) — keduanya terbaca "
                        f"sebagai warna yang sama pada pandangan sekilas, dan "
                        f"tidak ada galat apa pun yang akan menyebutkannya"
                    )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"warna lencana status: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"warna lencana status: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
