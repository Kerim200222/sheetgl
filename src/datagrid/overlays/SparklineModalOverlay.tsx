import React, { useEffect, useState } from 'react';
import { ColumnDef } from '../types/grid';
import { IGridThemeTokens } from '../theme/IGridTheme';
import { IGridLocale } from '../i18n/IGridLocale';

import { useGridState } from '../state';

export interface SparklineModalState {
  rowIndex: number;
  rowData: Record<string, any>;
  column: ColumnDef;
  points: number[];
}

export interface SparklineModalOverlayProps {
  modal: SparklineModalState;
  theme?: IGridThemeTokens;
  locale?: IGridLocale;
  onClose: () => void;
}

export const SparklineModalOverlay: React.FC<SparklineModalOverlayProps> = ({
  modal,
  theme: propTheme,
  locale: propLocale,
  onClose,
}) => {
  const gridState = useGridState();
  const theme = propTheme ?? gridState.resolvedTheme;
  const locale = propLocale ?? gridState.currentLocale;
  const isTR = locale.code.startsWith('tr');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points = Array.isArray(modal.points) && modal.points.length > 0 ? modal.points : [0, 0];
  const n = points.length;

  const firstVal = points[0] ?? 0;
  const lastVal = points[n - 1] ?? 0;
  const diff = lastVal - firstVal;
  const pctChange = firstVal !== 0 ? (diff / Math.abs(firstVal)) * 100 : 0;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const minIdx = points.indexOf(minVal);
  const maxIdx = points.indexOf(maxVal);
  const sumVal = points.reduce((a, b) => a + b, 0);
  const avgVal = sumVal / n;
  const variance = points.reduce((acc, v) => acc + Math.pow(v - avgVal, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  const accentColor = modal.column.sparklineColor || '#38BDF8';
  const isPositive = diff >= 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  // SVG Chart dimensions
  const svgW = 580;
  const svgH = 220;
  const padL = 44;
  const padR = 24;
  const padT = 24;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const yMin = Math.max(0, Math.floor(minVal * 0.85));
  const yMax = Math.ceil(maxVal * 1.12) || 100;
  const yRange = yMax - yMin || 1;

  const getX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const getY = (val: number) => padT + plotH - ((val - yMin) / yRange) * plotH;

  const linePath = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(v).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${getX(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const avgY = getY(avgVal);

  const rowTitle =
    modal.rowData.company ||
    modal.rowData.code ||
    `Row #${modal.rowData.id ?? modal.rowIndex + 1}`;
  const rowSubtitle = [
    modal.rowData.code,
    modal.rowData.city,
    modal.rowData.category,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: theme.fontFamily,
        userSelect: 'none',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 650,
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: theme.isDark ? '#0F172A' : '#FFFFFF',
          color: theme.isDark ? '#F8FAFC' : '#0F172A',
          border: `1px solid ${theme.isDark ? '#1E293B' : '#E2E8F0'}`,
          borderRadius: 16,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.55)',
          padding: 22,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingBottom: 14,
            borderBottom: `1px solid ${theme.isDark ? '#1E293B' : '#E2E8F0'}`,
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(56, 189, 248, 0.16)',
                  color: '#38BDF8',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                📈 {modal.column.title}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{rowTitle}</span>
            </div>
            {rowSubtitle && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{rowSubtitle}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Chart Mode Switcher */}
            <div
              style={{
                display: 'flex',
                padding: 2,
                borderRadius: 8,
                backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9',
              }}
            >
              <button
                type="button"
                onClick={() => setChartType('area')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor:
                    chartType === 'area'
                      ? theme.isDark
                        ? '#0284C7'
                        : '#FFFFFF'
                      : 'transparent',
                  color:
                    chartType === 'area'
                      ? theme.isDark
                        ? '#FFFFFF'
                        : '#0284C7'
                      : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {isTR ? '📈 Çizgi / Alan' : '📈 Area Line'}
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor:
                    chartType === 'bar'
                      ? theme.isDark
                        ? '#0284C7'
                        : '#FFFFFF'
                      : 'transparent',
                  color:
                    chartType === 'bar'
                      ? theme.isDark
                        ? '#FFFFFF'
                        : '#0284C7'
                      : '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                {isTR ? '📊 Sütun' : '📊 Bar Chart'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: `1px solid ${theme.isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: 'transparent',
                color: '#94A3B8',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
              {isTR ? 'SON DEĞER' : 'CURRENT'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{lastVal}</div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
              {isTR ? '7G DEĞİŞİM' : '7D CHANGE'}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginTop: 2,
                color: isPositive ? '#10B981' : '#EF4444',
              }}
            >
              {isPositive ? '+' : ''}
              {pctChange.toFixed(1)}% ({isPositive ? `+${diff}` : diff})
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
              {isTR ? 'ORTALAMA' : 'AVERAGE'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: '#38BDF8' }}>
              {avgVal.toFixed(1)}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
              {isTR ? `ZİRVE (GÜN ${maxIdx + 1})` : `PEAK (D${maxIdx + 1})`}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: '#10B981' }}>
              {maxVal}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
              border: `1px solid ${theme.isDark ? '#334155' : '#E2E8F0'}`,
            }}
          >
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
              {isTR ? `DİP / SAPMA` : `LOW / STD`}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
              {minVal} <span style={{ fontSize: 11, color: '#94A3B8' }}>(±{stdDev.toFixed(1)})</span>
            </div>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div
          style={{
            padding: '14px 12px 8px',
            borderRadius: 12,
            backgroundColor: theme.isDark ? '#0B1120' : '#F8FAFC',
            border: `1px solid ${theme.isDark ? '#1E293B' : '#E2E8F0'}`,
            marginBottom: 16,
            position: 'relative',
          }}
        >
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: '100%', height: 220, overflow: 'visible', display: 'block' }}
          >
            <defs>
              <linearGradient id="sparkModalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.38" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
              const val = Math.round(yMin + t * yRange);
              const y = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={svgW - padR}
                    y2={y}
                    stroke={theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'}
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Average Reference Dashed Line */}
            <line
              x1={padL}
              y1={avgY}
              x2={svgW - padR}
              y2={avgY}
              stroke="#F59E0B"
              strokeWidth="1.3"
              strokeDasharray="5 4"
            />
            <text
              x={svgW - padR - 4}
              y={avgY - 5}
              textAnchor="end"
              fill="#F59E0B"
              fontSize="10"
              fontWeight="700"
            >
              AVG: {avgVal.toFixed(1)}
            </text>

            {chartType === 'area' ? (
              <>
                <path d={areaPath} fill="url(#sparkModalGrad)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : (
              points.map((v, i) => {
                const bw = Math.min(38, plotW / (n * 1.6));
                const bx = getX(i) - bw / 2;
                const by = getY(v);
                const bh = Math.max(2, padT + plotH - by);
                const isHov = hoveredIdx === i;
                return (
                  <rect
                    key={i}
                    x={bx}
                    y={by}
                    width={bw}
                    height={bh}
                    rx={5}
                    fill={isHov ? '#38BDF8' : accentColor}
                    opacity={isHov ? 1 : 0.82}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })
            )}

            {/* Data Points & X-Axis Labels */}
            {points.map((v, i) => {
              const cx = getX(i);
              const cy = getY(v);
              const isHov = hoveredIdx === i;
              return (
                <g
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Hover vertical guide */}
                  {isHov && (
                    <line
                      x1={cx}
                      y1={padT}
                      x2={cx}
                      y2={padT + plotH}
                      stroke={accentColor}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  )}

                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHov ? 6.5 : 4.5}
                    fill={isHov ? '#FFFFFF' : accentColor}
                    stroke={accentColor}
                    strokeWidth={isHov ? 3 : 2}
                  />

                  {/* Value label above node */}
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill={isHov ? '#38BDF8' : theme.isDark ? '#E2E8F0' : '#334155'}
                    fontSize={isHov ? '12' : '10'}
                    fontWeight="700"
                  >
                    {v}
                  </text>

                  {/* X-Axis Day Label */}
                  <text
                    x={cx}
                    y={svgH - 10}
                    textAnchor="middle"
                    fill={isHov ? '#38BDF8' : '#94A3B8'}
                    fontSize="11"
                    fontWeight={isHov ? '700' : '600'}
                  >
                    {isTR ? `Gün ${i + 1}` : `Day ${i + 1}`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Day-by-Day Breakdown Table */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94A3B8',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            {isTR ? 'GÜNLÜK DETAYLI KIRILIM TABLOSU' : 'DAILY TREND BREAKDOWN'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}
          >
            {points.map((v, i) => {
              const prev = i > 0 ? points[i - 1] : v;
              const delta = v - prev;
              const isHov = hoveredIdx === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 8,
                    textAlign: 'center',
                    backgroundColor: isHov
                      ? 'rgba(56, 189, 248, 0.15)'
                      : theme.isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                    border: `1px solid ${
                      isHov ? '#38BDF8' : theme.isDark ? '#334155' : '#E2E8F0'
                    }`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                    {isTR ? `Gün ${i + 1}` : `Day ${i + 1}`}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, margin: '3px 0' }}>{v}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color:
                        i === 0
                          ? '#94A3B8'
                          : delta > 0
                          ? '#10B981'
                          : delta < 0
                          ? '#EF4444'
                          : '#94A3B8',
                    }}
                  >
                    {i === 0 ? '—' : delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '0'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
