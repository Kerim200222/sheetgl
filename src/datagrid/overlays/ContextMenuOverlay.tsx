import React, { useEffect, useRef } from 'react';
import { ColumnDef, GridPermissions } from '../types/grid';
import { SummaryType } from '../types/group';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';
import { MaterialIcon } from '../ui/MaterialIcon';

import { useGridState } from '../state';

export interface ContextMenuState {
  targetType: 'cell' | 'header' | 'rownumber';
  x: number;
  y: number;
  row: number;
  col: number;
  column?: ColumnDef;
  rowData?: Record<string, any>;
}

export interface ContextMenuOverlayProps {
  menu: ContextMenuState;
  viewportWidth: number;
  viewportHeight: number;
  theme?: IGridThemeTokens;
  locale?: IGridLocale;
  permissions?: GridPermissions;
  isCellEditable: boolean;
  isGroupedByCol: boolean;
  currentSummaryType?: SummaryType;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicateCellDown: () => void;
  onDuplicateCellRight: () => void;
  onDuplicateRow: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onClearCells: () => void;
  onDeleteRow: () => void;
  onFilterByCellValue: () => void;
  onToggleGroupColumn: () => void;
  onSortColumn: (desc: boolean | null) => void;
  onTogglePinColumn: () => void;
  onToggleColumnReadonly: () => void;
  onChangeSummaryType: (summaryType: SummaryType) => void;
  onOpenSparklineModal?: () => void;
  onViewRowDetail?: () => void;
  onClose: () => void;
}

