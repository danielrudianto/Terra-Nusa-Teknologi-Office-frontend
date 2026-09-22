import { inisialBadan, pisahNamaBadan } from './nama-badan.component';

describe('nama badan usaha', () => {
  it('bentuk jadi akhiran, tidak tertulis dua kali', () => {
    expect(pisahNamaBadan('Aldmic Indonesia', 'PT.')).toEqual({ nama: 'Aldmic Indonesia', bentuk: 'PT.' });
    expect(pisahNamaBadan('PT. Aldmic Indonesia', 'PT.')).toEqual({ nama: 'Aldmic Indonesia', bentuk: 'PT.' });
    expect(pisahNamaBadan('CV Baja Selatan', 'CV')).toEqual({ nama: 'Baja Selatan', bentuk: 'CV' });
    expect(pisahNamaBadan('Samator Indo Gas TBK, PT.', '')).toEqual({ nama: 'Samator Indo Gas TBK', bentuk: 'PT.' });
  });

  it('pribadi/lainnya tidak ditampilkan', () => {
    expect(pisahNamaBadan('Budi', 'Pribadi')).toEqual({ nama: 'Budi', bentuk: '' });
    expect(pisahNamaBadan('Budi, Pribadi', null)).toEqual({ nama: 'Budi', bentuk: '' });
  });

  it('nama yang kebetulan diawali huruf bentuk tidak terpotong', () => {
    expect(pisahNamaBadan('Ptera Jaya', 'PT.').nama).toBe('Ptera Jaya');
  });

  it('inisial dari nama, bukan dari bentuk', () => {
    expect(inisialBadan('PT. Monotaro Indonesia', 'PT.')).toBe('M');
    expect(inisialBadan('', null)).toBe('?');
  });
});
