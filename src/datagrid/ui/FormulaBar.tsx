import React, { useEffect, useState, useRef, useMemo } from 'react';
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

/**
 * Interactive Single Select / Dropdown editor for the Excel-like Formula Bar
 */
const FormulaBarSelect: React.FC<{
  column: ColumnDef;
  currentValue: any;
  isEditable: boolean;
  onCommitValue: (newVal: any) => void;
  theme: IGridThemeTokens;
  locale?: IGridLocale;
}> = ({ column, currentValue, isEditable, onCommitValue, theme, locale }) => {
  const options = column.options || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isTR = locale?.code?.startsWith('tr');

  const selectedOpt = options.find(
    (o) => o.value === currentValue || String(o.value) === String(currentValue)
  );
  const displayLabel = selectedOpt ? selectedOpt.label : currentValue != null ? String(currentValue) : '';

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 200 }}>
      <div
        onClick={() => {
          if (isEditable) setIsOpen(!isOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 26,
          padding: '0 8px',
          border: `1px solid ${isOpen ? theme.dom.accentColor : theme.canvas.gridLine}`,
          borderRadius: 4,
          backgroundColor: isEditable
            ? theme.canvas.bg
            : theme.isDark
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(0,0,0,0.03)',
          color: theme.canvas.cellText,
          cursor: isEditable ? 'pointer' : 'default',
          fontSize: 12,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          {displayLabel || (
            <span style={{ color: theme.isDark ? '#8E8E93' : '#AEAEB2' }}>
              {isTR ? 'Değer seçin (Dropdown)...' : 'Select value (Dropdown)...'}
            </span>
          )}
        </span>
        {isEditable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6, flexShrink: 0 }}>
            {displayLabel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommitValue('');
                }}
                title={isTR ? 'Seçimi Temizle' : 'Clear Selection'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#8E8E93',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MaterialIcon name="close" size={13} color="#8E8E93" />
              </button>
            )}
            <MaterialIcon
              name="arrow_drop_down"
              size={16}
              color={theme.isDark ? '#8E8E93' : '#64748B'}
            />
          </div>
        )}
      </div>

      {isOpen && isEditable && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: Math.max(260, containerRef.current?.clientWidth || 260),
            maxHeight: 280,
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
            gap: 4,
          }}
        >
          {options.length > 5 && (
            <div style={{ padding: '2px 2px 4px' }}>
              <input
                autoFocus
                type="text"
                placeholder={isTR ? 'Seçeneklerde ara...' : 'Search options...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 26,
                  padding: '0 8px',
                  borderRadius: 4,
                  border: `1px solid ${theme.dom.inputBorder}`,
                  backgroundColor: theme.dom.inputBg,
                  color: theme.dom.inputText,
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div
            style={{
              maxHeight: 210,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#8E8E93',
                  textAlign: 'center',
                }}
              >
                {isTR ? 'Eşleşen seçenek bulunamadı' : 'No matching options'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected =
                  opt.value === currentValue || String(opt.value) === String(currentValue);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onCommitValue(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 8px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: isSelected ? theme.dom.accentColor : 'transparent',
                      color: isSelected ? '#FFFFFF' : theme.dom.popoverText,
                      cursor: 'pointer',
                      fontSize: 11,
                      textAlign: 'left',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <MaterialIcon name="check" size={13} color="#FFFFFF" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Interactive Multiple Choice / MultiSelect editor for the Excel-like Formula Bar
 */
const FormulaBarMultiSelect: React.FC<{
  column: ColumnDef;
  currentValue: any;
  isEditable: boolean;
  onCommitValue: (newVal: any) => void;
  theme: IGridThemeTokens;
  locale?: IGridLocale;
}> = ({ column, currentValue, isEditable, onCommitValue, theme, locale }) => {
  const options = column.options || [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isTR = locale?.code?.startsWith('tr');
  const separator = (column as any)?.separator || ', ';

  const selectedList = useMemo<string[]>(() => {
    if (!currentValue) return [];
    if (Array.isArray(currentValue)) return currentValue.map(String).filter(Boolean);
    return String(currentValue)
      .split(/[,;|]|\s\+\s/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [currentValue]);

  const handleToggleOption = (valStr: string) => {
    let next: string[];
    if (selectedList.includes(valStr)) {
      next = selectedList.filter((v) => v !== valStr);
    } else {
      next = [...selectedList, valStr];
    }
    const finalVal = Array.isArray(currentValue) ? next : next.join(separator);
    onCommitValue(finalVal);
  };

  const handleRemoveTag = (e: React.MouseEvent, valStr: string) => {
    e.stopPropagation();
    const next = selectedList.filter((v) => v !== valStr);
    const finalVal = Array.isArray(currentValue) ? next : next.join(separator);
    onCommitValue(finalVal);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)
    );
  }, [options, search]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 200 }}>
      <div
        onClick={() => {
          if (isEditable) setIsOpen(!isOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minHeight: 26,
          padding: '2px 6px',
          border: `1px solid ${isOpen ? theme.dom.accentColor : theme.canvas.gridLine}`,
          borderRadius: 4,
          backgroundColor: isEditable
            ? theme.canvas.bg
            : theme.isDark
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(0,0,0,0.03)',
          color: theme.canvas.cellText,
          cursor: isEditable ? 'pointer' : 'default',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
        }}
      >
        {selectedList.length === 0 ? (
          <span
            style={{
              fontSize: 11,
              color: theme.isDark ? '#8E8E93' : '#AEAEB2',
              padding: '0 4px',
            }}
          >
            {isTR ? 'Çoklu seçim yapın (Multiple Choice)...' : 'Select multiple choices...'}
          </span>
        ) : (
          selectedList.map((item) => (
            <span
              key={item}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '1px 6px',
                borderRadius: 3,
                backgroundColor: theme.isDark
                  ? 'rgba(59, 130, 246, 0.22)'
                  : 'rgba(59, 130, 246, 0.12)',
                color: theme.isDark ? '#60a5fa' : '#2563eb',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              <span>{item}</span>
              {isEditable && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(e, item)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'inherit',
                    display: 'flex',
                  }}
                >
                  <MaterialIcon name="close" size={10} />
                </button>
              )}
            </span>
          ))
        )}

        {isEditable && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <MaterialIcon
              name="arrow_drop_down"
              size={16}
              color={theme.isDark ? '#8E8E93' : '#64748B'}
            />
          </span>
        )}
      </div>

      {isOpen && isEditable && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: Math.max(260, containerRef.current?.clientWidth || 260),
            maxHeight: 280,
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
            gap: 4,
          }}
        >
          {options.length > 5 && (
            <input
              autoFocus
              type="text"
              placeholder={isTR ? 'Seçeneklerde ara...' : 'Search options...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 26,
                padding: '0 8px',
                borderRadius: 4,
                border: `1px solid ${theme.dom.inputBorder}`,
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                fontSize: 11,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}

          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#8E8E93',
                  textAlign: 'center',
                }}
              >
                {isTR ? 'Seçenek bulunamadı' : 'No options found'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const valStr = String(opt.value);
                const isChecked = selectedList.includes(valStr);
                return (
                  <label
                    key={valStr}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      backgroundColor: isChecked
                        ? theme.isDark
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(59, 130, 246, 0.08)'
                        : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleOption(valStr)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Interactive Date / DateTime editor for the Excel-like Formula Bar
 */
const FormulaBarDate: React.FC<{
  column: ColumnDef;
  currentValue: any;
  isEditable: boolean;
  onCommitValue: (newVal: any) => void;
  theme: IGridThemeTokens;
  locale?: IGridLocale;
}> = ({ column, currentValue, isEditable, onCommitValue, theme, locale }) => {
  const isDateTime = column.type === 'datetime';
  const isTR = locale?.code?.startsWith('tr');

  const isoVal = useMemo(() => {
    if (!currentValue) return '';
    const str = String(currentValue).trim();
    if (isDateTime) {
      if (str.includes('T')) return str.slice(0, 16);
      if (str.includes(' ')) return str.replace(' ', 'T').slice(0, 16);
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }
    const dmy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const mon = dmy[2].padStart(2, '0');
      const yr = dmy[3];
      return `${yr}-${mon}-${day}`;
    }
    return '';
  }, [currentValue, isDateTime]);

  const [dateDraft, setDateDraft] = useState(isoVal);

  useEffect(() => {
    setDateDraft(isoVal);
  }, [isoVal]);

  const handleDateChange = (newVal: string) => {
    setDateDraft(newVal);
    onCommitValue(newVal);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    const finalVal = isDateTime ? `${today}T12:00` : today;
    handleDateChange(finalVal);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <input
        type={isDateTime ? 'datetime-local' : 'date'}
        value={dateDraft}
        disabled={!isEditable}
        onChange={(e) => handleDateChange(e.target.value)}
        style={{
          flex: 1,
          maxWidth: isDateTime ? 220 : 160,
          height: 26,
          padding: '0 8px',
          border: `1px solid ${theme.canvas.gridLine}`,
          borderRadius: 4,
          backgroundColor: isEditable
            ? theme.canvas.bg
            : theme.isDark
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(0,0,0,0.03)',
          color: theme.canvas.cellText,
          fontFamily: 'monospace',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
          cursor: isEditable ? 'pointer' : 'default',
        }}
      />
      {isEditable && (
        <>
          <button
            type="button"
            onClick={handleSetToday}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: `1px solid ${theme.canvas.gridLine}`,
              backgroundColor: theme.canvas.bg,
              color: theme.dom.accentColor,
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isTR ? 'Bugün' : 'Today'}
          </button>
          {dateDraft && (
            <button
              type="button"
              onClick={() => handleDateChange('')}
              title={isTR ? 'Tarihi Temizle' : 'Clear Date'}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#8E8E93',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
              }}
            >
              <MaterialIcon name="close" size={13} color="#8E8E93" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Interactive Boolean editor for the Excel-like Formula Bar
 */
const FormulaBarBoolean: React.FC<{
  currentValue: any;
  isEditable: boolean;
  onCommitValue: (newVal: boolean) => void;
  theme: IGridThemeTokens;
  locale?: IGridLocale;
}> = ({ currentValue, isEditable, onCommitValue, theme, locale }) => {
  const isTR = locale?.code?.startsWith('tr');
  const isChecked = ['true', '1', 1, true, 'yes', 'evet'].includes(currentValue);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 26 }}>
      <button
        type="button"
        disabled={!isEditable}
        onClick={() => onCommitValue(!isChecked)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 10px',
          borderRadius: 4,
          border: `1px solid ${isChecked ? '#22C55E' : theme.canvas.gridLine}`,
          backgroundColor: isChecked
            ? 'rgba(34, 197, 94, 0.15)'
            : theme.isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.04)',
          color: isChecked ? '#22C55E' : theme.canvas.cellText,
          fontSize: 11,
          fontWeight: 700,
          cursor: isEditable ? 'pointer' : 'default',
        }}
      >
        <MaterialIcon
          name={isChecked ? 'check_box' : 'check_box_outline_blank'}
          size={14}
          color={isChecked ? '#22C55E' : undefined}
        />
        <span>
          {isChecked
            ? isTR
              ? 'EVET (True)'
              : 'TRUE'
            : isTR
            ? 'HAYIR (False)'
            : 'FALSE'}
        </span>
      </button>
    </div>
  );
};

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

  const isMultiSelectCol =
    column?.type === 'multiselect' ||
    Boolean((column as any)?.multiple) ||
    (Boolean((column as any)?.separator) && column?.type !== 'date' && column?.type !== 'datetime');

  const isSelectCol =
    !isMultiSelectCol &&
    (column?.type === 'select' ||
      column?.type === 'dropdown' ||
      column?.type === 'lookup' ||
      (column?.options && column.options.length > 0));

  const isDateCol = column?.type === 'date' || column?.type === 'datetime';
  const isBoolCol = column?.type === 'boolean';

  const displayVal = isSparkline
    ? isTR
      ? '[7 Günlük Trend Grafiği — Detaylı grafik görünümü için hücreye tıklayın]'
      : '[7-Day Trend Chart — Click cell to open detailed chart dialog]'
    : currentValue != null && currentValue !== ''
    ? isDateCol
      ? FilterEngine.formatLocalizedDate(currentValue, locale?.code, column?.type === 'datetime')
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
            ? `${pd.isoDate} ${String(pd.hasTime ? pd.hour : 9).padStart(2, '0')}:${String(
                pd.hasTime ? pd.minute : 0
              ).padStart(2, '0')}`
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

      {/* Interactive Value / Formula Input Area Adapted to Column Type */}
      {!column ? (
        <input
          type="text"
          readOnly
          value=""
          placeholder={isTR ? 'Hücre seçilmedi' : 'No cell selected'}
          style={{
            flex: 1,
            height: 26,
            padding: '0 8px',
            border: `1px solid ${theme.canvas.gridLine}`,
            borderRadius: 4,
            backgroundColor: theme.canvas.bg,
            color: theme.canvas.cellText,
            fontSize: 12,
            outline: 'none',
          }}
        />
      ) : isMultiSelectCol ? (
        <FormulaBarMultiSelect
          column={column}
          currentValue={currentValue}
          isEditable={isEditable}
          onCommitValue={onCommitValue || (() => {})}
          theme={theme}
          locale={locale}
        />
      ) : isSelectCol ? (
        <FormulaBarSelect
          column={column}
          currentValue={currentValue}
          isEditable={isEditable}
          onCommitValue={onCommitValue || (() => {})}
          theme={theme}
          locale={locale}
        />
      ) : isDateCol ? (
        <FormulaBarDate
          column={column}
          currentValue={currentValue}
          isEditable={isEditable}
          onCommitValue={onCommitValue || (() => {})}
          theme={theme}
          locale={locale}
        />
      ) : isBoolCol ? (
        <FormulaBarBoolean
          currentValue={currentValue}
          isEditable={isEditable}
          onCommitValue={onCommitValue || (() => {})}
          theme={theme}
          locale={locale}
        />
      ) : (
        <input
          type="text"
          value={draft}
          readOnly={!isEditable || isSparkline || column?.type === 'action'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            commitDraft();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setDraft(displayVal);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={
            isEditable
              ? isTR
                ? 'Hücre değerini düzenle...'
                : 'Edit cell value...'
              : isTR
              ? 'Salt okunur hücre'
              : 'Readonly cell'
          }
          style={{
            flex: 1,
            height: 26,
            padding: '0 8px',
            border: `1px solid ${
              isFocused ? theme.dom.accentColor : theme.canvas.gridLine
            }`,
            borderRadius: 4,
            backgroundColor: isEditable
              ? theme.canvas.bg
              : theme.isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(0,0,0,0.03)',
            color: theme.canvas.cellText,
            fontFamily: theme.fontFamily,
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Excel Duplicate Down Button */}
      {canDuplicate && onDuplicateDown && (
        <button
          type="button"
          onClick={onDuplicateDown}
          disabled={!isEditable}
          title={
            isTR
              ? 'Mevcut hücre değerini bir alt satıra kopyala (Ctrl+D)'
              : 'Duplicate current cell value down (Ctrl+D)'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '3px 6px' : '3px 8px',
            borderRadius: 4,
            border: `1px solid ${theme.canvas.gridLine}`,
            backgroundColor: theme.canvas.bg,
            color: isEditable ? theme.canvas.cellText : theme.dom.toolbarText,
            opacity: isEditable ? 1 : 0.45,
            cursor: isEditable ? 'pointer' : 'not-allowed',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {renderBtnContent('arrow_downward', isTR ? 'Aşağı Çoğalt' : 'Fill Down')}
        </button>
      )}

      {/* Excel Duplicate Right Button */}
      {canDuplicate && onDuplicateRight && (
        <button
          type="button"
          onClick={onDuplicateRight}
          disabled={!isEditable}
          title={
            isTR
              ? 'Mevcut hücre değerini bir sağ sütuna kopyala (Alt+R)'
              : 'Duplicate current cell value right (Alt+R)'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '3px 6px' : '3px 8px',
            borderRadius: 4,
            border: `1px solid ${theme.canvas.gridLine}`,
            backgroundColor: theme.canvas.bg,
            color: isEditable ? theme.canvas.cellText : theme.dom.toolbarText,
            opacity: isEditable ? 1 : 0.45,
            cursor: isEditable ? 'pointer' : 'not-allowed',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {renderBtnContent('arrow_forward', isTR ? 'Sağa Çoğalt' : 'Fill Right')}
        </button>
      )}

      {/* Clone Active Row Button */}
      {canDuplicate && onDuplicateRow && (
        <button
          type="button"
          onClick={onDuplicateRow}
          disabled={!isEditable}
          title={
            isTR
              ? 'Seçili satırın tam kopyasını oluştur (Ctrl+Shift+D)'
              : 'Clone selected row (Ctrl+Shift+D)'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: isMobile ? '3px 6px' : '3px 8px',
            borderRadius: 4,
            border: `1px solid ${theme.canvas.gridLine}`,
            backgroundColor: theme.canvas.bg,
            color: isEditable ? theme.canvas.cellText : theme.dom.toolbarText,
            opacity: isEditable ? 1 : 0.45,
            cursor: isEditable ? 'pointer' : 'not-allowed',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {renderBtnContent('content_copy', isTR ? 'Satırı Klonla' : 'Clone Row')}
        </button>
      )}
    </div>
  );
};
