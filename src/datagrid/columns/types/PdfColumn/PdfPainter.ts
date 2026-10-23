import { CellPaintContext } from '../../IColumnTypePlugin';

export function paintPdf({
  ctx,
  value,
  theme,
  x,
  y,
  width,
  height,
  isHovered,
  column,
}: CellPaintContext<string>): void {
  const raw = value != null ? String(value).trim() : '';
  if (!raw) {
    if (isHovered) {
      ctx.save();
      ctx.fillStyle = theme.isDark ? '#475569' : '#CBD5E1';
      ctx.font = `400 12px ${theme.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('-', x + width / 2, y + height / 2);
      ctx.restore();
    }
    return;
  }

  const centerY = y + height / 2;
  const btnHeight = 22;
  const btnY = centerY - btnHeight / 2;

  const totalW = 78;
  const startX =
    column.align === 'left'
      ? x + 8
      : column.align === 'right'
      ? x + width - totalW - 8
      : x + Math.max(6, (width - totalW) / 2);

  const btn1X = startX;
  const btn1W = 48;
  const btn2X = startX + 52;
  const btn2W = 26;

  ctx.save();

  // Button 1: PDF Badge
  const isDark = theme.isDark;
  const bg1 = isDark
    ? isHovered
      ? 'rgba(239, 68, 68, 0.35)'
      : 'rgba(239, 68, 68, 0.18)'
    : isHovered
    ? 'rgba(220, 38, 38, 0.20)'
    : 'rgba(239, 68, 68, 0.10)';

  const border1 = isDark ? 'rgba(239, 68, 68, 0.65)' : 'rgba(220, 38, 38, 0.50)';

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(btn1X, btnY, btn1W, btnHeight, 4);
  } else {
    ctx.rect(btn1X, btnY, btn1W, btnHeight);
  }
  ctx.fillStyle = bg1;
  ctx.fill();
  ctx.strokeStyle = border1;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isDark ? '#F87171' : '#DC2626';
  ctx.font = `700 10.5px ${theme.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📄 PDF', btn1X + btn1W / 2, centerY + 0.5);

  // Button 2: Open in New Tab
  const bg2 = isDark
    ? isHovered
      ? 'rgba(56, 189, 248, 0.28)'
      : 'rgba(255, 255, 255, 0.06)'
    : isHovered
    ? 'rgba(2, 132, 199, 0.18)'
    : 'rgba(0, 0, 0, 0.04)';

  const border2 = isDark
    ? isHovered
      ? '#38BDF8'
      : 'rgba(255, 255, 255, 0.15)'
    : isHovered
    ? '#0284C7'
    : 'rgba(0, 0, 0, 0.12)';

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(btn2X, btnY, btn2W, btnHeight, 4);
  } else {
    ctx.rect(btn2X, btnY, btn2W, btnHeight);
  }
  ctx.fillStyle = bg2;
  ctx.fill();
  ctx.strokeStyle = border2;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = isDark ? (isHovered ? '#38BDF8' : '#94A3B8') : isHovered ? '#0284C7' : '#64748B';
  ctx.font = `700 13px ${theme.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↗', btn2X + btn2W / 2, centerY);

  ctx.restore();
}
