#!/usr/bin/env python3
"""
Deklarasi CSS yang DIBUANG DIAM-DIAM oleh peramban.

KELAS KEGAGALAN YANG DIJAGA

CSS tidak punya galat. Deklarasi yang tidak sah tidak melempar, tidak
mengotori konsol, dan tidak membuat build merah — peramban hanya MEMBUANG
seluruh deklarasinya lalu melanjutkan seolah ia tidak pernah ditulis. Yang
terlihat cuma tata letak yang "tidak mau jadi".

Yang menjadi sebab pemeriksa ini ada:

    grid-template-columns: repeat(auto-fit, minmax(0, minmax(190px, 1fr)));

minmax() BERSARANG tidak sah — argumen kedua minmax() harus <track-breadth>,
dan minmax() bukan salah satunya. Bentuk itu tersalin ke ENAM grid di halaman
posisi keuangan. Keenamnya jatuh ke satu kolom: kartu KPI, petak rasio, dan
angka disposisi semuanya melebar penuh satu baris. Dua kali dilaporkan sebagai
"kok tampilannya begini", dan dua kali dikira soal selera tata letak.

CARA MEMERIKSANYA — PERAMBAN YANG MEMUTUSKAN, BUKAN DAFTAR POLA

Setiap deklarasi dipasang lewat `element.style.setProperty()`, lalu dibaca
kembali. Peramban mengembalikan string KOSONG untuk yang ditolaknya. Jadi yang
menilai sah atau tidak adalah mesin yang sama dengan yang menjalankan
aplikasinya — bukan daftar pola yang harus ditebak dan dirawat, dan yang hanya
menangkap kekeliruan yang sudah pernah terjadi.

YANG SENGAJA TIDAK DIPERIKSA

  * properti berawalan `-` (vendor prefix) dan `--` (custom property):
    keduanya memang boleh tidak dikenali;
  * at-rule dan isi `@media`/`@supports` tetap diperiksa, karena
    deklarasinya sama saja.

CARA PAKAI

    python3 scripts/pemeriksa/csstolakcek.py
"""

import json
import pathlib
import re
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src"

#: Peramban tanpa kepala yang dipakai menilai. Dicari, bukan diasumsikan:
#: yang tidak ada harus DIKATAKAN, bukan diam-diam membuat pemeriksa hijau.
CALON_CHROME = [
    "/opt/pw-browsers/chromium-*/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
]

# Komentar /* ... */ dibuang lebih dulu; isinya kerap memuat titik dua dan
# titik koma yang akan terbaca sebagai deklarasi.
_KOMENTAR = re.compile(r"/\*.*?\*/", re.S)
#: BLOK TERDALAM — isi `{ ... }` yang tidak lagi memuat `{`.
#:
#: Penting: tanpa ini, SELEKTOR ikut terbaca sebagai deklarasi. `.ab-save:hover`
#: berbentuk persis `prop: nilai`, dan peramban tentu menolak properti bernama
#: `ab-save` — pemeriksanya lalu melaporkan seribu empat ratus "temuan" palsu
#: dan menenggelamkan satu yang sungguhan.
_BLOK = re.compile(r"(@?[^{}]*)\{([^{}]*)\}", re.S)
#: Isi tanda kutip DIKOSONGKAN sebelum dicari deklarasinya.
#:
#: `background-image: url("data:image/svg+xml,...http://www.w3.org/...")`
#: memuat `http:` di dalam nilainya, dan itu terbaca sebagai deklarasi kedua
#: bernama `http`. Isinya tidak menentukan sah-tidaknya sebuah deklarasi —
#: yang menentukan bentuknya — jadi menggantinya dengan satu huruf aman, dan
#: menghilangkan seluruh kelas salah-baca ini sekaligus.
_KUTIP = re.compile(r'"[^"\n]*"|\'[^\'\n]*\'')
#: At-rule yang isinya DESKRIPTOR, bukan properti elemen.
#:
#: `src`, `font-display`, dan `font-weight: 100 900` sah di dalam
#: `@font-face` tetapi tidak berlaku pada sebuah elemen, sehingga
#: `setProperty` menolaknya — penolakan yang benar atas pertanyaan yang salah.
_DESKRIPTOR = ("@font-face", "@counter-style", "@property", "@page",
               "@font-palette-values", "@viewport")
#: `prop: nilai` di dalam satu blok.
_DEKLARASI = re.compile(r"([-a-zA-Z][-a-zA-Z0-9]*)\s*:\s*([^;{}]+)")


def _chrome() -> str | None:
    import glob

    for pola in CALON_CHROME:
        for c in sorted(glob.glob(pola), reverse=True):
            if pathlib.Path(c).is_file():
                return c
    return None


