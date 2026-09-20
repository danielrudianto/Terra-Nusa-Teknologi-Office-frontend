#!/usr/bin/env python3
"""
Penggabungan menu Status Keuangan — janji yang mudah diam-diam dilanggar.

KELAS KEGAGALAN YANG DIJAGA

Tiga entri menu keuangan (Posisi Keuangan, KPI, Laba Rugi) digabung menjadi
satu: "Status Keuangan". KPI menjadi dua panel di dalam halamannya, laba rugi
menjadi kartu tautan yang hanya muncul untuk level 5.

Empat hal dapat rusak tanpa satu pun galat, dan tidak satu pun tertangkap uji
Karma — pengujian di peramban tidak dapat membaca berkas sumber:

  1. Alamat lama (`Laporan/Posisi-keuangan`, `Laporan/KPI`) berhenti
     dialihkan. Keduanya ada di riwayat peramban, di tab yang masih terbuka,
     dan di tautan yang sempat dikirim orang. Yang membukanya jatuh ke
     "tidak ditemukan" dan menyimpulkan laporannya DIHAPUS, bukan dipindah.
  2. Rute laba rugi ikut terbuang bersama entri menunya. Kartu tautan di
     dalam halaman lalu menunjuk alamat yang tidak ada — baru ketahuan saat
     ditekan.
  3. Kartu laba rugi berhenti dijaga level. Level 4 melihat pintu yang pasti
     ditolak, sekaligus diberi tahu bahwa ada laporan yang disembunyikan
     dari mereka.
  4. Alamat yang sama didaftarkan DUA KALI. Router memakai yang duluan,
     jadi yang kedua jadi blok mati — dan hidup kembali begitu urutannya
     dipindah. Sudah terjadi: merge dari dua device menambahkan kembali
     rute lama di bawah pengalihannya, dan seluruh uji tetap hijau.
  5. Panel KPI berhenti dimuat-saat-dibuka. Tanpa `@if`, komponennya tetap
     dibuat dan konstruktornya tetap memanggil `kpi/perusahaan` — yang
     menyusun laba rugi dua puluh empat bulan — untuk SETIAP orang yang
     membuka halaman ini, termasuk yang hanya ingin melihat quick ratio.
     Halamannya tetap benar; hanya lebih lambat, diam-diam.

CARA PAKAI

    python3 scripts/pemeriksa/gabungmenucek.py
"""

import os
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RUTE = os.path.join(AKAR, "src", "app", "app-routing.module.ts")
MENU = os.path.join(AKAR, "src", "app", "pages", "main", "main.component.ts")
HAL = os.path.join(
    AKAR, "src", "app", "pages", "report", "posisi-keuangan",
    "posisi-keuangan.component.html",
)

BARU = "Laporan/Status-keuangan"

#: Alamat yang pernah dipakai dan harus tetap sampai ke halaman barunya.
ALAMAT_LAMA = ("Laporan/Posisi-keuangan", "Laporan/KPI")

#: Entri menu yang sudah tidak boleh ada lagi di sidenav.
ENTRI_USANG = ("nav.posisiKeuangan", "nav.kpi", "nav.labaRugi")

#: Panel yang isinya harus dimuat saat dibuka.
PANEL_MALAS = (("kinerjaDibuka()", "app-kpi-kinerja"),
               ("antreanDibuka()", "app-kpi-antrean"))


