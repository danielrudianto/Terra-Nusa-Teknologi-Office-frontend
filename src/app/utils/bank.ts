import FuzzySearch from 'fuzzy-search';

export interface IBank {
  name: string;
  alias: string;
}

export const banks: IBank[] = [
  {
    name: 'PT BPD Bengkulu',
    alias: 'Bank Bengkulu',
  },
  {
    name: 'PT Bank Aceh',
    alias: 'Bank BPD Aceh',
  },
  {
    name: 'PT BPD Bali',
    alias: 'Bank BPD Bali',
  },
  {
    name: 'BPD Yogyakarta',
    alias: 'Bank BPD DIY',
  },
  {
    name: 'PT BPD Sulawesi Tengah',
    alias: 'Bank BPD Sulteng',
  },
  {
    name: 'PT Bank DKI',
    alias: 'Bank DKI',
  },
  {
    name: 'PT BPD Jawa Tengah',
    alias: 'Bank Jateng',
  },
  {
    name: 'PT BPD Jawa Timur',
    alias: 'Bank Jatim',
  },
  {
    name: 'PT BPD Kalimantan Barat',
    alias: 'Bank Kalbar',
  },
  {
    name: 'PT BPD Kalimantan Selatan',
    alias: 'Bank Kalsel',
  },
  {
    name: 'PT Bank Kalimantan Tengah',
    alias: 'Bank Kalteng',
  },
  {
    name: 'BPD Kalimantan Timur',
    alias: 'Bank Kaltim',
  },
  {
    name: 'PT Bank Lampung',
    alias: 'Bank Lampung',
  },
  {
    name: 'PT BPD Maluku',
    alias: 'Bank Maluku',
  },
  {
    name: 'PT Bank Mandiri, Tbk',
    alias: 'Bank Mandiri',
  },
  {
    name: 'PT BPD Nusa Tenggara Barat',
    alias: 'Bank NTB',
  },
  {
    name: 'PT BPD Nusa Tenggara Timur',
    alias: 'Bank NTT',
  },
  {
    name: 'PT BPD Papua',
    alias: 'Bank Papua',
  },
  {
    name: 'PT BPD Riau Dan Kepulauan Riau',
    alias: 'Bank Riau Kepri',
  },
  {
    name: 'PT BPD Sulawesi Utara',
    alias: 'Bank Sultra',
  },
  {
    name: 'PT BPD Sumatera Selatan Dan Bangka Belitung',
    alias: 'Bank Sumsel Babel',
  },
  {
    name: 'PT BPD Sumatera Utara',
    alias: 'Bank Sumut',
  },
  {
    name: 'PT Bank Central Asia Tbk.',
    alias: 'BCA',
  },
  {
    name: 'PT Bank Syariah Indonesia Tbk.,',
    alias: 'BSI',
  },
  {
    name: 'PT Bank BCA Syariah',
    alias: 'BCA Syariah',
  },
  {
    name: 'PT Bank Pembangunan Daerah Jawa Barat dan Banten, Tbk',
    alias: 'BJB',
  },
  {
    name: 'PT Bank Negara Indonesia (Persero), Tbk',
    alias: 'BNI',
  },
  {
    name: 'PT Bank BNI Syariah',
    alias: 'BNI Sayariah',
  },
  {
    name: 'PT Bank Rakyat Indonesia (Persero), Tbk',
    alias: 'BRI',
  },
  {
    name: 'PT Bank Raya Indonesia, Tbk.',
    alias: 'BRI Agro',
  },
  {
    name: 'PT Bank Bri Syariah',
    alias: 'BRI Syariah',
  },
  {
    name: 'PT Bank Syariah Mandiri',
    alias: 'BSI',
  },
  {
    name: 'PT Bank Tabungan Negara (Persero) Tbk',
    alias: 'BTN',
  },
  {
    name: 'PT Bank Bukopin, Tbk',
    alias: 'Bukopin',
  },
  {
    name: 'PT Bank Danamon Indonesia Tbk',
    alias: 'Danamon',
  },
  {
    name: 'PT Bank Maybank Indonesia Tbk',
    alias: 'Maybank',
  },
  {
    name: 'PT Bank Seabank Indonesia',
    alias: 'Seabank',
  },
  {
    name: 'PT Bank Antardaerah',
    alias: '',
  },
  {
    name: 'PT Bank Artha Graha Internasional, Tbk.',
    alias: '',
  },
  {
    name: 'PT Bank Bumi Arta, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Cimb Niaga, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Ekonomi Raharja, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Ganesha',
    alias: '',
  },
  {
    name: 'PT Bank Hana',
    alias: '',
  },
  {
    name: 'PT Bank Himpunan Saudara 906, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank ICB Bumiputera Tbk',
    alias: '',
  },
  {
    name: 'PT Bank ICBC Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Index Selindo',
    alias: '',
  },
  {
    name: 'PT Bank Maspion Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Mayapada International Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Mega, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Mestika Dharma',
    alias: '',
  },
  {
    name: 'PT Bank Metro Express',
    alias: '',
  },
  {
    name: 'PT Bank Muamalat Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Mutiara, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank NusantaraParahyangan,Tbk',
    alias: '',
  },
  {
    name: 'PT Bank OCBC NISP, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Of India Indonesia, Tbk',
    alias: '',
  },
  {
    name: 'PT BankPermata Tbk',
    alias: '',
  },
  {
    name: 'PT Bank SBI Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Sinarmas, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Syariah Mega Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank UOB Indonesia (Dahulu Uob Buana)',
    alias: '',
  },
  {
    name: 'PT Pan Indonesia Bank, Tbk',
    alias: '',
  },
  {
    name: 'PT QNB Bank Kesawan Tbk',
    alias: '',
  },
  {
    name: 'PT Anglomas Internasional Bank',
    alias: '',
  },
  {
    name: 'PT Bank Andara',
    alias: '',
  },
  {
    name: 'PT Bank Artos Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Bisnis Internasional',
    alias: '',
  },
  {
    name: 'PT Bank Fama Internasional',
    alias: '',
  },
  {
    name: 'PT Bank Harda Internasional',
    alias: '',
  },
  {
    name: 'PT Bank InaPerdana',
    alias: '',
  },
  {
    name: 'PT Bank Jabar Banten Syariah',
    alias: '',
  },
  {
    name: 'PT Bank Jasa Jakarta',
    alias: '',
  },
  {
    name: 'PT Bank Kesejahteraan Ekonomi',
    alias: '',
  },
  {
    name: 'PT Bank Mayora',
    alias: '',
  },
  {
    name: 'PT Bank Mitraniaga',
    alias: '',
  },
  {
    name: 'PT Bank Multi Arta Sentosa',
    alias: '',
  },
  {
    name: 'PT Bank Panin Syariah',
    alias: '',
  },
  {
    name: 'PT Bank Pundi Indonesia, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Royal Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Sahabat Purba Danarta',
    alias: '',
  },
  {
    name: 'PT Bank Sahabat Sampoerna',
    alias: '',
  },
  {
    name: 'PT Bank Sinar Harapan Bali',
    alias: '',
  },
  {
    name: 'PT Bank Syariah Bukopin',
    alias: '',
  },
  {
    name: 'PT Bank Tabungan Pensiunan Nasional, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Victoria International, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Victoria Syariah',
    alias: '',
  },
  {
    name: 'PT Bank Yudha Bhakti',
    alias: '',
  },
  {
    name: 'PT Centratama Nasional Bank',
    alias: '',
  },
  {
    name: 'PT Liman International Bank',
    alias: '',
  },
  {
    name: 'PT Nationalnobu',
    alias: '',
  },
  {
    name: 'PT Prima Master Bank',
    alias: '',
  },
  {
    name: 'PT Bank Commonwealth',
    alias: '',
  },
  {
    name: 'PT Bank Agris',
    alias: '',
  },
  {
    name: 'PT Bank ANZ Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank BNPParibas Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Capital Indonesia, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank DBS Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank KEB Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Maybank Syariah Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Mizuho Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Rabobank International Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank ResonaPerdania',
    alias: '',
  },
  {
    name: 'PT Bank Windu Kentjana International, Tbk',
    alias: '',
  },
  {
    name: 'PT Bank Woori Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank China Trust Indonesia',
    alias: '',
  },
  {
    name: 'PT Bank Sumitomo Mitsui Indonesia',
    alias: '',
  },
  {
    name: 'PT HSBC Indonesia',
    alias: 'HSBC',
  },
];

export const availableBankSearch = new FuzzySearch(banks, ['name', 'alias'], {
  caseSensitive: false,
  sort: true,
});
