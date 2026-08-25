#!/usr/bin/env python3
"""Penjagaan tautan CoP pada formulir pembelian."""
import re, sys
h = open("src/app/pages/purchase/purchase-create/purchase-create.component.html", encoding="utf-8").read()
t = open("src/app/pages/purchase/purchase-create/purchase-create.component.ts", encoding="utf-8").read()
galat = []

if 'formControlName="isCopAttached"' in h:
    blok = h[h.index('formControlName="isCopAttached"') - 400 :
             h.index('formControlName="isCopAttached"') + 300]
    if '[disabled]="!!copTerpilih"' not in blok:
        galat.append('togel isCopAttached tidak dikunci saat ada tautan CoP')
else:
    galat.append("togel isCopAttached hilang")

if "isCopAttached: true" not in t:
    galat.append("terapkanCop tidak menyalakan isCopAttached")
if "this.copTerpilih = null" not in t or "isCopAttached: false" not in t:
    galat.append("lepasCop tidak mematikan isCopAttached")
if t.count("this.copTerpilih = c") != 1:
    galat.append("pengisian dari CoP ditulis lebih dari satu tempat")
if "periksaCopSpk" not in t or t.count("this.periksaCopSpk(") < 3:
    galat.append("peringatan CoP tidak diperiksa di setiap jalur pemilihan SPK")

for g in galat: print("GAGAL:", g)
print("SEMUA COCOK" if not galat else "")
sys.exit(1 if galat else 0)
