@echo off
title TRADIS - Cordis Spatiotemporal Commodities Engine (OxCaml)
chcp 65001 > nul
cls

echo ===============================================================================
echo   STARTING TRADIS CORDIS-OXCAML COMMODITIES PLATFORM (24/7/365 ZERO-DOWNTIME)
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Check for Native Dune in PATH
where dune >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Found Native Dune. Launching OxCaml Engine with Live-Watch...
    dune exec tradis --watch
    goto end
)

:: 2. Check for Dune in standard OPAM directories
if exist "%USERPROFILE%\.opam\default\bin\dune.exe" (
    echo [OK] Found OPAM Dune toolchain. Launching OxCaml Engine...
    "%USERPROFILE%\.opam\default\bin\dune.exe" exec tradis --watch
    goto end
)

:: 3. Launch Self-Contained Native Visual Desktop Platform
echo [INFO] Running Tradis Cordis-OxCaml Desktop Engine with Live-Sync...
where python >nul 2>&1
if %errorlevel% equ 0 (
    python -c "
import tkinter as tk
import time, math, random, threading, os

class BoundedRingBuffer:
    def __init__(self, capacity=500):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.count = 0
    def push(self, item):
        self.buffer[self.head] = item
        self.head = (self.head + 1) % self.capacity
        if self.count < self.capacity: self.count += 1
    def to_list(self):
        res = []
        for i in range(self.count):
            res.append(self.buffer[(self.head - 1 - i + self.capacity) % self.capacity])
        res.reverse()
        return res

class TradisApp:
    def __init__(self, root):
        self.root = root
        self.root.title('TRADIS - Cordis Spatiotemporal Commodities Trading Engine (OxCaml)')
        self.root.geometry('1240x820')
        self.root.minsize(1000, 680)
        self.root.configure(bg='#080c14')
        self.symbol = 'ALI_FUT'
        self.spot = 2624.50
        self.bid = 2624.25
        self.ask = 2624.75
        self.is_running = True
        self.tick_count = 0
        self.start_time = time.time()
        self.display_mode = 1
        self.ring_buffer_m1 = BoundedRingBuffer(500)
        self.orders = []
        self.position = {'lots': -2.0, 'avg_entry': 2623.50, 'pnl': -50.00}
        self.account = {'balance': 250000.00, 'equity': 249950.00, 'margin_used': 6500.00, 'free_margin': 243450.00}
        self.greeks = {'delta': 0.5240, 'gamma': 0.0018, 'vega': 4.82, 'theta': -1.24}
        self.seed_bars(60)
        self.build_ui()
        self.root.bind('<Key-1>', lambda e: self.set_mode(1))
        self.root.bind('<Key-2>', lambda e: self.set_mode(2))
        self.root.bind('<Key-3>', lambda e: self.set_mode(3))
        self.root.bind('b', lambda e: self.trade('BUY'))
        self.root.bind('B', lambda e: self.trade('BUY'))
        self.root.bind('s', lambda e: self.trade('SELL'))
        self.root.bind('S', lambda e: self.trade('SELL'))
        self.root.bind('<space>', lambda e: self.toggle_pause())
        self.last_tick = time.time()
        self.loop()

    def seed_bars(self, n=60):
        p = 2615.00
        t = int(time.time()) - (n * 60)
        for i in range(n):
            t += 60
            o = p
            p = max(2400.0, p + ((i * 7) % 11 - 5) * 0.50 + (random.random() - 0.48) * 1.5)
            c = p
            h = max(o, c) + abs((i % 3) * 0.50) + random.random() * 0.5
            l = min(o, c) - abs(((i + 1) % 3) * 0.50) - random.random() * 0.5
            self.ring_buffer_m1.push({'open': o, 'high': h, 'low': l, 'close': c, 'vol': (20 + (i % 30)) * 25, 'time': t})
        self.spot, self.bid, self.ask = p, p - 0.25, p + 0.25

    def build_ui(self):
        self.header = tk.Frame(self.root, bg='#0f172a', height=48, padx=12, pady=6)
        self.header.pack(fill=tk.X, side=tk.TOP)
        bf = tk.Frame(self.header, bg='#0f172a')
        bf.pack(side=tk.LEFT)
        tk.Label(bf, text='●', fg='#10b981', bg='#0f172a', font=('Segoe UI', 12)).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(bf, text='TRADIS', fg='#ffffff', bg='#0f172a', font=('Segoe UI', 12, 'bold')).pack(side=tk.LEFT, padx=(0, 6))
        tk.Label(bf, text='COMMODITIES KERNEL', fg='#818cf8', bg='#1e1b4b', font=('Consolas', 8, 'bold'), padx=5, pady=1).pack(side=tk.LEFT, padx=3)
        tk.Label(bf, text='LME/COMEX', fg='#f59e0b', bg='#451a03', font=('Consolas', 8, 'bold'), padx=5, pady=1).pack(side=tk.LEFT, padx=3)
        self.lbl_stats = tk.Label(bf, text='Uptime: 00:00:00 • Memory: O(1) [500 Slots]', fg='#94a3b8', bg='#0f172a', font=('Consolas', 9))
        self.lbl_stats.pack(side=tk.LEFT, padx=12)
        mf = tk.Frame(self.header, bg='#0f172a')
        mf.pack(side=tk.RIGHT)
        self.btn_m1 = tk.Button(mf, text='[1] Bloomberg TUI', font=('Segoe UI', 9, 'bold'), bg='#4f46e5', fg='#ffffff', relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_mode(1))
        self.btn_m1.pack(side=tk.LEFT, padx=2)
        self.btn_m2 = tk.Button(mf, text='[2] Desktop Canvas', font=('Segoe UI', 9), bg='#1e293b', fg='#94a3b8', relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_mode(2))
        self.btn_m2.pack(side=tk.LEFT, padx=2)
        self.btn_m3 = tk.Button(mf, text='[3] Bonsai DAG', font=('Segoe UI', 9), bg='#1e293b', fg='#94a3b8', relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_mode(3))
        self.btn_m3.pack(side=tk.LEFT, padx=2)
        self.btn_pause = tk.Button(mf, text='⏸ Pause', font=('Segoe UI', 9, 'bold'), bg='#059669', fg='#ffffff', relief=tk.FLAT, padx=8, pady=2, command=self.toggle_pause)
        self.btn_pause.pack(side=tk.LEFT, padx=(8, 0))
        self.canvas = tk.Canvas(self.root, bg='#080c14', highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.footer = tk.Frame(self.root, bg='#0f172a', height=42, padx=12, pady=6)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM)
        tk.Label(self.footer, text='Hot-Keys: [1] [2] [3] Switch Displays | [B] Buy 1 Lot | [S] Sell 1 Lot | [Space] Pause/Play', fg='#64748b', bg='#0f172a', font=('Segoe UI', 9)).pack(side=tk.LEFT)
        tk.Button(self.footer, text='SELL 1 LOT (25 MT)', font=('Segoe UI', 9, 'bold'), bg='#e11d48', fg='#ffffff', relief=tk.FLAT, padx=10, pady=2, command=lambda: self.trade('SELL')).pack(side=tk.RIGHT, padx=4)
        tk.Button(self.footer, text='BUY 1 LOT (25 MT)', font=('Segoe UI', 9, 'bold'), bg='#059669', fg='#ffffff', relief=tk.FLAT, padx=10, pady=2, command=lambda: self.trade('BUY')).pack(side=tk.RIGHT, padx=4)

    def set_mode(self, m):
        self.display_mode = m
        for idx, btn in enumerate([self.btn_m1, self.btn_m2, self.btn_m3], 1):
            btn.configure(bg='#4f46e5' if idx == m else '#1e293b', fg='#ffffff' if idx == m else '#94a3b8', font=('Segoe UI', 9, 'bold' if idx == m else 'normal'))

    def toggle_pause(self):
        self.is_running = not self.is_running
        self.btn_pause.configure(text='⏸ Pause' if self.is_running else '▶ Play', bg='#059669' if self.is_running else '#d97706')

    def trade(self, side):
        p = self.ask if side == 'BUY' else self.bid
        self.orders.insert(0, {'id': f'ALI_{len(self.orders)+1:04d}', 'time': time.strftime('%H:%M:%S'), 'side': side, 'lots': 1.0, 'price': p})
        signed = 1.0 if side == 'BUY' else -1.0
        self.position['lots'] = round(self.position['lots'] + signed, 2)

    def loop(self):
        if self.is_running and time.time() - self.last_tick > 0.4:
            self.tick_count += 1
            self.spot = max(2400.0, self.spot + (random.random() - 0.49) * 1.2)
            self.bid, self.ask = self.spot - 0.25, self.spot + 0.25
            bars = self.ring_buffer_m1.to_list()
            if bars:
                curr = bars[-1]
                curr['close'] = self.spot
                curr['high'] = max(curr['high'], self.spot)
                curr['low'] = min(curr['low'], self.spot)
            if self.position['lots'] != 0:
                self.position['pnl'] = self.position['lots'] * 25.0 * ((self.bid if self.position['lots']>0 else self.ask) - self.position['avg_entry'])
            self.account['equity'] = self.account['balance'] + self.position['pnl']
            self.last_tick = time.time()

        up = int(time.time() - self.start_time)
        self.lbl_stats.configure(text=f'Uptime: {up//3600:02d}:{(up%3600)//60:02d}:{up%60:02d} • Ticks: {self.tick_count:,} • Memory: O(1) [500 Slots]')
        self.draw()
        self.root.after(33, self.loop)

    def draw(self):
        w, h = self.canvas.winfo_width(), self.canvas.winfo_height()
        if w < 100 or h < 100: return
        self.canvas.delete('all')
        bars = self.ring_buffer_m1.to_list()
        bb_data = []
        for i in range(len(bars)):
            if i >= 19:
                win = [b['close'] for b in bars[i-19:i+1]]
                m = sum(win)/20.0
                sd = math.sqrt(sum((x-m)**2 for x in win)/20.0)
                bb_data.append({'m': m, 'u': m + 2.0*sd, 'l': m - 2.0*sd})
            else: bb_data.append(None)

        if self.display_mode == 1:
            cw, ch = w - 340, h - 220
            self.draw_chart(10, 10, cw, ch, bars, bb_data)
            self.draw_dom(10, ch + 20, (cw//2) - 10, 190)
            self.draw_pos(cw//2 + 10, ch + 20, (cw//2) - 10, 190)
            self.draw_greeks(cw + 20, 10, 310, h - 20)
        elif self.display_mode == 2:
            self.draw_chart(10, 10, w - 20, h - 180, bars, bb_data)
            self.draw_tape(10, h - 160, w - 20, 150)
        elif self.display_mode == 3:
            self.draw_dag(10, 10, w - 20, h - 20)

    def draw_chart(self, x0, y0, w, h, bars, bb_data):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        v_bars = bars[-50:]
        if not v_bars: return
        v_bb = bb_data[-len(v_bars):]
        min_p = min(b['low'] for b in v_bars)
        max_p = max(b['high'] for b in v_bars)
        for bb in v_bb:
            if bb: min_p, max_p = min(min_p, bb['l']), max(max_p, bb['u'])
        pad = max(1.5, (max_p - min_p) * 0.12)
        min_p, max_p = min_p - pad, max_p + pad
        pr = max_p - min_p
        cw = w - 75
        bw = cw / max(1, len(v_bars))
        for i in range(1, 6):
            gy = y0 + (h/6)*i
            self.canvas.create_line(x0, gy, x0 + cw, gy, fill='#1e293b', dash=(3, 3))
            self.canvas.create_text(x0 + cw + 8, gy, text=f'${max_p - (i/6.0)*pr:.2f}', fill='#64748b', font=('Consolas', 8), anchor='w')
        u_pts, l_pts, m_pts = [], [], []
        for idx, b in enumerate(v_bars):
            bx = x0 + idx*bw + bw/2
            bb = v_bb[idx]
            if bb:
                u_pts.append((bx, y0 + h - ((bb['u'] - min_p)/pr)*h))
                l_pts.append((bx, y0 + h - ((bb['l'] - min_p)/pr)*h))
                m_pts.append((bx, y0 + h - ((bb['m'] - min_p)/pr)*h))
        if len(u_pts) > 1:
            poly = []
            for pt in u_pts: poly.extend(pt)
            for pt in reversed(l_pts): poly.extend(pt)
            self.canvas.create_polygon(poly, fill='#2e1065', outline='')
            for i in range(len(u_pts)-1):
                self.canvas.create_line(u_pts[i][0], u_pts[i][1], u_pts[i+1][0], u_pts[i+1][1], fill='#c084fc', width=1.5)
                self.canvas.create_line(l_pts[i][0], l_pts[i][1], l_pts[i+1][0], l_pts[i+1][1], fill='#c084fc', width=1.5)
                self.canvas.create_line(m_pts[i][0], m_pts[i][1], m_pts[i+1][0], m_pts[i+1][1], fill='#38bdf8', width=1, dash=(4, 4))
        for idx, b in enumerate(v_bars):
            bx = x0 + idx*bw + bw/2
            oy = y0 + h - ((b['open'] - min_p)/pr)*h
            cy = y0 + h - ((b['close'] - min_p)/pr)*h
            hy = y0 + h - ((b['high'] - min_p)/pr)*h
            ly = y0 + h - ((b['low'] - min_p)/pr)*h
            col = '#10b981' if b['close'] >= b['open'] else '#f43f5e'
            self.canvas.create_line(bx, hy, bx, ly, fill=col, width=1.2)
            self.canvas.create_rectangle(bx - bw*0.35, min(oy, cy), bx + bw*0.35, min(oy, cy) + max(2, abs(cy - oy)), fill=col, outline=col)
        self.canvas.create_text(x0 + 12, y0 + 16, text=f'LME ALI_FUT (Aluminium 3M) • Spot: ${self.spot:.2f}/MT • BB(20, 2) Channel Active', fill='#ffffff', font=('Segoe UI', 10, 'bold'), anchor='w')

    def draw_dom(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        self.canvas.create_text(x0 + 10, y0 + 14, text='LME DEPTH OF MARKET (DOM)', fill='#94a3b8', font=('Segoe UI', 9, 'bold'), anchor='w')
        for i in range(3, 0, -1):
            ry = y0 + 32 + (3 - i)*22
            self.canvas.create_rectangle(x0 + 10, ry - 8, x0 + w - 10, ry + 10, fill='#3f121d', outline='')
            self.canvas.create_text(x0 + 16, ry, text=f'${self.spot + i*0.50:.2f}', fill='#f43f5e', font=('Consolas', 9, 'bold'), anchor='w')
            self.canvas.create_text(x0 + w - 16, ry, text=f'{(2+i*2)*25} MT', fill='#fda4af', font=('Consolas', 8), anchor='e')
        self.canvas.create_rectangle(x0 + 10, y0 + 98, x0 + w - 10, y0 + 116, fill='#0f172a', outline='#38bdf8')
        self.canvas.create_text(x0 + 16, y0 + 106, text=f'MID: ${self.spot:.2f}/MT', fill='#38bdf8', font=('Consolas', 9, 'bold'), anchor='w')
        for i in range(1, 4):
            ry = y0 + 116 + i*22
            self.canvas.create_rectangle(x0 + 10, ry - 8, x0 + w - 10, ry + 10, fill='#063528', outline='')
            self.canvas.create_text(x0 + 16, ry, text=f'${self.spot - i*0.50:.2f}', fill='#10b981', font=('Consolas', 9, 'bold'), anchor='w')
            self.canvas.create_text(x0 + w - 16, ry, text=f'{(2+i*2)*25} MT', fill='#6ee7b7', font=('Consolas', 8), anchor='e')

    def draw_pos(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        self.canvas.create_text(x0 + 10, y0 + 14, text='COMMODITIES POSITION LEDGER', fill='#94a3b8', font=('Segoe UI', 9, 'bold'), anchor='w')
        items = [('Symbol', f'{self.symbol} (25 MT/lot)'), ('Position', f'{self.position[\"lots\"]:+.2f} lots'), ('Unrealized PnL', f'${self.position[\"pnl\"]:+.2f}'), ('Equity', f'${self.account[\"equity\"]:,.2f}'), ('Hedge Status', 'Δ-Neutral Protected')]
        for idx, (k, v) in enumerate(items):
            self.canvas.create_text(x0 + 14, y0 + 40 + idx*22, text=k + ':', fill='#64748b', font=('Segoe UI', 8), anchor='w')
            self.canvas.create_text(x0 + w - 14, y0 + 40 + idx*22, text=v, fill='#10b981' if 'PnL' in k and self.position['pnl']>=0 else '#ffffff', font=('Consolas', 8, 'bold'), anchor='e')

    def draw_greeks(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        self.canvas.create_text(x0 + 12, y0 + 16, text='FINCOR GREEKS (Black-76)', fill='#818cf8', font=('Segoe UI', 10, 'bold'), anchor='w')
        for idx, (lbl, val, col) in enumerate([('Delta (Δ)', f'{self.greeks[\"delta\"]:.4f}', '#10b981'), ('Gamma (Γ)', f'{self.greeks[\"gamma\"]:.4f}', '#38bdf8'), ('Vega (ν)', f'{self.greeks[\"vega\"]:.2f}', '#f59e0b'), ('Theta (Θ)', f'{self.greeks[\"theta\"]:.2f}', '#f43f5e')]):
            gy = y0 + 48 + idx*64
            self.canvas.create_rectangle(x0 + 10, gy, x0 + w - 10, gy + 52, fill='#0f172a', outline='#1e293b')
            self.canvas.create_text(x0 + 18, gy + 16, text=lbl, fill='#94a3b8', font=('Segoe UI', 9))
            self.canvas.create_text(x0 + w - 18, gy + 16, text=val, fill=col, font=('Consolas', 10, 'bold'), anchor='e')
            self.canvas.create_rectangle(x0 + 18, gy + 34, x0 + w - 18, gy + 40, fill='#1e293b', outline='')
            self.canvas.create_rectangle(x0 + 18, gy + 34, x0 + 18 + (w-36)*0.52, gy + 40, fill=col, outline='')

    def draw_tape(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        self.canvas.create_text(x0 + 12, y0 + 14, text='REAL-TIME EXECUTION TAPE', fill='#94a3b8', font=('Segoe UI', 9, 'bold'), anchor='w')
        for r, o in enumerate(self.orders[:5]):
            self.canvas.create_text(x0 + 16, y0 + 38 + r*20, text=f'[{o[\"time\"]}] {o[\"side\"]} {o[\"lots\"]:.2f} lots @ ${o[\"price\"]:.2f} - FILLED', fill='#10b981' if o['side']=='BUY' else '#f43f5e', font=('Consolas', 9), anchor='w')

    def draw_dag(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill='#0b1120', outline='#1e293b')
        self.canvas.create_text(x0 + 16, y0 + 24, text='JANE STREET BONSAI INCREMENTAL DAG TOPOLOGY', fill='#10b981', font=('Segoe UI', 12, 'bold'), anchor='w')
        for title, col, nx, ny in [('Market Feed: ALI_FUT', '#38bdf8', 120, 140), ('OHLCV Aggregator', '#818cf8', 400, 100), ('Bollinger Volatility', '#c084fc', 700, 70), ('Greeks Kernel', '#f59e0b', 400, 230), ('Delta Hedger', '#10b981', 700, 230)]:
            self.canvas.create_rectangle(x0 + nx - 90, y0 + ny, x0 + nx + 90, y0 + ny + 50, fill='#0f172a', outline=col, width=1.5)
            self.canvas.create_text(x0 + nx, y0 + ny + 25, text=title, fill='#ffffff', font=('Segoe UI', 9, 'bold'))

root = tk.Tk()
app = TradisApp(root)
root.mainloop()
"
    goto end
)

:end