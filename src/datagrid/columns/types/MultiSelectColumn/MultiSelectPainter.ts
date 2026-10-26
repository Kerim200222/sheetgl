import { CellPaintContext } from '../../IColumnTypePlugin';
import { SelectOption } from '../../../types/grid';

function resolveTagColors(opt: SelectOption, isDark: boolean): { bg: string; fg: string; border?: string } {
  if (!isDark) {
    return {
      bg: opt.bg || '#E0E7FF',
      fg: opt.fg || '#1E40AF',
      border: undefined,
    };
  }

  if (opt.darkBg && opt.darkFg) {
    return {
      bg: opt.darkBg,
      fg: opt.darkFg,
      border: `${opt.darkFg}33`,
    };
  }

  return {
    bg: 'rgba(99, 102, 241, 0.18)',
    fg: '#818CF8',
    border: 'rgba(99, 102, 241, 0.32)',
  };
}

export function normalizeMultiValue(value: any): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const v of value) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) || typeof v === 'string') {
        result.push(...normalizeMultiValue(v));
      } else {
        const s = String(v).trim();
        if (s) result.push(s);
      }
    }
    return Array.from(new Set(result.filter(Boolean)));
  }
  if (typeof value === 'string') {
    let str = value.trim();
    if (!str) return [];

    // 1. Recursive JSON parse if wrapped in array brackets e.g. ["A", "B"] or "[\"A\", \"B\"]"
    while (
      (str.startsWith('[') && str.endsWith(']')) ||
      (str.startsWith('"[') && str.endsWith(']"'))
    ) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          return normalizeMultiValue(parsed);
        }
        if (typeof parsed === 'string') {
          str = parsed.trim();
          continue;
        }
        break;
      } catch {
        // Fallback: strip outer brackets and quotes
        str = str.replace(/^\[+\s*|\]+\s*$/g, '').trim();
        break;
      }
    }

    // 2. Split by comma, semicolon, pipe, or ' + '
    return Array.from(
      new Set(
        str
          .split(/[,;|]|\s\+\s/)
          .map((s) => s.replace(/^["'\s]+|["'\s]+$/g, '').trim())
          .filter((s) => s.length > 0 && s !== 'null' && s !== 'undefined')
      )
    );
  }
  return [String(value).trim()].filter(Boolean);
}

export function paintMultiSelect({
  ctx,
  value,
  column,
  theme,
  x,
  y,
  width,
  height,
  isHovered,
  isSelected,
}: CellPaintContext<string[] | string>): void {
  const items = normalizeMultiValue(value);

  ctx.save();
  const pad = 6;
  const pillH = 20;
  const pillY = y + (height - pillH) / 2;
  const maxRight = x + width - 22; // Reserve space for dropdown arrow

  let curX = x + pad;
  ctx.font = `600 ${theme.fontSize - 2}px ${theme.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (let i = 0; i < items.length; i++) {
    const rawVal = items[i];
    const opt = column.options?.find((o) => o.value === rawVal) ?? {
      value: rawVal,
      label: rawVal,
    };
    const colors = resolveTagColors(opt, theme.isDark);
    const textW = ctx.measureText(opt.label).width;
    const pillW = Math.min(textW + 14, 110);

    const remainingCount = items.length - i;
    const reserveForMore = remainingCount > 1 ? 28 : 0;

    if (curX + pillW + reserveForMore > maxRight && i > 0) {
      // Draw +N overflow badge
      const moreText = `+${remainingCount}`;
      const moreW = ctx.measureText(moreText).width + 10;
      if (curX + moreW <= maxRight + 6) {
        ctx.fillStyle = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';
        ctx.beginPath();
        ctx.roundRect(curX, pillY, moreW, pillH, 4);
        ctx.fill();

        ctx.fillStyle = theme.canvas.cellText;
        ctx.fillText(moreText, curX + 5, y + height / 2);
      }
      break;
    }

    const drawW = Math.max(24, Math.min(pillW, maxRight - curX));
    if (drawW < 24) break;

    // Pill background
    ctx.fillStyle = colors.bg;
    ctx.beginPath();
    ctx.roundRect(curX, pillY, drawW, pillH, 4);
    ctx.fill();

    if (colors.border) {
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Pill label clipped
    ctx.save();
    ctx.beginPath();
    ctx.rect(curX + 4, pillY, drawW - 8, pillH);
    ctx.clip();
    ctx.fillStyle = colors.fg;
    ctx.fillText(opt.label, curX + 7, y + height / 2);
    ctx.restore();

    curX += drawW + 4;
  }

  // Dropdown arrow icon (▼) on right
  ctx.fillStyle =
    isSelected || isHovered
      ? theme.dom.accentColor
      : theme.isDark
      ? '#8E8E93'
      : '#AEAEB2';
  ctx.beginPath();
  const arrowX = x + width - 12;
  const arrowY = y + height / 2;
  ctx.moveTo(arrowX - 3.5, arrowY - 2);
  ctx.lineTo(arrowX + 3.5, arrowY - 2);
  ctx.lineTo(arrowX, arrowY + 2.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
