/**
 * Tradis UI: Canvas Candlestick & Fincor Greek Chart Renderer
 */
export class ChartRenderer {
  constructor(canvas, engine, context) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.context = context;
    this.activeTimeframe = 'M1';
    this.showEMA = true;
    this.showGreeks = true;
  }

  setTimeframe(tf) {
    this.activeTimeframe = tf;
    this.render();
  }

  render() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    this.ctx.clearRect(0, 0, w, h);

    const rb = this.engine.ringBuffers[this.activeTimeframe];
    if (!rb) return;
    const bars = [...rb.toArray()];
    const curr = this.engine.currentBars[this.activeTimeframe];
    if (curr) bars.push(curr);
    if (bars.length === 0) return;

    const visibleBars = bars.slice(-60);
    const numBars = visibleBars.length;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleBars.forEach(b => {
      if (b.low < minPrice) minPrice = b.low;
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.volume > maxVol) maxVol = b.volume;
    });

    const padding = (maxPrice - minPrice) * 0.1 || 0.0005;
    minPrice -= padding;
    maxPrice += padding;

    const chartH = h - 60;
    const barWidth = Math.max(3, (w - 60) / 60);

    // Grid lines & Axis labels
    this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = (chartH / 6) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w - 60, y);
      this.ctx.stroke();

      const priceAtY = maxPrice - ((y / chartH) * (maxPrice - minPrice));
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(priceAtY.toFixed(5), w - 55, y + 3);
    }

    const emaPoints = [];

    // Draw Candles & Volume
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

      // Volume
      const volH = (b.volume / maxVol) * 45;
      this.ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      this.ctx.fillRect(x - barWidth * 0.35, h - volH - 5, barWidth * 0.7, volH);

      emaPoints.push({ x, y: (openY + closeY) / 2 });
    });

    // EMA Overlay
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
