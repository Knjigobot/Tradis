/**
 * Tradis Core: Spatiotemporal Execution Engine (Cordis Theorem 2 & Theorem 5)
 * Continuous discrete event loop with bounded ring buffers, order state machine,
 * and mark-to-market position ledger.
 */
import { RingBuffer } from './ring_buffer.js';

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
    
    // Multi-timeframe bounded ring buffers (500 capacity each)
    this.timeframes = ['M1', 'M5', 'H1', 'D1'];
    this.ringBuffers = {};
    this.currentBars = {};
    
    this.timeframes.forEach(tf => {
      this.ringBuffers[tf] = new RingBuffer(500);
      this.currentBars[tf] = null;
      this.context.set(ar_history_, this.ringBuffers[tf]);
    });

    // Positions, Orders, Ledger
    this.position = { symbol: 'EUR/USD', qty: 0.0, avgEntry: 1.08500, pnl: 0.0 };
    this.account = { balance: 100000.0, equity: 100000.0, marginUsed: 0.0, freeMargin: 100000.0, leverage: 100 };
    this.orders = [];

    this.context.set('position', this.position);
    this.context.set('account', this.account);
  }

  processTick(tick) {
    this.tickCount++;
    this.context.set('latest_tick', tick);
    this.context.set('spot', tick.last);

    // 1. Update multi-timeframe bars (Bounded O(1) Memory)
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

    // 2. Dispatch tick event to Hot-Swappable Supervisor
    const commands = this.supervisor.dispatch({ type: 'TickEvent', tick }, tick.timestamp);
    commands.forEach(cmd => this.handleCommand(cmd, tick));

    // 3. Mark-to-Market Position & Self-Financing Invariant
    if (this.position.qty !== 0) {
      const currentPrice = this.position.qty > 0 ? tick.bid : tick.ask;
      this.position.pnl = this.position.qty * (currentPrice - this.position.avgEntry) * 10000;
    } else {
      this.position.pnl = 0.0;
    }
    this.account.equity = this.account.balance + this.position.pnl;
    this.account.freeMargin = this.account.equity - this.account.marginUsed;

    this.context.set('position', this.position);
    this.context.set('account', this.account);
  }

  executeOrder(side, qty, price, source = 'Manual') {
    this.orderSeq++;
    const ordId = ORD_;
    const order = {
      id: ordId,
      time: new Date().toISOString().slice(11, 19),
      symbol: this.position.symbol,
      side,
      qty: parseFloat(qty.toFixed(2)),
      price: parseFloat(price.toFixed(5)),
      status: 'FILLED',
      source
    };
    this.orders.unshift(order);
    if (this.orders.length > 100) this.orders.pop();

    // Position State Transformer
    const signedQty = side === 'BUY' ? qty : -qty;
    const prevCost = this.position.qty * this.position.avgEntry;
    const newCost = signedQty * price;
    this.position.qty = parseFloat((this.position.qty + signedQty).toFixed(2));
    
    if (this.position.qty !== 0) {
      this.position.avgEntry = Math.abs((prevCost + newCost) / this.position.qty);
      this.account.marginUsed = (Math.abs(this.position.qty) * price * 10000) / this.account.leverage;
    } else {
      this.account.marginUsed = 0.0;
    }

    this.supervisor.logAudit([ORDER FILLED]    @  ());
    return order;
  }

  handleCommand(cmd, tick) {
    if (cmd.type === 'SubmitOrder') {
      const execPrice = cmd.direction === 'BUY' ? tick.ask : tick.bid;
      this.executeOrder(cmd.direction, cmd.qty, execPrice, cmd.source || 'Plugin');
    } else if (cmd.type === 'Log') {
      this.supervisor.logAudit(cmd.message, cmd.level || 'info');
    }
  }
}
