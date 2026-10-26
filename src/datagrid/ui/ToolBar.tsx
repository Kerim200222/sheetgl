import React, { useState, useEffect } from 'react';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { ThemeInput } from '../theme/ThemeEngine';
import {
  ColumnDef,
  GridPermissions,
  GridSummaryConfig,
  GridToolbarConfig,
  GridToolbarCustomItem,
  RowSelectionMode,
  ToolbarButtonDisplayMode,
} from '../types/grid';
import { SummaryType } from '../types/group';
import { IGridLocale } from '../i18n/IGridLocale';
import { SheetGLLogo } from './SheetGLLogo';
import { MaterialIcon } from './MaterialIcon';
import { SHEETGL_VERSION } from '../version';

import { useGridState, useGridActions } from '../state';

export interface ToolBarProps {
  theme?: IGridThemeTokens;
  locale?: IGridLocale;
  currentThemeName?: string;
  onThemeChange?: (theme: ThemeInput) => void;
  onLocaleChange?: (localeCode: string) => void;
  searchKeyword?: string;
  onSearchChange?: (keyword: string) => void;
  onExportCsv?: () => void;
  groups?: string[];
  onToggleGroupColumn?: (columnId: string) => void;
  onExpandAllGroups?: () => void;
  onCollapseAllGroups?: () => void;
  availableColumns: ColumnDef[];
  onUpdateColumn?: (colId: string, patch: Partial<ColumnDef>) => void;
  summaryTypes?: Record<string, SummaryType>;
  onChangeSummaryType?: (colId: string, sType: SummaryType) => void;
  permissions?: GridPermissions;
  onPermissionsChange?: (perms: GridPermissions) => void;
  onAddRow?: () => void;
  onDuplicateRow?: () => void;
  onDeleteRow?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  pendingChangesCount?: number;
  onSaveBatch?: () => void;
  onDiscardBatch?: () => void;
  onInspectBatchChanges?: () => void;
  selectedRowCount?: number;
  selectionMode?: RowSelectionMode;
  onSelectionModeChange?: (mode: RowSelectionMode) => void;
  activeFilterCount?: number;
  onClearAllFilters?: () => void;
  toolbarConfig?: GridToolbarConfig;
  onUpdateToolbarConfig?: (patch: Partial<GridToolbarConfig>) => void;
  summaryConfig?: GridSummaryConfig;
  onUpdateSummaryConfig?: (patch: Partial<GridSummaryConfig>) => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  theme: propTheme,
  locale: propLocale,
  currentThemeName: propCurrentThemeName,
  onThemeChange: propOnThemeChange,
  onLocaleChange,
  searchKeyword: propSearchKeyword,
  onSearchChange: propOnSearchChange,
  onExportCsv,
  groups: propGroups,
  onToggleGroupColumn: propOnToggleGroupColumn,
  onExpandAllGroups,
  onCollapseAllGroups,
  availableColumns,
  onUpdateColumn,
  summaryTypes = {},
  onChangeSummaryType,
  permissions: propPermissions,
  onPermissionsChange: propOnPermissionsChange,
  onAddRow,
  onDuplicateRow,
  onDeleteRow,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  pendingChangesCount = 0,
  onSaveBatch,
  onDiscardBatch,
  onInspectBatchChanges: propOnInspectBatchChanges,
  selectedRowCount: propSelectedRowCount,
  selectionMode: propSelectionMode,
  onSelectionModeChange: propOnSelectionModeChange,
  activeFilterCount: propActiveFilterCount,
  onClearAllFilters: propOnClearAllFilters,
  toolbarConfig: propToolbarConfig,
  onUpdateToolbarConfig: propOnUpdateToolbarConfig,
  summaryConfig: propSummaryConfig,
  onUpdateSummaryConfig: propOnUpdateSummaryConfig,
}) => {
  const gridState = useGridState();
  const gridActions = useGridActions();

  const theme = propTheme ?? gridState.resolvedTheme;
  const locale = propLocale ?? gridState.currentLocale;
  const currentThemeName = propCurrentThemeName ?? (typeof gridState.currentThemeName === 'string' ? gridState.currentThemeName : 'custom');
  const searchKeyword = propSearchKeyword ?? gridState.searchKeyword;
  const onSearchChange = propOnSearchChange ?? ((kw: string) => gridActions.setSearchKeyword(kw));
  const groups = propGroups ?? gridState.groups.map((g) => g.selector);
  const onToggleGroupColumn = propOnToggleGroupColumn ?? ((colId: string) => gridActions.toggleGroup(colId));
  const permissions = propPermissions ?? gridState.permissions;
  const onPermissionsChange = propOnPermissionsChange ?? ((p: GridPermissions) => gridActions.setPermissions(p));
  const selectedRowCount = propSelectedRowCount ?? gridState.selectedRowKeys.size;
  const selectionMode = propSelectionMode ?? gridState.rowSelectionMode;
  const onSelectionModeChange = propOnSelectionModeChange ?? ((m: RowSelectionMode) => gridActions.setRowSelectionMode(m));
  const activeFilterCount = propActiveFilterCount ?? Object.keys(gridState.columnFilters).length;
  const onClearAllFilters = propOnClearAllFilters ?? (() => gridActions.clearAllFilters());
  const toolbarConfig = propToolbarConfig ?? gridState.toolbarConfig;
  const onUpdateToolbarConfig = propOnUpdateToolbarConfig ?? ((patch: Partial<GridToolbarConfig>) => gridActions.updateToolbarConfig(patch));
  const summaryConfig = propSummaryConfig ?? gridState.summaryConfig;
  const onUpdateSummaryConfig = propOnUpdateSummaryConfig ?? ((patch: Partial<GridSummaryConfig>) => gridActions.updateSummaryConfig(patch));
  const onInspectBatchChanges = propOnInspectBatchChanges ?? (() => gridActions.setShowBatchModal(true));
  const onThemeChange = propOnThemeChange ?? ((t: ThemeInput) => gridActions.setThemeName(t));

  const [showColSettings, setShowColSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'columns' | 'layout'>('columns');
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 740 : false
  );
  const [showMobileMore, setShowMobileMore] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 740);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isTR = locale.code.startsWith('tr');

  if (toolbarConfig?.visible === false) {
    return null;
  }

  const rawDisplayMode: ToolbarButtonDisplayMode = toolbarConfig?.buttonDisplayMode || 'icon-text';
  const displayMode: ToolbarButtonDisplayMode = isMobile ? 'icon' : rawDisplayMode;
  const allowDisplayModeSwitch = toolbarConfig?.allowDisplayModeSwitch !== false;

  const showBrand = toolbarConfig?.showBrand !== false;
  const showAddRow = toolbarConfig?.showAddRow !== false;
  const showDuplicateRow = toolbarConfig?.showDuplicateRow !== false;
  const showDeleteRow = toolbarConfig?.showDeleteRow !== false;
  const showUndoRedo = toolbarConfig?.showUndoRedo !== false;
  const showSearch = toolbarConfig?.showSearch !== false;
  const showGroupBy = toolbarConfig?.showGroupBy !== false;
  const showClearFilters = toolbarConfig?.showClearFilters !== false;
  const showBatchActions = toolbarConfig?.showBatchActions !== false;
  const showPermissionsSwitch = toolbarConfig?.showPermissionsSwitch !== false;
  const showColumnSettings = toolbarConfig?.showColumnSettings !== false;
  const showLocaleSwitch = toolbarConfig?.showLocaleSwitch !== false;
  const showThemeSwitch = toolbarConfig?.showThemeSwitch !== false;
  const showExportCsv = toolbarConfig?.showExportCsv !== false;

  const isReadonlyMode = permissions?.mode === 'readonly' || permissions?.mode === 'read';
  const canAdd = !isReadonlyMode && permissions?.allowAdding !== false;
  const canDup = !isReadonlyMode && permissions?.allowDuplicating !== false;
  const canDel = !isReadonlyMode && permissions?.allowDeleting !== false;
  const canEdit = !isReadonlyMode && permissions?.allowUpdating !== false;

  const btnStyle = (
    disabled?: boolean,
    highlight?: boolean,
    modeOverride?: ToolbarButtonDisplayMode
  ): React.CSSProperties => {
    const m = modeOverride || displayMode;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: m === 'icon-text' ? 5 : 0,
      padding: m === 'icon' ? '5px 7px' : '4px 9px',
      borderRadius: 6,
      border: `1px solid ${highlight ? theme.dom.accentColor : theme.dom.inputBorder}`,
      backgroundColor: highlight ? theme.dom.accentColor : theme.dom.inputBg,
      color: highlight ? '#FFFFFF' : theme.dom.toolbarText,
      fontSize: 11,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      fontFamily: theme.fontFamily,
      whiteSpace: 'nowrap',
      transition: 'all 0.12s ease',
    };
  };

  /**
   * Renders button content according to ToolbarButtonDisplayMode:
   * - 'icon': Google Material Symbols icon only
   * - 'icon-text': Google Material Symbols icon + text label
   * - 'text': Text label only
   */
  const renderBtnContent = (
    iconName: string,
    label: string,
    modeOverride?: ToolbarButtonDisplayMode,
    iconColor?: string,
    iconSize: number = 15
  ) => {
    const m = modeOverride || displayMode;
    return (
      <>
        {(m === 'icon' || m === 'icon-text') && (
          <MaterialIcon name={iconName} size={iconSize} color={iconColor} />
        )}
        {(m === 'icon-text' || m === 'text') && <span>{label}</span>}
      </>
    );
  };

  const renderCustomItem = (item: GridToolbarCustomItem) => {
    const itemMode = item.displayMode || displayMode;
    const isPrimary = item.variant === 'primary' || item.active;
    const isDanger = item.variant === 'danger';
    const isSuccess = item.variant === 'success';

    const baseStyle = btnStyle(item.disabled, isPrimary, itemMode);
    if (isDanger) {
      baseStyle.color = '#FF453A';
      baseStyle.borderColor = 'rgba(255, 69, 58, 0.35)';
    } else if (isSuccess) {
      baseStyle.backgroundColor = '#30D158';
      baseStyle.borderColor = '#30D158';
      baseStyle.color = '#FFFFFF';
    }

    return (
      <button
        key={item.id}
        type="button"
        disabled={item.disabled}
        title={item.tooltip || item.label}
        onClick={item.onClick}
        style={baseStyle}
      >
        {item.icon
          ? renderBtnContent(
              item.icon,
              item.label,
              itemMode,
              isPrimary || isSuccess ? '#FFFFFF' : isDanger ? '#FF453A' : undefined
            )
          : item.label}
      </button>
    );
  };

  const leftCustomItems = (toolbarConfig?.customItems || []).filter(
    (i) => (i.position || 'left') === 'left'
  );
  const rightCustomItems = (toolbarConfig?.customItems || []).filter(
    (i) => i.position === 'right'
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.dom.toolbarBg,
        borderBottom: `1px solid ${theme.dom.toolbarBorder}`,
        backdropFilter: theme.dom.glassBackdrop,
        WebkitBackdropFilter: theme.dom.glassBackdrop,
        color: theme.dom.toolbarText,
        fontFamily: theme.fontFamily,
        fontSize: 12,
        userSelect: 'none',
        position: 'relative',
        zIndex: 140,
      }}
    >
      {/* PRIMARY TOOLBAR ROW */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Brand + CRUD Action Buttons + Undo/Redo + Custom Left Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showBrand && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  marginRight: 4,
                }}
              >
                <SheetGLLogo size={20} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Sheet
                    <span
                      style={{
                        background:
                          'linear-gradient(110deg, #c4b5fd 0%, #a855f7 32%, #818cf8 68%, #38bdf8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      GL
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: theme.name === 'apple-dark' ? '#38BDF8' : '#7C3AED',
                      opacity: 0.88,
                    }}
                  >
                    v{SHEETGL_VERSION}
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: 1,
                  height: 18,
                  backgroundColor: theme.dom.toolbarBorder,
                  margin: '0 2px',
                }}
              />
            </>
          )}

          {/* CRUD Action Buttons */}
          {showAddRow && onAddRow && (
            <button
              type="button"
              disabled={!canAdd}
              onClick={onAddRow}
              title={isTR ? 'Yeni Satır Ekle (Insert)' : 'Insert New Row'}
              style={btnStyle(!canAdd)}
            >
              {renderBtnContent('add', isTR ? 'Satır Ekle' : 'Add Row', undefined, '#30D158')}
            </button>
          )}

          {showDuplicateRow && onDuplicateRow && (
            <button
              type="button"
              disabled={!canDup}
              onClick={onDuplicateRow}
              title={isTR ? 'Seçili Satırı Çoğalt (Ctrl+Shift+D)' : 'Duplicate Selected Row'}
              style={btnStyle(!canDup)}
            >
              {renderBtnContent(
                'content_copy',
                isTR ? 'Çoğalt' : 'Duplicate',
                undefined,
                theme.dom.accentColor
              )}
            </button>
          )}

          {showDeleteRow && onDeleteRow && (
            <button
              type="button"
              disabled={!canDel}
              onClick={onDeleteRow}
              title={
                selectedRowCount > 0
                  ? isTR
                    ? `Seçili ${selectedRowCount} Satırı Sil`
                    : `Delete ${selectedRowCount} Selected Rows`
                  : isTR
                  ? 'Seçili Satırı Sil'
                  : 'Delete Selected Row'
              }
              style={{
                ...btnStyle(!canDel),
                color: canDel ? '#FF453A' : theme.dom.toolbarText,
              }}
            >
              {renderBtnContent(
                'delete',
                selectedRowCount > 0
                  ? isTR
                    ? `Sil (${selectedRowCount})`
                    : `Delete (${selectedRowCount})`
                  : isTR
                  ? 'Sil'
                  : 'Delete',
                undefined,
                canDel ? '#FF453A' : undefined
              )}
            </button>
          )}

          {(!isMobile || showMobileMore) && toolbarConfig?.showSelectionModeSwitch && onSelectionModeChange && (
            <select
              value={selectionMode}
              onChange={(e) => onSelectionModeChange(e.target.value as RowSelectionMode)}
              title={isTR ? 'Satır Seçim Modu' : 'Row Selection Mode'}
              style={{
                padding: '4px 8px',
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 6,
                outline: 'none',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="none">{isTR ? 'Seçim: Hücre (Yok)' : 'Select: Cell Only'}</option>
              <option value="single">{isTR ? 'Seçim: Tekli (Single)' : 'Select: Single Row'}</option>
              <option value="multiple">{isTR ? 'Seçim: Çoklu (Multiple)' : 'Select: Multiple Choice'}</option>
            </select>
          )}

          {/* Undo / Redo */}
          {showUndoRedo && (onUndo || onRedo) && (
            <>
              <div
                style={{
                  width: 1,
                  height: 18,
                  backgroundColor: theme.dom.toolbarBorder,
                  margin: '0 2px',
                }}
              />
              <button
                type="button"
                disabled={!canUndo || !canEdit}
                onClick={onUndo}
                title={isTR ? 'Geri Al (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                style={btnStyle(!canUndo || !canEdit)}
              >
                {renderBtnContent('undo', isTR ? 'Geri Al' : 'Undo')}
              </button>
              <button
                type="button"
                disabled={!canRedo || !canEdit}
                onClick={onRedo}
                title={isTR ? 'İleri Al (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                style={btnStyle(!canRedo || !canEdit)}
              >
                {renderBtnContent('redo', isTR ? 'İleri Al' : 'Redo')}
              </button>
            </>
          )}

          {leftCustomItems.map(renderCustomItem)}
        </div>

        {/* Center: Search + Group Selector + Active Filter Clear */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 6 : 8,
            flex: 1,
            maxWidth: 500,
            minWidth: isMobile ? 115 : 200,
          }}
        >
          {showSearch && (
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <MaterialIcon
                  name="search"
                  size={15}
                  color={theme.isDark ? '#8E8E93' : '#6E6E73'}
                />
              </span>
              <input
                type="text"
                placeholder={locale.searchPlaceholder}
                value={searchKeyword}
                onChange={(e) => onSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 26px 5px 28px',
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
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: 5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: '#8E8E93',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcon name="close" size={14} color="#8E8E93" />
                </button>
              )}
            </div>
          )}

          {(!isMobile || showMobileMore) && showGroupBy && (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <MaterialIcon
                name="workspaces"
                size={14}
                color={theme.isDark ? '#8E8E93' : '#6E6E73'}
                style={{ position: 'absolute', left: 7, pointerEvents: 'none' }}
              />
              <select
                value=""
                disabled={permissions?.allowGrouping === false}
                onChange={(e) => {
                  if (e.target.value) {
                    onToggleGroupColumn(e.target.value);
                  }
                }}
                style={{
                  padding: '5px 8px 5px 24px',
                  backgroundColor: theme.dom.inputBg,
                  color: theme.dom.inputText,
                  border: `1px solid ${theme.dom.inputBorder}`,
                  borderRadius: 6,
                  outline: 'none',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <option value="">{locale.addGroup}</option>
                {availableColumns
                  .filter((c) => c.type !== 'sparkline' && c.type !== 'action')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {groups.includes(c.id) ? '✓' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {showClearFilters && activeFilterCount > 0 && onClearAllFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              title={isTR ? 'Tüm aktif filtreleri temizle' : 'Clear all active filters'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: displayMode === 'icon' ? '5px 7px' : '4px 8px',
                borderRadius: 6,
                border: `1px solid ${theme.dom.accentColor}`,
                backgroundColor: theme.isDark
                  ? 'rgba(10,132,255,0.16)'
                  : 'rgba(0,122,255,0.1)',
                color: theme.dom.accentColor,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {renderBtnContent(
                'filter_alt_off',
                isTR ? `Filtreler (${activeFilterCount})` : `Filters (${activeFilterCount})`,
                undefined,
                theme.dom.accentColor
              )}
            </button>
          )}
        </div>

        {/* Right: Batch Save Bar + Display Mode Switch + Permissions + Column/Summary Settings + Locale + Theme + Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Batch Save / Discard Controls */}
          {showBatchActions && pendingChangesCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 6px',
                borderRadius: 7,
                backgroundColor: theme.isDark
                  ? 'rgba(48, 209, 88, 0.14)'
                  : 'rgba(52, 199, 89, 0.12)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
              }}
            >
              <button
                type="button"
                onClick={onInspectBatchChanges || onSaveBatch}
                title={
                  isTR
                    ? 'Bekleyen değişiklikleri ve silinecek satırları incelemek için tıklayın'
                    : 'Click to inspect pending changes and rows marked for deletion'
                }
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#30D158',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 7px',
                  borderRadius: 5,
                  border: '1px dashed rgba(48, 209, 88, 0.55)',
                  backgroundColor: 'rgba(48, 209, 88, 0.1)',
                  cursor: 'pointer',
                }}
              >
                <MaterialIcon name="pending_actions" size={14} color="#30D158" />
                <span>
                  {pendingChangesCount} {isTR ? 'Değişiklik' : 'Unsaved'}
                </span>
              </button>
              {onSaveBatch && (
                <button
                  type="button"
                  onClick={onSaveBatch}
                  title={isTR ? 'Toplu Kaydet (Batch Save)' : 'Batch Save Changes'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: displayMode === 'icon' ? '4px 6px' : '3px 8px',
                    borderRadius: 5,
                    border: 'none',
                    backgroundColor: '#30D158',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {renderBtnContent(
                    'save',
                    isTR ? 'Toplu Kaydet' : 'Batch Save',
                    undefined,
                    '#FFFFFF',
                    14
                  )}
                </button>
              )}
              {onDiscardBatch && (
                <button
                  type="button"
                  onClick={onDiscardBatch}
                  title={isTR ? 'Değişiklikleri Geri Al' : 'Discard Changes'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: displayMode === 'icon' ? '4px 6px' : '3px 7px',
                    borderRadius: 5,
                    border: `1px solid ${theme.dom.inputBorder}`,
                    backgroundColor: 'transparent',
                    color: theme.dom.toolbarText,
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {renderBtnContent(
                    'restore',
                    isTR ? 'Vazgeç' : 'Discard',
                    undefined,
                    undefined,
                    14
                  )}
                </button>
              )}
            </div>
          )}

          {/* Toolbar Button Display Mode Switcher (Icon | Icon+Text | Text) */}
          {(!isMobile || showMobileMore) && allowDisplayModeSwitch && onUpdateToolbarConfig && (
            <div
              title={
                isTR
                  ? 'Toolbar Buton Görünümü: İkon / İkon+Metin / Metin'
                  : 'Toolbar Button Display Mode: Icon / Icon+Text / Text'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: theme.dom.inputBg,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 6,
                padding: 1,
                gap: 1,
              }}
            >
              {(
                [
                  {
                    mode: 'icon' as ToolbarButtonDisplayMode,
                    icon: 'apps',
                    label: isTR ? 'İkon' : 'Icon',
                    tip: isTR ? 'Sadece İkon (Icon Only)' : 'Icon Only',
                  },
                  {
                    mode: 'icon-text' as ToolbarButtonDisplayMode,
                    icon: 'view_sidebar',
                    label: isTR ? 'İkon+Metin' : 'Icon+Text',
                    tip: isTR ? 'İkon + Metin (Icon + Text)' : 'Icon + Text',
                  },
                  {
                    mode: 'text' as ToolbarButtonDisplayMode,
                    icon: 'text_fields',
                    label: isTR ? 'Metin' : 'Text',
                    tip: isTR ? 'Sadece Metin (Text Only)' : 'Text Only',
                  },
                ] as const
              ).map((opt) => {
                const active = displayMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    title={opt.tip}
                    onClick={() => onUpdateToolbarConfig({ buttonDisplayMode: opt.mode })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '3px 6px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: active ? theme.dom.accentColor : 'transparent',
                      color: active ? '#FFFFFF' : theme.dom.toolbarText,
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: theme.fontFamily,
                    }}
                  >
                    <MaterialIcon
                      name={opt.icon}
                      size={13}
                      color={active ? '#FFFFFF' : undefined}
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Permission Mode Switcher */}
          {(!isMobile || showMobileMore) && showPermissionsSwitch && onPermissionsChange && (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <MaterialIcon
                name={
                  permissions?.mode === 'readonly'
                    ? 'lock'
                    : permissions?.mode === 'read'
                    ? 'visibility'
                    : 'edit_note'
                }
                size={14}
                color={isReadonlyMode ? '#FF9F0A' : theme.dom.accentColor}
                style={{ position: 'absolute', left: 7, pointerEvents: 'none' }}
              />
              <select
                value={permissions?.mode || 'write'}
                onChange={(e) => {
                  const mode = e.target.value as 'write' | 'read' | 'readonly';
                  onPermissionsChange({
                    ...permissions,
                    mode,
                    allowUpdating: mode === 'write',
                    allowAdding: mode === 'write',
                    allowDeleting: mode === 'write',
                    allowDuplicating: mode === 'write',
                    allowClipboardPaste: mode === 'write',
                  });
                }}
                title={isTR ? 'Tablo Yetki Modu (Permissions)' : 'Grid Permission Mode'}
                style={{
                  padding: '4px 8px 4px 24px',
                  backgroundColor: isReadonlyMode
                    ? 'rgba(255, 159, 10, 0.16)'
                    : theme.dom.inputBg,
                  color: isReadonlyMode ? '#FF9F0A' : theme.dom.inputText,
                  border: `1px solid ${
                    isReadonlyMode ? 'rgba(255,159,10,0.4)' : theme.dom.inputBorder
                  }`,
                  borderRadius: 6,
                  outline: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="write">
                  {isTR ? 'Yetki: Yazma (Write)' : 'Perm: Write (Full)'}
                </option>
                <option value="readonly">
                  {isTR ? 'Yetki: Salt Okunur (ReadOnly)' : 'Perm: Read-Only'}
                </option>
                <option value="read">
                  {isTR ? 'Yetki: Sadece Okuma (Read)' : 'Perm: Read View'}
                </option>
              </select>
            </div>
          )}

          {/* Column, Toolbar & Summary Settings Popover Toggle */}
          {showColumnSettings && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                title={
                  isTR
                    ? 'Sütun, Toolbar ve Özet Satırı Ayarları'
                    : 'Columns, Toolbar & Summary Settings'
                }
                onClick={() => setShowColSettings((v) => !v)}
                style={btnStyle(false, showColSettings)}
              >
                {renderBtnContent(
                  'tune',
                  isTR ? 'Ayarlar' : 'Configure',
                  undefined,
                  showColSettings ? '#FFFFFF' : undefined
                )}
              </button>

              {showColSettings && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    left: isMobile ? 10 : undefined,
                    right: isMobile ? 10 : 0,
                    top: isMobile ? 64 : 'calc(100% + 6px)',
                    width: isMobile ? 'auto' : 400,
                    maxWidth: isMobile ? 420 : undefined,
                    margin: isMobile ? '0 auto' : undefined,
                    maxHeight: isMobile ? '78vh' : 420,
                    overflowY: 'auto',
                    backgroundColor: theme.dom.popoverBg,
                    color: theme.dom.popoverText,
                    border: `1px solid ${theme.dom.popoverBorder}`,
                    borderRadius: 10,
                    boxShadow: theme.dom.popoverShadow,
                    backdropFilter: theme.dom.glassBackdrop,
                    padding: 12,
                    zIndex: isMobile ? 600 : 200,
                  }}
                >
                  {/* Header + Tabs */}
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
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setSettingsTab('columns')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          borderRadius: 5,
                          border: 'none',
                          backgroundColor:
                            settingsTab === 'columns' ? theme.dom.accentColor : 'transparent',
                          color:
                            settingsTab === 'columns' ? '#FFFFFF' : theme.dom.popoverText,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <MaterialIcon
                          name="view_column"
                          size={14}
                          color={settingsTab === 'columns' ? '#FFFFFF' : undefined}
                        />
                        <span>{isTR ? 'Sütunlar ve Özet' : 'Columns & Summary'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsTab('layout')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          borderRadius: 5,
                          border: 'none',
                          backgroundColor:
                            settingsTab === 'layout' ? theme.dom.accentColor : 'transparent',
                          color:
                            settingsTab === 'layout' ? '#FFFFFF' : theme.dom.popoverText,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <MaterialIcon
                          name="dashboard_customize"
                          size={14}
                          color={settingsTab === 'layout' ? '#FFFFFF' : undefined}
                        />
                        <span>{isTR ? 'Toolbar & Özet Satırı' : 'Toolbar & Summary Row'}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowColSettings(false)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#8E8E93',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcon name="close" size={16} color="#8E8E93" />
                    </button>
                  </div>

                  {settingsTab === 'columns' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {availableColumns.map((col) => {
                        const isRO = Boolean(col.readonly || col.permission === 'readonly');
                        const isPinned = Boolean(col.pinned);
                        const sumType = summaryTypes[col.id] || 'none';
                        return (
                          <div
                            key={col.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                              padding: '5px 8px',
                              borderRadius: 6,
                              backgroundColor: theme.isDark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.025)',
                              fontSize: 11,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                fontWeight: 600,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.title}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {/* Toggle ReadOnly vs Write */}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateColumn?.(col.id, {
                                    readonly: !isRO,
                                    permission: !isRO ? 'readonly' : 'write',
                                  })
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  borderRadius: 4,
                                  border: `1px solid ${theme.dom.popoverBorder}`,
                                  backgroundColor: isRO
                                    ? 'rgba(255,159,10,0.16)'
                                    : 'rgba(48,209,88,0.15)',
                                  color: isRO ? '#FF9F0A' : '#30D158',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                <MaterialIcon
                                  name={isRO ? 'lock' : 'edit'}
                                  size={11}
                                  color={isRO ? '#FF9F0A' : '#30D158'}
                                />
                                <span>{isRO ? 'ReadOnly' : 'Write'}</span>
                              </button>

                              {/* Toggle Pin */}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateColumn?.(col.id, {
                                    pinned: isPinned ? false : 'left',
                                  })
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  borderRadius: 4,
                                  border: `1px solid ${theme.dom.popoverBorder}`,
                                  backgroundColor: isPinned
                                    ? theme.dom.accentColor
                                    : 'transparent',
                                  color: isPinned ? '#FFFFFF' : theme.dom.popoverText,
                                  cursor: 'pointer',
                                }}
                              >
                                <MaterialIcon
                                  name="push_pin"
                                  size={11}
                                  filled={isPinned}
                                  color={isPinned ? '#FFFFFF' : undefined}
                                />
                                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                              </button>

                              {/* Summary Selector */}
                              <select
                                value={sumType}
                                onChange={(e) =>
                                  onChangeSummaryType?.(col.id, e.target.value as SummaryType)
                                }
                                style={{
                                  padding: '2px 4px',
                                  fontSize: 10,
                                  borderRadius: 4,
                                  border: `1px solid ${theme.dom.popoverBorder}`,
                                  backgroundColor: theme.dom.inputBg,
                                  color: theme.dom.inputText,
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="none">No Sum</option>
                                <option value="sum">SUM</option>
                                <option value="avg">AVG</option>
                                <option value="min">MIN</option>
                                <option value="max">MAX</option>
                                <option value="count">COUNT</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Toolbar Button Display Mode */}
                      {onUpdateToolbarConfig && (
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 7,
                            backgroundColor: theme.isDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.025)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <MaterialIcon
                              name="smart_button"
                              size={14}
                              color={theme.dom.accentColor}
                            />
                            <span>
                              {isTR
                                ? 'Toolbar Buton Görünüm Modu'
                                : 'Toolbar Button Display Mode'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(
                              [
                                {
                                  mode: 'icon' as ToolbarButtonDisplayMode,
                                  icon: 'apps',
                                  label: isTR ? 'Sadece İkon' : 'Icon Only',
                                },
                                {
                                  mode: 'icon-text' as ToolbarButtonDisplayMode,
                                  icon: 'view_sidebar',
                                  label: isTR ? 'İkon + Metin' : 'Icon + Text',
                                },
                                {
                                  mode: 'text' as ToolbarButtonDisplayMode,
                                  icon: 'text_fields',
                                  label: isTR ? 'Sadece Metin' : 'Text Only',
                                },
                              ] as const
                            ).map((m) => {
                              const active = displayMode === m.mode;
                              return (
                                <button
                                  key={m.mode}
                                  type="button"
                                  onClick={() =>
                                    onUpdateToolbarConfig({ buttonDisplayMode: m.mode })
                                  }
                                  style={{
                                    flex: 1,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    padding: '5px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${
                                      active ? theme.dom.accentColor : theme.dom.popoverBorder
                                    }`,
                                    backgroundColor: active
                                      ? theme.dom.accentColor
                                      : 'transparent',
                                    color: active ? '#FFFFFF' : theme.dom.popoverText,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <MaterialIcon
                                    name={m.icon}
                                    size={14}
                                    color={active ? '#FFFFFF' : undefined}
                                  />
                                  <span>{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toolbar Items Visibility */}
                      {onUpdateToolbarConfig && (
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 7,
                            backgroundColor: theme.isDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.025)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <MaterialIcon
                              name="web_asset"
                              size={14}
                              color={theme.dom.accentColor}
                            />
                            <span>
                              {isTR ? 'Toolbar Elemanları' : 'Toolbar Visible Controls'}
                            </span>
                          </div>
                          {(
                            [
                              {
                                key: 'showAddRow' as const,
                                val: showAddRow,
                                label: isTR ? 'Satır Ekle Butonu' : 'Add Row Button',
                              },
                              {
                                key: 'showDuplicateRow' as const,
                                val: showDuplicateRow,
                                label: isTR ? 'Çoğalt Butonu' : 'Duplicate Button',
                              },
                              {
                                key: 'showDeleteRow' as const,
                                val: showDeleteRow,
                                label: isTR ? 'Sil Butonu' : 'Delete Button',
                              },
                              {
                                key: 'showUndoRedo' as const,
                                val: showUndoRedo,
                                label: isTR ? 'Geri Al / İleri Al' : 'Undo / Redo Buttons',
                              },
                              {
                                key: 'showSearch' as const,
                                val: showSearch,
                                label: isTR ? 'Arama Kutusu' : 'Global Search Box',
                              },
                              {
                                key: 'showGroupBy' as const,
                                val: showGroupBy,
                                label: isTR ? 'Gruplama Seçicisi' : 'Group By Selector',
                              },
                              {
                                key: 'showExportCsv' as const,
                                val: showExportCsv,
                                label: isTR ? 'CSV Dışa Aktar' : 'Export CSV Button',
                              },
                            ] as const
                          ).map((item) => (
                            <label
                              key={item.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              <span>{item.label}</span>
                              <input
                                type="checkbox"
                                checked={item.val}
                                onChange={(e) =>
                                  onUpdateToolbarConfig({ [item.key]: e.target.checked })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Summary Row Settings */}
                      {onUpdateSummaryConfig && (
                        <div
                          style={{
                            padding: 8,
                            borderRadius: 7,
                            backgroundColor: theme.isDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.025)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              marginBottom: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <MaterialIcon
                              name="functions"
                              size={14}
                              color={theme.dom.accentColor}
                            />
                            <span>
                              {isTR
                                ? 'Özet Satırı (Summary Row) Ayarları'
                                : 'Summary Row Configuration'}
                            </span>
                          </div>
                          {(
                            [
                              {
                                key: 'visible' as const,
                                val: summaryConfig?.visible !== false,
                                label: isTR
                                  ? 'Özet Satırını Göster (Summary Row)'
                                  : 'Show Summary Footer Row',
                              },
                              {
                                key: 'showTotalCount' as const,
                                val: summaryConfig?.showTotalCount !== false,
                                label: isTR
                                  ? 'Toplam Kayıt Sayısı'
                                  : 'Show Total Row Count',
                              },
                              {
                                key: 'showSelectionStats' as const,
                                val: summaryConfig?.showSelectionStats !== false,
                                label: isTR
                                  ? 'Canlı Hücre Seçim İstatistikleri'
                                  : 'Show Live Selection Stats',
                              },
                              {
                                key: 'showColumnSummaries' as const,
                                val: summaryConfig?.showColumnSummaries !== false,
                                label: isTR
                                  ? 'Sütun Özet Hesaplamaları'
                                  : 'Show Column Summaries',
                              },
                            ] as const
                          ).map((item) => (
                            <label
                              key={item.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              <span>{item.label}</span>
                              <input
                                type="checkbox"
                                checked={item.val}
                                onChange={(e) =>
                                  onUpdateSummaryConfig({ [item.key]: e.target.checked })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(!isMobile || showMobileMore) && showLocaleSwitch && onLocaleChange && (
            <select
              value={locale.code}
              onChange={(e) => onLocaleChange(e.target.value)}
              style={{
                padding: '4px 7px',
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 6,
                outline: 'none',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <option value="en-US">EN</option>
              <option value="tr-TR">TR</option>
            </select>
          )}

          {(!isMobile || showMobileMore) && showThemeSwitch && (
            <select
              value={currentThemeName}
              onChange={(e) => onThemeChange(e.target.value as ThemeInput)}
              style={{
                padding: '4px 7px',
                backgroundColor: theme.dom.inputBg,
                color: theme.dom.inputText,
                border: `1px solid ${theme.dom.inputBorder}`,
                borderRadius: 6,
                outline: 'none',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <option value="apple-light">Apple Light</option>
              <option value="apple-dark">Apple Dark</option>
              <option value="google-light">Google Light</option>
              <option value="google-dark">Google Dark</option>
              <option value="system">{locale.systemTheme}</option>
            </select>
          )}

          {rightCustomItems.map(renderCustomItem)}

          {(!isMobile || showMobileMore) && showExportCsv && permissions?.allowExport !== false && (
            <button
              type="button"
              onClick={onExportCsv}
              title={locale.exportCsv}
              style={btnStyle(false, true)}
            >
              {renderBtnContent('download', locale.exportCsv, undefined, '#FFFFFF')}
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setShowMobileMore((v) => !v)}
              title={isTR ? 'Diğer Araçları Göster/Gizle' : 'Toggle Extra Toolbar Controls'}
              style={btnStyle(false, showMobileMore, 'icon')}
            >
              <MaterialIcon
                name={showMobileMore ? 'expand_less' : 'more_horiz'}
                size={16}
                color={showMobileMore ? '#FFFFFF' : undefined}
              />
            </button>
          )}
        </div>
      </div>

      {/* SECONDARY GROUPING BREADCRUMB BAR (Shown when grouping is active) */}
      {groups.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 14px',
            borderTop: `1px solid ${theme.dom.toolbarBorder}`,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                color: '#8E8E93',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MaterialIcon name="account_tree" size={14} color="#8E8E93" />
              {isTR ? 'Aktif Gruplar:' : 'Grouped By:'}
            </span>
            {groups.map((colId, idx) => {
              const col = availableColumns.find((c) => c.id === colId);
              return (
                <React.Fragment key={colId}>
                  {idx > 0 && <span style={{ color: '#8E8E93' }}>›</span>}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: theme.dom.badgeBg,
                      color: theme.dom.badgeText,
                      fontWeight: 600,
                    }}
                  >
                    <span>{col?.title || colId}</span>
                    <button
                      type="button"
                      onClick={() => onToggleGroupColumn(colId)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: theme.dom.badgeText,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcon name="close" size={13} color={theme.dom.badgeText} />
                    </button>
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {onExpandAllGroups && (
              <button
                type="button"
                onClick={onExpandAllGroups}
                title={isTR ? 'Tüm Grupları Aç' : 'Expand All Groups'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  borderRadius: 4,
                  border: `1px solid ${theme.dom.inputBorder}`,
                  backgroundColor: 'transparent',
                  color: theme.dom.toolbarText,
                  cursor: 'pointer',
                }}
              >
                {renderBtnContent(
                  'unfold_more',
                  isTR ? 'Tümünü Aç' : 'Expand All',
                  undefined,
                  undefined,
                  13
                )}
              </button>
            )}
            {onCollapseAllGroups && (
              <button
                type="button"
                onClick={onCollapseAllGroups}
                title={isTR ? 'Tüm Grupları Kapat' : 'Collapse All Groups'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  borderRadius: 4,
                  border: `1px solid ${theme.dom.inputBorder}`,
                  backgroundColor: 'transparent',
                  color: theme.dom.toolbarText,
                  cursor: 'pointer',
                }}
              >
                {renderBtnContent(
                  'unfold_less',
                  isTR ? 'Tümünü Kapat' : 'Collapse All',
                  undefined,
                  undefined,
                  13
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
