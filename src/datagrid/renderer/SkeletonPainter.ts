import { IGridThemeTokens } from '../theme/IGridTheme';

export class SkeletonPainter {
  /**
   * Paints a subtle skeleton placeholder cell with base background, grid border,
   * and an inset rounded rectangular skeleton stub.
   */
  public static paintSkeletonCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    theme: IGridThemeTokens
  ): void {
    if (width <= 0 || height <= 0) return;

    const padX = 8;
    const barH = 12;
    const barY = y + (height - barH) / 2;
    const barW = Math.max(16, width - padX * 2);

    ctx.save();
    // 1. Base cell background
    ctx.fillStyle = theme.canvas.bg;
    ctx.fillRect(x, y, width, height);

    // 2. Subtle grid border lines
    ctx.strokeStyle = theme.canvas.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width - 0.5, y);
    ctx.lineTo(x + width - 0.5, y + height);
    ctx.moveTo(x, y + height - 0.5);
    ctx.lineTo(x + width, y + height - 0.5);
    ctx.stroke();

    // 3. Overlaid slightly lighter/darker inset rectangle stub
    const stubColor = theme.canvas.skeletonBar || (theme.isDark ? '#333333' : '#E0E0E0');
    ctx.fillStyle = stubColor;
    ctx.beginPath();
    ctx.roundRect(x + padX, barY, Math.min(barW, Math.max(0, width - padX * 2)), barH, 4);
    ctx.fill();
    ctx.restore();
  }
}
