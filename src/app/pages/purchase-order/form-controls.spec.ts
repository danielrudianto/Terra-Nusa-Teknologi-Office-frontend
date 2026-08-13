/**
 * Pengujian kelengkapan kontrol formulir.
 *
 * Angular melempar "Cannot find control with name" ketika markup memakai
 * `formControlName` yang tidak ada pada form group-nya — dan formulirnya
 * tidak dapat dibuka sama sekali.
 *
 * Kekeliruan ini tidak tertangkap oleh kompilasi: `formControlName` adalah
 * teks biasa bagi TypeScript. Ia baru muncul ketika halamannya dibuka,
 * sehingga bisa lolos ke pengguna bila formulir itu jarang dipakai.
 *
 * Terjadi pada PO 6.5.1: delapan kontrol hilang dari form group sementara
 * markup dan kodenya tetap memakainya.
 *
 * Pengujian ini membaca berkasnya sebagai teks, bukan menjalankan
 * komponennya — cukup untuk menangkap ketidakcocokan nama, dan jauh lebih
 * cepat daripada merender tujuh belas formulir.
 */
describe('Kelengkapan kontrol formulir purchase order', () => {
  // Berkas dibaca saat build lewat require.context; di lingkungan pengujian
  // Angular, seluruh berkas sumber tersedia melalui webpack.
  const konteks = (require as any).context(
    './purchase-order-create',
    true,
    /\.component\.(ts|html)$/,
    'raw',
  );

  const berkas: Record<string, string> = {};
  konteks.keys().forEach((k: string) => (berkas[k] = konteks(k)));

  const namaForm = Array.from(
    new Set(
      Object.keys(berkas)
        .map((k) => k.match(/purchase-order-create-([\w.]+)\//)?.[1])
        .filter((x): x is string => !!x),
    ),
  );

  it('menemukan berkas formulir', () => {
    expect(namaForm.length).toBeGreaterThan(10);
  });

  namaForm.forEach((nama) => {
    it(`PO ${nama}: setiap formControlName ada di form group`, () => {
      const ts =
        berkas[
          `./purchase-order-create-${nama}/purchase-order-create-${nama}.component.ts`
        ];
      const html =
        berkas[
          `./purchase-order-create-${nama}/purchase-order-create-${nama}.component.html`
        ];
      if (!ts || !html) return;

      const grup = ts.match(
        /formGroup: FormGroup = new FormGroup\(\{([\s\S]*?)\n {2}\}\);/,
      );
      if (!grup) return;

      const punya = new Set<string>();
      for (const m of grup[1].matchAll(
        /^\s*(\w+):\s*new Form(?:Control|Array)/gm,
      )) {
        punya.add(m[1]);
      }

      // Kontrol baris dibuat lewat FormBuilder; namanya ikut dikumpulkan
      // agar tidak dianggap hilang.
      for (const m of ts.matchAll(/formBuilder\.group\(\{([\s\S]*?)\n\s*\}\)/g)) {
        for (const n of m[1].matchAll(/^\s*(\w+):/gm)) punya.add(n[1]);
      }

      const hilang: string[] = [];
      for (const m of html.matchAll(/formControlName="(\w+)"/g)) {
        if (!punya.has(m[1]) && !hilang.includes(m[1])) hilang.push(m[1]);
      }

      expect(hilang).withContext(`kontrol hilang di PO ${nama}`).toEqual([]);
    });
  });
});
