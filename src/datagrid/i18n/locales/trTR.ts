import { IGridLocale } from '../IGridLocale';

export const trTR: IGridLocale = {
  code: 'tr-TR',
  language: 'Türkçe (TR)',

  searchPlaceholder: 'Tabloda ara (Ctrl+F)...',
  addGroup: '+ Gruba Ekle',
  exportCsv: 'CSV İndir',
  exportExcel: 'Excel İndir',
  rows: 'Satır',
  columns: 'Sütun',
  systemTheme: 'Sistem (Otomatik)',

  formulaBarPlaceholder: 'Boş',
  totalRecords: 'Toplam Kayıt',

  searchValuesPlaceholder: 'Değer ara...',
  selectAll: '(Tümünü Seç)',
  clear: 'Temizle',
  apply: 'Uygula',
  cancel: 'İptal',
  loading: 'Yükleniyor...',
  noMatches: 'Kayıt bulunamadı',

  emptyText: '(Boş)',
  trueText: 'DOĞRU',
  falseText: 'YANLIŞ',
  ratingOutOf: (val: number) => `${val} / 5 Yıldız`,
  groupRecordCount: (count: number) => `${count.toLocaleString('tr-TR')} kayıt`,
};
