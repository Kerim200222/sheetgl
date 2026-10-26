import { CellPaintContext } from '../../IColumnTypePlugin';

export function paintText({ ctx, value, theme, x, y, width, height }: CellPaintContext<string>): void {
  if (value === null || value === undefined || value === '' || typeof value === 'function') return;

  const padX = 10;
  const maxW = width - padX * 2;
  if (maxW <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + padX, y, maxW, height);
  ctx.clip();

  ctx.fillStyle = theme.canvas.cellText;
  ctx.font = `normal ${theme.fontSize}px ${theme.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x + padX, y + height / 2);

  ctx.restore();
}
