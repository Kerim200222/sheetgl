import { CellPaintContext } from '../../IColumnTypePlugin';
import { SelectOption } from '../../../types/grid';

/**
 * Açık renkleri Dark Mode için Apple / Google tarzı yarı saydam ve canlı renklere dönüştürür
 */
function resolveBadgeColors(
  opt: SelectOption,
  isDark: boolean
): { bg?: string; fg?: string; border?: string; isBadge: boolean } {
  // 1. Kullanıcı özel bg / darkBg verdiyse (ör. Status rozetleri için renk tanımlıysa) rozet olarak çiz
  if (opt.bg || opt.darkBg) {
    if (isDark) {
      return {
        bg: opt.darkBg || opt.bg,
        fg: opt.darkFg || '#F5F5F7',
        border: opt.darkFg ? `${opt.darkFg}33` : undefined,
        isBadge: true,
      };
    }
    return {
      bg: opt.bg,
      fg: opt.fg || '#1D1D1F',
      border: undefined,
      isBadge: true,
    };
  }

  // 2. Akıllı renk tahmini - yalnızca opt.bg bir renk anahtarı içeriyorsa
  const bg = (opt.bg || '').toLowerCase();
  const fg = (opt.fg || '').toLowerCase();
  if (bg) {
    if (bg.includes('dcfce7') || fg.includes('166534') || bg.includes('green') || bg.includes('emerald')) {
      return {
        bg: isDark ? 'rgba(48, 209, 88, 0.16)' : '#dcfce7',
        fg: isDark ? '#30D158' : '#166534',
        border: isDark ? 'rgba(48, 209, 88, 0.28)' : undefined,
        isBadge: true,
      };
    }
    if (bg.includes('fef3c7') || fg.includes('92400e') || bg.includes('yellow') || bg.includes('amber')) {
      return {
        bg: isDark ? 'rgba(255, 159, 10, 0.16)' : '#fef3c7',
        fg: isDark ? '#FF9F0A' : '#92400e',
        border: isDark ? 'rgba(255, 159, 10, 0.28)' : undefined,
        isBadge: true,
      };
    }
    if (bg.includes('e0f2fe') || fg.includes('075985') || bg.includes('blue') || bg.includes('sky')) {
      return {
        bg: isDark ? 'rgba(10, 132, 255, 0.16)' : '#e0f2fe',
        fg: isDark ? '#64D2FF' : '#075985',
        border: isDark ? 'rgba(10, 132, 255, 0.28)' : undefined,
        isBadge: true,
      };
    }
    if (bg.includes('fee2e2') || fg.includes('991b1b') || bg.includes('red') || bg.includes('rose')) {
      return {
        bg: isDark ? 'rgba(255, 69, 58, 0.16)' : '#fee2e2',
        fg: isDark ? '#FF453A' : '#991b1b',
        border: isDark ? 'rgba(255, 69, 58, 0.28)' : undefined,
        isBadge: true,
      };
    }
  }

  // 3. Normal düzenlenebilir dropdown sütunu: Gri kutu YOK! Hücre normal renginde görünür.
  return {
    isBadge: false,
  };
}

export function paintSelect({
  ctx,
  value,
  column,
  theme,
  x,
  y,
  width,
  height,
  isSelected,
  isHovered,
}: CellPaintContext<string>): void {
  if (value == null || value === '') return;

  const opt = column.options?.find(
    (o) => o.value === value || String(o.value) === String(value)
  ) ?? {
    value,
    label: String(value),
  };

  const badgeInfo = resolveBadgeColors(opt, theme.isDark);

  ctx.save();

  if (badgeInfo.isBadge && badgeInfo.bg) {
    // Yalnızca belirgin bir renk rozeti atanmış seçeneklerde renkli hap çiz
    const pad = 6;
    const pillH = 22;
    const pillY = y + (height - pillH) / 2;
    const pillW = Math.min(width - pad * 2 - 18, 180);

    if (pillW > 20) {
      ctx.fillStyle = badgeInfo.bg;
      ctx.beginPath();
      ctx.roundRect(x + pad, pillY, pillW, pillH, 4);
      ctx.fill();

      if (badgeInfo.border) {
        ctx.strokeStyle = badgeInfo.border;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.rect(x + pad + 6, pillY, pillW - 12, pillH);
      ctx.clip();

      ctx.fillStyle = badgeInfo.fg || theme.canvas.cellText;
      ctx.font = `600 ${theme.fontSize - 1}px ${theme.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.label, x + pad + 8, y + height / 2);
    }
  } else {
    // Normal düzenlenebilir dropdown: Gri zemin YOK. Temiz hücre metni
    const textStartX = x + 8;
    const maxTextW = Math.max(0, width - 26);

    ctx.save();
    ctx.beginPath();
    ctx.rect(textStartX, y, maxTextW, height);
    ctx.clip();

    ctx.fillStyle = theme.canvas.cellText;
    ctx.font = `500 ${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(opt.label, textStartX, y + height / 2);
    ctx.restore();
  }

  // Sağ taraftaki zarif açılır ok ikonu (▼)
  if (width > 36) {
    const arrowX = x + width - 12;
    const arrowY = y + height / 2;
    ctx.fillStyle =
      isSelected || isHovered
        ? theme.dom.accentColor
        : theme.isDark
        ? '#8E8E93'
        : '#AEAEB2';
    ctx.beginPath();
    ctx.moveTo(arrowX - 3.5, arrowY - 2);
    ctx.lineTo(arrowX + 3.5, arrowY - 2);
    ctx.lineTo(arrowX, arrowY + 2.5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
