/**
 * Tradis Data: Market Feeds & Stochastic GBM / Jump-Diffusion Generators
 */
export function generateSyntheticDataset(preset = 'eurusd_hf', nTicks = 1500, params = {}) {
  const ticks = [];
  let s = params.s0 || 1.08500;
  let t = 1700000000;
  const mu = params.mu !== undefined ? params.mu : 0.05;
  const sigma = params.sigma !== undefined ? params.sigma : 0.20;

  for (let i = 0; i < nTicks; i++) {
    t += 60; // 1 minute per tick
    
    // Box-Muller Gaussian Random Variable
    const u1 = Math.max(1e-10, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    let jump = 0;
    if (preset === 'btc_vol' && Math.random() < 0.06) {
      jump = (Math.random() - 0.5) * 0.0060;
    }

    const dt = 1.0 / (365.0 * 24.0 * 60.0);
    const dW = (mu * dt) + (sigma * Math.sqrt(dt) * z) + jump;
    s = s * Math.exp(dW);

    const spread = 0.00010;
    const bid = s - spread / 2.0;
    const ask = s + spread / 2.0;
    const volume = Math.floor(50 + Math.random() * 200);

    ticks.push({
      symbol: 'EUR/USD',
      timestamp: t,
      bid,
      ask,
      last: s,
      volume
    });
  }
  return ticks;
}

export function parseCSVDataset(csvText) {
  const lines = csvText.trim().split('\n');
  const ticks = [];
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 4) {
      const timestamp = parseFloat(parts[0]) || (Date.now() / 1000);
      const bid = parseFloat(parts[1]);
      const ask = parseFloat(parts[2]);
      const last = parseFloat(parts[3]) || ((bid + ask) / 2.0);
      const volume = parseFloat(parts[4]) || 100;
      if (!isNaN(bid) && !isNaN(ask)) {
        ticks.push({ symbol: 'EUR/USD', timestamp, bid, ask, last, volume });
      }
    }
  });
  return ticks;
}
