#!/usr/bin/env python3
"""
Baris yang TIDAK MUAT di layar ponsel — diukur, bukan dikira.

KELAS KEGAGALAN YANG DIJAGA

Tata letak yang meleset tidak menghasilkan galat apa pun. Tidak ada yang
melempar, tidak ada uji yang merah, build-nya hijau. Yang terjadi hanya ini:
sebuah baris lebih lebar daripada layarnya, dan satu-satunya yang mengetahuinya
adalah orang yang kebetulan membukanya di ponsel.

Tiga contoh nyata dari repo ini, semuanya diukur pada 390px:

  .prp-kat          kode 48 + nama 208 + persen 56 + porsi 45 + nilai 144
                    + lima celah 64 = 565px SEBELUM bilahnya dapat satu
                    piksel pun. Bilahnya menyusut ke nol dan barisnya tetap
                    melebihi layar.

  .prp-rinci__baris bilah 144 + nilai 136 + celah 25 + inden 61 = 366px,
                    menyisakan 24px untuk nama pemasok.

  .pml-tabel        tujuh kolom angka; digulir menyamping, dan gulirnya
                    membawa pergi kolom nama proyeknya.

SATU HAL YANG SEMPAT DIUKUR DI SINI, LALU DIBUANG

Ada pemeriksaan "angkanya terbungkus menjadi dua baris". Ia dibuang setelah
dicoba dirusak dengan sengaja dan TIDAK PERNAH menyala: angka seperti
`12.345.678.901` tidak punya tempat untuk dipenggal, jadi CSS tidak
membungkusnya — ia MELUBER, dan luberan itu sudah ditangkap pemeriksaan lebar
di bawah. Penjaga yang tidak dapat dibuat merah bukan penjaga.

TERUS TERANG SOAL APA YANG DIUKUR

Yang dirender di sini BUKAN template Angular-nya, melainkan potongan markup
yang ditulis tangan memakai KELAS YANG SAMA, diisi nilai terpanjang yang masuk
akal. Jadi yang diperiksa adalah CSS-nya, bukan seluruh halamannya.

Karena itu setiap potongan disertai daftar kelas yang harus benar-benar ada di
templatenya. Bila sebuah kelas berganti nama atau hilang, pemeriksa ini merah
karena FIKSTURNYA basi — bukan diam-diam menjadi hijau atas markup yang sudah
tidak dipakai siapa pun. Pemeriksa yang mengukur hal yang salah lebih buruk
daripada tidak ada.

CARA PAKAI

    python3 scripts/pemeriksa/lebarcek.py
"""

import json
import os
import pathlib
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

# Lebar layar yang diukur: iPhone SE / Android kecil. Di bawah ini praktis
# tidak ada lagi; di atasnya, yang muat di sini pasti muat.
LEBAR = 390

# ----------------------------------------------------------------------
# Fikstur: (nama, berkas scss, berkas html, kelas wajib, markup)
# ----------------------------------------------------------------------

