import React, { useEffect } from 'react';
import { ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';

export interface PdfPreviewModalState {
  url: string;
  title: string;
  column?: ColumnDef;
  row?: Record<string, any>;
}

export interface PdfPreviewModalOverlayProps {
  modal: PdfPreviewModalState;
  theme: IGridThemeTokens;
  locale: IGridLocale;
  onClose: () => void;
}

export const PdfPreviewModalOverlay: React.FC<PdfPreviewModalOverlayProps> = ({
  modal,
  theme,
  locale,
  onClose,
}) => {
  const isTR = locale.code.startsWith('tr');
  const fileName = modal.url.split('/').pop() || modal.title || 'document.pdf';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1180,
          height: '90vh',
          backgroundColor: theme.isDark ? '#0F172A' : '#FFFFFF',
          borderRadius: 14,
          border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: `1px solid ${theme.isDark ? '#1E293B' : '#E2E8F0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.isDark ? '#090D16' : '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 800,
                fontSize: 11,
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              PDF VIEW
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: theme.isDark ? '#F1F5F9' : '#0F172A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {modal.title || fileName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: theme.isDark ? '#94A3B8' : '#64748B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {modal.url}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href={modal.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: theme.isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                color: theme.isDark ? '#38BDF8' : '#0284C7',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                border: `1px solid ${theme.isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.2)'}`,
              }}
            >
              <span>{isTR ? 'Yeni Sekmede Aç' : 'Open in New Tab'}</span>
              <span>↗</span>
            </a>

            <a
              href={modal.url}
              download={fileName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: theme.isDark ? '#1E293B' : '#E2E8F0',
                color: theme.isDark ? '#F1F5F9' : '#1E293B',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>{isTR ? 'İndir' : 'Download'}</span>
              <span>↓</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.isDark ? '#94A3B8' : '#64748B',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
              }}
              title={isTR ? 'Kapat (Esc)' : 'Close (Esc)'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div style={{ flex: 1, backgroundColor: '#525659', position: 'relative' }}>
          <iframe
            src={`${modal.url}#toolbar=1&navpanes=0`}
            title={modal.title || fileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};
