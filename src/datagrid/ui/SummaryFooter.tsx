import React, { useState } from 'react';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnDef, GridSummaryConfig, SelectionStatMetric } from '../types/grid';
import { SummaryType } from '../types/group';
import { IGridLocale } from '../i18n/IGridLocale';
import { MaterialIcon } from './MaterialIcon';

export interface SelectionSummaryStats {
  count: number;
  numericCount: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
}

export interface SummaryFooterProps {
  summaries?: Record<string, number>;
  summaryTypes?: Record<string, SummaryType>;
  onChangeSummaryType?: (columnId: string, summaryType: SummaryType) => void;
  summaryConfig?: GridSummaryConfig;
  onUpdateSummaryConfig?: (patch: Partial<GridSummaryConfig>) => void;
  selectionStats?: SelectionSummaryStats | null;
  columns: ColumnDef[];
  theme: IGridThemeTokens;
  locale: IGridLocale;
  totalRowCount: number;
  unfilteredRowCount?: number;
}

const SUMMARY_TYPE_ICONS: Record<SummaryType, string> = {
  sum: 'functions',
  avg: 'analytics',
  min: 'south',
  max: 'north',
  count: 'tag',
  none: 'block',
};

export const SummaryFooter: React.FC<SummaryFooterProps> = ({
  summaries,
  summaryTypes = {},
  onChangeSummaryType,
  summaryConfig,
  onUpdateSummaryConfig,
  selectionStats,
  columns,
  theme,
  locale,
  totalRowCount,
  unfilteredRowCount,
}) => {
  const [openConfigCol, setOpenConfigCol] = useState<string | null>(null);
  const [showAddSummary, setShowAddSummary] = useState<boolean>(false);
  const isTR = locale.code.startsWith('tr');

  const isVisible = summaryConfig?.visible !== false;
  if (!isVisible) return null;

  const showTotalCount = summaryConfig?.showTotalCount !== false;
  const showSelectionStats = summaryConfig?.showSelectionStats !== false;
  const showColumnSummaries = summaryConfig?.showColumnSummaries !== false;
  const allowConfiguration = summaryConfig?.allowConfiguration !== false;
  const activeMetrics: SelectionStatMetric[] = summaryConfig?.selectionMetrics || [
    'count',
    'sum',
    'avg',
    'min',
    'max',
  ];

  const hasMetric = (m: SelectionStatMetric) => activeMetrics.includes(m);

  const formatSummaryVal = (colId: string, val: number, sType: SummaryType): string => {
    const itemOverride = summaryConfig?.items?.find((i) => i.columnId === colId);
    if (sType === 'count') {
      const base = val.toLocaleString(locale.code);
      return `${itemOverride?.prefix || ''}${base}${itemOverride?.suffix || ''}`;
    }
    const col = columns.find((c) => c.id === colId);
    const digits = itemOverride?.decimalDigits ?? (col?.type === 'currency' ? 2 : 2);
    const formattedNum = val.toLocaleString(locale.code, {
      minimumFractionDigits: col?.type === 'currency' ? Math.min(2, digits) : 0,
      maximumFractionDigits: digits,
    });
    if (itemOverride?.prefix || itemOverride?.suffix) {
      return `${itemOverride.prefix || ''}${formattedNum}${itemOverride.suffix || ''}`;
    }
    if (col?.type === 'currency') {
      return `${col.currencySymbol || '$'}${formattedNum}`;
    }
    if (col?.type === 'progress' || col?.type === 'percent') {
      return `${formattedNum}%`;
    }
    return formattedNum;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        backgroundColor: theme.canvas.rowNumberBg,
        borderTop: `1px solid ${theme.canvas.gridLine}`,
        color: theme.dom.toolbarText,
        fontFamily: theme.fontFamily,
        fontSize: 11,
        userSelect: 'none',
        position: 'relative',
        zIndex: 130,
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {/* Left: Total Records + Live Excel Range Selection Aggregations */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {showTotalCount && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MaterialIcon
              name="table_rows"
              size={14}
              color={theme.isDark ? '#98989D' : '#6E6E73'}
            />
            <span>
              {locale.totalRecords}:{' '}
              <strong>
                {unfilteredRowCount !== undefined && unfilteredRowCount !== totalRowCount
                  ? `${totalRowCount.toLocaleString(locale.code)} / ${unfilteredRowCount.toLocaleString(locale.code)}`
                  : totalRowCount.toLocaleString(locale.code)}
              </strong>
            </span>
          </span>
        )}

        {showSelectionStats && selectionStats && selectionStats.count > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '2px 9px',
              borderRadius: 6,
              backgroundColor: theme.isDark
                ? 'rgba(10, 132, 255, 0.15)'
                : 'rgba(0, 122, 255, 0.08)',
              border: `1px solid ${
                theme.isDark ? 'rgba(10,132,255,0.35)' : 'rgba(0,122,255,0.25)'
              }`,
              color: theme.dom.accentColor,
              fontWeight: 600,
            }}
          >
            {hasMetric('count') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MaterialIcon name="select_all" size={13} color={theme.dom.accentColor} />
                {isTR ? 'Seçim' : 'Selected'} ({selectionStats.count})
              </span>
            )}
            {selectionStats.numericCount > 0 && (
              <>
                {hasMetric('sum') && (
                  <span>
                    SUM:{' '}
                    <strong>
                      {selectionStats.sum.toLocaleString(locale.code, {
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
                {hasMetric('avg') && (
                  <span>
                    AVG:{' '}
                    <strong>
                      {selectionStats.avg.toLocaleString(locale.code, {
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
                {hasMetric('min') && (
                  <span>
                    MIN:{' '}
                    <strong>
                      {selectionStats.min.toLocaleString(locale.code, {
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
                {hasMetric('max') && (
                  <span>
                    MAX:{' '}
                    <strong>
                      {selectionStats.max.toLocaleString(locale.code, {
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Configurable Column Summaries */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {showColumnSummaries &&
          summaries &&
          Object.entries(summaries).map(([field, sumVal]) => {
            const col = columns.find((c) => c.id === field);
            const itemOverride = summaryConfig?.items?.find((i) => i.columnId === field);
            const sType = summaryTypes[field] || itemOverride?.summaryType || 'sum';
            const isOpen = openConfigCol === field;

            return (
              <div key={field} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (allowConfiguration) {
                      setOpenConfigCol(isOpen ? null : field);
                    }
                  }}
                  title={
                    allowConfiguration
                      ? isTR
                        ? 'Özet tipini değiştirmek için tıklayın'
                        : 'Click to change summary aggregation'
                      : undefined
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: `1px solid ${isOpen ? theme.dom.accentColor : theme.canvas.gridLine}`,
                    backgroundColor: theme.canvas.bg,
                    color: theme.canvas.cellText,
                    fontSize: 11,
                    cursor: allowConfiguration ? 'pointer' : 'default',
                    fontFamily: theme.fontFamily,
                  }}
                >
                  <MaterialIcon
                    name={SUMMARY_TYPE_ICONS[sType] || 'functions'}
                    size={13}
                    color={theme.dom.accentColor}
                  />
                  <span style={{ color: theme.isDark ? '#98989D' : '#6E6E73' }}>
                    {itemOverride?.label || col?.title || field}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      borderRadius: 3,
                      backgroundColor: theme.dom.badgeBg,
                      color: theme.dom.badgeText,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {sType}
                  </span>
                  <strong>{formatSummaryVal(field, sumVal, sType)}</strong>
                </button>

                {isOpen && allowConfiguration && onChangeSummaryType && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      right: 0,
                      width: 165,
                      padding: 6,
                      backgroundColor: theme.dom.popoverBg,
                      color: theme.dom.popoverText,
                      border: `1px solid ${theme.dom.popoverBorder}`,
                      borderRadius: 8,
                      boxShadow: theme.dom.popoverShadow,
                      backdropFilter: theme.dom.glassBackdrop,
                      zIndex: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#8E8E93',
                        padding: '2px 6px 4px',
                        borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{col?.title || field}</span>
                      <MaterialIcon name="functions" size={12} color="#8E8E93" />
                    </div>
                    {(['sum', 'avg', 'min', 'max', 'count', 'none'] as SummaryType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          onChangeSummaryType(field, t);
                          setOpenConfigCol(null);
                        }}
                        style={{
                          padding: '5px 8px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: sType === t ? 700 : 500,
                          border: 'none',
                          borderRadius: 4,
                          backgroundColor:
                            sType === t ? theme.dom.accentColor : 'transparent',
                          color: sType === t ? '#FFFFFF' : theme.dom.popoverText,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <MaterialIcon
                          name={t === 'none' ? 'delete' : SUMMARY_TYPE_ICONS[t]}
                          size={13}
                          color={sType === t ? '#FFFFFF' : theme.dom.accentColor}
                        />
                        <span>
                          {t === 'none'
                            ? isTR
                              ? 'Kaldır (None)'
                              : 'Remove (None)'
                            : t}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* Add / Configure Summary Row Button */}
        {allowConfiguration && onChangeSummaryType && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAddSummary((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px dashed ${theme.dom.accentColor}`,
                backgroundColor: showAddSummary
                  ? theme.isDark
                    ? 'rgba(10,132,255,0.16)'
                    : 'rgba(0,122,255,0.1)'
                  : 'transparent',
                color: theme.dom.accentColor,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: theme.fontFamily,
              }}
            >
              <MaterialIcon name="calculate" size={14} color={theme.dom.accentColor} />
              <span>{isTR ? 'Özet Satırı Ayarları' : 'Summary Settings'}</span>
            </button>

            {showAddSummary && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  bottom: 44,
                  right: 12,
                  left: 12,
                  width: 'auto',
                  maxWidth: 310,
                  marginLeft: 'auto',
                  maxHeight: '72vh',
                  overflowY: 'auto',
                  padding: 12,
                  backgroundColor: theme.dom.popoverBg,
                  color: theme.dom.popoverText,
                  border: `1px solid ${theme.dom.popoverBorder}`,
                  borderRadius: 10,
                  boxShadow: theme.dom.popoverShadow,
                  backdropFilter: theme.dom.glassBackdrop,
                  zIndex: 500,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <MaterialIcon
                      name="functions"
                      size={15}
                      color={theme.dom.accentColor}
                    />
                    {isTR ? 'Özet Satırı (Summary Row) Ayarları' : 'Summary Row Configuration'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddSummary(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#8E8E93',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcon name="close" size={15} color="#8E8E93" />
                  </button>
                </div>

                {/* Summary Row Display Toggles */}
                {onUpdateSummaryConfig && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      marginBottom: 10,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{isTR ? 'Toplam Kayıt Sayısı' : 'Show Total Row Count'}</span>
                      <input
                        type="checkbox"
                        checked={showTotalCount}
                        onChange={(e) =>
                          onUpdateSummaryConfig({ showTotalCount: e.target.checked })
                        }
                      />
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{isTR ? 'Canlı Hücre Seçim Özeti' : 'Show Range Selection Stats'}</span>
                      <input
                        type="checkbox"
                        checked={showSelectionStats}
                        onChange={(e) =>
                          onUpdateSummaryConfig({ showSelectionStats: e.target.checked })
                        }
                      />
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{isTR ? 'Sütun Özet Hesaplamaları' : 'Show Column Aggregations'}</span>
                      <input
                        type="checkbox"
                        checked={showColumnSummaries}
                        onChange={(e) =>
                          onUpdateSummaryConfig({ showColumnSummaries: e.target.checked })
                        }
                      />
                    </label>
                  </div>
                )}

                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#8E8E93',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {isTR ? 'Sütun Bazlı Hesaplama Türü' : 'Column Aggregation Type'}
                </div>

                {columns
                  .filter((c) => c.type !== 'sparkline' && c.type !== 'action')
                  .map((col) => {
                    const cur = summaryTypes[col.id] || 'none';
                    return (
                      <div
                        key={col.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 0',
                          fontSize: 11,
                        }}
                      >
                        <span style={{ fontWeight: cur !== 'none' ? 600 : 400 }}>{col.title}</span>
                        <select
                          value={cur}
                          onChange={(e) =>
                            onChangeSummaryType(col.id, e.target.value as SummaryType)
                          }
                          style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: `1px solid ${theme.dom.inputBorder}`,
                            backgroundColor: theme.dom.inputBg,
                            color: theme.dom.inputText,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          <option value="none">NONE</option>
                          <option value="sum">SUM</option>
                          <option value="avg">AVG</option>
                          <option value="min">MIN</option>
                          <option value="max">MAX</option>
                          <option value="count">COUNT</option>
                        </select>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
