import React, { useEffect, useRef, useState } from 'react';
import { ICellEditorProps, CellCommitDirection } from './ICellEditor';

/**
 * Default HTML <input> cell editor for SheetGL.
 * Supports auto-focus, text pre-selection, keyboard commit/cancellation, and theme integration.
 */
export const DefaultCellEditor: React.FC<ICellEditorProps<any>> = ({
  value,
  rect,
  theme,
  initialChar,
  onCommit,
  onCancel,
}) => {
  const [text, setText] = useState<string>(
    initialChar !== undefined ? initialChar : value != null ? String(value) : ''
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedRef = useRef<boolean>(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (initialChar !== undefined) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      } else {
        inputRef.current.select();
      }
    }
  }, [initialChar]);

  const safeCommit = (val: string, dir: CellCommitDirection = 'none') => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(val, dir);
  };

  const safeCancel = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      safeCommit(text, e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      safeCommit(text, e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      safeCancel();
    }
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: Math.max(rect.width, 80),
        height: rect.height,
        zIndex: 100,
        boxSizing: 'border-box',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => safeCommit(text, 'none')}
        style={{
          width: '100%',
          height: '100%',
          padding: '0 8px',
          boxSizing: 'border-box',
          backgroundColor: theme.dom?.inputBg || '#FFFFFF',
          color: theme.dom?.inputText || '#1E293B',
          border: `2px solid ${theme.dom?.inputFocusBorder || '#3B82F6'}`,
          outline: 'none',
          fontFamily: theme.fontFamily || 'inherit',
          fontSize: `${theme.fontSize || 13}px`,
          borderRadius: 2,
          boxShadow: theme.dom?.popoverShadow || '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      />
    </div>
  );
};
