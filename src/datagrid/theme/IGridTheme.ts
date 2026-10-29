export interface IGridThemeTokens {
  name: 'apple-light' | 'apple-dark' | 'google-light' | 'google-dark' | string;
  isDark: boolean;

  // Tipografi
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
  fontFeatureSettings: string; // 'tnum' (Tabular Rakamlar)

  // Canvas 2D Doğrudan Çizim Renkleri
  canvas: {
    bg: string;
    zebraRowBg?: string;
    rowHoverBg?: string;
    gridLine: string;
    headerBg: string;
    headerText: string;
    headerBorder: string;
    cellText: string;
    rowNumberBg: string;
    rowNumberText: string;
    rowNumberBorder: string;
    frozenDividerShadow: string;
    groupRowBg: string;
    groupRowText: string;
    groupRowBorder: string;
    selectionBorder: string;
    selectionFill: string;
    fillHandleColor: string;
    searchHighlight: string;
    skeletonBar: string;
  };

  // DOM Katmanı Stilleri (Toolbar, FormulaBar, Overlays, Popovers)
  dom: {
    toolbarBg: string;
    toolbarBorder: string;
    toolbarText: string;
    glassBackdrop: string;
    popoverBg: string;
    popoverBorder: string;
    popoverShadow: string;
    popoverText: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
    inputFocusBorder: string;
    accentColor: string;
    buttonHoverBg: string;
    badgeBg: string;
    badgeText: string;
  };
}
