#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, '..');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function readPkgVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
    return pkg.version || '2.0.2';
  } catch {
    return '2.0.2';
  }
}

function printBanner() {
  const version = readPkgVersion();
  console.log(`
${CYAN}${BOLD}  ╔══════════════════════════════════════════════════════════════╗
  ║   ⚡ SheetGL v${version} — Enterprise Canvas Excel DataGrid   ║
  ╚══════════════════════════════════════════════════════════════╝${RESET}
`);
}

function printHelp() {
  printBanner();
  console.log(`${BOLD}Usage:${RESET}
  npx sheetgl <command> [options]

${BOLD}Commands:${RESET}
  ${GREEN}init${RESET} [target-file]      Generate a ready-to-use <SheetGLGrid /> component in your React project
                          (Default: src/components/SheetGLGrid.tsx)
  ${GREEN}create${RESET} <project-name>   Scaffold a new Vite + React + TypeScript + SheetGL starter app
  ${GREEN}demo${RESET}                    Launch the interactive SheetGL Studio & Docs server
  ${GREEN}doctor${RESET}                  Verify Node.js, package build artifacts, and environment readiness
  ${GREEN}help${RESET}                    Show this help message

${BOLD}Examples:${RESET}
  ${DIM}# 1. Install SheetGL into an existing React project:${RESET}
  npm install sheetgl

  ${DIM}# 2. Generate a full-featured SheetGLGrid.tsx component:${RESET}
  npx sheetgl init

  ${DIM}# 3. Create a brand-new starter project:${RESET}
  npx sheetgl create my-excel-app
`);
}

const STARTER_COMPONENT_TEMPLATE = `import React, { useMemo, useState } from 'react';
import { SheetGL, ColumnDef } from 'sheetgl';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', bg: '#DCFCE7', fg: '#166534', darkBg: 'rgba(48, 209, 88, 0.16)', darkFg: '#30D158' },
  { value: 'pending', label: 'Pending', bg: '#FEF3C7', fg: '#92400E', darkBg: 'rgba(255, 159, 10, 0.16)', darkFg: '#FF9F0A' },
  { value: 'review', label: 'In Review', bg: '#E0F2FE', fg: '#075985', darkBg: 'rgba(10, 132, 255, 0.16)', darkFg: '#64D2FF' },
  { value: 'rejected', label: 'Cancelled', bg: '#FEE2E2', fg: '#991B1B', darkBg: 'rgba(255, 69, 58, 0.16)', darkFg: '#FF453A' },
];

const CITY_OPTIONS = [
  { value: 'New York', label: 'New York (US)' },
  { value: 'London', label: 'London (UK)' },
  { value: 'Berlin', label: 'Berlin (DE)' },
  { value: 'Tokyo', label: 'Tokyo (JP)' },
  { value: 'Istanbul', label: 'Istanbul (TR)' },
];

const TAG_OPTIONS = [
  { value: 'SOC2', label: 'SOC2', bg: '#E0E7FF', fg: '#3730A3' },
  { value: 'GDPR', label: 'GDPR', bg: '#DBEAFE', fg: '#1E40AF' },
  { value: 'ISO27001', label: 'ISO-27001', bg: '#DCFCE7', fg: '#166534' },
];

export function SheetGLGrid() {
  const [data] = useState(() =>
    Array.from({ length: 1000 }, (_, idx) => {
      const i = idx + 1;
      return {
        id: i,
        code: \`ACC-\${10000 + i}\`,
        company: ['Acme Global Holding', 'Vertex BioPharma Labs', 'Nexus Cloud Technologies', 'Quantum Dynamics'][i % 4],
        city: CITY_OPTIONS[i % CITY_OPTIONS.length].value,
        status: STATUS_OPTIONS[i % STATUS_OPTIONS.length].value,
        tags: i % 2 === 0 ? ['SOC2', 'GDPR'] : ['ISO27001'],
        balance: Math.round((25000 + (i * 137) % 80000) * 100) / 100,
        taxRate: 20,
        netBalance: Math.round((25000 + (i * 137) % 80000) * 0.8 * 100) / 100,
        progress: (i * 9) % 101,
        rating: (i % 5) + 1,
        isApproved: i % 3 === 0,
        date: '2025-05-15',
        lastAuditAt: '2025-05-15 14:30',
        cutoffTime: '17:00',
        sparkline: [25, 42, 38, 65, 58, 78, 92],
      };
    })
  );

  const columns = useMemo<ColumnDef[]>(
    () => [
      { id: 'id', title: 'ID', type: 'number', decimalDigits: 0, width: 65, pinned: 'left', readonly: true },
      { id: 'code', title: 'Account Code', type: 'text', width: 125, pinned: 'left' },
      { id: 'company', title: 'Company', type: 'text', width: 220, pinned: 'left' },
      {
        id: 'city',
        title: 'City (Dropdown) ⚡',
        type: 'dropdown',
        width: 160,
        options: CITY_OPTIONS,
        setCellValue: async (newData, newCity, currentRow) => {
          const taxMap: Record<string, number> = { 'New York': 21, London: 19, Berlin: 25, Tokyo: 23, Istanbul: 20 };
          const tax = taxMap[newCity] ?? 20;
          newData.taxRate = tax;
          newData.netBalance = Math.round((Number(currentRow.balance) || 0) * (1 - tax / 100) * 100) / 100;
        },
      },
      { id: 'status', title: 'Status (Select)', type: 'select', width: 135, options: STATUS_OPTIONS },
      { id: 'tags', title: 'Compliance (Multi)', type: 'multiselect', width: 195, options: TAG_OPTIONS },
      { id: 'balance', title: 'Gross Balance ($)', type: 'currency', width: 150, currencySymbol: '$', summaryType: 'sum' },
      { id: 'taxRate', title: 'Tax (%)', type: 'progress', width: 110, summaryType: 'avg' },
      { id: 'netBalance', title: 'Net Balance ($)', type: 'currency', width: 150, currencySymbol: '$', readonly: true, summaryType: 'sum' },
      { id: 'isApproved', title: 'Approved', type: 'boolean', width: 90 },
      { id: 'rating', title: 'Rating', type: 'rating', width: 120, summaryType: 'avg' },
      { id: 'date', title: 'Date', type: 'date', width: 135 },
      { id: 'lastAuditAt', title: 'Audit (DateTime)', type: 'datetime', width: 170 },
      { id: 'cutoffTime', title: 'Cut-off (Time)', type: 'time', width: 125 },
      { id: 'sparkline', title: '7D Trend', type: 'sparkline', width: 135 },
    ],
    []
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <SheetGL
        dataSource={data}
        columns={columns}
        theme="apple-dark"
        locale="tr"
        batchEditMode={true}
      />
    </div>
  );
}

export default SheetGLGrid;
`;

