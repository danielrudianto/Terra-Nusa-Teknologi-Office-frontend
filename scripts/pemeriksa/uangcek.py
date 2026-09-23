#!/usr/bin/env python3
"""
Nilai UANG ditulis dengan dua desimal — di mana pun, tanpa kecuali.

KENAPA INI PUNYA PEMERIKSA SENDIRI

Sebelum penyeragaman ini ada LIMA pemformat rupiah yang berdiri sendiri, plus
puluhan `Intl.NumberFormat` yang ditulis langsung di komponennya, plus empat
varian pipe `number` (`1.0-0`, `1.0-2`, `1.2-2`, `0.2-2`). Satu angka yang
sama karena itu ditulis berbeda tergantung layar mana yang menampilkannya.

Itu bukan soal selera:

  * PPN 11% dari angka bulat hampir tidak pernah bulat. Dibulatkan ke rupiah
    penuh, PPN yang tercetak selalu meleset dari perkaliannya sendiri — dan
    yang menerima dokumennya mengalikan DPP dengan 11%, mendapat angka lain,
    lalu menanyakan mana yang benar.
  * Dua tulisan berbeda untuk satu angka membuat KEDUANYA berhenti dipercaya.

Dan kelas kegagalannya sunyi: menambahkan `number: "1.0-0"` pada kolom rupiah
yang baru tidak melempar apa pun, tidak menggagalkan uji mana pun, dan
hasilnya tetap angka yang masuk akal — hanya berbeda dari kolom di sebelahnya.
Pemformat keenam akan muncul persis begitu.

APA YANG DIANGGAP BUKAN UANG

  * PERSEN — interpolasinya langsung diikuti tanda `%`.
  * VOLUME/KUANTITAS — ekspresinya menyebut `quantity`/`volume`, atau
    satuannya dicetak tepat sesudahnya (`{{ x.unit }}`).
  * Beberapa baris pagu CoP yang satuannya ada di kolom lain, disebut satu
    per satu di `KUANTITAS_MANUAL` di bawah.

CARA PAKAI

    python3 scripts/pemeriksa/uangcek.py
"""

import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

BENTUK_UANG = {"1.2-2"}

POLA_SITUS = re.compile(
    r'([\w$().?\[\]\'"\s+*/\-]{1,120}?)\|\s*number:\s*["\']([0-9]\.[0-9]-[0-9])["\']'
)
POLA_PERSEN = re.compile(
    r'\|\s*number:\s*["\'][0-9]\.[0-9]-[0-9]["\']\s*\)?\s*\}\}'
    r'\s*(?:</[a-z]+>\s*|\)\s*)*%'
)
POLA_KUANTITAS = re.compile(r"(?i)\b(quantity|_volume|\.volume)\b")
POLA_SATUAN = re.compile(r'\|\s*number:[^}]*\}\}\s*(?:<em>)?\s*\{\{\s*\w+\.unit\s*\}\}')

# Kuantitas yang satuannya dicetak di KOLOM LAIN, jadi tidak terdeteksi pola
# di atas. Disebut satu per satu supaya dapat diperiksa, bukan ditebak.
KUANTITAS_MANUAL = {
    ("pages/certificate-of-payment/certificate-of-payment-check/"
     "certificate-of-payment-check.component.html", 118),
    ("pages/certificate-of-payment/certificate-of-payment-pratinjau/"
     "certificate-of-payment-pratinjau.component.html", 101),
    ("pages/certificate-of-payment/certificate-of-payment-pratinjau/"
     "certificate-of-payment-pratinjau.component.html", 110),
    ("pages/certificate-of-payment/certificate-of-payment-view/"
     "certificate-of-payment-view.component.html", 275),
    ("mobile/persetujuan-cop/persetujuan-cop.component.html", 143),
}

# HARGA SATUAN yang sengaja lebih presisi.
#
# `{{ qty }} {{ unit }} × {{ price }}` harus tetap dapat dikalikan menjadi
# jumlah di sebelah kanannya. Dipaksa dua desimal, perkaliannya berhenti cocok
# — dan komentar di berkasnya sendiri menyebut hal itu sebagai sesuatu yang
# sudah pernah membingungkan orang. Dua desimal tetap MINIMUM di sini.
PRESISI_LEBIH = {
    ("pages/purchase-order/purchase-order-view/"
     "purchase-order-view.component.html", "1.2-4"),
}

# Pemformat yang memang BUKAN nilai dokumen.
#
#   * `short-currency.pipe`   bentuk ringkas "1,2 jt" untuk kartu sempit.
#   * `chart-dasar` (ringkas) label sumbu grafik "1,2 M" / "350 jt".
#   * `tender-gambar`         hanya dipakai untuk kuantitas.
#   * `angkaSatuan`/`kuantitas` volume.
BERKAS_DIKECUALIKAN = {
    "pipes/short-currency.pipe.ts",
    "helpers/tender-gambar.helper.ts",
}


