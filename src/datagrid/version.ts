declare const __SHEETGL_VERSION__: string | undefined;

export const SHEETGL_VERSION: string =
  typeof __SHEETGL_VERSION__ !== 'undefined' ? __SHEETGL_VERSION__ : '2.0.2';