export const ContextMenuOverlay: React.FC<ContextMenuOverlayProps> = ({
  menu,
  viewportWidth,
  viewportHeight,
  theme: propTheme,
  locale: propLocale,
  permissions: propPermissions,
  isCellEditable,
  isGroupedByCol,
  currentSummaryType = 'none',
  onCopy,
  onPaste,
  onDuplicateCellDown,
  onDuplicateCellRight,
  onDuplicateRow,
  onInsertRowAbove,
  onInsertRowBelow,
  onClearCells,
  onDeleteRow,
  onFilterByCellValue,
  onToggleGroupColumn,
  onSortColumn,
  onTogglePinColumn,
  onToggleColumnReadonly,
  onChangeSummaryType,
  onOpenSparklineModal,
  onViewRowDetail,
  onClose,
}) => {
  const gridState = useGridState();
  const theme = propTheme ?? gridState.resolvedTheme;
  const locale = propLocale ?? gridState.currentLocale;
  const permissions = propPermissions ?? gridState.permissions;

  const menuRef = useRef<HTMLDivElement | null>(null);
  const isTR = locale.code.startsWith('tr');

  const isWriteMode = permissions?.mode !== 'read' && permissions?.mode !== 'readonly';
  const canAdd = isWriteMode && permissions?.allowAdding !== false;
  const canDelete = isWriteMode && permissions?.allowDeleting !== false;
  const canDuplicate = isWriteMode && permissions?.allowDuplicating !== false;
  const canPaste = isWriteMode && permissions?.allowClipboardPaste !== false && isCellEditable;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutside, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose]);

  const menuWidth = 256;
  const estimatedHeight = menu.targetType === 'header' ? 320 : 350;
  const safeLeft = Math.max(8, Math.min(menu.x, viewportWidth - menuWidth - 12));
  const safeTop = Math.max(8, Math.min(menu.y, viewportHeight - estimatedHeight - 12));

  const renderItem = (
    iconName: string,
    label: string,
    shortcut: string | undefined,
    onClick: () => void,
    disabled: boolean = false,
    danger: boolean = false,
    badge?: string
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick();
        onClose();
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        border: 'none',
        borderRadius: 5,
        backgroundColor: 'transparent',
        color: disabled ? '#8E8E93' : danger ? '#FF453A' : theme.dom.popoverText,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: theme.fontFamily,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = theme.isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(0,0,0,0.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
        <MaterialIcon
          name={iconName}
          size={15}
          color={disabled ? '#8E8E93' : danger ? '#FF453A' : theme.dom.accentColor}
        />
        <span>{label}</span>
      </span>
      {badge ? (
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            backgroundColor: theme.dom.badgeBg,
            color: theme.dom.badgeText,
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      ) : shortcut ? (
        <span style={{ fontSize: 10, color: '#8E8E93', fontFamily: 'monospace' }}>{shortcut}</span>
      ) : null}
    </button>
  );

  const divider = (
    <div
      style={{
        height: 1,
        backgroundColor: theme.dom.popoverBorder,
        margin: '4px 0',
      }}
    />
  );

  return (
    <div
      ref={menuRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        left: safeLeft,
        top: safeTop,
        width: menuWidth,
        zIndex: 180,
        backgroundColor: theme.dom.popoverBg,
        color: theme.dom.popoverText,
        border: `1px solid ${theme.dom.popoverBorder}`,
        borderRadius: 10,
        boxShadow: theme.dom.popoverShadow,
        backdropFilter: theme.dom.glassBackdrop,
        padding: 5,
        userSelect: 'none',
        fontFamily: theme.fontFamily,
      }}
    >
      {menu.targetType === 'header' && menu.column ? (
        menu.column.type === 'sparkline' || menu.column.type === 'action' ? (
          <>
            <div
              style={{
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: theme.dom.accentColor,
                borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{menu.column.title}</span>
              <span>{menu.column.type.toUpperCase()}</span>
            </div>
            {renderItem(
              'push_pin',
              menu.column.pinned
                ? isTR
                  ? 'Sabitlemeyi Kaldır (Unpin)'
                  : 'Unpin Column'
                : isTR
                ? 'Sola Sabitle (Pin Left)'
                : 'Pin Column Left',
              undefined,
              onTogglePinColumn
            )}
          </>
        ) : (
          <>
            <div
              style={{
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: theme.dom.accentColor,
                borderBottom: `1px solid ${theme.dom.popoverBorder}`,
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{menu.column.title}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MaterialIcon name={menu.column.readonly ? 'lock' : 'edit'} size={12} />
                {menu.column.readonly ? 'ReadOnly' : 'Write'}
              </span>
            </div>

            {renderItem(
              'north',
              isTR ? 'Artan Sırala (A → Z)' : 'Sort Ascending (A → Z)',
              undefined,
              () => onSortColumn(false),
              menu.column.sortable === false
            )}
            {renderItem(
              'south',
              isTR ? 'Azalan Sırala (Z → A)' : 'Sort Descending (Z → A)',
              undefined,
              () => onSortColumn(true),
              menu.column.sortable === false
            )}
            {renderItem(
              'sort',
              isTR ? 'Sıralamayı Temizle' : 'Clear Sort',
              undefined,
              () => onSortColumn(null),
              menu.column.sortable === false
            )}

            {divider}

            {renderItem(
              'push_pin',
              menu.column.pinned
                ? isTR
                  ? 'Sabitlemeyi Kaldır (Unpin)'
                  : 'Unpin Column'
                : isTR
                ? 'Sola Sabitle (Pin Left)'
                : 'Pin Column Left',
              undefined,
              onTogglePinColumn
            )}
            {renderItem(
              isGroupedByCol ? 'folder_open' : 'workspaces',
              isGroupedByCol
                ? isTR
                  ? 'Grubu Kaldır'
                  : 'Ungroup Column'
                : isTR
                ? 'Bu Sütuna Göre Grupla'
                : 'Group by This Column',
              undefined,
              onToggleGroupColumn
            )}
            {renderItem(
              menu.column.readonly ? 'lock_open' : 'lock',
              menu.column.readonly
                ? isTR
                  ? 'Yazma İznini Aç (Write Mode)'
                  : 'Set Column Editable (Write)'
                : isTR
                ? 'Salt Okunur Yap (Read-Only)'
                : 'Set Column Read-Only',
              undefined,
              onToggleColumnReadonly
            )}

            {divider}

            <div
              style={{
                padding: '4px 10px 2px',
                fontSize: 10,
                fontWeight: 700,
                color: '#8E8E93',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MaterialIcon name="functions" size={12} color="#8E8E93" />
              {isTR ? 'ALT ÖZET HESAPLAMASI (SUMMARY)' : 'SUMMARY AGGREGATION'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
                padding: '4px 6px',
              }}
            >
              {(['sum', 'avg', 'min', 'max', 'count', 'none'] as SummaryType[]).map((sType) => {
                const isActive = currentSummaryType === sType;
                return (
                  <button
                    key={sType}
                    type="button"
                    onClick={() => {
                      onChangeSummaryType(sType);
                      onClose();
                    }}
                    style={{
                      padding: '4px 0',
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      textTransform: 'uppercase',
                      borderRadius: 4,
                      border: `1px solid ${
                        isActive ? theme.dom.accentColor : theme.dom.popoverBorder
                      }`,
                      backgroundColor: isActive ? theme.dom.accentColor : 'transparent',
                      color: isActive ? '#FFFFFF' : theme.dom.popoverText,
                      cursor: 'pointer',
                    }}
                  >
                    {sType}
                  </button>
                );
              })}
            </div>
          </>
        )
      ) : menu.column?.type === 'sparkline' ? (
        <>
          <div
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: theme.dom.accentColor,
              borderBottom: `1px solid ${theme.dom.popoverBorder}`,
              marginBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MaterialIcon name="show_chart" size={14} color={theme.dom.accentColor} />
              {menu.column.title}
            </span>
            <span>CHART</span>
          </div>
          {onOpenSparklineModal &&
            renderItem(
              'monitoring',
              isTR ? 'Detaylı Trend Grafiğini Görüntüle' : 'View Detailed Trend Chart',
              'Enter',
              onOpenSparklineModal
            )}
        </>
      ) : (
        <>
          <div
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: theme.dom.accentColor,
              borderBottom: `1px solid ${theme.dom.popoverBorder}`,
              marginBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              R{menu.row + 1} : C{menu.col + 1} {menu.column ? `(${menu.column.title})` : ''}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MaterialIcon name={isCellEditable ? 'edit' : 'lock'} size={12} />
              {isCellEditable ? 'WRITE' : 'READONLY'}
            </span>
          </div>

          {onViewRowDetail && (
            <>
              {renderItem(
                'visibility',
                isTR ? 'Satır Detayını İncele (View)' : 'View Row Details (View)',
                undefined,
                onViewRowDetail
              )}
              {divider}
            </>
          )}

          {renderItem(
            'content_copy',
            isTR ? 'Kopyala (Excel TSV)' : 'Copy (Excel TSV)',
            'Ctrl+C',
            onCopy
          )}
          {renderItem(
            'content_paste',
            isTR ? 'Yapıştır (Excel TSV)' : 'Paste (Excel TSV)',
            'Ctrl+V',
            onPaste,
            !canPaste
          )}

          {divider}

          {renderItem(
            'south',
            isTR ? 'Hücreyi Aşağı Çoğalt' : 'Duplicate Cell Down',
            'Ctrl+D',
            onDuplicateCellDown,
            !canDuplicate || !isCellEditable
          )}
          {renderItem(
            'library_add',
            isTR ? 'Satırı Klonla (Clone Row)' : 'Clone Entire Row',
            'Ctrl+Shift+D',
            onDuplicateRow,
            !canDuplicate || !canAdd
          )}

          {divider}

          {renderItem(
            'add_row_above',
            isTR ? 'Üste Yeni Satır Ekle' : 'Insert Row Above',
            undefined,
            onInsertRowAbove,
            !canAdd
          )}
          {renderItem(
            'add_row_below',
            isTR ? 'Alta Yeni Satır Ekle' : 'Insert Row Below',
            undefined,
            onInsertRowBelow,
            !canAdd
          )}

          {divider}

          {renderItem(
            'filter_alt',
            isTR ? 'Bu Hücre Değerine Göre Filtrele' : 'Filter by Cell Value',
            undefined,
            onFilterByCellValue,
            !menu.column || menu.column.filterable === false
          )}
          {renderItem(
            isGroupedByCol ? 'folder_open' : 'workspaces',
            isGroupedByCol
              ? isTR
                ? 'Sütun Grubunu Kaldır'
                : 'Ungroup Column'
              : isTR
              ? 'Bu Sütuna Göre Grupla'
              : 'Group by This Column',
            undefined,
            onToggleGroupColumn,
            !menu.column
          )}

          {divider}

          {renderItem(
            'backspace',
            isTR ? 'Hücre Değerini Temizle' : 'Clear Cell Value(s)',
            'Del',
            onClearCells,
            !isCellEditable
          )}
          {renderItem(
            'delete',
            isTR ? 'Satırı Sil (Delete Row)' : 'Delete Row',
            undefined,
            onDeleteRow,
            !canDelete,
            true
          )}
        </>
      )}
    </div>
  );
};
