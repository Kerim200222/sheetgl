import React, { useEffect, useState } from 'react';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ColumnDef, ToolbarButtonDisplayMode } from '../types/grid';
import { IGridLocale } from '../i18n/IGridLocale';
import { MaterialIcon } from './MaterialIcon';
import { FilterEngine } from '../core/FilterEngine';

export interface FormulaBarProps {
  activeCoords: { row: number; col: number };
  selectionSpan?: { rows: number; cols: number };
  column?: ColumnDef;
  currentValue: any;
  isEditable?: boolean;
  canDuplicate?: boolean;
  buttonDisplayMode?: ToolbarButtonDisplayMode;
  onCommitValue?: (newValue: any) => void;
  onDuplicateDown?: () => void;
  onDuplicateRight?: () => void;
  onDuplicateRow?: () => void;
  onOpenSparklineModal?: () => void;
  theme: IGridThemeTokens;
  locale?: IGridLocale;
}

function getExcelColName(colIndex: number): string {
  let n = colIndex;
  let name = '';
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCoords,
  selectionSpan,
  column,
  currentValue,
  isEditable = true,
  canDuplicate = true,
  buttonDisplayMode = 'icon-text',
  onCommitValue,
  onDuplicateDown,
  onDuplicateRight,
  onDuplicateRow,
  onOpenSparklineModal,
  theme,
  locale,
}) => {
  const isTR = locale?.code?.startsWith('tr');
  const isSparkline = column?.type === 'sparkline';
  const displayVal = isSparkline
    ? isTR
      ? '[7 Günlük Trend Grafiği — Detaylı grafik görünümü için hücreye tıklayın]'
      : '[7-Day Trend Chart — Click cell to open detailed chart dialog]'
    : currentValue != null && currentValue !== ''
    ? column?.type === 'date' || column?.type === 'datetime'
      ? FilterEngine.formatLocalizedDate(currentValue, locale?.code, column.type === 'datetime')
      : Array.isArray(currentValue)
      ? currentValue.join(', ')
      : typeof currentValue === 'object'
      ? JSON.stringify(currentValue)
      : String(currentValue)
    : '';

  const [draft, setDraft] = useState<string>(displayVal);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 680 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 680);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setDraft(displayVal);
    }
  }, [displayVal, isFocused, activeCoords.row, activeCoords.col]);

  const excelRef = `${getExcelColName(activeCoords.col)}${activeCoords.row + 1}`;
  const hasMultiSpan = selectionSpan && (selectionSpan.rows > 1 || selectionSpan.cols > 1);

  const commitDraft = () => {
    if (!isEditable || !onCommitValue || !column) return;
    if (draft === displayVal) return;

    let parsed: any = draft;
    if (
      column.type === 'number' ||
      column.type === 'currency' ||
      column.type === 'percent' ||
      column.type === 'progress' ||
      column.type === 'rating'
    ) {
      const n = parseFloat(draft.replace(/[%$,]/g, (m) => (m === ',' ? '.' : '')));
      parsed = isNaN(n) ? 0 : n;
    } else if (column.type === 'boolean') {
      parsed = ['true', '1', 'yes', 'evet', 'doğru'].includes(draft.trim().toLowerCase());
    } else if (column.type === 'date' || column.type === 'datetime') {
      const pd = FilterEngine.parseDateParts(draft);
      if (pd) {
        parsed =
          column.type === 'datetime'
            ? `${pd.isoDate} ${String(pd.hasTime ? pd.hour : 9).padStart(2, '0')}:${String(pd.hasTime ? pd.minute : 0).padStart(2, '0')}`
            : pd.isoDate;
      }
    } else if (column.type === 'multiselect') {
      parsed = draft
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (column.type === 'object') {
      try {
        const obj = JSON.parse(draft);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          parsed = obj;
        }
      } catch {
        const out: Record<string, any> = {};
        for (const pair of draft.split(/[,;|]/)) {
          const idx = pair.indexOf(':');
          if (idx > 0) {
            const k = pair.slice(0, idx).trim();
            const v = pair.slice(idx + 1).trim();
            if (k) out[k] = v;
          }
        }
        if (Object.keys(out).length > 0) parsed = out;
      }
    }
    onCommitValue(parsed);
  };

  const effectiveBtnMode: ToolbarButtonDisplayMode = isMobile ? 'icon' : buttonDisplayMode;

  const renderBtnContent = (iconName: string, label: string, iconColor?: string) => (
    <>
      {(effectiveBtnMode === 'icon' || effectiveBtnMode === 'icon-text') && (
        <MaterialIcon name={iconName} size={13} color={iconColor} />
      )}
      {(effectiveBtnMode === 'icon-text' || effectiveBtnMode === 'text') && <span>{label}</span>}
    </>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '4px 8px' : '4px 12px',
        backgroundColor: theme.canvas.rowNumberBg,
        borderBottom: `1px solid ${theme.canvas.gridLine}`,
        gap: isMobile ? 5 : 8,
        fontFamily: theme.fontFamily,
        fontSize: 12,
        userSelect: 'none',
        overflowX: 'auto',
      }}
    >
      {/* Coordinate Box (Excel Name Box) */}
      <div
        style={{
          padding: isMobile ? '2px 6px' : '2px 8px',
          backgroundColor: theme.canvas.bg,
          color: theme.dom.accentColor,
          border: `1px solid ${theme.canvas.gridLine}`,
          borderRadius: 4,
          fontFamily: 'monospace',
          fontWeight: 700,
          minWidth: isMobile ? 42 : 84,
          textAlign: 'center',
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        {hasMultiSpan
          ? `${selectionSpan.rows}×${selectionSpan.cols}`
          : isMobile
          ? excelRef
          : `${excelRef} (R${activeCoords.row + 1}:C${activeCoords.col + 1})`}
      </div>

      {/* Column Type & Permission Badges */}
      {column && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span
            style={{
              padding: '2px 5px',
              backgroundColor: theme.dom.badgeBg,
              color: theme.dom.badgeText,
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {column.type}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 5px',
              backgroundColor: isEditable
                ? 'rgba(48, 209, 88, 0.14)'
                : 'rgba(255, 159, 10, 0.16)',
              color: isEditable ? '#30D158' : '#FF9F0A',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            <MaterialIcon
              name={isEditable ? 'edit' : 'lock'}
              size={11}
              color={isEditable ? '#30D158' : '#FF9F0A'}
            />
            {!isMobile && <span>{isEditable ? 'WRITE' : 'READONLY'}</span>}
          </span>
        </div>
      )}

      {/* fx Symbol */}
      {!isMobile && (
        <MaterialIcon
          name="functions"
          size={15}
          color={theme.isDark ? '#8E8E93' : '#AEAEB2'}
          title="Formula / Value Bar"
        />
      )}

      {/* Interactive Formula / Value Input */}
      <input
        type="text"
        value={draft}
        readOnly={!isEditable || column?.type === 'sparkline' || column?.type === 'action'}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          commitDraft();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(displayVal);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder={
          isEditable ? locale?.formulaBarPlaceholder || 'Enter value...' : 'Read-only cell'
        }
        style={{
          flex: 1,
          minWidth: isMobile ? 90 : 120,
          padding: '3px 8px',
          backgroundColor: theme.canvas.bg,
          color: theme.canvas.cellText,
          border: `1px solid ${isFocused ? theme.dom.inputFocusBorder : theme.canvas.gridLine}`,
          borderRadius: 4,
          outline: 'none',
          fontSize: 12,
          fontFamily: theme.fontFamily,
        }}
      />

      {/* Quick Cell & Row Duplication Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {isSparkline && onOpenSparklineModal ? (
          <button
            type="button"
            onClick={onOpenSparklineModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 10px',
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${theme.dom.accentColor}`,
              backgroundColor: theme.dom.accentColor,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {renderBtnContent(
              'show_chart',
              isTR ? 'Detaylı Trend Grafiğini Aç' : 'Open Detailed Chart',
              '#FFFFFF'
            )}
          </button>
        ) : (
          <>
            {onDuplicateDown && (
              <button
                type="button"
                disabled={!canDuplicate || !isEditable}
                onClick={onDuplicateDown}
                title={isTR ? 'Hücreyi Aşağı Çoğalt (Ctrl+D)' : 'Duplicate Cell Down (Ctrl+D)'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: `1px solid ${theme.canvas.gridLine}`,
                  backgroundColor: theme.canvas.bg,
                  color: theme.canvas.cellText,
                  cursor: canDuplicate && isEditable ? 'pointer' : 'not-allowed',
                  opacity: canDuplicate && isEditable ? 1 : 0.45,
                  fontWeight: 600,
                }}
              >
                {renderBtnContent('south', isTR ? 'Aşağı Çoğalt' : 'Fill Down')}
              </button>
            )}
            {onDuplicateRight && (
              <button
                type="button"
                disabled={!canDuplicate || !isEditable}
                onClick={onDuplicateRight}
                title={isTR ? 'Hücreyi Sağa Çoğalt (Alt+R)' : 'Duplicate Cell Right (Alt+R)'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: `1px solid ${theme.canvas.gridLine}`,
                  backgroundColor: theme.canvas.bg,
                  color: theme.canvas.cellText,
                  cursor: canDuplicate && isEditable ? 'pointer' : 'not-allowed',
                  opacity: canDuplicate && isEditable ? 1 : 0.45,
                  fontWeight: 600,
                }}
              >
                {renderBtnContent('east', isTR ? 'Sağa Çoğalt' : 'Fill Right')}
              </button>
            )}
          </>
        )}
        {onDuplicateRow && (
          <button
            type="button"
            disabled={!canDuplicate}
            onClick={onDuplicateRow}
            title={isTR ? 'Satırı Çoğalt (Duplicate Row)' : 'Duplicate Entire Row'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${theme.canvas.gridLine}`,
              backgroundColor: theme.canvas.bg,
              color: theme.dom.accentColor,
              cursor: canDuplicate ? 'pointer' : 'not-allowed',
              opacity: canDuplicate ? 1 : 0.45,
              fontWeight: 600,
            }}
          >
            {renderBtnContent(
              'content_copy',
              isTR ? 'Satır Çoğalt' : 'Dup Row',
              theme.dom.accentColor
            )}
          </button>
        )}
      </div>
    </div>
  );
};
