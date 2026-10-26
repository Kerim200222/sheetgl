import React, { useEffect, useRef, useState } from 'react';
import { CellEditorProps } from '../../IColumnTypePlugin';
import { normalizeMultiValue } from './MultiSelectPainter';

export const MultiSelectEditor: React.FC<CellEditorProps<string[] | string>> = ({
  value,
  column,
  rect,
  theme,
  locale,
  initialChar,
  onCommit,
  onCancel,
}) => {
  const options = column.options || [];
  const [selected, setSelected] = useState<string[]>(() => normalizeMultiValue(value));
  const [search, setSearch] = useState<string>(initialChar || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestSelectedRef = useRef<string[]>(selected);
  latestSelectedRef.current = selected;

  const isTR = locale?.code?.startsWith('tr');

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commitValue = (items: string[], moveDir: 'none' | 'down' | 'left' | 'right') => {
    const sep = (column as any).separator || ', ';
    const cleanItems = items.map((s) => String(s).trim().replace(/^["'\s]+|["'\s]+$/g, '')).filter(Boolean);
    const finalVal = Array.isArray(value) && (column as any).saveAsArray ? cleanItems : cleanItems.join(sep);
    onCommit(finalVal, moveDir);
  };

  // Commit when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitValue(latestSelectedRef.current, 'none');
      }
    };
    document.addEventListener('mousedown', handleOutside, true);
    return () => document.removeEventListener('mousedown', handleOutside, true);
  }, [onCommit]);

  const toggleValue = (val: string) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleSelectAll = () => {
    setSelected(options.map((o) => o.value));
  };

  const handleClearAll = () => {
    setSelected([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === ' ' && filtered[highlightedIndex] && search === '') {
      e.preventDefault();
      toggleValue(filtered[highlightedIndex].value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(selected, 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitValue(selected, e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

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
        minWidth: Math.max(rect.width, 235),
        zIndex: 125,
        backgroundColor: theme.dom.popoverBg,
        color: theme.dom.popoverText,
        border: `1px solid ${theme.dom.popoverBorder}`,
        borderRadius: 10,
        boxShadow: theme.dom.popoverShadow,
        backdropFilter: theme.dom.glassBackdrop,
        overflow: 'hidden',
        fontFamily: theme.fontFamily,
        userSelect: 'none',
      }}
    >
      {/* Search Box */}
      <div style={{ padding: 8, borderBottom: `1px solid ${theme.dom.popoverBorder}` }}>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isTR ? 'Çoklu seçim ara...' : 'Search multiple choices...'}
          style={{
            width: '100%',
            padding: '5px 8px',
            backgroundColor: theme.dom.inputBg,
            color: theme.dom.inputText,
            border: `1px solid ${theme.dom.inputBorder}`,
            borderRadius: 6,
            outline: 'none',
            fontSize: 12,
            fontFamily: theme.fontFamily,
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
            fontSize: 11,
          }}
        >
          <span style={{ color: '#8E8E93', fontWeight: 600 }}>
            {isTR ? `${selected.length} seçildi` : `${selected.length} selected`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                border: 'none',
                background: 'none',
                color: theme.dom.accentColor,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isTR ? 'Tümünü Seç' : 'Select All'}
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                border: 'none',
                background: 'none',
                color: '#8E8E93',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isTR ? 'Temizle' : 'Clear'}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Checkbox Options List */}
      <div style={{ maxHeight: 200, overflowY: 'auto', padding: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#8E8E93' }}>
            {locale?.noMatches || 'No matching options'}
          </div>
        ) : (
          filtered.map((opt, i) => {
            const isChecked = selected.includes(opt.value);
            const isHigh = i === highlightedIndex;
            return (
              <div
                key={opt.value}
                onClick={() => toggleValue(opt.value)}
                onMouseEnter={() => setHighlightedIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: isHigh
                    ? theme.isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.05)'
                    : 'transparent',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{
                      cursor: 'pointer',
                      accentColor: theme.dom.accentColor,
                      margin: 0,
                    }}
                  />
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: theme.isDark
                        ? opt.darkBg || 'rgba(99,102,241,0.18)'
                        : opt.bg || '#E0E7FF',
                      color: theme.isDark
                        ? opt.darkFg || '#818CF8'
                        : opt.fg || '#1E40AF',
                    }}
                  >
                    {opt.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Commit Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 6,
          padding: '6px 8px',
          borderTop: `1px solid ${theme.dom.popoverBorder}`,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            borderRadius: 5,
            border: `1px solid ${theme.dom.popoverBorder}`,
            backgroundColor: 'transparent',
            color: theme.dom.popoverText,
            cursor: 'pointer',
          }}
        >
          {locale?.cancel || (isTR ? 'İptal' : 'Cancel')}
        </button>
        <button
          type="button"
          onClick={() => onCommit(selected, 'none')}
          style={{
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 5,
            border: 'none',
            backgroundColor: theme.dom.accentColor,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {locale?.apply || (isTR ? 'Uygula' : 'Apply')} ({selected.length})
        </button>
      </div>
    </div>
  );
};
