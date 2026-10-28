import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { SheetGL, ColumnDef, SheetGLLogo, SHEETGL_VERSION } from './datagrid';

export interface LandingPageProps {
  isDark: boolean;
  lang: 'tr' | 'en';
  demoData: any[];
  demoColumns: ColumnDef[];
  onOpenStudio: () => void;
  onOpenDocs: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  isDark,
  lang,
  demoData,
  demoColumns,
  onOpenStudio,
  onOpenDocs,
  onToggleTheme,
  onToggleLang,
}) => {
  const isTR = lang === 'tr';
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 820 : false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [installTab, setInstallTab] = useState<
    'npm' | 'npx' | 'create' | 'pnpm' | 'yarn' | 'bun'
  >('npm');
  const [copiedCmdKey, setCopiedCmdKey] = useState<string | null>(null);
  const [showQuickUsage, setShowQuickUsage] = useState<boolean>(false);

  const copyCommand = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCmdKey(key);
    setTimeout(() => {
      setCopiedCmdKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const installCommands = {
    npm: {
      label: 'npm',
      cmd: 'npm install sheetgl',
      hint: isTR
        ? 'Tek komutla sıfır bağımlılıklı WebGL & Canvas DataGrid kurulumu'
        : 'Single-command zero-dependency WebGL & Canvas DataGrid install',
    },
    npx: {
      label: 'npx init',
      cmd: 'npx sheetgl init',
      hint: isTR
        ? 'Projenize hazır <SheetGLGrid /> bileşenini üretir'
        : 'Scaffolds a ready-to-use <SheetGLGrid /> component',
    },
    create: {
      label: 'npx create',
      cmd: 'npx sheetgl create my-excel-app',
      hint: isTR
        ? 'Sıfırdan hazır Vite + React + TS + SheetGL uygulaması kurar'
        : 'Scaffolds a standalone Vite + React + TS + SheetGL app',
    },
    pnpm: {
      label: 'pnpm',
      cmd: 'pnpm add sheetgl',
      hint: 'PNPM Workspace',
    },
    yarn: {
      label: 'yarn',
      cmd: 'yarn add sheetgl',
      hint: 'Yarn Package Manager',
    },
    bun: {
      label: 'bun',
      cmd: 'bun add sheetgl',
      hint: 'Bun Runtime',
    },
  } as const;

  const sheetglUsageSnippet = `import { SheetGL, ColumnDef } from 'sheetgl';

const columns: ColumnDef[] = [
  { id: 'id', title: 'ID', type: 'number', width: 65, pinned: 'left', readonly: true },
  { id: 'company', title: 'Company', type: 'text', width: 220, sortable: true, filterable: true },
  { id: 'balance', title: 'Balance ($)', type: 'currency', width: 150, currencySymbol: '$', summaryType: 'sum' },
  { id: 'rating', title: 'Trust Score', type: 'rating', width: 120 },
];

export default function App() {
  return (
    <div style={{ width: '100%', height: 560 }}>
      <SheetGL dataSource={rows} columns={columns} theme="apple-dark" locale="tr" batchEditMode />
    </div>
  );
}`;

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 820;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const colors = {
    bg: isDark ? '#06070B' : '#FAF9FE',
    navBg: isDark ? 'rgba(6, 7, 11, 0.78)' : 'rgba(250, 249, 254, 0.85)',
    card: isDark ? 'rgba(18, 14, 33, 0.72)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(134, 59, 255, 0.22)' : 'rgba(134, 59, 255, 0.14)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
    text: isDark ? '#F9FAFB' : '#0B081B',
    muted: isDark ? '#9CA3AF' : '#5E6478',
    ctaGradient: 'linear-gradient(135deg, #1E40AF 0%, #0284C7 50%, #0D9488 100%)',
    ctaHover: 'linear-gradient(135deg, #2563EB 0%, #0369A1 100%)',
    purpleAccent: '#863BFF',
    cyanAccent: '#38BDF8',
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = isTR
    ? [
        {
          icon: '⚡',
          title: 'Yüksek Performanslı HTML5 Canvas Motoru',
          desc: '10.000+ satır ve onlarca sütunu sıfır DOM şişkinliği ile akıcı şekilde çizer. Sağ yan kaydırma göstergesi ve otomatik kenar kaydırma (edge auto-scroll) içerir.',
        },
        {
          icon: '📐',
          title: 'Tam Microsoft Excel Deneyimi',
          desc: 'Sağ alt Fill Handle sürükleme, hücre sağ yanı (+) çoğaltma butonu, Ctrl+D / Ctrl+R, sağ tık menüsü ile satır çoğaltma ve Excel TSV Kopyala/Yapıştır.',
        },
        {
          icon: '🔄',
          title: 'Yaşam Döngüsü Olayları & Backend Senkronizasyonu',
          desc: 'Bir sütun güncellendiğinde (ör. Şehir, Sektör veya Bakiye) ilişkili diğer sütunları doğrudan backend API’den çekerek satırı canlı senkronize eder.',
        },
        {
          icon: '🔒',
          title: '3 Katmanlı Yetkilendirme (Permissions)',
          desc: 'Tablo, sütun ve satır bazlı write / readonly / read izinleri, koşullu düzenleme (canEdit) ve veri doğrulama (validator) kuralları.',
        },
        {
          icon: '💾',
          title: 'Batch Save & Kirli Hücre Takibi',
          desc: 'Eklenen, düzenlenen ve silinen kayıtları yeşil köşe işaretçileriyle izler; tek tıkla Toplu Kayıt (Batch Save), Geri Alma (Discard) ve 100 adımlı Undo/Redo sunar.',
        },
        {
          icon: '🧮',
          title: 'Dinamik Özetler & Çift Modlu Filtreler',
          desc: 'Alt özet satırında ve grup başlıklarında çalışma zamanında SUM, AVG, MIN, MAX, COUNT seçimi; Değer Listesi ve Koşul Kuralı destekli Excel filtreleri.',
        },
      ]
    : [
        {
          icon: '⚡',
          title: 'High-Performance HTML5 Canvas Engine',
          desc: 'Renders 10,000+ rows with zero DOM bloat and ultra-smooth scrolling. Includes right-side live scroll row indicator, quick jump buttons, and edge auto-scrolling.',
        },
        {
          icon: '📐',
          title: 'Complete Microsoft Excel UX',
          desc: 'Bottom-right Fill Handle drag, right-side (+) cell duplicate button, Ctrl+D / Ctrl+R, right-click row duplication, and native Excel TSV Copy/Paste.',
        },
        {
          icon: '🔄',
          title: 'Lifecycle Triggers & Backend Cascade',
          desc: 'When a cell changes (e.g. City, Sector, or Balance), automatically fetches dependent fields from the backend and updates the row in real time.',
        },
        {
          icon: '🔒',
          title: '3-Tier Permissions (Write / ReadOnly)',
          desc: 'Grid-level, column-level, and conditional row-level permissions (canEdit) plus inline validation rules enforced across all edit surfaces.',
        },
        {
          icon: '💾',
          title: 'Batch Save & Dirty State Tracking',
          desc: 'Tracks inserted, modified, and deleted rows with visual Canvas corner markers, atomic Batch Save, Discard, and 100-step Undo/Redo.',
        },
        {
          icon: '🧮',
          title: 'Dynamic Summaries & Dual Filters',
          desc: 'Switch any column summary between SUM, AVG, MIN, MAX, COUNT at runtime, plus live multi-cell selection stats and Excel Value/Condition filters.',
        },
      ];

  const faqs = isTR
    ? [
        {
          q: 'SheetGL, DevExtreme DataGrid veya ag-Grid lisansı gerektirir mi?',
          a: 'Hayır! SheetGL sıfırdan MIT lisanslı ve açık mimariyle geliştirilmiş, tamamen özgür ve bağımsız bir HTML5 Canvas & WebGL motorudur.',
        },
        {
          q: '100.000 satırda tarayıcı donar mı?',
          a: 'Kesinlikle hayır. Yalnızca ekranda görünen hücreler (viewport) çizilir. DOM üzerinde binlerce düğüm oluşmadığı için yüksek veri hacimlerinde bile kesintisiz ve akıcı çalışır.',
        },
        {
          q: 'Excel kısayolları ve formül barı destekleniyor mu?',
          a: 'Evet; Ctrl+C / Ctrl+V (TSV kopyalama/yapıştırma), Ctrl+D, Ctrl+R, F2 inline edit, yön tuşlarıyla gezinti ve Formül Barı tam entegredir.',
        },
      ]
    : [
        {
          q: 'Does SheetGL require a commercial DevExtreme or ag-Grid license?',
          a: 'No! SheetGL is built from scratch under the MIT license with open architecture. Completely independent and royalty-free.',
        },
        {
          q: 'Does it freeze with 100,000 rows in the browser?',
          a: 'Never. Only visible viewport cells are painted on HTML5 Canvas. Zero DOM node pollution ensures consistent, lag-free performance.',
        },
        {
          q: 'Are native Excel shortcuts and formula bars supported?',
          a: 'Yes; Ctrl+C / Ctrl+V (native TSV clipboard), Ctrl+D, Ctrl+R, F2 cell edit, arrow navigation, and real-time formula bar are built-in.',
        },
      ];

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: colors.bg,
        backgroundImage: isDark
          ? `radial-gradient(ellipse 90% 55% at 50% -8%, rgba(14, 165, 233, 0.16) 0%, rgba(134, 59, 255, 0.22) 35%, rgba(6, 7, 11, 0) 80%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`
          : `radial-gradient(ellipse 85% 50% at 50% -5%, rgba(14, 165, 233, 0.1) 0%, rgba(134, 59, 255, 0.12) 35%, rgba(250, 249, 254, 0) 85%), linear-gradient(rgba(134, 59, 255, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(134, 59, 255, 0.025) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        color: colors.text,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* PARABOL-STYLE HEADER (Sticky & Glassmorphism) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 500,
          width: '100%',
          backgroundColor: colors.navBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${colors.border}`,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: isMobile ? '0 14px' : '0 24px',
            height: isMobile ? 60 : 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {/* LEFT: BRAND LOGO (Parabol Style) */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 8 : 10,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <SheetGLLogo size={isMobile ? 26 : 30} glow={true} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 5 : 8 }}>
              <span
                style={{
                  fontSize: isMobile ? 19 : 22,
                  fontWeight: 900,
                  letterSpacing: '-0.035em',
                  color: colors.text,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
                }}
              >
                Sheet
                <span
                  style={{
                    background:
                      'linear-gradient(110deg, #c4b5fd 0%, #a855f7 32%, #818cf8 68%, #38bdf8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  GL
                </span>
              </span>
              <span
                style={{
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isDark ? '#38BDF8' : '#7C3AED',
                  letterSpacing: '-0.02em',
                  opacity: 0.92,
                }}
              >
                v{SHEETGL_VERSION}
              </span>
            </div>
          </div>

          {/* CENTER: NAV LINKS (Desktop) */}
          {!isMobile && (
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
              }}
            >
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#D1D5DB' : '#374151')}
              >
                {isTR ? 'Özellikler' : 'Features'}
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('preview')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#D1D5DB' : '#374151')}
              >
                Demo
              </button>

              <button
                type="button"
                onClick={onOpenDocs}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#D1D5DB' : '#374151')}
              >
                {isTR ? 'Dokümantasyon' : 'Docs'}
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#D1D5DB' : '#374151')}
              >
                {isTR ? 'SSS' : 'FAQ'}
              </button>

              <a
                href="https://github.com/umitunc/sheetgl"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: isDark ? '#D1D5DB' : '#374151',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? '#D1D5DB' : '#374151')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </a>
            </nav>
          )}

          {/* RIGHT: GITHUB, THEME TOGGLE, LANG TOGGLE, CTA BUTTON (Parabol Style) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            {/* GitHub Icon Button */}
            {!isMobile && (
              <a
                href="https://github.com/umitunc/sheetgl"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub Repository (umitunc/sheetgl)"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38BDF8')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            )}
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              title={isTR ? 'Dili İngilizceye çevir' : 'Switch to Turkish'}
              style={{
                padding: isMobile ? '5px 8px' : '6px 10px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                color: colors.text,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {lang.toUpperCase()}
            </button>

            {/* Sun/Moon Theme Toggle (Parabol Style) */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isTR ? 'Temayı Değiştir' : 'Toggle Theme'}
              style={{
                width: isMobile ? 34 : 38,
                height: isMobile ? 34 : 38,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                backgroundColor: isDark ? '#0D111A' : '#F1F5F9',
                color: isDark ? '#FBBF24' : '#6B21A8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? 14 : 16,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Primary Action Button: "Uygulamaya Git →" (Parabol Exact Style) */}
            <button
              type="button"
              onClick={onOpenStudio}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: isMobile ? 5 : 8,
                padding: isMobile ? '7px 13px' : '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 60%, #06B6D4 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: isMobile ? 12.5 : 13.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isDark
                  ? '0 4px 18px rgba(2, 132, 199, 0.45)'
                  : '0 4px 14px rgba(2, 132, 199, 0.3)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>{isMobile ? (isTR ? 'Stüdyo' : 'Studio') : isTR ? 'Uygulamaya Git' : 'Launch Studio'}</span>
              <span style={{ fontSize: isMobile ? 13 : 15 }}>→</span>
            </button>

            {/* Mobile Hamburger Menu Button */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle Menu"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        {/* MOBILE COLLAPSIBLE NAV DRAWER */}
        {isMobile && mobileMenuOpen && (
          <div
            style={{
              padding: '12px 16px 16px',
              borderTop: `1px solid ${colors.border}`,
              backgroundColor: isDark ? 'rgba(6, 7, 11, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection('features');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: colors.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚡ {isTR ? 'Özellikler' : 'Features'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection('preview');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: colors.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📐 {isTR ? 'Canlı Tablo Önizleme' : 'Live Grid Preview'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDocs();
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: colors.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📚 {isTR ? 'Dokümantasyon (/documentation)' : 'Documentation (/documentation)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection('faq');
              }}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: colors.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ❓ {isTR ? 'Sıkça Sorulan Sorular' : 'FAQ'}
            </button>
            <a
              href="https://github.com/umitunc/sheetgl"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: colors.text,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🐙 GitHub (umitunc/sheetgl)</span>
            </a>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section
        style={{
          maxWidth: 1260,
          margin: '0 auto',
          padding: isMobile ? '28px 14px 24px' : '44px 24px 32px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* LARGE FRAMELESS TRANSLUCENT HERO EMBLEM (FileManGL Style) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? 16 : 24,
            pointerEvents: 'none',
          }}
        >
          <SheetGLLogo
            size={isMobile ? 96 : 134}
            glow={true}
            style={{
              opacity: isDark ? 0.92 : 0.95,
            }}
          />
        </div>

        {/* HERO TITLE (Large & Bold Parabol Typography) */}
        <h1
          className={isDark ? 'hero-title-dark' : 'hero-title-light'}
          style={{
            fontSize: 'clamp(30px, 5.5vw, 68px)',
            fontWeight: 800,
            lineHeight: 1.12,
            margin: '0 auto 18px',
            maxWidth: 1040,
            letterSpacing: '-0.035em',
          }}
        >
          {isTR ? (
            <>
              React İçin Yeni Nesil{' '}
              <span className={isDark ? 'hero-gradient-span-dark' : 'hero-gradient-span-light'}>
                Ultra Hızlı Excel
              </span>{' '}
              DataGrid
            </>
          ) : (
            <>
              The Ultra-Fast{' '}
              <span className={isDark ? 'hero-gradient-span-dark' : 'hero-gradient-span-light'}>
                Excel-Grade DataGrid
              </span>{' '}
              for React
            </>
          )}
        </h1>

        {/* HERO SUBTITLE */}
        <p
          style={{
            fontSize: 17.5,
            color: colors.muted,
            maxWidth: 820,
            margin: '0 auto 34px',
            lineHeight: 1.7,
            fontWeight: 400,
          }}
        >
          {isTR
            ? '100.000+ satırda takılmayan yüksek hızlı Canvas performansı. Akıllı hücre çoğaltma, Excel kısayolları ve kurumsal veri yönetimi tek bir bileşende.'
            : 'Ultra-smooth Canvas performance across 100,000+ rows. Smart fill handles, Excel shortcuts, and enterprise-grade data management in a single component.'}
        </p>

        {/* CTA ACTIONS (Parabol Style) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <button
            type="button"
            onClick={onOpenStudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 26px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 60%, #06B6D4 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 14.5,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
              transition: 'transform 0.18s ease',
            }}
          >
            <span>{isTR ? 'Stüdyoyu Başlat' : 'Launch Studio'}</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={onOpenDocs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 22px',
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
              color: colors.text,
              fontWeight: 700,
              fontSize: 14.5,
              cursor: 'pointer',
              transition: 'background-color 0.18s ease',
            }}
          >
            <span>{isTR ? 'Dokümantasyon' : 'Documentation'}</span>
          </button>

          <a
            href="https://github.com/umitunc/sheetgl"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '13px 22px',
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
              color: colors.text,
              fontWeight: 700,
              fontSize: 14.5,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.18s ease, border-color 0.18s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38BDF8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = colors.border)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>

        {/* ==================================================================
            INTERACTIVE NPM / NPX / PNPM / BUN CLI & REACT USAGE BAR (uxiGL Style)
        ================================================================== */}
        <div
          style={{
            maxWidth: 820,
            margin: '0 auto 34px',
            borderRadius: 16,
            border: `1px solid ${colors.cardBorder}`,
            backgroundColor: isDark ? 'rgba(9, 14, 26, 0.92)' : '#FFFFFF',
            boxShadow: isDark
              ? '0 18px 42px -12px rgba(0, 0, 0, 0.65)'
              : '0 12px 32px -10px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: '8px 14px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: isDark ? 'rgba(6, 10, 18, 0.9)' : '#F1F5F9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {(
                Object.keys(installCommands) as Array<keyof typeof installCommands>
              ).map((key) => {
                const item = installCommands[key];
                const active = installTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInstallTab(key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: active
                        ? '1px solid rgba(56, 189, 248, 0.45)'
                        : '1px solid transparent',
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(2, 132, 199, 0.22)'
                          : 'rgba(2, 132, 199, 0.12)'
                        : 'transparent',
                      color: active
                        ? isDark
                          ? '#7DD3FC'
                          : '#0369A1'
                        : colors.muted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowQuickUsage((p) => !p)}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: showQuickUsage
                  ? 'rgba(16, 185, 129, 0.18)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : '#FFFFFF',
                color: showQuickUsage ? '#10B981' : colors.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showQuickUsage
                ? isTR
                  ? 'Örnek Kodu Gizle'
                  : 'Hide Code'
                : isTR
                ? 'Örnek Kullanım (TSX)'
                : 'Code Usage (TSX)'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto' }}>
              <span style={{ color: '#10B981', fontWeight: 800 }}>$</span>
              <code style={{ color: colors.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {installCommands[installTab].cmd}
              </code>
              {!isMobile && (
                <span style={{ fontSize: 11.5, color: colors.muted, fontFamily: 'Inter, sans-serif' }}>
                  — {installCommands[installTab].hint}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                copyCommand(`hero-${installTab}`, installCommands[installTab].cmd)
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC',
                color: colors.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copiedCmdKey === `hero-${installTab}` ? (
                <>
                  <Check size={13} color="#10B981" />
                  <span style={{ color: '#10B981' }}>
                    {isTR ? 'Kopyalandı' : 'Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy size={13} color="#38BDF8" />
                  <span>{isTR ? 'Kopyala' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>

          {showQuickUsage && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: isDark ? '#050811' : '#F8FAFC',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: isDark ? '#A5F3FC' : '#0F172A',
                  overflowX: 'auto',
                }}
              >
                <code>{sheetglUsageSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        {/* LIVE INTERACTIVE CANVAS PREVIEW BADGE */}
        <div
          id="preview"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            maxWidth: 1220,
            margin: '0 auto 12px',
            padding: '0 4px',
            fontSize: 12,
            color: colors.muted,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
                flexShrink: 0,
              }}
            />
            <span style={{ color: colors.text }}>
              {isTR ? 'Canlı İnteraktif Önizleme (Aşağıdaki Tabloyu Deneyin)' : 'Live Interactive Preview (Try the Grid Below)'}
            </span>
          </div>
          {!isMobile && (
            <span style={{ fontSize: 11.5 }}>
              {isTR ? 'Fill Handle • Satır Ekle/Sil • Çoklu Seçim' : 'Fill Handle • Add/Delete • Multi Select'}
            </span>
          )}
        </div>

        {/* LIVE INTERACTIVE EMBEDDED PREVIEW CONTAINER */}
        <div
          style={{
            height: isMobile ? 440 : 540,
            borderRadius: isMobile ? 12 : 16,
            overflow: 'hidden',
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: isDark
              ? '0 28px 70px rgba(0, 0, 0, 0.75), 0 0 35px rgba(134, 59, 255, 0.15)'
              : '0 24px 60px rgba(134, 59, 255, 0.15), 0 10px 24px rgba(15, 23, 42, 0.08)',
            textAlign: 'left',
          }}
        >
          <SheetGL
            dataSource={demoData}
            columns={demoColumns}
            theme={isDark ? 'apple-dark' : 'apple-light'}
            locale={lang}
            batchEditMode={true}
          />
        </div>
      </section>

      {/* FEATURE PILLARS GRID */}
      <section id="features" style={{ maxWidth: 1260, margin: '0 auto', padding: isMobile ? '32px 14px 48px' : '48px 24px 72px' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: isMobile ? 24 : 32,
            fontWeight: 800,
            marginBottom: isMobile ? 24 : 36,
            letterSpacing: '-0.02em',
          }}
        >
          {isTR ? 'Kurumsal Mimari ve Öne Çıkan Yetenekler' : 'Enterprise Architecture & Capabilities'}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: isMobile ? 14 : 20,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: 24,
                borderRadius: 14,
                backgroundColor: colors.card,
                border: `1px solid ${colors.cardBorder}`,
                backdropFilter: 'blur(10px)',
                boxShadow: isDark
                  ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                  : '0 4px 16px rgba(134, 59, 255, 0.06)',
                transition: 'transform 0.2s ease, border-color 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 14,
                  backgroundColor: isDark ? 'rgba(134, 59, 255, 0.16)' : 'rgba(134, 59, 255, 0.1)',
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16.5, marginBottom: 8, color: colors.text }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13.5, color: colors.muted, lineHeight: 1.65 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION (Parabol style) */}
      <section id="faq" style={{ maxWidth: 880, margin: '0 auto', padding: '16px 24px 72px' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 32,
            letterSpacing: '-0.02em',
          }}
        >
          {isTR ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                padding: '20px 24px',
                borderRadius: 14,
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15.5, marginBottom: 8, color: colors.text }}>
                {faq.q}
              </div>
              <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6 }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${colors.border}`,
          padding: '32px 24px',
          textAlign: 'center',
          fontSize: 13,
          color: colors.muted,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <SheetGLLogo size={18} />
          <span style={{ fontWeight: 800, color: colors.text }}>
            Sheet
            <span
              style={{
                background:
                  'linear-gradient(110deg, #c4b5fd 0%, #a855f7 32%, #818cf8 68%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              GL
            </span>
          </span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              color: isDark ? '#38BDF8' : '#7C3AED',
              opacity: 0.9,
            }}
          >
            v{SHEETGL_VERSION}
          </span>
          <span>•</span>
          <span>Next-Gen WebGL & Canvas DataGrid for React</span>
        </div>
        <nav
          aria-label="Footer Links"
          style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginBottom: 10, fontSize: 12.5 }}
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{ color: colors.muted, textDecoration: 'none' }}
          >
            {isTR ? 'Ana Sayfa (/)' : 'Home (/)'}
          </a>
          <a
            href="/documentation"
            onClick={(e) => {
              e.preventDefault();
              onOpenDocs();
            }}
            style={{ color: colors.muted, textDecoration: 'none' }}
          >
            {isTR ? 'Dokümantasyon (/documentation)' : 'Documentation (/documentation)'}
          </a>
          <a
            href="/demo"
            onClick={(e) => {
              e.preventDefault();
              onOpenStudio();
            }}
            style={{ color: colors.muted, textDecoration: 'none' }}
          >
            {isTR ? 'Canlı Demo (/demo)' : 'Live Demo (/demo)'}
          </a>
          <a
            href="https://github.com/umitunc/sheetgl"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.muted, textDecoration: 'none' }}
          >
            GitHub
          </a>
          <a href="/llms.txt" target="_blank" rel="noreferrer" style={{ color: colors.muted, textDecoration: 'none' }}>
            LLMs.txt (GEO)
          </a>
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" style={{ color: colors.muted, textDecoration: 'none' }}>
            Sitemap
          </a>
        </nav>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { id: 'ft-sheetgl', cmd: 'npm i sheetgl' },
            { id: 'ft-npx-init', cmd: 'npx sheetgl init' },
            { id: 'ft-npx-create', cmd: 'npx sheetgl create my-excel-app' },
            { id: 'ft-uxigl', cmd: 'npm i truncgil-uxigl' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => copyCommand(item.id, item.cmd)}
              title={isTR ? 'Panoya kopyala' : 'Copy to clipboard'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 11px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
                color: colors.text,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{ color: '#10B981', fontWeight: 800 }}>$</span>
              <span>{item.cmd}</span>
              {copiedCmdKey === item.id ? (
                <Check size={12} color="#10B981" />
              ) : (
                <Copy size={12} color={colors.muted} />
              )}
            </button>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span>MIT License • © {new Date().getFullYear()} SheetGL</span>
          <span>•</span>
          <span>
            Crafted with ❤️ by{' '}
            <a
              href="https://www.truncgil.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: isDark ? '#FDBA74' : '#EA580C',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              🍊 Trunçgil Teknoloji
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};
