import React, { useEffect, useRef, useState } from 'react';
import { CellEditorProps } from '../../IColumnTypePlugin';

function parseTimeParts(raw: any): { hour: number; minute: number; formatted: string } {
  if (!raw) {
    return { hour: 9, minute: 0, formatted: '09:00' };
  }
  const str = String(raw).trim();
  const m = str.match(/^(\d{1,2}):(\d{1,2})/);
  if (m) {
    const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return {
      hour: hh,
      minute: mm,
      formatted: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    };
  }
  return { hour: 9, minute: 0, formatted: str };
}

export const TimeEditor: React.FC<CellEditorProps<string>> = ({
  value,
  rect,
  theme,
  locale,
  onCommit,
  onCancel,
}) => {
  const initial = parseTimeParts(value);
  const [timeVal, setTimeVal] = useState<string>(value ? initial.formatted : '09:00');
  const [selHour, setSelHour] = useState<number>(initial.hour);
  const [selMinute, setSelMinute] = useState<number>(initial.minute);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestValRef = useRef<string>(timeVal);
  useEffect(() => {
    latestValRef.current = timeVal;
  }, [timeVal]);

  const isTR = locale?.code?.startsWith('tr');

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCommit(latestValRef.current, 'none');
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, [onCommit]);

  const updateTime = (hh: number, mm: number, commitImmediate = false) => {
    const nextStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    setSelHour(hh);
    setSelMinute(mm);
    setTimeVal(nextStr);
    if (commitImmediate) {
      onCommit(nextStr, 'none');
    }
  };

  const handleSelectNow = () => {
    const now = new Date();
    updateTime(now.getHours(), now.getMinutes(), true);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const presets = ['08:30', '09:00', '12:00', '14:30', '17:00', '18:00'];

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
        zIndex: 125,
        fontFamily: theme.fontFamily,
      }}
    >
      {/* Inline Input */}
      <div
        style={{
          width: Math.max(rect.width, 115),
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
          value={timeVal}
          placeholder="HH:mm"
          onChange={(e) => {
            setTimeVal(e.target.value);
            const p = parseTimeParts(e.target.value);
            setSelHour(p.hour);
            setSelMinute(p.minute);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommit(timeVal, 'down');
            } else if (e.key === 'Tab') {
              e.preventDefault();
              onCommit(timeVal, e.shiftKey ? 'left' : 'right');
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
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

      {/* Time Picker Popover */}
      <div
        style={{
          marginTop: 4,
          width: 215,
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
        {/* Quick Preset Chips */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: `1px solid ${theme.dom.popoverBorder}`,
          }}
        >
          {presets.map((p) => {
            const active = timeVal === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onCommit(p, 'none')}
                style={{
                  padding: '3px 7px',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: active ? 700 : 500,
                  borderRadius: 5,
                  border: `1px solid ${active ? theme.dom.accentColor : theme.dom.popoverBorder}`,
                  backgroundColor: active ? theme.dom.accentColor : 'transparent',
                  color: active ? '#FFFFFF' : theme.dom.popoverText,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Hour & Minute Columns */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', textAlign: 'center', marginBottom: 4 }}>
              {isTR ? 'SAAT' : 'HOUR'}
            </div>
            <div
              style={{
                height: 140,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              {hours.map((h) => {
                const active = h === selHour;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => updateTime(h, selMinute)}
                    style={{
                      padding: '4px 0',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: active ? 700 : 500,
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: active ? theme.dom.accentColor : 'transparent',
                      color: active ? '#FFFFFF' : theme.dom.popoverText,
                      cursor: 'pointer',
                    }}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8E8E93', textAlign: 'center', marginBottom: 4 }}>
              {isTR ? 'DAKİKA' : 'MIN'}
            </div>
            <div
              style={{
                height: 140,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              {minutes.map((m) => {
                const active = m === selMinute;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateTime(selHour, m)}
                    style={{
                      padding: '4px 0',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: active ? 700 : 500,
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: active ? theme.dom.accentColor : 'transparent',
                      color: active ? '#FFFFFF' : theme.dom.popoverText,
                      cursor: 'pointer',
                    }}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${theme.dom.popoverBorder}`,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => onCommit('', 'none')}
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
              {locale?.clear || (isTR ? 'Temizle' : 'Clear')}
            </button>
            <button
              type="button"
              onClick={handleSelectNow}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                borderRadius: 4,
                border: `1px solid ${theme.dom.popoverBorder}`,
                backgroundColor: 'transparent',
                color: theme.dom.accentColor,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isTR ? 'Şimdi' : 'Now'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onCommit(timeVal, 'none')}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              border: 'none',
              backgroundColor: theme.dom.accentColor,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {locale?.apply || (isTR ? 'Uygula' : 'Apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
