/**
 * Tradis Desktop Master Application Coordinator (Cordis Commodities Platform)
 */
import { ContextManifold } from '../core/context.js';
import { PluginSupervisor } from '../core/supervisor.js';
import { TradingEngine } from '../core/engine.js';
import { initCordisLiveSync } from '../core/live_sync.js';
import { FincorGreeksPlugin } from '../plugins/fincor_greeks.js';
import { BollingerBandsPlugin } from '../plugins/bollinger_bands.js';
import { generateCommodityDataset, generateLiveCommodityTick, parseCSVDataset } from '../data/generator.js';
import { ChartRenderer } from './chart.js';

export class TradisApp {
  constructor() {
    this.context = new ContextManifold();
    this.supervisor = new PluginSupervisor(this.context);
    this.engine = new TradingEngine(this.context, this.supervisor);
    
    this.speed = 5;
    this.startTime = Date.now();
    this.tickHistory = [];
    this.filtrationIndex = 0;

    // Register Fincor Formalized Plugins
    this.greeksPlugin = new FincorGreeksPlugin();
    this.bollingerPlugin = new BollingerBandsPlugin({ period: 20, k: 2.0 });
    
    this.supervisor.register(this.greeksPlugin);
    this.supervisor.register(this.bollingerPlugin);

    // Setup Canvas Chart
    const canvas = document.getElementById('main-chart-canvas');
    this.chart = new ChartRenderer(canvas, this.engine, this.context);

    // Pre-populate 120 historical Aluminium bars synchronously for INSTANT display
    this.seedInitialHistoricalData('ALI_FUT');

    this.bindUIEvents();
    this.updateUI();
    this.startLiveHeartbeat();

    // Enable Dual-Channel Cordis Zero-Refresh Live Sync
    initCordisLiveSync();
  }

  seedInitialHistoricalData(symbol) {
    const historicalBars = generateCommodityDataset(symbol, 120);
    historicalBars.forEach(b => {
      this.engine.ringBuffers['M1'].push(b);
      this.engine.currentBars['M1'] = b;
    });

    const latest = historicalBars[historicalBars.length - 1];
    this.engine.processTick({
      symbol,
      timestamp: latest.openTime,
      bid: latest.close - 0.25,
      ask: latest.close + 0.25,
      last: latest.close,
      volume: latest.volume
    });

    this.supervisor.logAudit(`[FEED SEEDED] Initialized 120 historical bars for ${symbol}. Ready for live streaming.`);
  }

  startLiveHeartbeat() {
    setInterval(() => {
      if (!this.engine.isRunning) return;

      const spot = this.context.get('spot') || 2624.50;
      const tick = generateLiveCommodityTick(this.engine.activeSymbol, spot);
      this.engine.processTick(tick);
      this.updateUI();
    }, 400);
  }

