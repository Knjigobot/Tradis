/**
 * Fincor Plugin for Tradis: Bollinger Bands Volatility Channel (20, 2.0)
 * Computes Upper Band, Middle SMA, Lower Band, Bandwidth, and %B dynamically.
 */
export class BollingerBandsPlugin {
  constructor(options = {}) {
    this.id = 'fincor_bollinger_bands';
    this.name = 'Fincor Bollinger Bands Channel (20, 2.0)';
    this.version = '1.0.0';
    this.period = options.period || 20;
    this.k = options.k || 2.0;
  }

  onInit(context) {
    context.set('bollinger_bands', {
      middle: 2624.50,
      upper: 2634.50,
      lower: 2614.50,
      bandwidth: 0.0076,
      percentB: 0.50
    });
  }

  computeBands(bars) {
    if (bars.length < this.period) return null;
    const slice = bars.slice(-this.period);
    
    // 1. Compute 20-period Mean (Middle Band)
    const sum = slice.reduce((acc, b) => acc + b.close, 0);
    const mean = sum / this.period;

    // 2. Compute Standard Deviation
    const variance = slice.reduce((acc, b) => acc + Math.pow(b.close - mean, 2), 0) / this.period;
    const stdev = Math.sqrt(variance);

    // 3. Bands Calculation
    const upper = mean + (this.k * stdev);
    const lower = mean - (this.k * stdev);
    const latestPrice = slice[slice.length - 1].close;
    const bandwidth = mean !== 0 ? (upper - lower) / mean : 0;
    const percentB = upper !== lower ? (latestPrice - lower) / (upper - lower) : 0.5;

    return { middle: mean, upper, lower, bandwidth, percentB, stdev };
  }

  onEvent(context, event, currentTime) {
    if (event.type === 'TickEvent') {
      const barHistory = context.get('bar_history_M1');
      if (barHistory) {
        const bars = barHistory.toArray();
        const bands = this.computeBands(bars);
        if (bands) {
          context.set('bollinger_bands', bands);

          // Mean reversion alert logs on extreme bands touch
          const spot = event.tick.last;
          if (spot >= bands.upper) {
            return [{
              type: 'Log',
              message: `[BOLLINGER OVERBOUGHT] Spot $${spot.toFixed(2)} pierced Upper Band ($${bands.upper.toFixed(2)})`,
              level: 'warn'
            }];
          } else if (spot <= bands.lower) {
            return [{
              type: 'Log',
              message: `[BOLLINGER OVERSOLD] Spot $${spot.toFixed(2)} pierced Lower Band ($${bands.lower.toFixed(2)})`,
              level: 'warn'
            }];
          }
        }
      }
    }
    return [];
  }
}