FIKSTUR = [
    {
        "nama": "rincian kategori (laporan proyek)",
        "scss": "pages/project/project-report/project-report.component.scss",
        "html": "pages/project/project-report/project-report.component.html",
        "kelas": [
            "prp-kat",
            "prp-kat__kode",
            "prp-kat__nama",
            "prp-kat__rel",
            "prp-kat__pct",
            "prp-kat__kontrak",
            "prp-kat__nilai",
        ],
        "markup": """
          <div class="prp-kat">
            <span class="prp-kat__kode">MATL</span>
            <span class="prp-kat__nama">Pekerjaan Beton Bertulang Struktur Atas</span>
            <span class="prp-kat__rel"><span style="width:88%"></span></span>
            <span class="prp-kat__pct">31,4%</span>
            <span class="prp-kat__kontrak">27% K</span>
            <span class="prp-kat__nilai">1.234.567.890</span>
          </div>
        """,
    },
    {
        "nama": "pemasok di dalam kategori",
        "scss": "pages/project/project-report/project-report.component.scss",
        "html": "pages/project/project-report/project-report.component.html",
        "kelas": [
            "prp-rinci",
            "prp-rinci__baris",
            "prp-rinci__nama",
            "prp-rinci__bar",
            "prp-rinci__nilai",
        ],
        "markup": """
          <div class="prp-rinci">
            <div class="prp-rinci__baris">
              <span class="prp-rinci__nama">PT Sumber Bangunan Sejahtera Abadi</span>
              <span class="prp-rinci__bar"><span style="width:70%"></span></span>
              <span class="prp-rinci__nilai">987.654.321</span>
            </div>
          </div>
        """,
    },
    {
        "nama": "ringkasan angka (KPI)",
        "scss": "pages/project/project-report/project-report.component.scss",
        "html": "pages/project/project-report/project-report.component.html",
        "kelas": ["prp-kpi", "prp-sel", "prp-label", "prp-nilai", "prp-ket"],
        "markup": """
          <div class="prp-kpi">
            <div class="prp-sel">
              <div class="prp-label">BIAYA PERIODE 2026</div>
              <div class="prp-nilai">12.345.678.901</div>
              <div class="prp-ket">87,4% dari biaya seumur proyek</div>
            </div>
          </div>
        """,
    },
    {
        "nama": "kartu daftar proyek",
        "scss": "pages/project/project-margin-list/project-margin-list.component.scss",
        "html": "pages/project/project-margin-list/project-margin-list.component.html",
        "kelas": [
            "pml-kartu",
            "pml-kartu__kepala",
            "pml-kartu__kode",
            "pml-kartu__nama",
            "pml-kartu__angka",
            "pml-kartu__margin",
            "pml-kartu__persen",
        ],
        "markup": """
          <div class="pml-kartu">
            <button class="pml-kartu__kepala">
              <span class="pml-kartu__judul">
                <span class="pml-kartu__kode">R501-A</span>
                <span class="pml-kartu__nama">Pembangunan Gedung Serbaguna Tahap Dua</span>
              </span>
              <span class="pml-kartu__angka">
                <span class="pml-kartu__margin">-1.234.567.890</span>
                <span class="pml-kartu__persen">-142,7%</span>
              </span>
              <span class="pml-kartu__panah">v</span>
            </button>
          </div>
        """,
    },
]

SKRIP_UKUR = r"""
const { chromium } = require('playwright');
(async () => {
  const [berkas, lebar] = [process.argv[2], Number(process.argv[3])];
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROME || undefined,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: lebar, height: 800 } });
  await page.goto('file://' + berkas);
  const hasil = await page.evaluate((lebar) => {
    const keluar = [];
    // Halamannya sendiri tidak boleh dapat digulir menyamping.
    if (document.documentElement.scrollWidth > lebar) {
      keluar.push({
        apa: 'halaman',
        lebar: document.documentElement.scrollWidth,
        batas: lebar,
      });
    }
    // Tiap fikstur diperiksa sendiri: isi yang meluber keluar wadahnya tidak
    // selalu melebarkan halamannya (overflow dapat tersembunyi di induknya).
    for (const el of document.querySelectorAll('[data-fikstur]')) {
      const anak = el.firstElementChild;
      if (!anak) continue;
      if (anak.scrollWidth > anak.clientWidth + 1) {
        keluar.push({
          apa: el.getAttribute('data-fikstur'),
          lebar: anak.scrollWidth,
          batas: anak.clientWidth,
        });
      }
    }
    return keluar;
  }, lebar);
  await browser.close();
  console.log(JSON.stringify(hasil));
})().catch((e) => {
  console.error(String(e));
  process.exit(2);
});
"""


def _sass(scss: pathlib.Path) -> str:
    """Kompilasi SCSS komponen menjadi CSS biasa."""
    hasil = subprocess.run(
        [
            str(AKAR / "node_modules" / ".bin" / "sass"),
            "--no-source-map",
            "--load-path",
            str(AKAR / "src"),
            str(scss),
        ],
        capture_output=True,
        text=True,
    )
    if hasil.returncode != 0:
        raise RuntimeError(f"sass gagal untuk {scss.name}: {hasil.stderr.strip()}")
    return hasil.stdout


