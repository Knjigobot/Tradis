/**
 * Tradis Core: Commodities Futures Trading Engine (Cordis Theorems 2, 3 & 5)
 * Specialized for Non-Precious Commodities (Aluminium, Copper, Zinc, Nickel, Crude)
 */
import { RingBuffer } from './ring_buffer.js';
import { COMMODITY_SPECS } from './types.js';

export const TF_SECONDS = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  D1: 86400
};

export class TradingEngine {
  constructor(context, supervisor) {
    this.context = context;
    this.supervisor = supervisor;
    this.isRunning = true;
    this.tickCount = 0;
    this.orderSeq = 0;
    
    this.activeSymbol = 'ALI_FUT';
    this.spec = COMMODITY_SPECS[this.activeSymbol];

    // Multi-timeframe bounded ring buffers (500 capacity each)
    this.timeframes = ['M1', 'M5', 'H1', 'D1'];
    this.ringBuffers = {};
    this.currentBars = {};
    
    this.timeframes.forEach(tf => {
      this.ringBuffers[tf] = new RingBuffer(500);
      this.currentBars[tf] = null;
      this.context.set(`bar_history_${tf}`, this.ringBuffers[tf]);
    });

    // Positions, Orders, Account
    this.position = { 
      symbol: this.activeSymbol, 
      lots: -2.0, // 2 Short contracts for delta hedge (50 Metric Tons)
      avgEntry: 2623.50, 
      pnl: 0.0 
    };
    
    this.account = { 
      balance: 250000.0, 
      equity: 250000.0, 
      marginUsed: 6500.00, 
      freeMargin: 243500.00, 
      leverage: 20 
    };
    
    this.orders = [];

    this.context.set('active_symbol', this.activeSymbol);
    this.context.set('contract_spec', this.spec);
    this.context.set('position', this.position);
    this.context.set('account', this.account);
  }

  processTick(tick) {
    this.tickCount++;
    this.context.set('latest_tick', tick);
    this.context.set('spot', tick.last);

    // 1. Multi-timeframe bar builder (Bounded O(1) Memory)
    this.timeframes.forEach(tf => {
      const tfSec = TF_SECONDS[tf];
      const barStart = Math.floor(tick.timestamp / tfSec) * tfSec;
      let curr = this.currentBars[tf];

      if (!curr || curr.openTime !== barStart) {
        if (curr) {
          this.ringBuffers[tf].push({ ...curr });
        }
        this.currentBars[tf] = {
          openTime: barStart,
          open: tick.last,
          high: tick.last,
          low: tick.last,
          close: tick.last,
          volume: tick.volume
        };
      } else {
        curr.high = Math.max(curr.high, tick.last);
        curr.low = Math.min(curr.low, tick.last);
        curr.close = tick.last;
        curr.volume += tick.volume;
      }
    });

    // 2. Dispatch to Hot-Swappable Supervisor
    const commands = this.supervisor.dispatch({ type: 'TickEvent', tick }, tick.timestamp);
    commands.forEach(cmd => this.handleCommand(cmd, tick));

    // 3. Mark-to-Market Commodities Position PnL
    // PnL = lots * lotSizeMT * (CurrentPrice - AvgEntry)
    if (this.position.lots !== 0) {
      const currentPrice = this.position.lots > 0 ? tick.bid : tick.ask;
      const lotSize = this.spec.lotSizeMT;
      this.position.pnl = this.position.lots * lotSize * (currentPrice - this.position.avgEntry);
    } else {
      this.position.pnl = 0.0;
    }
    
    this.account.equity = this.account.balance + this.position.pnl;
    this.account.freeMargin = this.account.equity - this.account.marginUsed;

    this.context.set('position', this.position);
    this.context.set('account', this.account);
  }

  executeOrder(side, lots, price, source = 'Manual') {
    this.orderSeq++;
    const ordId = `ALI_${this.orderSeq.toString().padStart(6, '0')}`;
    const order = {
      id: ordId,
      time: new Date().toISOString().slice(11, 19),
      symbol: this.activeSymbol,
      side,
      lots: parseFloat(lots.toFixed(2)),
      price: parseFloat(price.toFixed(2)),
      status: 'FILLED',
      source
    };
    this.orders.unshift(order);
    if (this.orders.length > 100) this.orders.pop();

    // Position State Transition
    const signedLots = side === 'BUY' ? lots : -lots;
    const prevTotal = this.position.lots * this.position.avgEntry;
    const newTotal = signedLots * price;
    this.position.lots = parseFloat((this.position.lots + signedLots).toFixed(2));
    
    if (this.position.lots !== 0) {
      this.position.avgEntry = Math.abs((prevTotal + newTotal) / this.position.lots);
      this.account.marginUsed = Math.abs(this.position.lots) * this.spec.initialMarginPerLot;
    } else {
      this.account.marginUsed = 0.0;
    }

    this.supervisor.logAudit(`[ORDER FILLED] ${side} ${lots.toFixed(2)} lots ${this.activeSymbol} @ $${price.toFixed(2)}/MT (${source})`);
    return order;
  }

  handleCommand(cmd, tick) {
    if (cmd.type === 'SubmitOrder') {
      const execPrice = cmd.direction === 'BUY' ? tick.ask : tick.bid;
      this.executeOrder(cmd.direction, cmd.lots, execPrice, cmd.source || 'Fincor Plugin');
    } else if (cmd.type === 'Log') {
      this.supervisor.logAudit(cmd.message, cmd.level || 'info');
    }
  }
}