def _sass(scss: pathlib.Path) -> str:
    hasil = subprocess.run(
        [
            str(AKAR / "node_modules" / ".bin" / "sass"),
            "--no-source-map",
            # Peringatan usang milik pustaka pihak ketiga bukan urusan
            # pemeriksa ini; tanpa ini `styles.scss` gagal hanya karena
            # `@import` yang sudah usang di dalam Angular Material.
            "--quiet",
            "--quiet-deps",
            "--load-path",
            str(SUMBER),
            # `styles.scss` memakai `@use "@angular/material"`; tanpa jalur
            # ini ia gagal, dan berkas gaya global justru yang paling banyak
            # dipakai bersama.
            "--load-path",
            str(AKAR / "node_modules"),
            str(scss),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if hasil.returncode != 0:
        raise RuntimeError(f"{scss.name}: sass gagal — {hasil.stderr.strip()[:200]}")
    return hasil.stdout


def _deklarasi(css: str) -> list[tuple[str, str]]:
    """Seluruh pasangan (properti, nilai) di dalam CSS yang sudah dikompilasi."""
    css = _KOMENTAR.sub(" ", css)
    keluar = []
    css = _KUTIP.sub('"_"', css)
    isi_blok = "\n".join(
        isi
        for kepala, isi in _BLOK.findall(css)
        if not any(d in kepala.lower() for d in _DESKRIPTOR)
    )
    for prop, nilai in _DEKLARASI.findall(isi_blok):
        prop = prop.strip()
        nilai = " ".join(nilai.split())
        if prop.startswith("-"):
            # Vendor prefix dan custom property memang boleh tidak dikenali.
            continue
        # `!important` DIPISAHKAN, tidak ikut ke dalam nilainya.
        #
        # `setProperty(prop, "flex !important")` selalu mengembalikan string
        # kosong — bukan karena nilainya tidak sah, melainkan karena
        # prioritas harus diberikan sebagai argumen KETIGA. Tanpa pemisahan
        # ini, setiap `display: flex !important` di repo ini dilaporkan
        # sebagai temuan; ada seratusan, dan seratusan temuan palsu
        # menenggelamkan satu yang sungguhan.
        if nilai.lower().endswith("!important"):
            nilai = nilai[: -len("!important")].rstrip().rstrip("!").rstrip()
        if not nilai:
            continue
        keluar.append((prop, nilai))
    return keluar


SKRIP = """
<!doctype html><html><head><meta charset="utf-8"></head><body>
<script id="muatan" type="application/json">__MUATAN__</script>
<script>
  var daftar = JSON.parse(document.getElementById('muatan').textContent);
  var el = document.createElement('div');
  var tolak = [];
  for (var i = 0; i < daftar.length; i++) {
    var prop = daftar[i][0], nilai = daftar[i][1];
    el.style.cssText = '';
    try { el.style.setProperty(prop, nilai); } catch (e) {}
    if (el.style.getPropertyValue(prop) === '') {
      tolak.push(daftar[i]);
    }
  }
  var out = document.createElement('pre');
  out.id = 'hasil';
  out.textContent = JSON.stringify(tolak);
  document.body.appendChild(out);
</script></body></html>
"""


def periksa() -> list[str]:
    chrome = _chrome()
    if not chrome:
        raise RuntimeError("peramban tanpa kepala tidak ditemukan")

    # (properti, nilai) -> berkas pertama yang memuatnya. Kunci digabung
    # supaya deklarasi yang sama di lima berkas hanya diuji sekali.
    asal: dict[tuple[str, str], list[str]] = {}
    galat: list[str] = []
    berkas = sorted(SUMBER.rglob("*.scss"))
    for f in berkas:
        # Parsial (_nama.scss) ikut terkompilasi lewat berkas yang
        # mengimpornya; mengompilasinya sendiri kerap gagal karena
        # variabelnya belum ada.
        if f.name.startswith("_"):
            continue
        try:
            css = _sass(f)
        except RuntimeError as e:
            galat.append(str(e))
            continue
        rel = str(f.relative_to(AKAR))
        for pasangan in _deklarasi(css):
            asal.setdefault(pasangan, []).append(rel)

    daftar = [list(k) for k in asal]
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / "cek.html"
        p.write_text(
            SKRIP.replace("__MUATAN__", json.dumps(daftar, ensure_ascii=False)),
            encoding="utf-8",
        )
        hasil = subprocess.run(
            [
                chrome,
                "--headless",
                "--no-sandbox",
                "--disable-gpu",
                "--dump-dom",
                f"file://{p}",
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

    cocok = re.search(r'<pre id="hasil">(.*?)</pre>', hasil.stdout, re.S)
    if not cocok:
        raise RuntimeError(
            "peramban tidak mengembalikan hasil — "
            f"{(hasil.stderr or hasil.stdout).strip()[:300]}"
        )

    import html as _html

    tolak = json.loads(_html.unescape(cocok.group(1)))

    masalah = list(galat)
    for prop, nilai in sorted(tolak):
        tempat = asal.get((prop, nilai), [])
        di = tempat[0] if tempat else "?"
        lagi = f" (+{len(tempat) - 1} berkas lain)" if len(tempat) > 1 else ""
        masalah.append(
            f"{di}{lagi}: `{prop}: {nilai}` ditolak peramban — seluruh "
            f"deklarasinya dibuang tanpa galat, jadi aturannya tidak pernah "
            f"berlaku sama sekali"
        )
    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        # DIKATAKAN, bukan dilewati diam-diam: pemeriksa yang tidak berjalan
        # tetapi mencetak hijau membuat yang membacanya menyangka CSS-nya
        # sudah dinilai.
        print(f"CSS yang ditolak peramban: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"CSS yang ditolak peramban: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
