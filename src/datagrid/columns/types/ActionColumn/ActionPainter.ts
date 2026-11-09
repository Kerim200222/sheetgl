import { CellPaintContext } from '../../IColumnTypePlugin';

export function paintAction({ ctx, column, theme, x, y, width, height, isHovered }: CellPaintContext): void {
  const isIconOnly = column.buttonText === '⚙️' || column.buttonText === '⋯' || !column.buttonText;
  const pad = isIconOnly ? 4 : 6;
  const btnH = 24;
  const btnY = y + (height - btnH) / 2;
  const btnW = isIconOnly ? 28 : Math.max(28, width - pad * 2);
  const btnX = isIconOnly ? x + (width - btnW) / 2 : x + pad;
  if (btnW <= 6) return;

  ctx.save();

  // Buton arka planı
  ctx.fillStyle = isHovered
    ? theme.canvas.selectionBorder
    : theme.isDark
    ? '#2C2C2E'
    : '#F2F2F7';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 5);
  ctx.fill();

  // Buton çerçevesi
  ctx.strokeStyle = isHovered
    ? theme.canvas.selectionBorder
    : theme.isDark
    ? '#3A3A3C'
    : '#E5E5EA';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Buton metni veya İkonu
  const textColor = isHovered ? '#FFFFFF' : theme.canvas.cellText;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const label = column.buttonText || '⚙️';
  if (label === '⚙️' || label === '⋯') {
    // 3 dikey veya yatay nokta çiz (crisp minimal icon)
    const dotColor = isHovered ? '#FFFFFF' : (theme.isDark ? '#E5E5EA' : '#475569');
    ctx.fillStyle = dotColor;
    const midX = btnX + btnW / 2;
    const midY = btnY + btnH / 2;
    const radius = 1.75;
    for (const offset of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.arc(midX + offset, midY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.font = `500 11px ${theme.fontFamily}`;
    ctx.fillText(label, x + width / 2, y + height / 2);
  }

  ctx.restore();
}