def _baca(p):
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def periksa():
    masalah = []

    rute = _baca(RUTE)
    menu = _baca(MENU)
    hal = _baca(HAL)
    for nama, isi in (("app-routing.module.ts", rute),
                      ("main.component.ts", menu),
                      ("posisi-keuangan.component.html", hal)):
        if isi is None:
            masalah.append(f"{nama} tidak ditemukan")
    if masalah:
        return masalah

    # 1. pengalihan alamat lama
    for lama in ALAMAT_LAMA:
        i = rute.find(f"path: '{lama}'")
        if i < 0:
            masalah.append(
                f"alamat lama `{lama}` sudah tidak ada di rute — yang "
                f"membukanya dari riwayat peramban atau tab yang masih "
                f"terbuka jatuh ke halaman 'tidak ditemukan', dan "
                f"menyimpulkan laporannya dihapus"
            )
            continue
        potongan = rute[i:i + 240]
        if f"redirectTo: '{BARU}'" not in potongan:
            masalah.append(
                f"`{lama}` ada tetapi tidak dialihkan ke `{BARU}`"
            )
        if "pathMatch: 'full'" not in potongan:
            masalah.append(
                f"pengalihan `{lama}` tanpa `pathMatch: 'full'` — awalan "
                f"yang sama ikut tertangkap, dan alamat lain yang kebetulan "
                f"berawalan sama ikut dialihkan"
            )

    # 1b. TIDAK ADA DUPLIKAT alamat.
    #
    # Ini benar-benar terjadi: merge dari dua device menambahkan kembali
    # rute lama `Laporan/Posisi-keuangan` yang utuh, DI BAWAH pengalihan
    # yang menggantikannya. Hari itu tidak ada yang rusak — router memakai
    # yang duluan, dan yang duluan kebetulan pengalihannya — sehingga
    # seluruh uji hijau, build bersih, dan halamannya berperilaku benar.
    #
    # Yang tertinggal: satu blok mati yang menyatakan kebalikan dari
    # rancangannya, dan yang akan HIDUP KEMBALI begitu seseorang memindah
    # urutan blok rute. Diuji dan dipastikan: pada larik yang sama dengan
    # urutan terbalik, halaman lamalah yang menang.
    for alamat in ALAMAT_LAMA + (BARU, "Laporan/Laba-rugi"):
        n = rute.count(f"path: '{alamat}'")
        if n > 1:
            masalah.append(
                f"alamat `{alamat}` muncul {n} kali di daftar rute — router "
                f"memakai yang DULUAN, jadi sisanya blok mati yang "
                f"menyatakan kebalikan dari rancangannya, dan akan hidup "
                f"kembali begitu urutannya dipindah. Biasanya sisa merge "
                f"dari dua device"
            )

    # 2. rutenya sendiri masih ada
    if f"path: '{BARU}'" not in rute:
        masalah.append(f"rute `{BARU}` tidak ada — seluruh pengalihan di atas menunjuk ke kekosongan")
    if "path: 'Laporan/Laba-rugi'" not in rute:
        masalah.append(
            "rute laba rugi ikut terbuang bersama entri menunya — kartu "
            "tautan di dalam halaman menunjuk alamat yang tidak ada, dan itu "
            "baru ketahuan saat ditekan"
        )

    # 3. sidenav tinggal satu pintu
    if "name: 'nav.statusKeuangan'" not in menu:
        masalah.append("entri menu `nav.statusKeuangan` tidak ada di sidenav")
    for usang in ENTRI_USANG:
        if f"name: '{usang}'" in menu:
            masalah.append(
                f"entri menu `{usang}` masih ada — penggabungannya setengah "
                f"jalan, dan menu Laporan kembali memuat lebih dari satu "
                f"pintu keuangan"
            )

    # 4. kartu laba rugi: ada, menunjuk benar, dan dijaga level
    i = hal.find('routerLink="/Laporan/Laba-rugi"')
    if i < 0:
        masalah.append(
            "kartu tautan laba rugi hilang dari halaman — setelah entri "
            "menunya dibuang, tidak ada jalan tersisa untuk membukanya"
        )
    elif "bolehLabaRugi()" not in hal[max(0, i - 500):i]:
        masalah.append(
            "kartu laba rugi tidak lagi dijaga `bolehLabaRugi()` — level 4 "
            "melihat pintu yang pasti ditolak, sekaligus diberi tahu bahwa "
            "ada laporan yang disembunyikan dari mereka"
        )

    # 5. panel KPI dimuat saat dibuka
    for penanda, tag in PANEL_MALAS:
        j = hal.find(f"<{tag}>")
        if j < 0:
            masalah.append(f"`<{tag}>` tidak ada di halaman")
            continue
        if f"@if ({penanda})" not in hal[max(0, j - 300):j]:
            masalah.append(
                f"`<{tag}>` tidak lagi dibungkus `@if ({penanda})` — "
                f"komponennya tetap dibuat dan konstruktornya tetap "
                f"memanggil servernya untuk setiap orang yang membuka "
                f"halaman ini, walau panelnya tertutup. Halamannya tetap "
                f"benar; hanya lebih lambat, tanpa galat apa pun"
            )

    return masalah


if __name__ == "__main__":
    try:
        h = periksa()
    except Exception as e:  # noqa: BLE001
        print(f"penggabungan menu keuangan: pemeriksa gagal — {e}")
        sys.exit(1)
    print(f"penggabungan menu keuangan: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
