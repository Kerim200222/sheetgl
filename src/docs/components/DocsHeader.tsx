import React from 'react';
import { SheetGLLogo } from '../../datagrid/ui/SheetGLLogo';
import { MaterialIcon } from '../../datagrid/ui/MaterialIcon';
import { SHEETGL_VERSION } from '../../datagrid/version';
import { DocThemeColors } from '../types';

export interface DocsHeaderProps {
  isDark: boolean;
  isTR: boolean;
  colors: DocThemeColors;
  isMobile?: boolean;
  mobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
  onGoLanding: () => void;
  onGoStudio: () => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
}

export const DocsHeader: React.FC<DocsHeaderProps> = ({
  isDark,
  isTR,
  colors,
  isMobile = false,
  mobileSidebarOpen = false,
  onToggleMobileSidebar,
  onGoLanding,
  onGoStudio,
  onToggleLang,
  onToggleTheme,
}) => {
  return (
    <header
      style={{
        height: isMobile ? 56 : 60,
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.sidebarBg,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
        {isMobile && onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            title={isTR ? 'Dokümantasyon Menüsü' : 'Documentation Menu'}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${mobileSidebarOpen ? colors.accent : colors.border}`,
              backgroundColor: mobileSidebarOpen ? colors.accentBg : colors.surface,
              color: mobileSidebarOpen ? colors.accent : colors.text,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <MaterialIcon name={mobileSidebarOpen ? 'close' : 'menu'} size={20} color={mobileSidebarOpen ? colors.accent : colors.text} />
          </button>
        )}

        <div
          onClick={onGoLanding}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 7 : 10,
            cursor: 'pointer',
          }}
        >
          <SheetGLLogo size={isMobile ? 24 : 28} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontWeight: 900, fontSize: isMobile ? 17 : 19, letterSpacing: '-0.03em' }}>
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
                fontSize: isMobile ? 10.5 : 11.5,
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

        <button
          type="button"
          onClick={onGoLanding}
          title={isTR ? 'Ana Sayfa' : 'Home'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: isMobile ? '6px 8px' : '6px 12px',
            borderRadius: 7,
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: colors.muted,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <MaterialIcon name="home" size={16} color={colors.muted} />
          {!isMobile && <span>{isTR ? 'Ana Sayfa' : 'Home'}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
        <a
          href="https://github.com/umitunc/sheetgl"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: isMobile ? '6px 8px' : '6px 12px',
            borderRadius: 7,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {!isMobile && <span>GitHub</span>}
        </a>

        <button
          type="button"
          onClick={onToggleLang}
          style={{
            padding: isMobile ? '6px 8px' : '6px 12px',
            borderRadius: 7,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isTR ? 'TR' : 'EN'}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title={isTR ? 'Temayı Değiştir' : 'Toggle Theme'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: isMobile ? '6px 8px' : '6px 12px',
            borderRadius: 7,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <MaterialIcon name={isDark ? 'light_mode' : 'dark_mode'} size={16} color={colors.accent} />
          {!isMobile && <span>{isDark ? (isTR ? 'Açık' : 'Light') : isTR ? 'Koyu' : 'Dark'}</span>}
        </button>

        <button
          type="button"
          onClick={onGoStudio}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: isMobile ? '7px 11px' : '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #0284C7 0%, #4F46E5 100%)',
            color: '#FFFFFF',
            fontSize: isMobile ? 12 : 13.5,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <MaterialIcon name="rocket_launch" size={15} color="#FFFFFF" />
          <span>{isMobile ? 'Demo' : isTR ? 'Canlı Demo (10K Satır)' : 'Full Demo (10K Rows)'}</span>
        </button>
      </div>
    </header>
  );
};
