#!/usr/bin/env python3
"""
Layar yang MENYUNTING dokumen terkunci harus mengirim `rowVersion`.

KENAPA INI PUNYA PEMERIKSA SENDIRI

Penguncian optimistik di server sengaja MENERIMA permintaan tanpa versi.
Alasannya benar: backend dan frontend tidak dapat dinyalakan pada detik yang
sama, dan menolak permintaan tanpa versi berarti seluruh penyuntingan berhenti
pada jeda di antara kedua deploy.

Akibatnya, penjaga itu tidak menyala sendiri — ia MENUNGGU DIPANGGIL. Dan
sebuah penjaga yang menunggu dipanggil punya satu kelas kegagalan yang tidak
menghasilkan galat apa pun:

    Kolomnya ada. Kodenya di server ada. Ujinya hijau. Dan tidak ada satu pun
    permintaan yang menyertakan versinya, jadi tidak ada satu pun dokumen yang
    benar-benar terlindungi.

Semuanya terlihat benar. Tidak ada yang merah. Dua orang tetap saling menimpa
persis seperti sebelumnya.

Satu-satunya cara mengetahuinya adalah memeriksa bahwa layar penyuntingnya
benar-benar MEMBACA versi saat memuat dan MENGIRIMNYA saat menyimpan.

CARA PAKAI

    python3 scripts/pemeriksa/versicek.py
"""

import pathlib
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SUMBER = AKAR / "src" / "app"

# Layar yang menyunting dokumen yang sudah terkunci di server.
#
# Menambah baris di sini adalah cara menyatakan "layar ini ikut terlindungi",
# dan sejak saat itu pemeriksanya menjaga agar tidak mundur.
LAYAR = {
    "Certificate of Payment": (
        "pages/certificate-of-payment/certificate-of-payment-create/"
        "certificate-of-payment-create.component.ts"
    ),
    "Beban": "pages/expense/expense-create/expense-create.component.ts",
}


def periksa() -> list[str]:
    masalah: list[str] = []

    for nama, jalur in LAYAR.items():
        berkas = SUMBER / jalur
        if not berkas.exists():
            masalah.append(f"{nama}: {jalur} tidak ada")
            continue

        isi = berkas.read_text(encoding="utf-8")

        # (1) Versinya DIBACA saat memuat.
        if "rowVersion" not in isi:
            masalah.append(
                f"{nama}: tidak menyebut `rowVersion` sama sekali — layar ini "
                f"menyunting dokumen yang terkunci di server, tetapi tidak "
                f"pernah mengirim versinya, jadi penjagaannya tidak pernah "
                f"menyala"
            )
            continue

        membaca = "rowVersion ===" in isi or "rowVersion'" in isi or ".rowVersion" in isi
        if not membaca:
            masalah.append(
                f"{nama}: `rowVersion` tidak pernah DIBACA dari jawaban "
                f"server — yang dikirim saat menyimpan tidak mungkin versi "
                f"yang benar"
            )

        # (2) Versinya DIKIRIM saat menyimpan.
        if "rowVersion:" not in isi:
            masalah.append(
                f"{nama}: `rowVersion` dibaca tetapi tidak pernah DIKIRIM "
                f"dalam muatan penyimpanan"
            )

        # (3) `?? 0` adalah kekeliruan yang mahal.
        #
        # Nol adalah versi yang SAH — setiap baris dimulai dari sana. Memakai
        # nol sebagai pengganti "tidak tahu" berarti menabrak dokumen yang
        # memang belum pernah disunting, dan penyimpanan yang benar ditolak
        # tanpa sebab yang dapat dijelaskan kepada yang menekan Simpan.
        if "rowVersion: this." in isi and "?? 0" in isi:
            baris = [
                i + 1
                for i, b in enumerate(isi.split("\n"))
                if "?? 0" in b and "rowVersion" in b
            ]
            if baris:
                masalah.append(
                    f"{nama}: `rowVersion` memakai `?? 0` (baris "
                    f"{', '.join(map(str, baris))}) — nol adalah versi yang "
                    f"SAH, bukan penanda 'tidak tahu'. Pakai `?? undefined`."
                )

    return masalah


if __name__ == "__main__":
    h = periksa()
    print(f"pengiriman rowVersion: {len(h)}")
    print()
    for x in h:
        print(f"  {x}")
    sys.exit(1 if h else 0)
