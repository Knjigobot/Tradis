/**
 * Tradis UI: Canvas Candlestick, Volume & Bollinger Bands Chart Renderer
 * Features auto-bounding box and vibrant purple volatility channel.
 */
export class ChartRenderer {
  constructor(canvas, engine, context) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.context = context;
    this.activeTimeframe = 'M1';
    this.showEMA = true;
    this.showBollinger = true; // RE-ENABLED

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

    // Pre-calculate Bollinger Bands for all visible bars
    const bbData = [];
    visibleBars.forEach((_, idx) => {
      const fullIdx = bars.length - visibleBars.length + idx;
      if (fullIdx >= 19) {
        const windowBars = bars.slice(fullIdx - 19, fullIdx + 1);
        const mean = windowBars.reduce((sum, b) => sum + b.close, 0) / 20.0;
        const variance = windowBars.reduce((sum, b) => sum + Math.pow(b.close - mean, 2), 0) / 20.0;
        const stdev = Math.sqrt(variance);
        bbData.push({
          idx,
          mean,
          upper: mean + 2.0 * stdev,
          lower: mean - 2.0 * stdev,
          stdev
        });
      } else {
        bbData.push(null);
      }
    });

    // Dynamic price bounding box including Bollinger Bands
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleBars.forEach((b, i) => {
      if (b.low < minPrice) minPrice = b.low;
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.volume > maxVol) maxVol = b.volume;

      if (this.showBollinger && bbData[i]) {
        if (bbData[i].lower < minPrice) minPrice = bbData[i].lower;
        if (bbData[i].upper > maxPrice) maxPrice = bbData[i].upper;
      }
    });

    const padding = (maxPrice - minPrice) * 0.10 || 1.5;
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
    const upperPoints = [];
    const lowerPoints = [];
    const midPoints = [];

    // Collect Bollinger Coordinate Points
    if (this.showBollinger) {
      bbData.forEach((bb, i) => {
        if (bb) {
          const x = i * barWidth + barWidth / 2;
          const upperY = chartH - ((bb.upper - minPrice) / (maxPrice - minPrice)) * chartH;
          const lowerY = chartH - ((bb.lower - minPrice) / (maxPrice - minPrice)) * chartH;
          const midY = chartH - ((bb.mean - minPrice) / (maxPrice - minPrice)) * chartH;

          upperPoints.push({ x, y: upperY });
          lowerPoints.push({ x, y: lowerY });
          midPoints.push({ x, y: midY });
        }
      });
    }

    // 2. Draw Bollinger Bands (Vibrant Purple Volatility Channel)
    if (this.showBollinger && upperPoints.length > 1) {
      // Shaded Volatility Cloud
      this.ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
      this.ctx.beginPath();
      upperPoints.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      for (let i = lowerPoints.length - 1; i >= 0; i--) {
        this.ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y);
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Upper Band Line
      this.ctx.strokeStyle = '#c084fc';
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      upperPoints.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();

      // Lower Band Line
      this.ctx.strokeStyle = '#c084fc';
      this.ctx.lineWidth = 1.8;
      this.ctx.beginPath();
      lowerPoints.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();

      // Middle Band Line (Dashed SMA)
      this.ctx.strokeStyle = '#e879f9';
      this.ctx.lineWidth = 1.2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      midPoints.forEach((pt, i) => {
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      });
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 3. Draw Candlesticks & Volume
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

      // Candle Body
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

    // 4. Draw EMA 20 Overlay Line
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

    // 5. On-Chart Live Legend
    if (this.showBollinger && bbData.length > 0) {
      const latestBB = bbData[bbData.length - 1];
      if (latestBB) {
        this.ctx.font = '10px monospace';
        this.ctx.fillStyle = '#c084fc';
        this.ctx.fillText(`BB(20, 2): Upper $${latestBB.upper.toFixed(2)} | Mid $${latestBB.mean.toFixed(2)} | Lower $${latestBB.lower.toFixed(2)}`, 12, 18);
      }
    }
  }
}