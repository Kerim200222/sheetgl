import React, { useState } from 'react';
import { BatchChanges } from '../types/store';
import { ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { MaterialIcon } from '../ui/MaterialIcon';

import { useGridState } from '../state';

export interface BatchChangesModalProps {
  changes: BatchChanges;
  columns: ColumnDef[];
  theme?: IGridThemeTokens;
  locale?: IGridLocale;
  onConfirmSave: () => void;
  onDiscardAll: () => void;
  onRevertDelete?: (rowKey: any) => void;
  onRevertUpdate?: (rowKey: any, columnId?: string) => void;
  onRevertInsert?: (rowKey: any) => void;
  onClose: () => void;
}

type ModalTab = 'all' | 'deleted' | 'updated' | 'inserted' | 'payload';

function formatVal(val: any): string {
  if (val === null || val === undefined || val === '') return '— (Boş)';
  if (typeof val === 'boolean') return val ? 'True (✓)' : 'False (✕)';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function getRowSummaryLabel(row: Record<string, any> | undefined, key: any): string {
  if (!row) return `#${key}`;
  const labelParts: string[] = [];
  if (row.code) labelParts.push(String(row.code));
  if (row.company) labelParts.push(String(row.company));
  else if (row.name) labelParts.push(String(row.name));
  else if (row.title) labelParts.push(String(row.title));
  if (row.city) labelParts.push(`(${row.city})`);
  return labelParts.length > 0 ? `#${key} • ${labelParts.join(' — ')}` : `Satır #${key}`;
}

export const BatchChangesModal: React.FC<BatchChangesModalProps> = ({
  changes,
  columns,
  theme: propTheme,
  locale: propLocale,
  onConfirmSave,
  onDiscardAll,
  onRevertDelete,
  onRevertUpdate,
  onRevertInsert,
  onClose,
}) => {
  const gridState = useGridState();
  const theme = propTheme ?? gridState.resolvedTheme;
  const locale = propLocale ?? gridState.currentLocale;
  const isTR = locale.code.startsWith('tr');
  const inserted = changes.inserted || [];
  const updated = changes.updated || [];
  const deletedKeys = changes.deleted || [];
  const deletedRowsData =
    changes.deletedRowsData || deletedKeys.map((k) => ({ key: k, data: { id: k } }));

  const defaultTab: ModalTab =
    deletedRowsData.length > 0 && updated.length === 0 && inserted.length === 0
      ? 'deleted'
      : 'all';
  const [activeTab, setActiveTab] = useState<ModalTab>(defaultTab);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [visibleLimit, setVisibleLimit] = useState<number>(80);

  const colTitleMap = new Map<string, string>();
  for (const c of columns) {
    colTitleMap.set(c.id, c.title || c.id);
  }

  const totalOps = inserted.length + updated.length + deletedRowsData.length;

  const formattedJsonPayload =
    activeTab === 'payload'
      ? JSON.stringify(
          {
            endpoint: 'POST /api/v1/sheetgl/batch-commit',
            timestamp: new Date().toISOString(),
            summary: {
              totalOperations: totalOps,
              insertedCount: inserted.length,
              updatedCount: updated.length,
              deletedCount: deletedKeys.length,
            },
            payload: {
              inserted: inserted.slice(0, 200),
              updated: updated.slice(0, 200).map((u) => ({
                key: u.key,
                values: u.values,
                oldValues: u.oldValues,
              })),
              deleted: deletedKeys.slice(0, 500),
              deletedRowsSnapshot: deletedRowsData.slice(0, 100),
              ...(totalOps > 200
                ? {
                    _previewNote: isTR
                      ? `Performans için önizlemede ilk kayıtlar gösteriliyor (Toplam: ${totalOps.toLocaleString('tr-TR')} işlem)`
                      : `Showing first records in preview for performance (Total: ${totalOps.toLocaleString('en-US')} operations)`,
                  }
                : {}),
            },
          },
          null,
          2
        )
      : '';

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
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
          maxWidth: 780,
          maxHeight: '84vh',
          display: 'flex',
          flexDirection: 'column',
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
            padding: '16px 22px',
            borderBottom: `1px solid ${theme.dom.popoverBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(34, 197, 94, 0.16)',
                color: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="fact_check" size={20} color="#22C55E" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {isTR
                  ? `Bekleyen Toplu Değişiklik Özeti (${totalOps} İşlem)`
                  : `Pending Batch Changes Summary (${totalOps} Operations)`}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {isTR
                  ? 'Kaydetmeden önce silinecek satırları, güncellenen hücreleri ve yeni kayıtları inceleyin veya tekil olarak geri alın.'
                  : 'Review rows to be deleted, modified cells, and newly inserted records before committing.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
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
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {/* Summary Filter Tabs */}
        <div
          style={{
            padding: '12px 22px',
            borderBottom: `1px solid ${theme.dom.popoverBorder}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {[
            { id: 'all' as const, label: isTR ? `Tümü (${totalOps})` : `All (${totalOps})`, color: '#38BDF8', icon: 'list_alt' },
            { id: 'deleted' as const, label: isTR ? `Silinecek Satırlar (${deletedRowsData.length})` : `Rows to Delete (${deletedRowsData.length})`, color: '#EF4444', icon: 'delete_sweep' },
            { id: 'updated' as const, label: isTR ? `Güncellenen Satırlar (${updated.length})` : `Modified Rows (${updated.length})`, color: '#3B82F6', icon: 'edit_note' },
            { id: 'inserted' as const, label: isTR ? `Yeni Eklenenler (${inserted.length})` : `Inserted Rows (${inserted.length})`, color: '#22C55E', icon: 'playlist_add' },
            { id: 'payload' as const, label: isTR ? `{ } JSON Payload` : `{ } JSON Payload`, color: '#A855F7', icon: 'data_object' },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${active ? t.color : theme.dom.popoverBorder}`,
                  backgroundColor: active ? `${t.color}22` : 'transparent',
                  color: active ? t.color : theme.dom.popoverText,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                <MaterialIcon name={t.icon} size={15} color={active ? t.color : undefined} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {totalOps === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.7, fontSize: 14 }}>
              {isTR ? 'Bekleyen herhangi bir değişiklik kalmadı.' : 'No pending changes remaining.'}
            </div>
          )}

          {/* 1. DELETED ROWS SECTION */}
          {(activeTab === 'all' || activeTab === 'deleted') && deletedRowsData.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#EF4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="delete_forever" size={16} color="#EF4444" />
                <span>
                  {isTR
                    ? `SİLİNECEK SATIRLAR (${deletedRowsData.length} Kayıt)`
                    : `ROWS MARKED FOR DELETION (${deletedRowsData.length} Records)`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deletedRowsData.slice(0, visibleLimit).map(({ key, data }) => (
                  <div
                    key={String(key)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#F87171' }}>
                        {getRowSummaryLabel(data, key)}
                      </div>
                      <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {Object.entries(data)
                          .filter(([k]) => !k.startsWith('__') && k !== 'sparkline')
                          .slice(0, 5)
                          .map(([k, v]) => (
                            <span key={k}>
                              <strong>{colTitleMap.get(k) || k}:</strong> {formatVal(v)}
                            </span>
                          ))}
                      </div>
                    </div>
                    {onRevertDelete && (
                      <button
                        type="button"
                        onClick={() => onRevertDelete(key)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          backgroundColor: theme.dom.popoverBg,
                          color: '#F87171',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <MaterialIcon name="undo" size={14} color="#F87171" />
                        <span>{isTR ? 'Silmeyi Geri Al' : 'Restore Row'}</span>
                      </button>
                    )}
                  </div>
                ))}
                {deletedRowsData.length > visibleLimit && (
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + 200)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: `1px solid ${theme.dom.popoverBorder}`,
                      backgroundColor: 'transparent',
                      color: theme.dom.popoverText,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {isTR
                      ? `Daha Fazla Göster (+200) — Kalan: ${(deletedRowsData.length - visibleLimit).toLocaleString('tr-TR')} satır`
                      : `Load More (+200) — Remaining: ${(deletedRowsData.length - visibleLimit).toLocaleString('en-US')} rows`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. UPDATED ROWS SECTION */}
          {(activeTab === 'all' || activeTab === 'updated') && updated.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#38BDF8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="edit_note" size={16} color="#38BDF8" />
                <span>
                  {isTR
                    ? `GÜNCELLENEN SATIRLAR VE HÜCRELER (${updated.length} Satır)`
                    : `MODIFIED ROWS & CELLS (${updated.length} Rows)`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {updated.map((item) => (
                  <div
                    key={String(item.key)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(56, 189, 248, 0.32)',
                      backgroundColor: 'rgba(56, 189, 248, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>
                        {getRowSummaryLabel(item.rowData, item.key)}
                      </span>
                      {onRevertUpdate && (
                        <button
                          type="button"
                          onClick={() => onRevertUpdate(item.key)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: `1px solid ${theme.dom.popoverBorder}`,
                            backgroundColor: 'transparent',
                            color: theme.dom.popoverText,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <MaterialIcon name="undo" size={13} />
                          <span>{isTR ? 'Satırı Geri Al' : 'Revert Row'}</span>
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {Object.entries(item.values).map(([colId, newVal]) => {
                        const oldVal = item.oldValues?.[colId];
                        return (
                          <div
                            key={colId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '5px 8px',
                              borderRadius: 6,
                              backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.75)',
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <strong>{colTitleMap.get(colId) || colId}:</strong>{' '}
                              <span style={{ textDecoration: 'line-through', opacity: 0.65, color: '#F87171' }}>
                                {formatVal(oldVal)}
                              </span>{' '}
                              <span style={{ margin: '0 4px', opacity: 0.6 }}>→</span>
                              <span style={{ fontWeight: 700, color: '#22C55E' }}>
                                {formatVal(newVal)}
                              </span>
                            </div>
                            {onRevertUpdate && (
                              <button
                                type="button"
                                onClick={() => onRevertUpdate(item.key, colId)}
                                title={isTR ? 'Bu hücreyi eski değerine döndür' : 'Revert this cell'}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#38BDF8',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isTR ? 'Geri Al' : 'Revert'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. INSERTED ROWS SECTION */}
          {(activeTab === 'all' || activeTab === 'inserted') && inserted.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#22C55E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="playlist_add_check" size={16} color="#22C55E" />
                <span>
                  {isTR
                    ? `YENİ EKLENEN SATIRLAR (${inserted.length} Kayıt)`
                    : `NEWLY INSERTED ROWS (${inserted.length} Records)`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inserted.map((row) => {
                  const key = row.id;
                  return (
                    <div
                      key={String(key)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        backgroundColor: 'rgba(34, 197, 94, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#4ADE80' }}>
                        {getRowSummaryLabel(row, key)}
                      </div>
                      {onRevertInsert && (
                        <button
                          type="button"
                          onClick={() => onRevertInsert(key)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 9px',
                            borderRadius: 6,
                            border: '1px solid rgba(34, 197, 94, 0.4)',
                            backgroundColor: 'transparent',
                            color: '#4ADE80',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <MaterialIcon name="delete" size={14} color="#4ADE80" />
                          <span>{isTR ? 'Eklemeyi İptal Et' : 'Remove Row'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. JSON PAYLOAD PREVIEW SECTION */}
          {activeTab === 'payload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#A855F7', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MaterialIcon name="data_object" size={16} color="#A855F7" />
                  <span>
                    {isTR
                      ? 'BACKEND API SAVE / BATCH COMMIT JSON PAYLOAD'
                      : 'BACKEND API SAVE / BATCH COMMIT JSON PAYLOAD'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(formattedJsonPayload);
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 1800);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    backgroundColor: 'rgba(168, 85, 247, 0.14)',
                    color: '#C084FC',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <MaterialIcon name={copiedPayload ? 'check' : 'content_copy'} size={14} color="#C084FC" />
                  <span>
                    {copiedPayload
                      ? isTR
                        ? 'Kopyalandı!'
                        : 'Copied!'
                      : isTR
                      ? 'JSON Payload Kopyala'
                      : 'Copy JSON Payload'}
                  </span>
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: theme.isDark ? '#090D16' : '#0F172A',
                  color: '#E2E8F0',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  overflowX: 'auto',
                  maxHeight: 340,
                }}
              >
                {formattedJsonPayload}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: `1px solid ${theme.dom.popoverBorder}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onDiscardAll();
              onClose();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(239, 68, 68, 0.45)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#F87171',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <MaterialIcon name="history" size={15} color="#F87171" />
            <span>{isTR ? 'Tüm Değişikliklerden Vazgeç' : 'Discard All Changes'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
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
              {isTR ? 'Kapat' : 'Close'}
            </button>

            <button
              type="button"
              disabled={totalOps === 0}
              onClick={() => {
                onConfirmSave();
                onClose();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: totalOps === 0 ? '#4B5563' : '#22C55E',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 800,
                cursor: totalOps === 0 ? 'not-allowed' : 'pointer',
                boxShadow: totalOps > 0 ? '0 4px 14px rgba(34, 197, 94, 0.4)' : 'none',
              }}
            >
              <MaterialIcon name="save" size={16} color="#FFFFFF" />
              <span>
                {isTR
                  ? `Onayla ve Toplu Kaydet (${totalOps})`
                  : `Confirm & Batch Save (${totalOps})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
