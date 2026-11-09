<div align="center">

<a href="https://sheetgl.truncgil.com">
  <img src="https://raw.githubusercontent.com/umitunc/sheetgl/main/docs/logo/logo.png" alt="SheetGL Logo" width="110" height="110" />
</a>

# SheetGL v2.1.4 ⚡

### **The Ultra-Fast Excel-Grade WebGL & Canvas DataGrid for React**

Combine **GPU-Accelerated HTML5 Canvas Virtualization** and **Native Microsoft Excel UX** with **Enterprise DataGrid Architecture** — featuring **21 Built-in Column Types**, **Async Cascading Backend Lookups**, **Dynamic Summaries**, **Atomic Batch CRUD**, and **3-Tier Role-Based Permissions**.  
**Zero dependencies. Zero DOM bloat. 100% Free under the MIT License.**

[![Version](https://img.shields.io/badge/version-2.1.4-0284c7.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/sheetgl)
[![NPM Downloads](https://img.shields.io/npm/dm/sheetgl.svg?style=flat-square&color=0ea5e9&logo=npm)](https://www.npmjs.com/package/sheetgl)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/sheetgl?style=flat-square&color=10b981&label=minzipped)](https://bundlephobia.com/package/sheetgl)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-10b981.svg?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-18_%7C_19-61dafb.svg?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Performance](https://img.shields.io/badge/Engine-Zero_DOM_Canvas-863bff.svg?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="https://sheetgl.truncgil.com/demo"><strong>🚀 Live 10,000-Row Studio Demo</strong></a> ·
  <a href="https://sheetgl.truncgil.com/documentation"><strong>📚 Interactive Docs Portal</strong></a> ·
  <a href="https://sheetgl.truncgil.com"><strong>🌐 Product Landing Page</strong></a> ·
  <a href="https://www.npmjs.com/package/sheetgl"><strong>📦 NPM Package</strong></a> ·
  <a href="docs/ARCHITECTURE.md"><strong>🏗️ Architecture</strong></a>
</p>

</div>

---

## ⚡ 10-Second Quick Start

### 1. Install in Seconds

```bash
# Install via npm, pnpm, yarn, or bun
npm i sheetgl

# Or scaffold a ready-to-use <SheetGLGrid /> component into your existing React project
npx sheetgl init

# Or create a complete standalone Vite + React + TypeScript + SheetGL starter app
npx sheetgl create my-excel-app
```

### 2. Drop-In Usage (Copy & Paste)

```tsx
import { SheetGL, ColumnDef } from 'sheetgl';

const columns: ColumnDef[] = [
  { id: 'id', title: 'ID', type: 'number', width: 65, pinned: 'left', readonly: true },
  { id: 'company', title: 'Company', type: 'text', width: 220, sortable: true, filterable: true },
  { id: 'balance', title: 'Balance ($)', type: 'currency', width: 150, currencySymbol: '$', summaryType: 'sum' },
  { id: 'rating', title: 'Trust Score', type: 'rating', width: 120 },
];

export default function App() {
  return (
    <div style={{ width: '100%', height: 560 }}>
      <SheetGL dataSource={rows} columns={columns} theme="apple-dark" locale="en" batchEditMode />
    </div>
  );
}
```

---

## 🖥️ Visual Showcase (Dark & Light Themes)

> **Try It Live in Your Browser:** Launch the interactive [**10,000-Row SheetGL Studio**](https://sheetgl.truncgil.com/demo) or explore the [**Interactive Documentation Portal**](https://sheetgl.truncgil.com/documentation) (`TR` / `EN`).

### 🌙 Dark Mode (`theme="apple-dark"`)
<p align="center">
  <a href="https://sheetgl.truncgil.com/demo">
    <img src="https://raw.githubusercontent.com/umitunc/sheetgl/main/docs/logo/dark.png" alt="SheetGL Dark Mode — High-Performance Canvas Excel DataGrid for React" width="100%" />
  </a>
</p>

### ☀️ Light Mode (`theme="apple-light"`)
<p align="center">
  <a href="https://sheetgl.truncgil.com/demo">
    <img src="https://raw.githubusercontent.com/umitunc/sheetgl/main/docs/logo/light.png" alt="SheetGL Light Mode — High-Performance Canvas Excel DataGrid for React" width="100%" />
  </a>
</p>

---

## 💡 Why SheetGL? (The Problem We Solved)

Most React data tables force you into a painful trade-off:
1. **DOM-Based Tables Freeze at Scale:** Rendering thousands of `<div>` or `<td>` nodes causes severe layout thrashing, memory spikes (150+ MB), and frame drops during fast scrolling or multi-cell selection.
2. **Enterprise Grids Cost $1,200+ per Developer/Year:** Features like Excel Fill Handle, multi-column grouping, dynamic summaries, batch dirty-state tracking, and cascading lookups are locked behind expensive commercial licenses.

**SheetGL solves both:**
- **1 HTML5 `<canvas>` Element for the Entire Viewport:** Only visible cells are painted using O(1) prefix-sum binary search and `WeakMap` cache layers. A lightweight **Micro-DOM** input mounts *only* on the single actively edited cell.
- **100% Free & Open Source (MIT):** Every enterprise feature — Fill Handle, TSV Clipboard, Banded Column Groups, Batch CRUD, 3-Tier RBAC, and 21 Column Plugins — is included out of the box with **zero runtime dependencies**.

---

## 🌟 Key Highlights in v2.1.4

- 🏎️ **Ultra-Fast Canvas Virtualization:** Renders 10,000–100,000+ rows and dozens of columns on a single high-DPI `<canvas>` element with right-side live scroll indicators, quick jump controls (`⤒` / `⤓`), and automatic edge-scrolling during drag operations.
- 📐 **Complete Microsoft Excel UX:**
  - **Bottom-Right Fill Handle & Smart AutoFill:** Drag the corner square across rows or columns to duplicate values or auto-increment sequential codes (`ACC-100001` → `ACC-100002`).
  - **Right-Side Quick Cell Duplicate Handle (`+`):** Click or drag the right-edge `+` pill on any active selection to duplicate cell values.
  - **Right-Click Context Menu:** Full context menu on cells, row numbers, and column headers (`Duplicate Row`, `Duplicate Cell Down (Ctrl+D)`, `Duplicate Cell Right (Ctrl+R)`, `Insert Row Above/Below`, `Delete Row`, `Filter by Cell Value`, `Pin Column`, `Configure Summary Type`).
  - **Native Excel TSV Clipboard (`Ctrl+C` / `Ctrl+V`):** Copy and paste multi-row/multi-column ranges directly between Microsoft Excel, Google Sheets, and SheetGL.
- 🔄 **Enterprise Event Triggers & Async Cascading Backend Lookups:**
  - Full lifecycle hooks: `onEditingStart`, `onCellValueChanging`, `onCellValueChanged`, `onRowInserting`, `onRowInserted`, `onRowUpdating`, `onRowUpdated`, `onRowRemoving`, `onRowRemoved`, `onSaving`, `onSaved`.
  - **Column-Level `setCellValue` Cascading Engine:** When a column value changes (e.g. `city`, `category`, `status`, `balance`), automatically fetch dependent fields from your backend API and update related columns on the row with a live `⟳` row sync indicator.
- 🔒 **3-Tier Permissions (`write` / `readonly` / `read`):**
  - Grid-level `permissions`, column-level `permission` (`'write' | 'readonly' | 'read'`), and row/cell conditional `canEdit(row, col)` + `validator(val, row)` rules enforced across inline editing, paste, Fill Handle, and row duplication.
- 💾 **Batch CRUD & Dirty State Engine:**
  - Visual green top-right cell triangles for modified cells and green gutter indicators for newly added/duplicated rows.
  - Atomic **Batch Save**, **Discard Changes**, and 100-step **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**.
- 🧮 **Dynamic Summary Rows & Dual-Mode Excel Header Filters:**
  - Switch any column's footer & group summary between `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, or `NONE` at runtime, plus live Excel status bar stats (`Count`, `SUM`, `AVG`, `MIN`, `MAX`) when multiple cells are selected.
  - Excel Header Filter Popover with **Distinct Value Checkbox List** (preserving checked state across searches and reopenings) and **Condition Rules** (`contains`, `=`, `<>`, `>`, `<`, `between`).
- 🎨 **Banded Column Groups & 13 Semantic Color Presets:**
  - Group related columns under top banded headers (`columnGroups`) and style headers or cells using 13 theme-adaptive palettes (`blue`, `indigo`, `violet`, `emerald`, `amber`, `rose`, `cyan`, `teal`, etc.) or custom `{ light, dark }` tokens.

---

## 🧩 21+ Built-In Zero-DOM Column Types

Every column type is painted directly onto the HTML5 2D Canvas at 60–120 FPS and mounts a specialized Micro-DOM editor only when double-clicked or edited via `Enter`/`F2`:

| Category | Built-in Column Types | Canvas Rendering & Micro-DOM Editor Highlights |
| :--- | :--- | :--- |
| **Text & Identity** | `text`, `email`, `url`, `phone` | Clickable links, formatted masks, instant inline text input |
| **Numeric & Financial** | `number`, `currency`, `percent` | Locale-aware thousand separators, currency symbols (`$`, `€`, `₺`), negative coloring |
| **Choice & Relational** | `dropdown`, `select`, `multiselect`, `lookup` | Color-coded pills, avatar initials + subtitle lookup cards, searchable multi-tag popovers |
| **Date & Time** | `date`, `datetime`, `time` | ISO & locale formatting with calendar/time picker editors |
| **Visual & Analytical** | `boolean`, `progress`, `rating`, `sparkline`, `color` | Interactive checkboxes, gradient progress bars, 5-star ratings, mini trend charts, hex swatches |
| **Structured & Actions** | `object`, `pdf`, `action` | JSON drawer inspector (`{k}` badge), PDF preview modal, custom row action buttons |

---

## ⚖️ Comparison: SheetGL vs. Traditional Grids

| Feature | SheetGL v2.1.4 | Traditional Enterprise Grids | AG-Grid Enterprise | Standard React Table |
| :--- | :---: | :---: | :---: | :---: |
| **Licensing** | **Free (MIT)** | Commercial ($1,200+/yr) | Commercial ($1,200+/yr) | Free (MIT) |
| **Rendering Engine** | **HTML5 Canvas 2D / WebGL** | DOM Virtualization | DOM Virtualization | 100% DOM Nodes |
| **DOM Overhead** | **1 `<canvas>` Element** | 500+ DOM Nodes | 400+ DOM Nodes | 1,000+ DOM Nodes |
| **Scroll Performance (100k rows)** | **60–120 FPS (Zero Lag)** | Moderate | Fast | Lag / Crash |
| **Memory Footprint** | **~15 MB** | ~60 MB | ~55 MB | 150+ MB |
| **Fill Handle & Quick Duplicate** | **Built-in** | ❌ Manual | Plugin | ❌ Not supported |
| **Async Cascading Lookups** | **Built-in (`Promise`)** | Supported | ❌ Complex | ❌ Not supported |
| **Dual-Mode Excel Filters** | **Built-in** | Built-in | Built-in | ❌ Requires custom code |
| **Batch CRUD with Dirty Flags** | **Built-in** | Supported | Supported | ❌ Not supported |

---

## 🔄 Enterprise Examples

### Async Cascading Backend Lookups (`setCellValue`)

Automatically fetch dependent fields from your API when a user edits a cell (via keyboard, dropdown, paste, or Fill Handle):

```tsx
const columns: ColumnDef[] = [
  {
    id: 'city',
    title: 'Region / City',
    type: 'dropdown',
    options: ['San Francisco (US)', 'London (UK)', 'Tokyo (JP)', 'Berlin (DE)'],
    // Supports synchronous or async Promise-based cascading updates!
    setCellValue: async (newData, newValue, currentRow) => {
      newData.city = newValue;
      const meta = await fetch(`/api/regions?city=${encodeURIComponent(newValue)}`).then((r) => r.json());
      newData.currency = meta.currency;
      newData.taxRate = meta.defaultTaxRate;
      newData.accountManagerId = meta.regionalLeadId;
    },
  },
];
```

### 3-Tier Permissions & Cell Validation

```tsx
<SheetGL
  dataSource={rows}
  columns={[
    { id: 'id', title: 'ID', type: 'number', permission: 'readonly' },
    {
      id: 'balance',
      title: 'Balance ($)',
      type: 'currency',
      canEdit: (row) => row.status !== 'locked',
      validator: (val) => ({
        valid: Number(val) >= 0,
        message: 'Balance cannot be negative',
      }),
    },
  ]}
  permissions={{
    mode: 'write',
    allowInsertRow: true,
    allowDeleteRow: true,
    allowDuplicateRow: true,
  }}
  batchEditMode={true}
  onSaving={async ({ inserted, updated, deleted }) => {
    await api.batchSave({ inserted, updated, deleted });
  }}
/>
```

---

## ⌨️ Microsoft Excel & Google Sheets Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Arrow Keys` | Navigate active cell selection across the viewport |
| `Tab` / `Shift + Tab` | Move horizontally to next / previous cell |
| `Enter` / `F2` | Open Micro-DOM inline editor on active cell |
| `Escape` | Cancel active cell edit or clear multi-cell selection |
| `Ctrl + C` / `Cmd + C` | Copy selected range as native Excel/Google Sheets TSV |
| `Ctrl + V` / `Cmd + V` | Paste multi-row/column TSV clipboard data into grid |
| `Ctrl + D` | Duplicate active cell value downward (or duplicate row) |
| `Ctrl + R` | Duplicate active cell value to the right |
| `Ctrl + Z` / `Ctrl + Y` | 100-step non-destructive Undo and Redo |
| `Shift + Click` | Multi-column natural sorting on column headers |

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><strong>Does SheetGL require a commercial DevExtreme or AG-Grid license?</strong></summary>
<br />
No! SheetGL is engineered from scratch under the <strong>MIT License</strong> with an independent HTML5 Canvas & WebGL architecture. It is 100% free for both commercial SaaS products and open-source projects.
</details>

<details>
<summary><strong>Does the browser freeze with 100,000+ rows?</strong></summary>
<br />
Never. Only the cells visible within the current viewport are painted onto a single high-DPI HTML5 Canvas. Because zero DOM nodes are created for off-screen or inactive cells, scrolling remains locked at 60–120 FPS.
</details>

<details>
<summary><strong>Can I create my own custom column types?</strong></summary>
<br />
Yes! Use <code>ColumnTypeRegistry.register(plugin)</code> to define custom Zero-DOM Canvas cell painters and custom React Micro-DOM popup editors. See the <a href="docs/CUSTOM_COLUMN_GUIDE.md">Custom Column Plugins Guide</a>.
</details>

---

## 📚 Comprehensive Documentation

Explore detailed architectural guides and API references in the [`docs/`](docs/) directory or on the [**Interactive Documentation Portal**](https://sheetgl.truncgil.com/documentation):

- [**Documentation Index**](docs/INDEX.md)
- [**Architecture & Technical Design**](docs/ARCHITECTURE.md): Canvas 2D render loop, prefix-sum binary search, zero-DOM vs micro-DOM lifecycle, and dual-bridge theming.
- [**API Reference**](docs/API_REFERENCE.md): Full TypeScript interfaces for `<SheetGL />`, `ColumnDef`, `IDataStore`, `IColumnTypePlugin`, and `IGridLocale`.
- [**Custom Column Plugins Guide**](docs/CUSTOM_COLUMN_GUIDE.md): Building Zero-DOM canvas painters and Micro-DOM cell editors.
- [**Remote Operations & Enterprise REST DTO Guide**](docs/REMOTE_OPERATIONS_GUIDE.md): Connecting `RemoteDataStore` to server-side APIs with Node.js, ASP.NET Core, and FastAPI backend examples.

---

## 🛠️ Local Development & CLI Diagnostics

```bash
# Install dependencies
npm install

# Start interactive Landing Page, Docs Portal & 10,000-Row Studio with HMR
npm run dev

# Run package diagnostics
npx sheetgl doctor

# Run unit tests & production library build
npm test
npm run build
```

---

## 📄 License

Licensed under the [**MIT License**](LICENSE) — 100% free for commercial and open-source use without per-seat royalties or telemetry.

<div align="center">
  <sub>Crafted with ❤️ by <a href="https://www.truncgil.com"><strong>🍊 Trunçgil Teknoloji</strong></a> · <a href="https://sheetgl.truncgil.com">sheetgl.truncgil.com</a> · <a href="https://github.com/umitunc/sheetgl">GitHub</a></sub>
</div>
