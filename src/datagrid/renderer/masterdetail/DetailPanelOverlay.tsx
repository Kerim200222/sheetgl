import React from 'react';
import { IDataStore } from '../../types/store';
import { GeometryEngine } from '../../core/GeometryEngine';
import { IGridThemeTokens } from '../../theme/IGridTheme';

export interface DetailPanelOverlayProps {
  expandedMasterRows: Set<any>;
  store: IDataStore;
  geometry: GeometryEngine;
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
  masterDetailTemplate?: (rowData: any, rowIndex?: number) => React.ReactNode;
  theme: IGridThemeTokens;
  detailRowHeight?: number;
}

/**
 * Generic React overlay component for SheetGL Master-Detail row drawers.
 * Renders user-provided templates over expanded canvas rows with vertical viewport culling.
 */
export const DetailPanelOverlay: React.FC<DetailPanelOverlayProps> = ({
  expandedMasterRows,
  store,
  geometry,
  scrollTop,
  viewportWidth,
  viewportHeight,
  masterDetailTemplate,
  theme,
  detailRowHeight = 160,
}) => {
  if (!masterDetailTemplate || expandedMasterRows.size === 0) {
    return null;
  }

  const rowCount = store.getRowCount();
  const panels: React.ReactNode[] = [];

  for (let r = 0; r < rowCount; r++) {
    const vRow = store.getViewRow(r);
    if (!vRow || vRow.type !== 'data') continue;

    const rowData = vRow.data;
    const keyField = (store as any).getKeyField?.() || (store as any).keyField || 'id';
    const rowKey = rowData[keyField] ?? rowData.id ?? rowData.legacy_id ?? r;

    if (!expandedMasterRows.has(rowKey)) continue;

    const rowRect = geometry.getRowScreenRect(r, scrollTop);
    const standardH = geometry.rowHeight;
    const top = rowRect.y + standardH;
    const height = rowRect.height > standardH ? rowRect.height - standardH : detailRowHeight;

    // Viewport vertical culling: skip rendering if entirely outside visible bounds
    if (top + height < geometry.headerHeight || top > viewportHeight + 100) {
      continue;
    }

    // Horizontal placement: spans across center viewport (e.g. from frozen/left-pinned boundary)
    const left = (geometry as any).totalLeftPinnedWidth ?? geometry.totalFrozenWidth ?? geometry.rowNumberWidth;
    const rightPinnedW = (geometry as any).totalRightPinnedWidth ?? 0;
    const width = Math.max(200, viewportWidth - left - rightPinnedW);

    panels.push(
      <div
        key={`master-detail-${rowKey}`}
        data-detail-row={r}
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
          zIndex: 25,
          boxSizing: 'border-box',
          backgroundColor: theme.isDark ? '#141416' : '#FAFAFA',
          borderTop: `1px solid ${theme.canvas.gridLine || 'rgba(0,0,0,0.1)'}`,
          borderBottom: `2px solid ${theme.canvas.gridLine || 'rgba(0,0,0,0.15)'}`,
          overflow: 'auto',
          padding: '12px 16px',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {masterDetailTemplate(rowData, r)}
      </div>
    );
  }

  return <>{panels}</>;
};
