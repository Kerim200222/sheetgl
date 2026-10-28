# SheetGL v2.0.2 ⚡

> **Next-Generation High-Performance WebGL & Canvas Excel DataGrid for React**  
> Combining **GPU-Accelerated Canvas Virtualization** and **Microsoft Excel UX** with **Enterprise DataGrid Architecture** (Full Event Lifecycle, Async Cascading Backend Lookups, Dynamic Summaries, Batch CRUD, and Role-Based Permissions). Zero dependencies, zero DOM bloat, **100% Free under the MIT License**.

[![Version](https://img.shields.io/badge/version-2.0.2-0284c7.svg)](https://www.npmjs.com/package/sheetgl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org)
[![Performance](https://img.shields.io/badge/Performance-Zero_DOM_Canvas-success.svg)](#)
[![i18n](https://img.shields.io/badge/i18n-Multi--Language-orange.svg)](#)

---

## 🌟 Key Highlights in v2.0.2

- 🏎️ **Ultra-Fast Canvas Virtualization:** Renders 10,000–100,000+ rows and dozens of columns on a single high-DPI `<canvas>` element with right-side live scroll indicators, quick jump controls (`⤒` / `⤓`), and automatic edge-scrolling during drag operations.
- 📐 **Complete Microsoft Excel UX:**
  - **Bottom-Right Fill Handle & Smart AutoFill:** Drag the corner square across rows or columns to duplicate values or auto-increment sequential codes (`ACC-100001` → `ACC-100002`).
  - **Right-Side Quick Cell Duplicate Handle (`+`):** Click or drag the right-edge `+` pill on any active selection to duplicate cell values.
  - **Right-Click Context Menu:** Full context menu on cells, row numbers, and column headers (`Duplicate Row`, `Duplicate Cell Down (Ctrl+D)`, `Duplicate Cell Right (Ctrl+R)`, `Insert Row Above/Below`, `Delete Row`, `Filter by Cell Value`, `Pin Column`, `Configure Summary Type`).
  - **Native Excel TSV Clipboard (`Ctrl+C` / `Ctrl+V`):** Copy and paste multi-row/multi-column ranges directly between Microsoft Excel, Google Sheets, and SheetGL.
- 🔄 **Enterprise Event Triggers & Async Cascading Backend Lookups:**
  - Full lifecycle hooks: `onEditingStart`, `onCellValueChanging`, `onCellValueChanged`, `onRowInserting`, `onRowInserted`, `onRowUpdating`, `onRowUpdated`, `onRowRemoving`, `onRowRemoved`, `onSaving`, `onSaved`.
  - **Column-Level `setCellValue` Cascading Engine:** When a column value changes (e.g. `city`, `category`, `status`, `balance`), automatically fetch dependent fields from your backend API and update related columns on the row with a live `⟳` row sync indicator!
- 🔒 **3-Tier Permissions (`write` / `readonly` / `read`):**
  - Grid-level `permissions`, column-level `permission` (`'write' | 'readonly' | 'read'`), and row/cell conditional `canEdit(row, col)` + `validator(val, row)` rules.
- 💾 **Batch CRUD & Dirty State Engine:**
  - Visual green top-right cell triangles for modified cells and green gutter indicators for newly added/duplicated rows.
  - Atomic **Batch Save**, **Discard Changes**, and 100-step **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**.
- 🧮 **Dynamic Summary Rows & Dual-Mode Excel Header Filters:**
  - Switch any column's footer & group summary between `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, or `NONE` at runtime, plus live Excel status bar stats (`Count`, `SUM`, `AVG`, `MIN`, `MAX`) when multiple cells are selected.
  - Excel Header Filter Popover with **Distinct Value Checkbox List** (preserving checked state across searches and reopenings) and **Condition Rules** (`contains`, `=`, `<>`, `>`, `<`, `between`).
- 🌗 **Interactive Landing Page & Full Documentation Portal (Dark & Light Mode):**
  - Switch seamlessly between **Excel Studio**, **Product Landing Page**, and **Interactive Documentation Portal** in both Dark and Light modes (`TR` & `EN`).

---

## ⚖️ Comparison: SheetGL vs. Traditional Grids

| Feature | SheetGL v2.0.2 | Traditional Enterprise Grids | AG-Grid Enterprise | Standard React Table |
| :--- | :---: | :---: | :---: | :---: |
| **Licensing** | **Free (MIT)** | Commercial ($1,200+/yr) | Commercial ($1,200+/yr) | Free (MIT) |
| **Rendering Engine** | **HTML5 Canvas 2D** | DOM Virtualization | DOM Virtualization | 100% DOM Nodes |
| **DOM Overhead** | **1 Canvas Element** | 500+ DOM Nodes | 400+ DOM Nodes | 1,000+ DOM Nodes |
| **Scroll Performance (100k rows)** | **Ultra-Smooth** | Moderate | Fast | Lag / Crash |
| **Memory Footprint** | **~15 MB** | ~60 MB | ~55 MB | 150+ MB |
| **Fill Handle & Quick Duplicate** | **Built-in** | ❌ Manual | Plugin | ❌ Not supported |
| **Async Cascading Lookups** | **Built-in** | Supported | ❌ Complex | ❌ Not supported |
| **Dual-Mode Excel Filters** | **Built-in** | Built-in | Built-in | ❌ Requires custom code |
| **Batch CRUD with Dirty Flags** | **Built-in** | Supported | Supported | ❌ Not supported |

---

## 📦 Installation & NPX CLI Setup

### 1. Install via Package Manager (`npm` / `pnpm` / `yarn`)

```bash
# Using npm
npm install sheetgl

# Using pnpm
pnpm add sheetgl

# Using yarn
yarn add sheetgl
```

### 2. Instant Setup via `npx sheetgl` CLI

```bash
# Generate a ready-to-use <SheetGLGrid /> component in your existing React project
npx sheetgl init

# Or scaffold a complete standalone Vite + React + TypeScript + SheetGL starter app
npx sheetgl create my-excel-app

# Run diagnostics on package build & environment
npx sheetgl doctor
```

---

## 🚀 Quick Start

```tsx
import React, { useMemo, useState } from 'react';
import { SheetGL, ColumnDef } from 'sheetgl';

export function SimpleGrid() {
  const [data] = useState([
    { id: 1, name: 'Acme Corporation', sector: 'Enterprise SaaS', balance: 54200.5, status: 'active', rating: 5 },
    { id: 2, name: 'Quantum AI Systems', sector: 'Robotics', balance: 129000.0, status: 'in-review', rating: 4 },
    { id: 3, name: 'Apex Global Logistics', sector: 'Logistics', balance: 34100.25, status: 'pending', rating: 3 },
  ]);

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'id', title: 'ID', type: 'number', width: 60, pinned: 'left' },
    { id: 'name', title: 'Company Name', type: 'text', width: 220, sortable: true, filterable: true },
    { id: 'sector', title: 'Industry Sector', type: 'text', width: 160, groupable: true },
    { id: 'balance', title: 'Balance ($)', type: 'currency', width: 140, currencySymbol: '$', summaryType: 'sum' },
    { id: 'rating', title: 'Trust Score', type: 'rating', width: 120 },
  ], []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <SheetGL
        dataSource={data}
        columns={columns}
        theme="apple-dark"
        locale="en"
        onCellValueChanged={(e) => {
          console.log(`Cell ${e.column.id} changed:`, e.oldValue, '->', e.newValue);
        }}
      />
    </div>
  );
}
```

---

## 📚 Comprehensive Documentation

Explore detailed architectural guides and API references in the [`docs/`](docs/) directory:

- [**Documentation Index**](docs/INDEX.md)
- [**Architecture & Technical Design**](docs/ARCHITECTURE.md): Canvas 2D render loop, prefix-sum binary search, zero-DOM vs micro-DOM lifecycle, and dual-bridge theming.
- [**API Reference**](docs/API_REFERENCE.md): Full TypeScript interfaces for `<SheetGL />`, `ColumnDef`, `IDataStore`, `IColumnTypePlugin`, and `IGridLocale`.
- [**Custom Column Plugins Guide**](docs/CUSTOM_COLUMN_GUIDE.md): Building Zero-DOM canvas painters and Micro-DOM cell editors.
- [**Remote Operations & Enterprise REST DTO Guide**](docs/REMOTE_OPERATIONS_GUIDE.md): Connecting `RemoteDataStore` to server-side APIs with Node.js, ASP.NET Core, and FastAPI backend examples.

---

## ⌨️ Google Sheets & Excel Keyboard Shortcuts

- `Arrow Keys`: Move active cell selection.
- `Tab` / `Shift + Tab`: Move to next/previous cell horizontally.
- `Enter` / `F2`: Start editing active cell.
- `Escape`: Cancel editing or clear selection.
- `Ctrl + D`: Duplicate cell value or row downwards.
- `Ctrl + R`: Duplicate cell value to the right.
- `Shift + Click`: Multi-column natural sorting.
- `Ctrl + C` / `Cmd + C`: Copy selected range as TSV (pasteable into Excel & Sheets).
- `Ctrl + V` / `Cmd + V`: Paste TSV matrix into active cell selection.
- `Ctrl + Z` / `Ctrl + Y`: Undo and Redo operations (100 steps).

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Start development server with live HMR
npm run dev

# Run strict TypeScript check and production build
npm run build
```

---

## 📄 License

This project is licensed under the **MIT License** — free for commercial and open-source use without license fees or telemetry.
