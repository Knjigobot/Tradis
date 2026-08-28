/**
 * Fincor Quantitative Plugin for Tradis: Aluminium Commodity Options Greeks & Hedger
 * Computes Black-76 Greeks (Δ, Γ, ν, Θ) for commodity futures options.
 */
export class FincorGreeksPlugin {
  constructor(options = {}) {
    this.id = 'fincor_greeks_hedger';
    this.name = 'Fincor Aluminium Commodity Options Hedger';
    this.version = '1.0.0';
    
    this.strike = options.strike || 2620.00; // $2,620/MT Strike
    this.maturity = options.maturity || 0.25; // 3-month contract (0.25 yr)
    this.interestRate = options.interestRate || 0.045; // 4.5% Risk Free Rate
    this.volatility = options.volatility || 0.22; // 22% Aluminium Implied Volatility
    this.targetOptionLots = options.targetOptionLots || 5.0; // Long 5 Call Contracts (125 MT)
    this.rebalanceThreshold = 0.25; // 0.25 lot threshold
  }

  onInit(context) {
    context.set('fincor_greeks', { delta: 0.524, gamma: 0.0018, vega: 4.82, theta: -1.24 });
  }

  computeGreeks(futuresPrice) {
    const F = futuresPrice;
    const K = this.strike;
    const T = this.maturity;
    const r = this.interestRate;
    const sigma = this.volatility;

    if (T <= 0 || F <= 0 || K <= 0) {
      return { delta: F > K ? 1.0 : 0.0, gamma: 0.0, vega: 0.0, theta: 0.0 };
    }

    const d1 = (Math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const df = Math.exp(-r * T);

    // Normal PDF & CDF
    const normPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const normCdf = (x) => 0.5 * (1.0 + this.erf(x / Math.SQRT2));

    // Black-76 Commodity Futures Options Greeks
    const delta = df * normCdf(d1);
    const gamma = (df * normPdf(d1)) / (F * sigma * Math.sqrt(T));
    const vega = (F * df * normPdf(d1) * Math.sqrt(T)) / 100.0;
    const theta = (-(F * df * normPdf(d1) * sigma) / (2.0 * Math.sqrt(T)) + r * df * (F * normCdf(d1) - K * normCdf(d2))) / 365.0;

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
      const futuresPrice = event.tick.last;
      const greeks = this.computeGreeks(futuresPrice);
      context.set('fincor_greeks', greeks);

      // Delta Neutral Hedging Condition:
      // Portfolio Delta in Lots = Target Option Lots * Option Delta
      // Target Short Futures Position = - Portfolio Delta
      const portfolioDeltaLots = this.targetOptionLots * greeks.delta;
      const position = context.get('position') || { lots: 0.0 };
      const desiredHedgeLots = - portfolioDeltaLots;
      const discrepancy = desiredHedgeLots - position.lots;

      if (Math.abs(discrepancy) >= this.rebalanceThreshold) {
        const direction = discrepancy > 0 ? 'BUY' : 'SELL';
        return [
          {
            type: 'SubmitOrder',
            direction,
            lots: Math.abs(discrepancy),
            source: 'Fincor Commodity Hedger'
          }
        ];
      }
    }
    return [];
  }
}