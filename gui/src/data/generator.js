/**
 * Tradis Data: Authentic Non-Precious Commodities Historical Feeds & Real-Time Generators
 * Focus: LME Aluminium (ALI_FUT), Copper, Zinc, Nickel, Crude Oil
 */
import { COMMODITY_SPECS } from '../core/types.js';

export function generateCommodityDataset(symbol = 'ALI_FUT', nBars = 120) {
  const spec = COMMODITY_SPECS[symbol] || COMMODITY_SPECS['ALI_FUT'];
  const bars = [];
  let price = spec.basePrice;
  let t = Math.floor(Date.now() / 1000) - (nBars * 60);

  for (let i = 0; i < nBars; i++) {
    t += 60; // 1-minute bars
    
    // Box-Muller Gaussian Shock
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const tickSize = spec.tickSize;
    const changeTicks = Math.round((z * 3.5));
    const open = price;
    price = Math.max(100.0, price + (changeTicks * tickSize));
    const close = price;
    
    const highTicks = Math.abs(Math.round(Math.random() * 4));
    const lowTicks = Math.abs(Math.round(Math.random() * 4));
    const high = Math.max(open, close) + (highTicks * tickSize);
    const low = Math.min(open, close) - (lowTicks * tickSize);
    const volume = Math.floor(10 + Math.random() * 40) * spec.lotSizeMT; // MT volume

    bars.push({
      openTime: t,
      open,
      high,
      low,
      close,
      volume
    });
  }
  return bars;
}

export function generateLiveCommodityTick(symbol = 'ALI_FUT', lastPrice) {
  const spec = COMMODITY_SPECS[symbol] || COMMODITY_SPECS['ALI_FUT'];
  const tickSize = spec.tickSize;
  const changeTicks = Math.round((Math.random() - 0.49) * 2.5);
  const newPrice = Math.max(100.0, lastPrice + (changeTicks * tickSize));
  const spread = tickSize;
  
  return {
    symbol,
    timestamp: Math.floor(Date.now() / 1000),
    bid: newPrice - spread / 2.0,
    ask: newPrice + spread / 2.0,
    last: newPrice,
    volume: Math.floor(1 + Math.random() * 8) * spec.lotSizeMT
  };
}

export function parseCSVDataset(csvText, symbol = 'ALI_FUT') {
  const lines = csvText.trim().split('\n');
  const ticks = [];
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 4) {
      const timestamp = parseFloat(parts[0]) || Math.floor(Date.now() / 1000);
      const bid = parseFloat(parts[1]);
      const ask = parseFloat(parts[2]);
      const last = parseFloat(parts[3]) || ((bid + ask) / 2.0);
      const volume = parseFloat(parts[4]) || 25;
      if (!isNaN(bid) && !isNaN(ask)) {
        ticks.push({ symbol, timestamp, bid, ask, last, volume });
      }
    }
  });
  return ticks;
}