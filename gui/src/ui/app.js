/**
 * Tradis Desktop Master Application Coordinator (Cordis Runtime Orchestrator)
 */
import { ContextManifold } from '../core/context.js';
import { PluginSupervisor } from '../core/supervisor.js';
import { TradingEngine } from '../core/engine.js';
import { FincorGreeksPlugin } from '../plugins/fincor_greeks.js';
import { generateSyntheticDataset, parseCSVDataset } from '../data/generator.js';
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

    // Register Formalized Fincor Greeks Plugin
    this.greeksPlugin = new FincorGreeksPlugin();
    this.supervisor.register(this.greeksPlugin);

    // Setup Canvas Chart
    const canvas = document.getElementById('main-chart-canvas');
    this.chart = new ChartRenderer(canvas, this.engine, this.context);

    this.bindUIEvents();
    this.initDataset('eurusd_hf');
    this.startHeartbeat();
  }

  initDataset(preset) {
    this.tickHistory = generateSyntheticDataset(preset, 1500);
    this.filtrationIndex = 0;
    this.supervisor.logAudit(`[DATASET INITIALIZED] Loaded 1,500 ticks for preset '${preset}'.`);
  }

  startHeartbeat() {
    setInterval(() => {
      if (!this.engine.isRunning || this.tickHistory.length === 0) return;
      for (let s = 0; s < this.speed; s++) {
        if (this.filtrationIndex < this.tickHistory.length) {
          const tick = this.tickHistory[this.filtrationIndex++];
          this.engine.processTick(tick);
        } else {
          // Continuous Live Generator
          const last = this.tickHistory[this.tickHistory.length - 1];
          const nextTicks = generateSyntheticDataset('eurusd_hf', 1, { s0: last.last });
          nextTicks[0].timestamp = last.timestamp + 60;
          this.tickHistory.push(nextTicks[0]);
          this.filtrationIndex++;
          this.engine.processTick(nextTicks[0]);
        }
      }
      this.updateUI();
    }, 200);
  }

  bindUIEvents() {
    // Timeframe selector
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => {
          b.className = 'tf-btn px-2 py-0.5 text-xs rounded font-medium text-[var(--muted-foreground,#94a3b8)] hover:text-white';
        });
        btn.className = 'tf-btn px-2 py-0.5 text-xs rounded font-medium bg-indigo-600 text-white';
        this.chart.setTimeframe(btn.dataset.tf);
      });
    });

    // Play/Pause
    document.getElementById('btn-play-pause').addEventListener('click', () => {
      this.engine.isRunning = !this.engine.isRunning;
      const btn = document.getElementById('btn-play-pause');
      btn.textContent = this.engine.isRunning ? '? Pause' : '? Play';
      btn.className = this.engine.isRunning 
        ? 'px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded'
        : 'px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded';
    });

    // Speed
    document.getElementById('speed-select').addEventListener('change', (e) => {
      this.speed = parseInt(e.target.value);
    });

    // Audit logs
    this.supervisor.onAudit((msg, level) => {
      const container = document.getElementById('audit-log-entries');
      if (!container) return;
      const div = document.createElement('div');
      div.className = level === 'error' ? 'text-rose-400 font-semibold' : level === 'warn' ? 'text-amber-400' : 'text-[var(--muted-foreground,#cbd5e1)]';
      div.textContent = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
      container.appendChild(div);
      container.parentElement.scrollTop = container.parentElement.scrollHeight;
    });

    // Time Scrubber (Temporal Reversibility / Rollback)
    document.getElementById('time-scrubber').addEventListener('input', (e) => {
      const pct = parseInt(e.target.value);
      if (this.tickHistory.length > 0) {
        this.filtrationIndex = Math.floor((pct / 100) * (this.tickHistory.length - 1));
        const tick = this.tickHistory[this.filtrationIndex];
        if (tick) {
          this.engine.processTick(tick);
          document.getElementById('scrubber-time-label').textContent = `F_t: ${new Date(tick.timestamp * 1000).toISOString().slice(11, 19)}`;
        }
      }
    });

    // Manual Trade
    window.manualOrder = (side) => {
      const spot = this.context.get('spot') || 1.08500;
      this.engine.executeOrder(side.toUpperCase(), 1.0, spot, 'Manual Trader');
      this.updateUI();
    };

    // Hot Reload Plugin
    window.hotReloadPlugin = (pluginId) => {
      if (pluginId === 'fincor_greeks_hedger') {
        this.supervisor.hotReload(new FincorGreeksPlugin());
      }
    };

    // Trigger Fault
    window.triggerRogueCrash = () => {
      const rogue = {
        id: 'rogue_chaos',
        name: 'Rogue Chaos Plugin',
        onEvent: () => { throw new Error('Unhandled division by zero in rogue strategy!'); }
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
        const ticks = parseCSVDataset(raw);
        if (ticks.length > 0) {
          this.tickHistory = ticks;
          this.filtrationIndex = 0;
          this.supervisor.logAudit(`[CUSTOM CSV LOADED] ${ticks.length} ticks parsed.`);
        }
      } else {
        const preset = document.getElementById('dataset-preset-select').value;
        this.initDataset(preset);
      }
      document.getElementById('dataset-modal').classList.add('hidden');
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

    const spot = this.context.get('spot') || 1.08500;
    document.getElementById('side-spot-price').textContent = spot.toFixed(5);

    const greeks = this.context.get('fincor_greeks') || { delta: 0.5, gamma: 0.0, vega: 0.0, theta: 0.0 };
    document.getElementById('greek-delta-val').textContent = greeks.delta.toFixed(4);
    document.getElementById('greek-delta-bar').style.width = `${Math.min(100, Math.max(0, greeks.delta * 100))}%`;
    document.getElementById('greek-gamma-val').textContent = greeks.gamma.toFixed(4);
    document.getElementById('greek-vega-val').textContent = greeks.vega.toFixed(4);
    document.getElementById('greek-theta-val').textContent = greeks.theta.toFixed(4);

    const acc = this.engine.account;
    document.getElementById('acc-balance').textContent = `$${acc.balance.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('acc-equity').textContent = `$${acc.equity.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    document.getElementById('acc-margin').textContent = `$${acc.marginUsed.toFixed(2)}`;
    document.getElementById('acc-freemargin').textContent = `$${acc.freeMargin.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const pos = this.engine.position;
    document.getElementById('pos-qty').textContent = pos.qty.toFixed(2);
    document.getElementById('pos-entry').textContent = pos.avgEntry.toFixed(5);
    document.getElementById('pos-current').textContent = spot.toFixed(5);
    const pnlEl = document.getElementById('pos-pnl');
    pnlEl.textContent = `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}`;
    pnlEl.className = pos.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';

    // Orders Table
    const tbody = document.getElementById('orders-tbody');
    if (tbody) {
      tbody.innerHTML = this.engine.orders.map(o => `
        <tr class="hover:bg-[var(--background,#020617)]/40">
          <td class="py-1 text-[var(--foreground,#f8fafc)]">${o.id}</td>
          <td class="text-[var(--muted-foreground,#94a3b8)]">${o.time}</td>
          <td>${o.symbol}</td>
          <td class="${o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} font-semibold">${o.side}</td>
          <td>${o.qty}</td>
          <td><span class="px-1 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400">${o.status}</span></td>
          <td class="font-bold text-[var(--foreground,#f8fafc)]">${o.price.toFixed(5)}</td>
        </tr>
      `).join('');
    }

    this.chart.render();
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TradisApp();
});