def periksa() -> list[str]:
    masalah: list[str] = []
    diperiksa = 0

    # --- (1) pipe `number` pada template --------------------------------
    for html in sorted(SUMBER.rglob("*.html")):
        rel = str(html.relative_to(SUMBER))
        baris = html.read_text(encoding="utf-8").split("\n")
        for i, teks in enumerate(baris, 1):
            for m in POLA_SITUS.finditer(teks):
                ekspresi, fmt = m.group(1), m.group(2)
                diperiksa += 1
                if POLA_PERSEN.search(teks):
                    continue
                if POLA_KUANTITAS.search(ekspresi) or POLA_SATUAN.search(teks):
                    continue
                if (rel, i) in KUANTITAS_MANUAL:
                    continue
                if (rel, fmt) in PRESISI_LEBIH:
                    continue
                if fmt not in BENTUK_UANG:
                    masalah.append(
                        f"{rel}:{i}: nilai uang memakai `number: \"{fmt}\"`, "
                        f"bukan `\"1.2-2\"` — "
                        f"`{' '.join(ekspresi.split())[:50]}`"
                    )

    if diperiksa < 200:
        masalah.append(
            f"hanya menemukan {diperiksa} situs angka — pemeriksa ini mungkin "
            f"menunjuk tempat yang salah, dan pemeriksa yang tidak menemukan "
            f"apa-apa selalu hijau"
        )

    # --- (2) pemformat yang membulatkan ke rupiah penuh ------------------
    #
    # `maximumFractionDigits: 0` pada nilai uang adalah bentuk lama yang
    # persis sedang dihapus. Yang menuliskannya lagi tidak akan tahu aturan
    # ini ada.
    for ts in sorted(SUMBER.rglob("*.ts")):
        rel = str(ts.relative_to(SUMBER))
        if rel.endswith(".spec.ts") or rel in BERKAS_DIKECUALIKAN:
            continue
        isi = ts.read_text(encoding="utf-8")
        for i, teks in enumerate(isi.split("\n"), 1):
            if re.search(r"maximumFractionDigits:\s*0\b", teks):
                masalah.append(
                    f"{rel}:{i}: `maximumFractionDigits: 0` — nilai uang yang "
                    f"dibulatkan ke rupiah penuh. PPN 11% dari angka bulat "
                    f"hampir tidak pernah bulat, jadi angkanya berhenti cocok "
                    f"dengan perkaliannya sendiri. Pakai `uangDokumen()` di "
                    f"`helpers/uang.helper.ts`."
                )

    # --- (3) format Excel yang membulatkan ke rupiah penuh ---------------
    #
    # Lembar Excel yang sama pernah memakai `#,##0` di satu tempat dan
    # `#,##0.00` di tempat lain. Yang membukanya menjumlahkan satu kolom,
    # membandingkannya dengan kolom di lembar sebelah, dan menemukan selisih
    # beberapa rupiah yang tidak ada sebabnya — selisih pembulatan yang
    # menumpuk sebaris demi sebaris.
    #
    # `HITUNGAN` adalah pengecualiannya: banyak dokumen dan banyak baris
    # barang memang bilangan bulat. Ia diberi nama sendiri supaya bedanya
    # terbaca di tempat pemakaiannya.
    for ts in sorted(SUMBER.rglob("*.ts")):
        rel = str(ts.relative_to(SUMBER))
        if rel.endswith(".spec.ts"):
            continue
        for i, teks in enumerate(ts.read_text(encoding="utf-8").split("\n"), 1):
            if "HITUNGAN" in teks:
                continue
            if re.search(r"""['\"]#,##0(?!\.)""", teks):
                masalah.append(
                    f"{rel}:{i}: format Excel `#,##0` pada kolom nominal — "
                    f"dibulatkan ke rupiah penuh, sementara kolom lain pada "
                    f"berkas yang sama menyimpan sen. Pakai `#,##0.00`, atau "
                    f"beri nama sendiri bila memang HITUNGAN."
                )

    # --- (4) pemformat rupiah keenam -------------------------------------
    for ts in sorted(SUMBER.rglob("*.ts")):
        rel = str(ts.relative_to(SUMBER))
        if rel.endswith(".spec.ts") or rel == "helpers/uang.helper.ts":
            continue
        isi = ts.read_text(encoding="utf-8")
        for m in re.finditer(
            r"function\s+(rupiah|rp|formatIDR|formatCurrency|uang)\s*\(", isi
        ):
            potong = isi[m.end():m.end() + 400]
            # `rupiahDokumen` ikut diterima: ia sendiri meneruskan ke
            # `uangDokumen`, dan namanya dipakai di banyak tempat.
            if "uangDokumen" in potong or "rupiahDokumen" in potong:
                continue
            if re.search(r"minimumFractionDigits:\s*2", potong):
                continue
            baris = isi[: m.start()].count("\n") + 1
            masalah.append(
                f"{rel}:{baris}: `{m.group(1)}()` memformat uang sendiri "
                f"tanpa meneruskan ke `uangDokumen()` dan tanpa "
                f"`minimumFractionDigits: 2` — inilah cara pemformat keenam "
                f"masuk"
            )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"keseragaman nilai uang: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