function handleInit(rawArgs) {
  printBanner();
  let dirOpt = null;
  let nameOpt = null;
  let rowsOpt = 1000;
  let positionalPath = null;

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--dir' || arg === '-d') {
      dirOpt = rawArgs[++i];
    } else if (arg === '--name' || arg === '-n') {
      nameOpt = rawArgs[++i];
    } else if (arg === '--rows' || arg === '-r') {
      const parsed = parseInt(rawArgs[++i], 10);
      if (!Number.isNaN(parsed) && parsed > 0) rowsOpt = parsed;
    } else if (!arg.startsWith('-') && !positionalPath) {
      positionalPath = arg;
    }
  }

  const componentName = (nameOpt || 'SheetGLGrid').replace(/\.(tsx|ts|jsx|js)$/i, '');
  const defaultRelPath = path.join(dirOpt || 'src/components', `${componentName}.tsx`);
  const outPath = path.resolve(process.cwd(), positionalPath || defaultRelPath);
  const outDir = path.dirname(outPath);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const customizedTemplate = STARTER_COMPONENT_TEMPLATE
    .replace(/SheetGLGrid/g, componentName)
    .replace('length: 1000', `length: ${rowsOpt}`);

  fs.writeFileSync(outPath, customizedTemplate, 'utf8');
  console.log(`${GREEN}✔ Created SheetGL starter component at:${RESET} ${BOLD}${outPath}${RESET}`);
  console.log(`
${BOLD}Next steps:${RESET}
  1. Ensure ${CYAN}sheetgl${RESET} is installed in your project:
     ${YELLOW}npm install sheetgl${RESET}
  2. Import and render ${CYAN}<${componentName} />${RESET} in your ${BOLD}App.tsx${RESET}:
     ${DIM}import { ${componentName} } from './components/${componentName}';${RESET}
`);
}

