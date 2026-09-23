import { FileDropComponent } from './file-drop.component';

/** `containsFiles` privat; diuji lewat contoh, bukan lewat DOM. */
const punyaBerkas = (types: string[]): boolean => {
  const c = new FileDropComponent() as any;
  return c.containsFiles({ dataTransfer: { types } } as any);
};

describe('FileDropComponent: membedakan berkas luar dari seretan di halaman', () => {
  it('berkas dari penjelajah berkas dikenali', () => {
    expect(punyaBerkas(['Files'])).toBe(true);
  });

  it('gambar yang diseret DARI HALAMAN tidak dianggap unggahan', () => {
    /*
     * Inilah yang dilaporkan: menyeret pratinjau halaman PDF untuk
     * mengurutkannya memunculkan lapisan "Lepas untuk upload", dan
     * pengurutannya batal. Chrome menyertakan `Files` pada seretan gambar,
     * berikut penanda asalnya.
     */
    expect(punyaBerkas(['text/html', 'text/uri-list', 'Files'])).toBe(false);
    expect(punyaBerkas(['text/uri-list', 'Files'])).toBe(false);
  });

  it('seretan teks biasa bukan unggahan', () => {
    expect(punyaBerkas(['text/plain'])).toBe(false);
    expect(punyaBerkas([])).toBe(false);
  });

  it('tanpa dataTransfer tidak melempar', () => {
    const c = new FileDropComponent() as any;
    expect(c.containsFiles({} as any)).toBe(false);
  });
});
