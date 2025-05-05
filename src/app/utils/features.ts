import FuzzySearch from 'fuzzy-search';

export interface IFeature {
  name: string;
  description: string;
  descriptionSubtitle: string;
  icon: string;
  routerLink: string;
}

const availableFeatures: IFeature[] = [
  {
    name: 'Create new purchase',
    description: 'Create a new purchase data.',
    descriptionSubtitle: 'Buat data pembelian baru.',
    icon: 'bag',
    routerLink: '/Purchase',
  },
  {
    name: 'View purchase list',
    description: 'View purchase list based on date or projects.',
    descriptionSubtitle:
      'Lihat daftar pembelian berdasarkan tanggal atau proyek.',
    icon: 'receipt',
    routerLink: '/Purchase/List',
  },
];

export const availableFeaturesSearch = new FuzzySearch(
  availableFeatures,
  ['name', 'description', 'descriptionSubtitle'],
  {
    caseSensitive: false,
    sort: true,
  }
);