function handleCreate(projectName) {
  printBanner();
  if (!projectName) {
    console.error(`${YELLOW}⚠ Please specify a project directory name:${RESET}\n  npx sheetgl create my-sheetgl-app`);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`${YELLOW}⚠ Target directory "${projectName}" already exists and is not empty.${RESET}`);
    process.exit(1);
  }

  fs.mkdirSync(path.join(targetDir, 'src', 'components'), { recursive: true });

  const appPkg = {
    name: projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      sheetgl: `^${readPkgVersion()}`,
    },
    devDependencies: {
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      '@vitejs/plugin-react': '^4.3.0',
      typescript: '^5.6.0',
      vite: '^6.0.0',
    },
  };

  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(targetDir, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} — SheetGL</title>
  </head>
  <body style="margin:0;padding:0;overflow:hidden;">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(targetDir, 'vite.config.ts'),
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(targetDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ['src'],
      },
      null,
      2
    ),
    'utf8'
  );

  fs.writeFileSync(path.join(targetDir, 'src', 'components', 'SheetGLGrid.tsx'), STARTER_COMPONENT_TEMPLATE, 'utf8');
  fs.writeFileSync(
    path.join(targetDir, 'src', 'App.tsx'),
    `import React from 'react';
import { SheetGLGrid } from './components/SheetGLGrid';

export default function App() {
  return <SheetGLGrid />;
}
`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(targetDir, 'src', 'main.tsx'),
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    'utf8'
  );

  console.log(`${GREEN}✔ Scaffolded new SheetGL project in:${RESET} ${BOLD}${targetDir}${RESET}\n`);
  console.log(`${BOLD}Run the following commands to start:${RESET}
  ${CYAN}cd ${projectName}${RESET}
  ${CYAN}npm install${RESET}
  ${CYAN}npm run dev${RESET}
`);
}

function handleDoctor() {
  printBanner();
  const esmBundle = path.join(pkgRoot, 'dist', 'lib', 'sheetgl.js');
  const cjsBundle = path.join(pkgRoot, 'dist', 'lib', 'sheetgl.cjs');
  const dtsBundle = path.join(pkgRoot, 'dist', 'lib', 'types', 'index.d.ts');
  const demoIndex = path.join(pkgRoot, 'dist', 'index.html');

  console.log(`${BOLD}Environment & Package Diagnostics:${RESET}`);
  console.log(`  • Node.js Runtime : ${GREEN}${process.version}${RESET}`);
  console.log(`  • Platform / Arch : ${process.platform} (${process.arch})`);
  console.log(`  • ESM Library     : ${fs.existsSync(esmBundle) ? `${GREEN}✔ Ready (dist/lib/sheetgl.js)${RESET}` : `${YELLOW}⚠ Missing (run npm run build:lib)${RESET}`}`);
  console.log(`  • CJS Library     : ${fs.existsSync(cjsBundle) ? `${GREEN}✔ Ready (dist/lib/sheetgl.cjs)${RESET}` : `${YELLOW}⚠ Missing (run npm run build:lib)${RESET}`}`);
  console.log(`  • TypeScript .d.ts: ${fs.existsSync(dtsBundle) ? `${GREEN}✔ Ready (dist/lib/types/index.d.ts)${RESET}` : `${YELLOW}⚠ Missing (run npm run build:lib)${RESET}`}`);
  console.log(`  • Demo SPA Bundle : ${fs.existsSync(demoIndex) ? `${GREEN}✔ Ready (dist/index.html)${RESET}` : `${YELLOW}⚠ Missing (run npm run build:demo)${RESET}`}`);
  console.log('');
}

function handleDemo() {
  printBanner();
  console.log(`${CYAN}Starting SheetGL Studio development server...${RESET}\n`);
  spawnSync('npx', ['vite'], { cwd: pkgRoot, stdio: 'inherit', shell: true });
}

const args = process.argv.slice(2);
const cmd = (args[0] || 'help').toLowerCase();

if (cmd === 'init' || cmd === 'setup') {
  handleInit(args.slice(1));
} else if (cmd === 'create') {
  handleCreate(args[1]);
} else if (cmd === 'doctor' || cmd === 'info' || cmd === 'check') {
  handleDoctor();
} else if (cmd === 'demo' || cmd === 'studio' || cmd === 'start') {
  handleDemo();
} else if (cmd === '-v' || cmd === '--version' || cmd === 'version') {
  console.log(readPkgVersion());
} else {
  printHelp();
}
