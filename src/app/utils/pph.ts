import FuzzySearch from 'fuzzy-search';
export interface IPPh {
  code: string;
  taxObjectName: string;
  type: string;
  tariff: number;
  otherKeyword?: string;
}
export const availablePPh: IPPh[] = [
  {
    code: '24-102-01',
    taxObjectName: 'Bunga selain yang dikenakan PPh Pasal 4 ayat (2).',
    type: 'PPh 23',
    tariff: 15,
  },
  { code: '24-103-01', taxObjectName: 'Royalti.', type: 'PPh 23', tariff: 15 },
  {
    code: '24-100-01',
    taxObjectName:
      'Hadiah, penghargaan, bonus dan lainnya selain yang telah dipotong PPh Pasal 21 ayat (1) huruf e UU PPh.',
    type: 'PPh 23',
    tariff: 15,
  },
  {
    code: '24-100-02',
    taxObjectName:
      'Sewa dan penghasilan lain sehubungan dengan penggunaan harta kecuali sewa tanah dan bangunan yang telah dikenai PPh Pasal 4 ayat (2) UU PPh.',
    type: 'PPh 23',
    otherKeyword: 'transportasi',
    tariff: 2,
  },
  {
    code: '24-104-01',
    taxObjectName: 'Jasa Teknik.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-02',
    taxObjectName: 'Jasa Manajemen.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-03',
    taxObjectName: 'Jasa Konsultan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-04',
    taxObjectName: 'Jasa penilai (appraisal).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-05',
    taxObjectName: 'Jasa aktuaris.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-06',
    taxObjectName: 'Jasa akuntansi, pembukuan, dan atestasi laporan keuangan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-07',
    taxObjectName: 'Jasa hukum.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-08',
    taxObjectName: 'Jasa arsitektur.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-09',
    taxObjectName: 'Jasa perencanaan kota dan arsitektur landscape.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-10',
    taxObjectName: 'Jasa perancang (design).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-11',
    taxObjectName:
      'Jasa pengeboran (drilling) di bidang penambangan minyak dan gas bumi (migas) kecuali yang dilakukan oleh Badan Usaha Tetap (BUT).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-12',
    taxObjectName:
      'Jasa penunjang di bidang usaha panas bumi dan penambangan minyak dan gas bumi (migas).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-13',
    taxObjectName:
      'Jasa  penambangan  dan  jasa  penunjang  selain  di  bidang  usaha  panas  bumi  dan penambangan minyak dan gas bumi (migas).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-14',
    taxObjectName: 'Jasa penunjang di bidang penerbangan dan bandar udara.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-15',
    taxObjectName: 'Jasa penebangan hutan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-16',
    taxObjectName: 'Jasa pengolahan limbah.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-17',
    taxObjectName:
      'Jasa penyedia tenaga kerja dan/atau tenaga ahli (outsourcing Services).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-18',
    taxObjectName: 'Jasa perantara dan/atau keagenan;',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-19',
    taxObjectName:
      'Jasa di bidang perdagangan surat-surat berharga, kecuali yang dilakukan Bursa Efek, Kustodian Sentral Efek Indonesia (KSEI) dan Kliring Penjaminan Efek Indonesia (KPEI).',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-20',
    taxObjectName:
      'Jasa kustodian/penyimpanan/penitipan, kecuali yang dilakukan oleh KSEI.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-21',
    taxObjectName: 'Jasa pengisian suara (dubbing) dan/atau sulih suara.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-22',
    taxObjectName: 'Jasa mixing film.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-23',
    taxObjectName:
      'Jasa pembuatan sarana promosi film, iklan, poster, foto, slide, klise, banner, pamphlet,\nbaliho dan folder.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-24',
    taxObjectName:
      'Jasa sehubungan dengan software atau hardware atau sistem komputer, termasuk perawatan, pemeliharaan dan perbaikan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-25',
    taxObjectName: 'Jasa pembuatan dan/atau pengelolaan website.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-26',
    taxObjectName: 'Jasa internet termasuk sambungannya.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-27',
    taxObjectName:
      'Jasa penyimpanan, pengolahan dan/atau penyaluran data, informasi, dan/atau program.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-28',
    taxObjectName:
      'Jasa instalasi/pemasangan mesin, peralatan, listrik, telepon, air, gas, AC dan/atau TV Kabel, selain yang dilakukan oleh Wajib Pajak yang ruang lingkupnya di bidang konstruksi dan mempunyai izin dan/atau sertifikasi sebagai pengusaha konstruksi.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-29',
    taxObjectName:
      'Jasa perawatan/perbaikan/pemeliharaan mesin, peralatan, listrik, telepon, air, gas, AC dan/atau TV kabel, selain yang dilakukan oleh Wajib Pajak yang ruang lingkupnya di bidang konstruksi dan mempunyai izin dan/atau sertifikasi sebagai pengusaha konstruksi.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-30',
    taxObjectName:
      'Jasa perawatan kendaraan dan/atau alat transportasi darat, laut dan udara.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-31',
    taxObjectName: 'Jasa maklon.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-33',
    taxObjectName: 'Jasa penyelenggara kegiatan atau event organizer.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-34',
    taxObjectName:
      'Jasa penyediaan tempat dan/atau waktu dalam media massa, media luar ruang atau media lain untuk penyampaian informasi, dan/atau jasa periklanan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-35',
    taxObjectName: 'Jasa pembasmian hama.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-36',
    taxObjectName: 'Jasa kebersihan atau cleaning service.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-37',
    taxObjectName: 'Jasa sedot septic tank.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-38',
    taxObjectName: 'Jasa pemeliharaan kolam.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-39',
    taxObjectName: 'Jasa katering atau tata boga.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-40',
    taxObjectName: 'Jasa freight forwarding.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-41',
    taxObjectName: 'Jasa logistik.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-42',
    taxObjectName: 'Jasa pengurusan dokumen.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-43',
    taxObjectName: 'Jasa pengepakan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-44',
    taxObjectName: 'Jasa loading dan unloading.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-45',
    taxObjectName:
      'Jasa laboratorium dan/atau pengujian kecuali yang dilakukan oleh lembaga atau institusi pendidikan dalam rangka penelitian akademis.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-46',
    taxObjectName: 'Jasa pengelolaan parkir.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-47',
    taxObjectName: 'Jasa penyondiran tanah.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-48',
    taxObjectName: 'Jasa penyiapan dan/atau pengolahan lahan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-49',
    taxObjectName: 'Jasa pembibitan dan/atau penanaman bibit.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-50',
    taxObjectName: 'Jasa pemeliharaan tanaman.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-51',
    taxObjectName: 'Jasa pemanenan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-52',
    taxObjectName:
      'Jasa pengolahan  hasil  pertanian,  perkebunan,  perikanan,  peternakan  dan/atau perhutanan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-53',
    taxObjectName: 'Jasa dekorasi.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-54',
    taxObjectName: 'Jasa pencetakan/penerbitan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-55',
    taxObjectName: 'Jasa penerjemahan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-56',
    taxObjectName:
      'Jasa pengangkutan/ekspedisi kecuali yang telah diatur dalam Pasal 15 Undang-Undang PPh.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-57',
    taxObjectName: 'Jasa pelayanan pelabuhan.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-58',
    taxObjectName: 'Jasa pengangkutan melalui jalur pipa.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-59',
    taxObjectName: 'Jasa pengelolaan penitipan anak.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-60',
    taxObjectName: 'Jasa pelatihan dan/atau kursus.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-61',
    taxObjectName: 'Jasa pengiriman dan pengisian uang ke ATM.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-62',
    taxObjectName: 'Jasa sertifikasi.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-63',
    taxObjectName: 'Jasa survey.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-64',
    taxObjectName: 'Jasa tester.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '24-104-65',
    taxObjectName:
      'Jasa selain jasa-jasa tersebut di atas yang pembayarannya dibebankan pada APBN atau APBD.',
    type: 'PPh 23',
    tariff: 2,
  },
  {
    code: '28-402-01',
    taxObjectName: 'Pengalihan Hak atas Tanah dan/atau Bangunan.',
    type: 'PPh 4(2)',
    tariff: 2.5,
  },
  {
    code: '28-403-02',
    taxObjectName: 'Persewaan tanah dan/atau bangunan.',
    type: 'PPh 4(2)',
    tariff: 10,
  },
  {
    code: '28-405-01',
    taxObjectName: 'Hadiah undian.',
    type: 'PPh 4(2)',
    tariff: 25,
  },
  {
    code: '28-409-22',
    taxObjectName:
      'Pekerjaan konstruksi yang dilakukan oleh Penyedia Jasa yang memiliki sertifikat badan usaha kualifikasi kecil atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    type: 'PPh 4(2)',
    tariff: 1.75,
  },
  {
    code: '28-409-23',
    taxObjectName:
      'Pekerjaan konstruksi yang dilakukan oleh Penyedia Jasa yang tidak memiliki sertifikat badan usaha atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    type: 'PPh 4(2)',
    tariff: 4,
  },
  {
    code: '28-409-24',
    taxObjectName:
      'Pekerjaan konstruksi yang dilakukan oleh Penyedia Jasa yang memiliki sertifikat selain sertifikat badan usaha kualifikasi kecil atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    type: 'PPh 4(2)',
    tariff: 2.65,
  },
  {
    code: '28-409-25',
    taxObjectName:
      'Pekerjaan konstruksi terintegrasi yang dilakukan oleh Penyedia Jasa yang memiliki sertifikat badan usaha.',
    type: 'PPh 4(2)',
    tariff: 2.65,
  },
  {
    code: '28-409-26',
    taxObjectName:
      'Pekerjaan konstruksi terintegrasi yang dilakukan oleh Penyedia Jasa yang tidak memiliki sertifikat badan usaha.',
    type: 'PPh 4(2)',
    tariff: 4,
  },
  {
    code: '28-409-27',
    taxObjectName:
      'Jasa konsultansi konstruksi yang dilakukan oleh Penyedia Jasa yang memiliki sertifikat badan usaha atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    type: 'PPh 4(2)',
    tariff: 3.5,
  },
  {
    code: '28-409-28',
    taxObjectName:
      'Jasa konsultansi konstruksi yang dilakukan oleh Penyedia Jasa yang tidak memiliki sertifikat badan usaha atau sertifikat kompetensi kerja untuk usaha orang perseorangan.',
    type: 'PPh 4(2)',
    tariff: 6,
  },
  {
    code: '28-417-02',
    taxObjectName:
      'Bunga simpanan yang dibayarkan oleh Koperasi kepada anggota Wajib Pajak Orang Pribadi (bunga di atas Rp240.000,00).',
    type: 'PPh 4(2)',
    tariff: 10,
  },
  {
    code: '28-423-01',
    taxObjectName:
      'Transaksi dengan Wajib Pajak yang menggunakan tarif Peraturan Pemerintah Nomor 23 Tahun 2018 tentang Pajak Penghasilan atas Penghasilan dari Usaha yang Diterima atau Diperoleh Wajib Pajak yang Memiliki Peredaran Bruto Tertentu.',
    type: 'PPh 4(2)',
    tariff: 0.5,
  },
  {
    code: '28-410-02',
    taxObjectName:
      'Imbalan yang Dibayarkan/Terutang kepada Perusahaan Pelayaran Dalam Negeri.',
    type: 'PPh 15',
    tariff: 1.2,
  },
  {
    code: '28-411-02',
    taxObjectName:
      'Imbalan Charter Kapal Laut dan/atau Pesawat Udara yang Dibayarkan/Terutang kepada Perusahaan Pelayaran dan/atau Penerbangan Luar Negeri melalui BUT.',
    type: 'PPh 15',
    tariff: 2.64,
  },
  {
    code: '29-101-01',
    taxObjectName:
      'Imbalan  Charter  Pesawat  Udara  yang  Dibayarkan/Terutang  kepada  Perusahaan Penerbangan Dalam Negeri.',
    type: 'PPh 15',
    tariff: 1.8,
  },
  {
    code: '21-100-01',
    taxObjectName:
      'Tidak final -	Pegawai Negeri Sipil, Anggota Tentara Nasional Indonesia, Anggota Polisi Republik Indonesia atau Pejabat Negara',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-02',
    taxObjectName:
      'Tidak final - Penerima Pensiun yang menerima penghasilan secara teraturs',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-03',
    taxObjectName: 'Tidak final - Pegawai Tidak Tetap atau Tenaga Kerja Lepas',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-04',
    taxObjectName: 'Tidak final - Distributor Multi Level Marketing (MLM)',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-05',
    taxObjectName: 'Tidak final - Petugas Dinas Luar Asuransi',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-06',
    taxObjectName: 'Tidak final - Penjaja Barang Dagangan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-07',
    taxObjectName: 'Tidak final - Tenaga Ahli',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-08',
    taxObjectName:
      'Tidak final - Bukan Pegawai yang Menerima Penghasilan yang Bersifat Berkesinambungan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-09',
    taxObjectName:
      'Tidak final - Bukan Pegawai yang Menerima Penghasilan yang Tidak Bersifat Berkesinambungan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-10',
    taxObjectName:
      'Tidak final - Anggota Dewan Komisaris atau Dewan Pengawas yang tidak Merangkap sebagai Pegawai Tetap',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-11',
    taxObjectName:
      'Tidak final - Mantan Pegawai yang menerima Jasa Produksi, Tantiem, Bonus atau Imbalan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-12',
    taxObjectName:
      'Tidak final - Pegawai yang melakukan  penarikan Dana Pensiun',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-13',
    taxObjectName: 'Tidak final - Peserta Kegiatan yang menerima imbalan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-14',
    taxObjectName:
      'Imbalan kepada Peserta Rapat, Konferensi, Sidang, Pertemuan, Kunjungan Kerja, Seminar, Lokakarya, atau Pertunjukan, atau Kegiatan Tertentu Lainnya',
    type: 'PPh 21',
    tariff: 5,
  },
  {
    code: '21-100-15',
    taxObjectName:
      'Imbalan kepada Peserta atau Anggota dalam Suatu Kepanitiaan sebagai Penyelenggara Kegiatan Tertentu',
    type: 'PPh 21',
    tariff: 5,
  },

  {
    code: '21-100-16',
    taxObjectName: 'Imbalan kepada Peserta Pendidikan, Pelatihan, dan Magang',
    type: 'PPh 21',
    tariff: 5,
  },

  {
    code: '21-100-25',
    taxObjectName:
      'Penghasilan berupa Uang Pesangon, Uang Manfaat Pensiun, Tunjangan Hari Tua, atau Jaminan Hari Tua yang Terutang atau Dibayarkan pada Tahun Ketiga dan Tahun-Tahun Berikutnya',
    type: 'PPh 21',
    tariff: 5,
  },
  {
    code: '21-100-33',
    taxObjectName:
      'Imbalan kepada Pemain Musik, Pembawa Acara, Penyanyi, Pelawak, Bintang Film, Bintang Sinetron, Bintang Iklan, Sutradara, Kru Film, Foto Model, Peragawan/Peragawati, Pemain Drama, Penari, Pemahat, Pelukis, Pembuat/Pencipta Konten pada Media yang Dibagikan secara Daring (Influencer, Selebgram, Blogger, Vlogger, dan Sejenis Lainnya), dan Seniman Lainnya',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-34',
    taxObjectName: 'Imbalan yang Diterima oleh Olahragawan',
    type: 'PPh 21',
    tariff: 2.5,
  },
  {
    code: '21-100-24',
    taxObjectName:
      'Upah Pegawai Tidak Tetap yang Dibayarkan secara Harian, Mingguan, Satuan dan Borongan dengan Penghasilan Bruto sampai dengan Rp2.500.000 Sehari',
    type: 'PPh 21',
    tariff: 0,
  },
  {
    code: '21-100-29',
    taxObjectName:
      'Upah Pegawai Tidak Tetap yang Dibayarkan secara Harian, Mingguan, Satuan dan Borongan dengan Penghasilan Bruto sampai dengan Rp2.500.000 Sehari yang Mendapat Fasilitas di Daerah Tertentu',
    type: 'PPh 21',
    tariff: 0,
  },
];
export const availablePPhSearch = new FuzzySearch(
  availablePPh,
  ['taxObjectName', 'code', 'otherKeyword'],
  { caseSensitive: false, sort: true }
);
