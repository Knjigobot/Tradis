/**
 * Tradis UI: Canvas Candlestick & Volume Chart Renderer
 * (Bollinger Bands visually removed as requested)
 */
export class ChartRenderer {
  constructor(canvas, engine, context) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.context = context;
    this.activeTimeframe = 'M1';
    this.showEMA = true;
    this.showBollinger = false; // VISUALLY REMOVED

    const parent = this.canvas.parentElement;
    if (parent && window.ResizeObserver) {
      const ro = new ResizeObserver(() => this.render());
      ro.observe(parent);
    }
  }

  setTimeframe(tf) {
    this.activeTimeframe = tf;
    this.render();
  }

  render() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth || 800;
    const h = parent.clientHeight || 450;
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, w, h);

    const rb = this.engine.ringBuffers[this.activeTimeframe];
    if (!rb) return;
    const bars = [...rb.toArray()];
    const curr = this.engine.currentBars[this.activeTimeframe];
    if (curr) bars.push(curr);
    if (bars.length === 0) return;

    const visibleBars = bars.slice(-70);
    const numBars = visibleBars.length;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleBars.forEach((b) => {
      if (b.low < minPrice) minPrice = b.low;
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.volume > maxVol) maxVol = b.volume;
    });

    const padding = (maxPrice - minPrice) * 0.12 || 1.5;
    minPrice -= padding;
    maxPrice += padding;

    const rightMargin = 75;
    const bottomMargin = 40;
    const chartW = w - rightMargin;
    const chartH = h - bottomMargin;
    const barWidth = Math.max(3, chartW / 70);

    // 1. Grid Lines & Axis Labels
    this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
    this.ctx.lineWidth = 1;
    this.ctx.font = '10px monospace';
    this.ctx.fillStyle = '#94a3b8';

    for (let i = 1; i <= 6; i++) {
      const y = (chartH / 7) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(chartW, y);
      this.ctx.stroke();

      const priceAtY = maxPrice - ((y / chartH) * (maxPrice - minPrice));
      this.ctx.fillText(`$${priceAtY.toFixed(2)}`, chartW + 8, y + 3);
    }

    const emaPoints = [];

    // 2. Draw Candlesticks & Volume
    visibleBars.forEach((b, idx) => {
      const x = idx * barWidth + barWidth / 2;
      const openY = chartH - ((b.open - minPrice) / (maxPrice - minPrice)) * chartH;
      const closeY = chartH - ((b.close - minPrice) / (maxPrice - minPrice)) * chartH;
      const highY = chartH - ((b.high - minPrice) / (maxPrice - minPrice)) * chartH;
      const lowY = chartH - ((b.low - minPrice) / (maxPrice - minPrice)) * chartH;

      const isUp = b.close >= b.open;
      const color = isUp ? '#10b981' : '#f43f5e';

      // Wick
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, highY);
      this.ctx.lineTo(x, lowY);
      this.ctx.stroke();

      // Body
      this.ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      this.ctx.fillRect(x - barWidth * 0.35, bodyTop, barWidth * 0.7, bodyH);

      // Volume Bar
      const volH = maxVol > 0 ? (b.volume / maxVol) * 35 : 0;
      this.ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)';
      this.ctx.fillRect(x - barWidth * 0.35, h - volH - 4, barWidth * 0.7, volH);

      emaPoints.push({ x, y: (openY + closeY) / 2 });
    });

    // 3. Draw EMA 20 Overlay Line
    if (this.showEMA && emaPoints.length > 1) {
      this.ctx.strokeStyle = '#818cf8';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      emaPoints.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();
    }
  }
}