def _playwright_ada() -> bool:
    """Playwright dapat dipanggil DAN perambannya terpasang."""
    lingkungan = dict(os.environ)
    if "PLAYWRIGHT_BROWSERS_PATH" not in lingkungan and os.path.isdir(
        "/opt/pw-browsers"
    ):
        lingkungan["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"
    try:
        hasil = subprocess.run(
            [
                "node",
                "-e",
                "require('playwright').chromium.executablePath()",
            ],
            capture_output=True,
            text=True,
            cwd=str(AKAR),
            env=lingkungan,
            timeout=60,
        )
    except Exception:  # noqa: BLE001
        return False
    return hasil.returncode == 0


def periksa() -> list[str]:
    masalah: list[str] = []

    # --- (1) fiksturnya tidak basi --------------------------------------
    dipakai = []
    for f in FIKSTUR:
        html = SUMBER / f["html"]
        if not html.exists():
            masalah.append(f'{f["nama"]}: {f["html"]} tidak ada')
            continue
        isi = html.read_text(encoding="utf-8")
        hilang = [k for k in f["kelas"] if f'"{k}"' not in isi and f"{k} " not in isi]
        if hilang:
            masalah.append(
                f'{f["nama"]}: kelas {", ".join(hilang)} tidak ada lagi di '
                f'{f["html"]} — fikstur pemeriksa ini basi, dan mengukurnya '
                f"berarti melaporkan hijau atas markup yang tidak dipakai "
                f"siapa pun"
            )
            continue
        dipakai.append(f)

    if not dipakai:
        return masalah or ["tidak ada fikstur yang dapat diukur"]

    # --- (2) diukur di peramban sungguhan --------------------------------
    css_per_berkas = {}
    for f in dipakai:
        if f["scss"] not in css_per_berkas:
            try:
                css_per_berkas[f["scss"]] = _sass(SUMBER / f["scss"])
            except RuntimeError as e:
                masalah.append(str(e))
                css_per_berkas[f["scss"]] = ""

    bagian = "\n".join(
        f'<div data-fikstur="{f["nama"]}">{f["markup"]}</div>' for f in dipakai
    )
    halaman = f"""<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* Tanpa `box-sizing` yang sama seperti aplikasinya, angkanya bukan angka
     yang sama. */
  *, *::before, *::after {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; font-family: sans-serif; }}
  /* Aplikasinya memberi jarak tepi pada halaman; ditirukan supaya lebar yang
     tersedia bagi barisnya sama dengan keadaan sebenarnya. */
  [data-fikstur] {{ padding: 0 1rem; }}
{chr(10).join(css_per_berkas.values())}
</style></head><body>
{bagian}
</body></html>"""

    with tempfile.TemporaryDirectory() as d:
        ph = pathlib.Path(d) / "ukur.html"
        ph.write_text(halaman, encoding="utf-8")
        ps = pathlib.Path(d) / "ukur.js"
        ps.write_text(SKRIP_UKUR, encoding="utf-8")

        lingkungan = dict(os.environ)
        # Hanya disetel bila tempatnya memang ada.
        #
        # `setdefault` ke jalur yang tidak ada JUSTRU mematahkannya: Playwright
        # akan mencari peramban di sana dan berhenti, alih-alih memakai tempat
        # bawaannya sendiri.
        if "PLAYWRIGHT_BROWSERS_PATH" not in lingkungan and os.path.isdir(
            "/opt/pw-browsers"
        ):
            lingkungan["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

        hasil = subprocess.run(
            ["node", str(ps), str(ph), str(LEBAR)],
            capture_output=True,
            text=True,
            cwd=str(AKAR),
            env=lingkungan,
            timeout=180,
        )

    if hasil.returncode != 0:
        masalah.append(
            f"pengukuran gagal dijalankan: {hasil.stderr.strip()[:400]}"
        )
        return masalah

    for t in json.loads(hasil.stdout.strip().splitlines()[-1]):
        masalah.append(
            f'{t["apa"]}: lebarnya {t["lebar"]}px pada layar {LEBAR}px '
            f'(muat {t["batas"]}px) — barisnya melebihi layar, dan '
            f"satu-satunya yang mengetahuinya adalah yang membukanya di ponsel"
        )

    return masalah


if __name__ == "__main__":
    # Playwright BUKAN dependensi proyek ini.
    #
    # Menambahkannya berarti setiap `npm ci` — termasuk di CI — mengunduh
    # peramban ratusan megabita demi satu pemeriksa tata letak. Itu keputusan
    # yang bukan milik pemeriksa ini.
    #
    # Jadi tanpa Playwright ia DILEWATI, dan mengatakannya dengan terang:
    # pemeriksa yang diam-diam tidak berjalan lebih buruk daripada yang tidak
    # ada, karena yang membaca keluarannya menyangka tata letaknya sudah
    # diukur.
    #
    # Supaya ia benar-benar menjaga di CI, tambahkan `playwright` sebagai
    # devDependency lalu `npx playwright install --with-deps chromium`
    # sebelum langkah Pemeriksa.
    if not _playwright_ada():
        print("lebar baris di ponsel: DILEWATI")
        print()
        print("  Playwright atau perambannya tidak tersedia, jadi tata letak")
        print("  ponsel TIDAK diukur sama sekali pada jalannya kali ini.")
        print("  Pasang: npm i -D playwright && npx playwright install chromium")
        sys.exit(0)

    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"lebar baris di ponsel: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"lebar baris di ponsel: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
