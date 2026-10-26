import React, { useState } from 'react';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ThemeEngine } from '../theme/ThemeEngine';
import { IGridLocale } from '../i18n/IGridLocale';
import { LocaleEngine } from '../i18n/LocaleEngine';
import { MaterialIcon } from '../ui/MaterialIcon';

import { useOptionalGridState } from '../state';

export interface DeleteConfirmProgressModalProps {
  rowKeys: any[];
  sampleRows: Record<string, any>[];
  batchMode: boolean;
  theme?: IGridThemeTokens;
  locale?: IGridLocale;
  onConfirm: (onProgress: (processed: number, total: number) => void) => Promise<void>;
  onCancel: () => void;
}

export const DeleteConfirmProgressModal: React.FC<DeleteConfirmProgressModalProps> = ({
  rowKeys,
  sampleRows,
  batchMode,
  theme: propTheme,
  locale: propLocale,
  onConfirm,
  onCancel,
}) => {
  const gridState = useOptionalGridState();
  const theme = propTheme ?? gridState?.resolvedTheme ?? ThemeEngine.resolve('apple-dark');
  const locale = propLocale ?? gridState?.currentLocale ?? LocaleEngine.resolve('auto');
  const isTR = locale.code.startsWith('tr');
  const totalCount = rowKeys.length;

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);

  const percent =
    totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0;

  const handleStartDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setProcessedCount(0);

    // Yield a frame so the progress bar UI mounts immediately before batch processing starts
    await new Promise((r) => setTimeout(r, 20));

    await onConfirm((processed) => {
      setProcessedCount(processed);
    });
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDeleting && e.target === e.currentTarget) {
          onCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(6, 10, 18, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 16,
          backgroundColor: theme.dom.popoverBg,
          color: theme.dom.popoverText,
          border: `1px solid ${theme.dom.popoverBorder}`,
          boxShadow: '0 28px 70px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.dom.popoverBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="warning" size={20} color="#EF4444" />
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>
                {isDeleting
                  ? isTR
                    ? 'Satırlar Siliniyor...'
                    : 'Deleting Selected Rows...'
                  : isTR
                  ? 'Silme İşlemini Onaylayın'
                  : 'Confirm Row Deletion'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                {isTR
                  ? `Toplam ${totalCount.toLocaleString('tr-TR')} kayıt seçildi`
                  : `${totalCount.toLocaleString('en-US')} records selected`}
              </div>
            </div>
          </div>

          {!isDeleting && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: 'transparent',
                color: theme.dom.popoverText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="close" size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isDeleting ? (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 600 }}>
                {isTR ? (
                  <>
                    Seçili{' '}
                    <strong style={{ color: '#F87171' }}>
                      {totalCount.toLocaleString('tr-TR')} satırı
                    </strong>{' '}
                    silmek istediğinize emin misiniz?
                  </>
                ) : (
                  <>
                    Are you sure you want to delete{' '}
                    <strong style={{ color: '#F87171' }}>
                      {totalCount.toLocaleString('en-US')} selected rows
                    </strong>
                    ?
                  </>
                )}
              </div>

              {/* Sample Preview of rows to be deleted */}
              {sampleRows.length > 0 && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: theme.isDark ? 'rgba(0,0,0,0.28)' : 'rgba(15,23,42,0.04)',
                    border: `1px solid ${theme.dom.popoverBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>
                    {isTR ? 'Silinecek Kayıt Önizlemesi:' : 'Preview of Rows to Delete:'}
                  </div>
                  {sampleRows.slice(0, 4).map((r, i) => (
                    <div
                      key={String(r.id ?? i)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 0',
                        borderBottom:
                          i < Math.min(sampleRows.length, 4) - 1
                            ? `1px dashed ${theme.dom.popoverBorder}`
                            : 'none',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#F87171' }}>
                        #{r.id} {r.code ? `• ${r.code}` : ''}
                      </span>
                      <span style={{ opacity: 0.85 }}>
                        {r.company || r.name || r.city || ''}
                      </span>
                    </div>
                  ))}
                  {totalCount > 4 && (
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', paddingTop: 2 }}>
                      {isTR
                        ? `+ ${(totalCount - 4).toLocaleString('tr-TR')} diğer satır daha silinecek...`
                        : `+ ${(totalCount - 4).toLocaleString('en-US')} more rows...`}
                    </div>
                  )}
                </div>
              )}

              {batchMode && (
                <div
                  style={{
                    fontSize: 11.5,
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#38BDF8',
                    lineHeight: 1.4,
                  }}
                >
                  ℹ️{' '}
                  {isTR
                    ? 'Toplu Düzenleme (Batch) modu aktif olduğu için silinen satırları "Toplu Kaydet" öncesinde Değişiklik Özeti penceresinden geri alabilirsiniz.'
                    : 'Batch mode is active: you can still restore deleted rows before committing Batch Save.'}
                </div>
              )}
            </>
          ) : (
            /* LIVE PROGRESS BAR VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {isTR
                    ? `İşleniyor: ${processedCount.toLocaleString('tr-TR')} / ${totalCount.toLocaleString('tr-TR')} satır`
                    : `Processing: ${processedCount.toLocaleString('en-US')} / ${totalCount.toLocaleString('en-US')} rows`}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#EF4444' }}>{percent}%</span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: theme.isDark ? '#1E293B' : '#E2E8F0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #EF4444, #F97316)',
                    transition: 'width 80ms linear',
                  }}
                />
              </div>

              <div style={{ fontSize: 11.5, opacity: 0.75, textAlign: 'center' }}>
                {isTR
                  ? 'Sanal indeks ve özet tabloları güncelleniyor, lütfen bekleyin...'
                  : 'Updating virtual viewport & summary indices, please wait...'}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {!isDeleting && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: `1px solid ${theme.dom.popoverBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: 'transparent',
                color: theme.dom.popoverText,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isTR ? 'Vazgeç' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleStartDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
              }}
            >
              <MaterialIcon name="delete_forever" size={16} color="#FFFFFF" />
              <span>
                {isTR
                  ? `Evet, ${totalCount.toLocaleString('tr-TR')} Satırı Sil`
                  : `Yes, Delete ${totalCount.toLocaleString('en-US')} Rows`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