  bindUIEvents() {
    // Timeframe selector
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => {
          b.className = 'tf-btn px-2 py-0.5 text-xs rounded font-medium text-slate-400 hover:text-white';
        });
        btn.className = 'tf-btn px-2 py-0.5 text-xs rounded font-medium bg-indigo-600 text-white';
        this.chart.setTimeframe(btn.dataset.tf);
      });
    });

    // Indicator toggles
    const emaCheck = document.getElementById('check-ema');
    if (emaCheck) {
      emaCheck.addEventListener('change', (e) => {
        this.chart.showEMA = e.target.checked;
        this.chart.render();
      });
    }

    const bbCheck = document.getElementById('check-bollinger');
    if (bbCheck) {
      bbCheck.addEventListener('change', (e) => {
        this.chart.showBollinger = e.target.checked;
        this.chart.render();
      });
    }

    // Play/Pause Engine
    document.getElementById('btn-play-pause').addEventListener('click', () => {
      this.engine.isRunning = !this.engine.isRunning;
      const btn = document.getElementById('btn-play-pause');
      btn.textContent = this.engine.isRunning ? '⏸ Pause' : '▶ Play';
      btn.className = this.engine.isRunning 
        ? 'px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded'
        : 'px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded';
    });

    // Speed Select
    document.getElementById('speed-select').addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value);
    });

    // Audit Log Stream
    this.supervisor.onAudit((msg, level) => {
      const container = document.getElementById('audit-log-entries');
      if (!container) return;
      const div = document.createElement('div');
      div.className = level === 'error' ? 'text-rose-400 font-semibold' : level === 'warn' ? 'text-amber-400' : 'text-slate-300';
      div.textContent = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
      container.appendChild(div);
      container.parentElement.scrollTop = container.parentElement.scrollHeight;
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.className = 'tab-btn pb-1.5 text-slate-400 hover:text-white';
        });
        btn.className = 'tab-btn pb-1.5 border-b-2 border-indigo-500 text-indigo-400 font-semibold';
        
        document.querySelectorAll('#tab-content-container > div').forEach(d => d.classList.add('hidden'));
        document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
      });
    });

    // Manual Trade Execution
    window.manualOrder = (side) => {
      const spot = this.context.get('spot') || 2624.50;
      this.engine.executeOrder(side.toUpperCase(), 1.0, spot, 'Manual Trader');
      this.updateUI();
    };

    // Hot-Reload Plugin Hook
    window.hotReloadPlugin = (pluginId) => {
      if (pluginId === 'fincor_greeks_hedger') {
        this.supervisor.hotReload(new FincorGreeksPlugin());
      } else if (pluginId === 'fincor_bollinger_bands') {
        this.supervisor.hotReload(new BollingerBandsPlugin({ period: 20, k: 2.0 }));
      }
    };

    // Fault Injection Simulation
    window.triggerRogueCrash = () => {
      const rogue = {
        id: 'rogue_chaos',
        name: 'Rogue Chaos Strategy',
        onEvent: () => { throw new Error('Unhandled mathematical singularity / div-by-zero!'); }
      };
      this.supervisor.register(rogue);
      document.getElementById('rogue-status-badge').textContent = 'QUARANTINED';
      document.getElementById('rogue-status-badge').className = 'px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30';
    };

    // Modal Dataset Loader
    document.getElementById('btn-load-dataset-modal').addEventListener('click', () => {
      document.getElementById('dataset-modal').classList.remove('hidden');
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('dataset-modal').classList.add('hidden');
    });
    document.getElementById('btn-cancel-dataset').addEventListener('click', () => {
      document.getElementById('dataset-modal').classList.add('hidden');
    });
    document.getElementById('btn-confirm-load-dataset').addEventListener('click', () => {
      const raw = document.getElementById('raw-csv-input').value.trim();
      if (raw) {
        const ticks = parseCSVDataset(raw, this.engine.activeSymbol);
        if (ticks.length > 0) {
          ticks.forEach(t => this.engine.processTick(t));
          this.supervisor.logAudit(`[CUSTOM CSV LOADED] ${ticks.length} commodity ticks ingested.`);
        }
      } else {
        const preset = document.getElementById('dataset-preset-select').value;
        this.seedInitialHistoricalData(preset);
      }
      document.getElementById('dataset-modal').classList.add('hidden');
      this.updateUI();
    });

    window.addEventListener('resize', () => this.chart.render());
  }

  updateUI() {
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
    const hrs = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
    const secs = String(uptimeSec % 60).padStart(2, '0');
    document.getElementById('uptime-display').textContent = `${hrs}:${mins}:${secs}`;
    document.getElementById('ticks-count-display').textContent = this.engine.tickCount.toLocaleString();

    const spot = this.context.get('spot') || 2624.50;
    document.getElementById('side-spot-price').textContent = `$${spot.toFixed(2)}`;
    document.getElementById('stat-c').textContent = `$${spot.toFixed(2)}/MT`;

    // Greeks Display
    const greeks = this.context.get('fincor_greeks') || { delta: 0.524, gamma: 0.0018, vega: 4.82, theta: -1.24 };
    document.getElementById('stat-delta').textContent = greeks.delta.toFixed(4);
    document.getElementById('greek-delta-val').textContent = greeks.delta.toFixed(4);
    document.getElementById('greek-delta-bar').style.width = `${Math.min(100, Math.max(0, greeks.delta * 100))}%`;
    document.getElementById('greek-gamma-val').textContent = greeks.gamma.toFixed(4);
    document.getElementById('greek-vega-val').textContent = greeks.vega.toFixed(2);
    document.getElementById('greek-theta-val').textContent = greeks.theta.toFixed(2);

    // Bollinger Bands Display
    const bb = this.context.get('bollinger_bands');
    if (bb) {
      const bbUpperEl = document.getElementById('bb-upper-val');
      const bbLowerEl = document.getElementById('bb-lower-val');
      const bbBwEl = document.getElementById('bb-bw-val');
      if (bbUpperEl) bbUpperEl.textContent = `$${bb.upper.toFixed(2)}`;
      if (bbLowerEl) bbLowerEl.textContent = `$${bb.lower.toFixed(2)}`;
      if (bbBwEl) bbBwEl.textContent = `${(bb.bandwidth * 100).toFixed(2)}%`;
    }

    // Ledger & Positions
    const acc = this.engine.account;
    document.getElementById('acc-balance').textContent = `$${acc.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('acc-equity').textContent = `$${acc.equity.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('acc-margin').textContent = `$${acc.marginUsed.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('acc-freemargin').textContent = `$${acc.freeMargin.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const pos = this.engine.position;
    document.getElementById('pos-lots').textContent = `${pos.lots.toFixed(2)} lots (${Math.abs(pos.lots * 25)} MT)`;
    document.getElementById('pos-entry').textContent = `$${pos.avgEntry.toFixed(2)}`;
    document.getElementById('pos-current').textContent = `$${spot.toFixed(2)}`;
    const pnlEl = document.getElementById('pos-pnl');
    pnlEl.textContent = `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`;
    pnlEl.className = pos.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';

    // Update DOM (L2 Depth of Market)
    this.updateDOM(spot);

    // Render Orders Table
    const tbody = document.getElementById('orders-tbody');
    if (tbody) {
      tbody.innerHTML = this.engine.orders.map(o => `
        <tr class="hover:bg-slate-900/60">
          <td class="py-1 text-white font-mono">${o.id}</td>
          <td class="text-slate-400 font-mono">${o.time}</td>
          <td class="font-bold">${o.symbol}</td>
          <td class="${o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} font-semibold font-mono">${o.side}</td>
          <td class="font-mono">${o.lots} lots</td>
          <td><span class="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-mono">${o.status}</span></td>
          <td class="font-bold text-white font-mono">$${o.price.toFixed(2)}</td>
        </tr>
      `).join('');
    }

    this.chart.render();
  }

  updateDOM(spot) {
    const asksDiv = document.getElementById('dom-asks');
    const bidsDiv = document.getElementById('dom-bids');
    const midDiv = document.getElementById('dom-mid');
    if (!asksDiv || !bidsDiv) return;

    midDiv.textContent = `$${spot.toFixed(2)}`;
    document.getElementById('dom-spread').textContent = '$0.50';

    let asksHtml = '';
    for (let i = 4; i >= 1; i--) {
      const p = (spot + i * 0.50).toFixed(2);
      const lots = Math.floor(5 + Math.random() * 20);
      asksHtml += `<div class="flex justify-between text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono">
        <span>$${p}</span><span class="text-rose-300/70">${lots * 25} MT</span>
      </div>`;
    }
    asksDiv.innerHTML = asksHtml;

    let bidsHtml = '';
    for (let i = 1; i <= 4; i++) {
      const p = (spot - i * 0.50).toFixed(2);
      const lots = Math.floor(5 + Math.random() * 20);
      bidsHtml += `<div class="flex justify-between text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
        <span>$${p}</span><span class="text-emerald-300/70">${lots * 25} MT</span>
      </div>`;
    }
    bidsDiv.innerHTML = bidsHtml;
  }
}

// Auto-boot on load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TradisApp();
});