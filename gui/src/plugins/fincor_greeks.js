/**
 * Fincor Plugin for Tradis: Analytical & Monte Carlo Greeks Engine
 * Computes ?, G, ?, T in real-time and executes delta-neutral hedging.
 */
export class FincorGreeksPlugin {
  constructor(options = {}) {
    this.id = 'fincor_greeks_hedger';
    this.name = 'Fincor Greeks Delta-Neutral Hedger';
    this.version = '1.0.0';
    
    this.strike = options.strike || 1.0850;
    this.maturity = options.maturity || 1.0;
    this.interestRate = options.interestRate || 0.05;
    this.volatility = options.volatility || 0.20;
    this.targetOptionQty = options.targetOptionQty || 10.0; // Long 10 call options
    this.rebalanceThreshold = 0.20;
  }

  onInit(context) {
    context.set('fincor_greeks', { delta: 0.5, gamma: 0.0, vega: 0.0, theta: 0.0 });
  }

  computeGreeks(spot) {
    const t = this.maturity;
    const r = this.interestRate;
    const sigma = this.volatility;
    const strike = this.strike;

    if (t <= 0) return { delta: spot > strike ? 1.0 : 0.0, gamma: 0.0, vega: 0.0, theta: 0.0 };
    
    const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
    const d2 = d1 - sigma * Math.sqrt(t);
    
    // Normal PDF & CDF
    const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const normCdf = (x) => 0.5 * (1.0 + this.erf(x / Math.SQRT2));

    const delta = normCdf(d1);
    const gamma = normPdf(d1) / (spot * sigma * Math.sqrt(t));
    const vega = spot * normPdf(d1) * Math.sqrt(t) / 100.0;
    const theta = (- (spot * normPdf(d1) * sigma) / (2.0 * Math.sqrt(t)) - r * strike * Math.exp(-r * t) * normCdf(d2)) / 365.0;

    return { delta, gamma, vega, theta };
  }

  erf(x) {
    const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
    const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
  }

  onEvent(context, event, currentTime) {
    if (event.type === 'TickEvent') {
      const spot = event.tick.last;
      const greeks = this.computeGreeks(spot);
      context.set('fincor_greeks', greeks);

      // Delta-Neutral Hedging Condition:
      // Portfolio Delta = Target Option Qty * Option Delta
      // Optimal underlying hedge = - Portfolio Delta
      const portfolioDelta = this.targetOptionQty * greeks.delta;
      const position = context.get('position') || { qty: 0.0 };
      const desiredHedgeQty = - portfolioDelta;
      const discrepancy = desiredHedgeQty - position.qty;

      if (Math.abs(discrepancy) >= this.rebalanceThreshold) {
        const direction = discrepancy > 0 ? 'BUY' : 'SELL';
        return [
          {
            type: 'SubmitOrder',
            direction,
            qty: Math.abs(discrepancy),
            source: 'Fincor ?-Hedger'
          }
        ];
      }
    }
    return [];
  }
}
