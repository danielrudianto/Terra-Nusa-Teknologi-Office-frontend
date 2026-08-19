"""
Galat server yang ditampilkan MENTAH ke layar.

Sejak server menyebut penyebab lewat kode, `detail` berupa OBJEK:

    { "code": "PO_EDIT_FORBIDDEN", "message": "...", "context": {...} }

Menampilkannya langsung menghasilkan tulisan `[object Object]` di snackbar —
tepat pada saat penggunanya sedang menghadapi persoalan, dan justru pada
pesan yang paling perlu terbaca. Tidak ada galat di mana pun; layarnya
memang menampilkan apa yang diberikan kepadanya.

Yang benar: lewat `ServerMessageService.terjemahkan(e)`, yang mencari
`serverError.<KODE>` di berkas terjemahan, meneruskan `context` sebagai
parameternya, dan jatuh ke kalimat umum bila kodenya belum diterjemahkan.

Jalankan dari akar frontend:

    python3 scripts/pemeriksa/galatcek.py

Keluar dengan kode 1 bila masih ada yang menampilkan `detail` mentah.
"""

import os
import re
import sys
from glob import glob

FE = "src/app"

#: `error.detail` yang dipakai sebagai TEKS yang ditampilkan.
#:
#: Yang dicari pemakaian di dalam `snackBar.open(...)` maupun perangkaian
#: kalimat — bukan pembacaan `detail` untuk diperiksa isinya, yang memang sah.
POLA = re.compile(
    r"""(?:snackBar\.open|alert|\+)\s*\(?[^;]{0,200}?\w+\??\.error\??\.detail""",
    re.S,
)

#: Berkas yang memang tugasnya mengurai `detail`.
DIKECUALIKAN = ("services/server-message.service.ts",)


def main() -> int:
    temuan = []
    for p in sorted(glob(os.path.join(FE, "**", "*.ts"), recursive=True)):
        if p.endswith(".spec.ts") or any(x in p for x in DIKECUALIKAN):
            continue

        isi = open(p, encoding="utf-8").read()
        if ".error?.detail" not in isi and ".error.detail" not in isi:
            continue

        for m in POLA.finditer(isi):
            baris = isi[: m.start()].count("\n") + 1
            temuan.append((p, baris))

    if not temuan:
        print("galatcek: tidak ada galat server yang ditampilkan mentah")
        return 0

    berkas = sorted({p for p, _ in temuan})
    for p, baris in temuan:
        print(f"{p}:{baris}  `detail` ditampilkan mentah — pakai ServerMessageService")
    print(f"\ngalatcek: {len(temuan)} tempat pada {len(berkas)} berkas")
    return 1


if __name__ == "__main__":
    sys.exit(main())
