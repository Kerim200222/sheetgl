import fs from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __SHEETGL_VERSION__: JSON.stringify(pkg.version),
  },
  publicDir: false,
  build: {
    outDir: 'dist/lib',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/datagrid/index.ts'),
      name: 'SheetGL',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'sheetgl.js' : 'sheetgl.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
  },
});
