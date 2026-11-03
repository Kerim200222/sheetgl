import React, { useState, useMemo } from 'react';
import { SheetGL } from '../../datagrid/ui/SheetGL';
import { MaterialIcon } from '../../datagrid/ui/MaterialIcon';
import {
  ColumnDef,
  ColumnGroupDef,
  GridPermissions,
  GridSummaryConfig,
  GridToolbarConfig,
} from '../../datagrid/types/grid';
import { DocThemeColors } from '../types';

export interface LiveDemoBoxProps {
  title: string;
  subtitle?: string;
  hints?: string[];
  height?: number;
  data: any[];
  columns: ColumnDef[];
  columnGroups?: ColumnGroupDef[];
  groupHeaderHeight?: number;
  isDark: boolean;
  isTR: boolean;
  colors: DocThemeColors;
  showToolbar?: boolean;
  toolbar?: boolean | GridToolbarConfig;
  showFormulaBar?: boolean;
  showGroupPanel?: boolean;
  showSummaryFooter?: boolean;
  summaryRow?: boolean | GridSummaryConfig;
  initialGroups?: { selector: string }[];
  permissions?: GridPermissions;
}

export const LiveDemoBox: React.FC<LiveDemoBoxProps> = ({
  title,
  subtitle,
  hints,
  height = 240,
  data,
  columns: demoCols,
  columnGroups,
  groupHeaderHeight,
  isDark,
  isTR,
  colors,
  showToolbar = true,
  toolbar,
  showFormulaBar = false,
  showGroupPanel = false,
  showSummaryFooter = false,
  summaryRow,
  initialGroups = [],
  permissions,
}) => {
  const [resetKey, setResetKey] = useState<number>(0);
  const clonedData = useMemo(() => {
    void resetKey;
    return JSON.parse(JSON.stringify(data));
  }, [data, resetKey]);

  const resolvedToolbar = useMemo<boolean | GridToolbarConfig>(() => {
    if (toolbar !== undefined) return toolbar;
    if (!showToolbar) return false;
    return {
      visible: true,
      buttonDisplayMode: 'icon-text',
      allowDisplayModeSwitch: false,
      showBrand: false,
      showAddRow: true,
      showDuplicateRow: false,
      showDeleteRow: true,
      showUndoRedo: true,
      showSearch: true,
      showGroupBy: Boolean(showGroupPanel),
      showClearFilters: true,
      showBatchActions: true,
      showPermissionsSwitch: false,
      showColumnSettings: false,
      showLocaleSwitch: false,
      showThemeSwitch: false,
      showExportCsv: false,
    };
  }, [toolbar, showToolbar, showGroupPanel]);

  return (
    <div
      style={{
        margin: '16px 0 22px',
        borderRadius: 14,
        border: `1px solid ${colors.accent}`,
        backgroundColor: colors.surface,
        boxShadow: isDark
          ? '0 10px 28px rgba(0, 0, 0, 0.42)'
          : '0 6px 20px rgba(2, 132, 199, 0.08)',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderTopLeftRadius: 13,
          borderTopRightRadius: 13,
          backgroundColor: colors.surfaceAlt,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 999,
                backgroundColor: 'rgba(16, 185, 129, 0.16)',
                color: '#10B981',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              ● {isTR ? 'CANLI DEMO' : 'LIVE DEMO'}
            </span>
            <span style={{ fontWeight: 800, fontSize: 14.5, color: colors.text }}>{title}</span>
          </div>
          {subtitle && (
            <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 11px',
            borderRadius: 6,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <MaterialIcon name="restart_alt" size={15} color={colors.accent} />
          <span>{isTR ? 'Örneği Sıfırla' : 'Reset Demo'}</span>
        </button>
      </div>

      {hints && hints.length > 0 && (
        <div
          style={{
            padding: '7px 16px',
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.07)' : 'rgba(2, 132, 199, 0.05)',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            fontSize: 12,
            color: colors.text,
          }}
        >
          <strong style={{ color: colors.accent }}>
            {isTR ? 'Deneyin:' : 'Try it live:'}
          </strong>
          {hints.map((h, i) => (
            <span
              key={i}
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                fontSize: 11.5,
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height,
          borderBottomLeftRadius: 13,
          borderBottomRightRadius: 13,
        }}
      >
        <SheetGL
          key={`${resetKey}_${isTR ? 'tr' : 'en'}_${isDark}`}
          dataSource={clonedData}
          columns={demoCols}
          columnGroups={columnGroups}
          groupHeaderHeight={groupHeaderHeight}
          theme={isDark ? 'apple-dark' : 'apple-light'}
          locale={isTR ? 'tr-TR' : 'en-US'}
          initialGroups={initialGroups}
          permissions={permissions}
          toolbar={resolvedToolbar}
          summaryRow={summaryRow !== undefined ? summaryRow : showSummaryFooter}
          showFormulaBar={showFormulaBar}
          batchEditMode={true}
          style={{
            width: '100%',
            height: '100%',
            borderBottomLeftRadius: 13,
            borderBottomRightRadius: 13,
          }}
        />
      </div>
    </div>
  );
};
