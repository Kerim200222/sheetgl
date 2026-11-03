import React, { useEffect, useRef, useState } from 'react';
import { CellEditorProps } from '../../IColumnTypePlugin';
import { FilterEngine } from '../../../core/FilterEngine';
import { MaterialIcon } from '../../../ui/MaterialIcon';

function parseIsoParts(raw: any): { year: number; month: number; day: number; formatted: string } {
  const now = new Date();
  if (!raw) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }
  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    };
  }
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    formatted: str,
  };
}

export const DateEditor: React.FC<CellEditorProps<string>> = ({
  value,
  initialChar,
  rect,
  theme,
  locale,
  onCommit,
  onCancel,
}) => {
  const initial = parseIsoParts(value);
  const localeCode = locale?.code || 'tr-TR';
  const [dateVal, setDateVal] = useState<string>(() => {
    if (initialChar !== undefined && initialChar !== '') {
      return initialChar;
    }
    return value ? FilterEngine.formatLocalizedDate(initial.formatted, localeCode) : '';
  });
  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month); // 1..12

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestValRef = useRef<string>(dateVal);
  const committedRef = useRef<boolean>(false);

  useEffect(() => {
    latestValRef.current = dateVal;
  }, [dateVal]);

  const normalizeCommitValue = (rawStr: string): string => {
    const trimmed = rawStr.trim();
    if (!trimmed) return '';
    const parsed = FilterEngine.parseDateParts(trimmed);
    return parsed ? parsed.isoDate : trimmed;
  };

  const safeCommit = (val: string, move: 'none' | 'down' | 'right' | 'left' = 'none') => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(val, move);
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (initialChar !== undefined && initialChar !== '') {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } else {
      el.select();
    }
  }, []);

  // Close & commit when clicking outside the DateEditor container
  useEffect(() => {
    const handleOutsideMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        safeCommit(normalizeCommitValue(latestValRef.current), 'none');
      }
    };
    document.addEventListener('mousedown', handleOutsideMouseDown, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown, true);
    };
  }, [onCommit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      safeCommit(normalizeCommitValue(dateVal), e.shiftKey ? 'none' : 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      safeCommit(normalizeCommitValue(dateVal), e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      committedRef.current = true;
      onCancel();
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    const nextIso = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    latestValRef.current = nextIso;
    setDateVal(nextIso);
    safeCommit(nextIso, 'none');
  };

  const selectToday = () => {
    const now = new Date();
    const nextIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    latestValRef.current = nextIso;
    setDateVal(nextIso);
    safeCommit(nextIso, 'none');
  };

  // Build days in current month view
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7; // Monday = 0
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isTR = locale?.code?.startsWith('tr');
  const monthNames = isTR
    ? ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = isTR
    ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const selectedParts = dateVal ? parseIsoParts(dateVal) : null;
  const openAbove = rect.y > 280 && typeof window !== 'undefined' && rect.y + rect.height + 280 > window.innerHeight - 80;

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: Math.max(4, rect.x),
        top: rect.y,
        zIndex: 120,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Inline Cell Input */}
      <div
        style={{
          width: Math.max(rect.width, 145),
          height: rect.height,
          backgroundColor: theme.dom.inputBg,
          border: `2px solid ${theme.dom.inputFocusBorder}`,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          boxShadow: theme.dom.popoverShadow,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={dateVal}
          placeholder={isTR ? 'GG.AA.YYYY' : 'MM/DD/YYYY'}
          onChange={(e) => {
            const val = e.target.value;
            setDateVal(val);
            const p = FilterEngine.parseDateParts(val);
            if (p) {
              setViewYear(p.year);
              setViewMonth(p.month);
            }
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            padding: '0 8px',
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
            color: theme.dom.inputText,
            border: 'none',
            outline: 'none',
            fontFamily: theme.fontFamily,
            fontSize: `${theme.fontSize}px`,
          }}
        />
      </div>

      {/* Interactive Calendar Dropdown */}
      <div
        style={{
          ...(openAbove
            ? { position: 'absolute' as const, bottom: rect.height + 4, left: 0 }
            : { marginTop: 4 }),
          width: 236,
          padding: 10,
          backgroundColor: theme.dom.popoverBg,
          color: theme.dom.popoverText,
          border: `1px solid ${theme.dom.popoverBorder}`,
          borderRadius: 10,
          boxShadow: theme.dom.popoverShadow,
          backdropFilter: theme.dom.glassBackdrop,
          userSelect: 'none',
        }}
      >
        {/* Header: Month / Year Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrevMonth();
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: `1px solid ${theme.dom.popoverBorder}`,
              backgroundColor: 'transparent',
              color: theme.dom.popoverText,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <MaterialIcon name="chevron_left" size={16} color={theme.dom.popoverText} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              style={{
                padding: '2px 4px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 5,
                border: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.popoverText,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - 25 + i).map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <MaterialIcon name="chevron_right" size={13} color="#8E8E93" />
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              style={{
                padding: '2px 4px',
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 5,
                border: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.popoverText,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {monthNames.map((mName, i) => (
                <option key={i + 1} value={i + 1}>
                  {String(i + 1).padStart(2, '0')} - {mName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNextMonth();
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: `1px solid ${theme.dom.popoverBorder}`,
              backgroundColor: 'transparent',
              color: theme.dom.popoverText,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <MaterialIcon name="chevron_right" size={16} color={theme.dom.popoverText} />
          </button>
        </div>

        {/* Weekday Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            marginBottom: 4,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: '#8E8E93',
          }}
        >
          {weekDays.map((wd) => (
            <div key={wd} style={{ padding: '2px 0' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
          }}
        >
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty_${idx}`} style={{ height: 26 }} />;
            }
            const isSelectedDay =
              selectedParts &&
              selectedParts.year === viewYear &&
              selectedParts.month === viewMonth &&
              selectedParts.day === day;

            return (
              <button
                key={day}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectDay(day);
                }}
                onClick={() => selectDay(day)}
                style={{
                  height: 26,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: isSelectedDay
                    ? theme.dom.accentColor
                    : 'transparent',
                  color: isSelectedDay ? '#FFFFFF' : theme.dom.popoverText,
                  fontWeight: isSelectedDay ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Footer Actions: Clear & Today */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${theme.dom.popoverBorder}`,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              latestValRef.current = '';
              setDateVal('');
              safeCommit('', 'none');
            }}
            onClick={() => safeCommit('', 'none')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${theme.dom.popoverBorder}`,
              backgroundColor: 'transparent',
              color: theme.dom.popoverText,
              cursor: 'pointer',
            }}
          >
            {locale?.clear || 'Clear'}
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectToday();
            }}
            onClick={selectToday}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: theme.dom.accentColor,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {isTR ? 'Bugün' : 'Today'}
          </button>
        </div>
      </div>
    </div>
  );
};
