import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnDef, GridSummaryConfig, SelectionStatMetric } from '../types/grid';
import { SummaryType } from '../types/group';
import { IGridLocale } from '../i18n/IGridLocale';
import { MaterialIcon } from './MaterialIcon';
import { GeometryEngine } from '../core/GeometryEngine';

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
  geometry?: GeometryEngine;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const SUMMARY_TYPE_ICONS: Record<SummaryType, string> = {
  sum: 'functions',
  avg: 'analytics',
  min: 'south',
  max: 'north',
  count: 'tag',
  none: 'block',
};

interface SummaryCellProps {
  col: ColumnDef;
  val?: number;
  summaryType?: SummaryType;
  allowConfiguration: boolean;
  onChangeSummaryType?: (columnId: string, summaryType: SummaryType) => void;
  theme: IGridThemeTokens;
  locale: IGridLocale;
  formatSummaryVal: (colId: string, val: number, sType: SummaryType) => string;
  isTR: boolean;
}

const SummaryCell: React.FC<SummaryCellProps> = ({
  col,
  val,
  summaryType,
  allowConfiguration,
  onChangeSummaryType,
  theme,
  locale,
  formatSummaryVal,
  isTR,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  // Safely normalize summaryType into a valid lowercase string
  const normalizedType = useMemo<SummaryType | undefined>(() => {
    const raw = summaryType as any;
    if (!raw) return undefined;
    if (typeof raw === 'string') return raw.toLowerCase() as SummaryType;
    if (typeof raw === 'object' && raw !== null) {
      const candidate = raw.summaryType || raw.type || raw.name;
      if (typeof candidate === 'string') return candidate.toLowerCase() as SummaryType;
    }
    return undefined;
  }, [summaryType]);

  const effectiveSummaryType =
    normalizedType ||
    (typeof col.summaryType === 'string' ? (col.summaryType.toLowerCase() as SummaryType) : undefined);

  const summaryTypeStr = effectiveSummaryType || '';
  const hasSummary = val !== undefined && summaryTypeStr !== '' && summaryTypeStr !== 'none';
  const isNumeric =
    col.type === 'number' ||
    col.type === 'currency' ||
    col.type === 'percent' ||
    col.type === 'integer';
  const isSpecialCol =
    col.id === '__selection__' ||
    col.id === '__actions__' ||
    col.type === 'action' ||
    col.type === 'sparkline';

  const handleToggleDropdown = (e: React.MouseEvent) => {
    if (!allowConfiguration || isSpecialCol || !onChangeSummaryType) return;
    e.stopPropagation();
    if (!isOpen && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      const popWidth = 165;
      const popHeight = 220;
      let top = rect.top - popHeight - 4;
      if (top < 10) top = rect.bottom + 4;
      let left = Math.min(rect.left, window.innerWidth - popWidth - 10);
      if (left < 10) left = 10;
      setPopoverPos({ top, left });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (isSpecialCol) {
    return <div ref={cellRef} style={{ width: '100%', height: '100%' }} />;
  }

  const formattedVal = hasSummary
    ? formatSummaryVal(col.id, val!, (effectiveSummaryType as SummaryType) || 'sum')
    : '';

  return (
    <div
      ref={cellRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggleDropdown}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isNumeric ? 'flex-end' : 'flex-start',
        padding: '0 6px',
        gap: 4,
        cursor: allowConfiguration ? 'pointer' : 'default',
        backgroundColor: isOpen
          ? theme.isDark
            ? 'rgba(59, 130, 246, 0.2)'
            : 'rgba(59, 130, 246, 0.1)'
          : isHovered
            ? theme.isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.04)'
            : 'transparent',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      title={
        hasSummary
          ? `${col.title || col.id}: ${summaryTypeStr.toUpperCase()} = ${formattedVal} (${
              isTR ? 'Değiştirmek için tıkla' : 'Click to change'
            })`
          : allowConfiguration
            ? `${col.title || col.id} (${isTR ? 'Özet eklemek için tıkla' : 'Click to add summary'})`
            : undefined
      }
    >
      {hasSummary ? (
        <>
          {/* Summary Type Pill: e.g. SUM, AVG */}
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: theme.isDark
                ? 'rgba(59, 130, 246, 0.25)'
                : 'rgba(59, 130, 246, 0.12)',
              color: theme.isDark ? '#60a5fa' : '#2563eb',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              lineHeight: '12px',
              flexShrink: 0,
            }}
          >
            {summaryTypeStr.toUpperCase()}
          </span>

          {/* Formatted Number */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: theme.canvas.cellText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formattedVal}
          </span>

          {/* Subtle dropdown indicator */}
          {allowConfiguration && (
            <span
              style={{
                fontSize: 8,
                color: theme.isDark ? '#94a3b8' : '#94a3b8',
                marginLeft: 1,
                flexShrink: 0,
              }}
            >
              ▾
            </span>
          )}
        </>
      ) : (
        isHovered &&
        allowConfiguration && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: 9,
              fontWeight: 700,
              color: theme.dom.accentColor,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: theme.isDark
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(59, 130, 246, 0.08)',
            }}
          >
            + {isTR ? 'Özet' : 'Add'}
          </span>
        )
      )}

      {/* Floating Dropdown Menu (Fixed Coordinates to Prevent Overflow Clipping) */}
      {isOpen && popoverPos && allowConfiguration && onChangeSummaryType && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            width: 165,
            padding: 6,
            backgroundColor: theme.dom.popoverBg,
            color: theme.dom.popoverText,
            border: `1px solid ${theme.dom.popoverBorder}`,
            borderRadius: 8,
            boxShadow: theme.dom.popoverShadow,
            backdropFilter: theme.dom.glassBackdrop,
            zIndex: 9999,
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.title || col.id}
            </span>
            <MaterialIcon name="functions" size={12} color="#8E8E93" />
          </div>

          {(['sum', 'avg', 'min', 'max', 'count', 'none'] as SummaryType[]).map((t) => {
            const isSelected = (effectiveSummaryType || 'none') === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChangeSummaryType(col.id, t);
                  setIsOpen(false);
                }}
                style={{
                  padding: '5px 8px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  border: 'none',
                  borderRadius: 4,
                  backgroundColor: isSelected ? theme.dom.accentColor : 'transparent',
                  color: isSelected ? '#FFFFFF' : theme.dom.popoverText,
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
                  color={isSelected ? '#FFFFFF' : theme.dom.accentColor}
                />
                <span>
                  {t === 'none'
                    ? isTR
                      ? 'Kaldır (None)'
                      : 'Remove (None)'
                    : t === 'sum'
                      ? isTR
                        ? 'Toplam (SUM)'
                        : 'Sum (SUM)'
                      : t === 'avg'
                        ? isTR
                          ? 'Ortalama (AVG)'
                          : 'Average (AVG)'
                        : t === 'min'
                          ? isTR
                            ? 'Minimum (MIN)'
                            : 'Min (MIN)'
                          : t === 'max'
                            ? isTR
                              ? 'Maksimum (MAX)'
                              : 'Max (MAX)'
                            : isTR
                              ? 'Adet (COUNT)'
                              : 'Count (COUNT)'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  geometry,
  scrollContainerRef,
}) => {
  const [showAddSummary, setShowAddSummary] = useState<boolean>(false);
  const summaryScrollRef = useRef<HTMLDivElement>(null);
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

  // 1. Column Partitioning: Frozen vs Scrollable
  const rowNumberWidth = geometry?.rowNumberWidth ?? 54;

  const frozenColumns = useMemo(() => {
    if (geometry?.frozenColumns && geometry.frozenColumns.length > 0) {
      return geometry.frozenColumns;
    }
    return columns.filter((c) => c.pinned === 'left' || c.pinned === true);
  }, [geometry, columns]);

  const scrollableColumns = useMemo(() => {
    if (geometry?.scrollableColumns && geometry.scrollableColumns.length > 0) {
      return geometry.scrollableColumns;
    }
    return columns.filter(
      (c) => c.pinned !== 'left' && c.pinned !== true && c.pinned !== 'right'
    );
  }, [geometry, columns]);

  const rightPinnedColumns = useMemo(() => {
    return columns.filter((c) => c.pinned === 'right');
  }, [columns]);

  const totalScrollableWidth = useMemo(() => {
    return scrollableColumns.reduce((sum, c) => sum + (c.width || 100), 0);
  }, [scrollableColumns]);

  // 2. Synchronize Horizontal Scroll with Main Grid (Bi-directional, 60fps native)
  useEffect(() => {
    const sc = scrollContainerRef?.current;
    const summary = summaryScrollRef.current;
    if (!sc || !summary) return;

    let isSyncing = false;

    const onGridScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      summary.scrollLeft = sc.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    const onSummaryWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) {
        sc.scrollLeft += e.deltaX;
      }
    };

    sc.addEventListener('scroll', onGridScroll, { passive: true });
    summary.addEventListener('wheel', onSummaryWheel, { passive: true });

    summary.scrollLeft = sc.scrollLeft;

    return () => {
      sc.removeEventListener('scroll', onGridScroll);
      summary.removeEventListener('wheel', onSummaryWheel);
    };
  }, [scrollContainerRef]);

  // Determine if selection stats pill should be visible
  const hasSelectionStats = Boolean(
    showSelectionStats && selectionStats && selectionStats.count > 1
  );

  return (
    <div
      className="sheetgl-summary-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: theme.canvas.rowNumberBg,
        borderTop: `2px solid ${theme.canvas.gridLine}`,
        color: theme.dom.toolbarText,
        fontFamily: theme.fontFamily,
        fontSize: 11,
        userSelect: 'none',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Optional Range Selection Stats Bar (floating or slim bar) */}
      {hasSelectionStats && selectionStats && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 12px',
            backgroundColor: theme.isDark
              ? 'rgba(10, 132, 255, 0.15)'
              : 'rgba(0, 122, 255, 0.08)',
            borderBottom: `1px solid ${
              theme.isDark ? 'rgba(10,132,255,0.35)' : 'rgba(0,122,255,0.25)'
            }`,
            color: theme.dom.accentColor,
            fontWeight: 600,
            fontSize: 11,
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

      {/* Pinned Column-Aligned Summary Row */}
      {showColumnSummaries && (
        <div
          className="sheetgl-summary-row"
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'stretch',
            width: '100%',
            backgroundColor: theme.canvas.rowNumberBg,
            position: 'relative',
            overflow: 'hidden',
            fontSize: 11,
            fontFamily: theme.fontFamily,
            boxSizing: 'border-box',
          }}
        >
          {/* 1. Left Frozen Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              flexShrink: 0,
              zIndex: 10,
              backgroundColor: theme.canvas.rowNumberBg,
              borderRight:
                frozenColumns.length > 0 || rowNumberWidth > 0
                  ? `1px solid ${theme.canvas.gridLine}`
                  : 'none',
              boxShadow:
                frozenColumns.length > 0
                  ? theme.isDark
                    ? '2px 0 6px rgba(0,0,0,0.3)'
                    : '2px 0 6px rgba(0,0,0,0.06)'
                  : 'none',
            }}
          >
            {/* Row Number Column Cell */}
            {rowNumberWidth > 0 && (
              <div
                style={{
                  width: rowNumberWidth,
                  minWidth: rowNumberWidth,
                  maxWidth: rowNumberWidth,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: `1px solid ${theme.canvas.gridLine}`,
                  boxSizing: 'border-box',
                  backgroundColor: theme.canvas.rowNumberBg,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddSummary(true)}
                  title={isTR ? 'Tüm Sütun Özet Ayarları' : 'Summary Settings'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: allowConfiguration ? 'pointer' : 'default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    color: theme.dom.accentColor,
                    fontWeight: 800,
                    fontSize: 12,
                    padding: '2px 4px',
                    borderRadius: 4,
                  }}
                >
                  <span>Σ</span>
                </button>
              </div>
            )}

            {/* Frozen Columns */}
            {frozenColumns.map((col) => (
              <div
                key={col.id}
                style={{
                  width: col.width,
                  minWidth: col.width,
                  maxWidth: col.width,
                  borderRight: `1px solid ${theme.canvas.gridLine}`,
                  boxSizing: 'border-box',
                  backgroundColor: theme.canvas.rowNumberBg,
                  display: 'flex',
                  alignItems: 'stretch',
                }}
              >
                <SummaryCell
                  col={col}
                  val={summaries?.[col.id]}
                  summaryType={
                    (summaryTypes && summaryTypes[col.id]) ||
                    col.summaryType ||
                    summaryConfig?.items?.find((i) => i.columnId === col.id)?.summaryType
                  }
                  allowConfiguration={allowConfiguration}
                  onChangeSummaryType={onChangeSummaryType}
                  theme={theme}
                  locale={locale}
                  formatSummaryVal={formatSummaryVal}
                  isTR={isTR}
                />
              </div>
            ))}
          </div>

          {/* 2. Middle Scrollable Area */}
          <div
            ref={summaryScrollRef}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'stretch',
              overflowX: 'hidden',
              position: 'relative',
              backgroundColor: theme.canvas.bg,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                minWidth: totalScrollableWidth,
                flexShrink: 0,
              }}
            >
              {scrollableColumns.map((col) => (
                <div
                  key={col.id}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                    borderRight: `1px solid ${theme.canvas.gridLine}`,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'stretch',
                  }}
                >
                  <SummaryCell
                    col={col}
                    val={summaries?.[col.id]}
                    summaryType={
                      (summaryTypes && summaryTypes[col.id]) ||
                      col.summaryType ||
                      summaryConfig?.items?.find((i) => i.columnId === col.id)?.summaryType
                    }
                    allowConfiguration={allowConfiguration}
                    onChangeSummaryType={onChangeSummaryType}
                    theme={theme}
                    locale={locale}
                    formatSummaryVal={formatSummaryVal}
                    isTR={isTR}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Right Pinned Area (if any) */}
          {rightPinnedColumns.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                flexShrink: 0,
                zIndex: 10,
                backgroundColor: theme.canvas.rowNumberBg,
                borderLeft: `1px solid ${theme.canvas.gridLine}`,
              }}
            >
              {rightPinnedColumns.map((col) => (
                <div
                  key={col.id}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                    borderRight: `1px solid ${theme.canvas.gridLine}`,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'stretch',
                  }}
                >
                  <SummaryCell
                    col={col}
                    val={summaries?.[col.id]}
                    summaryType={
                      (summaryTypes && summaryTypes[col.id]) ||
                      col.summaryType ||
                      summaryConfig?.items?.find((i) => i.columnId === col.id)?.summaryType
                    }
                    allowConfiguration={allowConfiguration}
                    onChangeSummaryType={onChangeSummaryType}
                    theme={theme}
                    locale={locale}
                    formatSummaryVal={formatSummaryVal}
                    isTR={isTR}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 4. Right Spacer matching vertical scrollbar width buffer */}
          <div
            style={{
              width: 14,
              minWidth: 14,
              maxWidth: 14,
              flexShrink: 0,
              backgroundColor: theme.canvas.rowNumberBg,
            }}
          />
        </div>
      )}

      {/* Global Configuration Modal Dialog */}
      {showAddSummary && allowConfiguration && onChangeSummaryType && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: 44,
            right: 12,
            left: 12,
            width: 'auto',
            maxWidth: 320,
            marginLeft: 'auto',
            maxHeight: '75vh',
            overflowY: 'auto',
            padding: 12,
            backgroundColor: theme.dom.popoverBg,
            color: theme.dom.popoverText,
            border: `1px solid ${theme.dom.popoverBorder}`,
            borderRadius: 10,
            boxShadow: theme.dom.popoverShadow,
            backdropFilter: theme.dom.glassBackdrop,
            zIndex: 9999,
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
              <MaterialIcon name="functions" size={15} color={theme.dom.accentColor} />
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
                <span>{isTR ? 'Sütun Özet Satırı' : 'Show Column Summary Row'}</span>
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
            .filter((c) => c.type !== 'sparkline' && c.type !== 'action' && c.id !== '__selection__')
            .map((col) => {
              const rawCur = (summaryTypes && summaryTypes[col.id]) || col.summaryType;
              const cur = typeof rawCur === 'string'
                ? rawCur.toLowerCase()
                : (typeof rawCur === 'object' && rawCur !== null
                    ? String((rawCur as any).summaryType || (rawCur as any).type || 'none').toLowerCase()
                    : 'none');
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
                  <span
                    style={{
                      fontWeight: cur !== 'none' ? 600 : 400,
                      maxWidth: 160,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.title || col.id}
                  </span>
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
  );
};
