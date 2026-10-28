import React from 'react';
import { DocThemeColors } from '../types';
import { SHEETGL_VERSION } from '../../datagrid/version';
import { LiveDemoBox } from '../components/LiveDemoBox';
import { CodeBlock } from '../components/CodeBlock';
import {
  ALL_COLUMNS_DEMO_DATA,
  DOC_CITY_OPTIONS,
  DOC_STATUS_OPTIONS,
} from '../data/docOptionsAndRows';

export interface QuickStartSectionProps {
  isDark: boolean;
  isTR: boolean;
  colors: DocThemeColors;
}

export const QuickStartSection: React.FC<QuickStartSectionProps> = ({
  isDark,
  isTR,
  colors,
}) => {
  return (
    <div>
      <div id="qs-live">
        <LiveDemoBox
          title={
            isTR
              ? 'Hızlı Başlangıç Canlı Örnek Tablosu'
              : 'Quick Start Live Interactive Grid'
          }
          subtitle={
            isTR
              ? 'Hücrelere çift tıklayarak düzenleyin, sağ alt kareden (Fill Handle) aşağı sürükleyin veya sütun başlığından filtreleyin.'
              : 'Double-click cells to edit, drag the bottom-right Fill Handle square, or click any column funnel icon to filter.'
          }
          hints={
            isTR
              ? [
                  'Hesap Kodu hücresini sağ alt köşeden aşağı sürükleyin (ACC-100001 → ACC-100004)',
                  'Değiştirilen hücrelerin DevExtreme tarzı yeşil vurgulandığını görün',
                ]
              : [
                  'Drag the Fill Handle on Account Code down (ACC-100001 → ACC-100004)',
                  'Notice how edited cells are highlighted in DevExtreme green',
                ]
          }
          height={255}
          isDark={isDark}
          isTR={isTR}
          colors={colors}
          data={ALL_COLUMNS_DEMO_DATA}
          columns={[
            { id: 'id', title: 'ID', type: 'number', decimalDigits: 0, width: 65, pinned: 'left', readonly: true },
            { id: 'code', title: isTR ? 'Hesap Kodu' : 'Account Code', type: 'text', width: 135, pinned: 'left' },
            { id: 'company', title: isTR ? 'Şirket Adı' : 'Company Name', type: 'text', width: 200 },
            { id: 'city', title: isTR ? 'Şehir' : 'City', type: 'dropdown', width: 165, options: DOC_CITY_OPTIONS },
            { id: 'balance', title: isTR ? 'Bakiye ($)' : 'Balance ($)', type: 'currency', width: 150, currencySymbol: '$', summaryType: 'sum' },
            { id: 'status', title: isTR ? 'Durum' : 'Status', type: 'select', width: 140, options: DOC_STATUS_OPTIONS },
            { id: 'isApproved', title: isTR ? 'Onaylı' : 'Approved', type: 'boolean', width: 95 },
          ]}
        />
      </div>

      <h3 id="qs-install" style={{ fontSize: 20, fontWeight: 800, margin: '24px 0 8px' }}>
        {isTR
          ? 'NPM ile Kurulum veya NPX ile Otomatik Şablon'
          : 'Install via NPM or Scaffold with NPX CLI'}
      </h3>
      <CodeBlock
        id="install-cmd"
        title={isTR ? 'Terminal — Paket Kurulumu & CLI' : 'Terminal — Installation & CLI Generator'}
        langBadge="BASH"
        isDark={isDark}
        isTR={isTR}
        colors={colors}
        code={
          isTR
            ? `# Seçenek A: NPM Registry üzerinden doğrudan kurulum (Önerilen)
npm install sheetgl

# İsteğe bağlı: Hazır kurumsal tablo bileşenini tek komutla projenize üretin
npx sheetgl init --dir ./src/components --name FinancialGrid --rows 1000

# Seçenek B: Yerel .tgz paketi veya proje dizini (path) üzerinden kurulum
npm install ./path/to/sheetgl-${SHEETGL_VERSION}.tgz
# veya doğrudan yerel klasör yolundan:
npm install ../path/to/sheetgl`
            : `# Option A: Install directly from NPM Registry (Recommended)
npm install sheetgl

# Optional: Scaffold a ready-to-run TypeScript grid component
npx sheetgl init --dir ./src/components --name FinancialGrid --rows 1000

# Option B: Install from a local .tgz tarball or project directory path
npm install ./path/to/sheetgl-${SHEETGL_VERSION}.tgz
# or directly from a local folder path:
npm install ../path/to/sheetgl`
        }
      />

      <h3 id="qs-code" style={{ fontSize: 20, fontWeight: 800, margin: '28px 0 8px' }}>
        {isTR
          ? 'Yukarıdaki Canlı Tablonun Tam Kodu'
          : 'Complete Code for the Live Example Above'}
      </h3>
      <CodeBlock
        id="usage-code"
        title="src/FinancialGrid.tsx"
        langBadge="TSX"
        isDark={isDark}
        isTR={isTR}
        colors={colors}
        code={`import React from 'react';
import { SheetGL, ColumnDef } from 'sheetgl';

const columns: ColumnDef[] = [
  { id: 'id', title: 'ID', type: 'number', decimalDigits: 0, width: 65, pinned: 'left', readonly: true },
  { id: 'code', title: '${isTR ? 'Hesap Kodu' : 'Account Code'}', type: 'text', width: 135, pinned: 'left' },
  { id: 'company', title: '${isTR ? 'Şirket Adı' : 'Company Name'}', type: 'text', width: 200 },
  {
    id: 'city',
    title: '${isTR ? 'Şehir' : 'City'}',
    type: 'dropdown',
    width: 165,
    options: [
      { value: 'Istanbul', label: 'Istanbul', icon: '🌉', subtitle: 'EMEA Hub • 20% Tax' },
      { value: 'London', label: 'London', icon: '🇬🇧', subtitle: 'Europe • 15% Tax' },
    ],
  },
  { id: 'balance', title: '${isTR ? 'Bakiye ($)' : 'Balance ($)'}', type: 'currency', width: 150, currencySymbol: '$', summaryType: 'sum' },
  { id: 'isApproved', title: '${isTR ? 'Onaylı' : 'Approved'}', type: 'boolean', width: 95 },
];

export default function FinancialGrid({ rows }: { rows: any[] }) {
  return (
    <div style={{ width: '100%', height: 600 }}>
      <SheetGL
        dataSource={rows}
        columns={columns}
        theme="apple-dark"
        locale="${isTR ? 'tr-TR' : 'en-US'}"
        batchEditMode={true}
      />
    </div>
  );
}`}
      />
    </div>
  );
};
