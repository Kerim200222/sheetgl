const MATERIAL_SYMBOLS_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';

let injected = false;

/**
 * Ensures the Google Material Symbols font stylesheet (https://fonts.google.com/icons)
 * is present in the document head when SheetGL is used as an npm package.
 */
export function ensureMaterialSymbolsLoaded(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  const existing = document.querySelector(
    'link[href*="Material+Symbols+Outlined"], link[href*="Material+Symbols+Rounded"]'
  );
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = MATERIAL_SYMBOLS_HREF;
  document.head.appendChild(link);
}
