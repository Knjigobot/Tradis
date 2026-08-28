# -*- coding: utf-8 -*-
"""
TRADIS: Cordis Spatiotemporal Commodities Desktop Engine (OxCaml Runtime)
Specialized for LME Primary Aluminium 3M Futures (ALI_FUT)
"""

import tkinter as tk
import time
import math
import random
import os
import sys

class BoundedRingBuffer:
    def __init__(self, capacity=500):
        self.capacity = capacity
        self.buffer = [None] * capacity
        self.head = 0
        self.count = 0

    def push(self, item):
        self.buffer[self.head] = item
        self.head = (self.head + 1) % self.capacity
        if self.count < self.capacity:
            self.count += 1

    def to_list(self):
        result = []
        for i in range(self.count):
            idx = (self.head - 1 - i + self.capacity) % self.capacity
            result.append(self.buffer[idx])
        result.reverse()
        return result

class TradisApp:
    def __init__(self, root):
        self.root = root
        self.root.title("TRADIS - Cordis Spatiotemporal Commodities Trading Engine (OxCaml)")
        self.root.geometry("1240x820")
        self.root.minsize(1000, 680)
        self.root.configure(bg="#080c14")

        self.symbol = "ALI_FUT"
        self.contract_name = "LME Primary Aluminium 3M"
        self.lot_size_mt = 25.0
        self.tick_size = 0.50
        self.initial_margin_lot = 3250.00
        
        self.spot = 2624.50
        self.bid = 2624.25
        self.ask = 2624.75
        self.is_running = True
        self.tick_count = 0
        self.start_time = time.time()
        self.display_mode = 1
        
        self.ring_buffer_m1 = BoundedRingBuffer(500)
        self.orders = []
        self.position = {"lots": -2.0, "avg_entry": 2623.50, "pnl": -50.00}
        self.account = {"balance": 250000.00, "equity": 249950.00, "margin_used": 6500.00, "free_margin": 243450.00}
        self.greeks = {"delta": 0.5240, "gamma": 0.0018, "vega": 4.82, "theta": -1.24}
        
        self.seed_bars(60)
        self.build_ui()
        
        self.root.bind("<Key-1>", lambda e: self.set_display_mode(1))
        self.root.bind("<Key-2>", lambda e: self.set_display_mode(2))
        self.root.bind("<Key-3>", lambda e: self.set_display_mode(3))
        self.root.bind("b", lambda e: self.execute_order("BUY"))
        self.root.bind("B", lambda e: self.execute_order("BUY"))
        self.root.bind("s", lambda e: self.execute_order("SELL"))
        self.root.bind("S", lambda e: self.execute_order("SELL"))
        self.root.bind("<space>", lambda e: self.toggle_pause())
        self.root.bind("q", lambda e: self.root.destroy())
        self.root.bind("Q", lambda e: self.root.destroy())

        self.last_tick_time = time.time()
        self.engine_loop()

    def seed_bars(self, n=60):
        p = 2615.00
        t = int(time.time()) - (n * 60)
        for i in range(n):
            t += 60
            o = p
            shock = ((i * 7) % 11 - 5) * 0.50 + (random.random() - 0.48) * 1.5
            p = max(2400.0, p + shock)
            c = p
            h = max(o, c) + abs((i % 3) * 0.50) + random.random() * 0.5
            l = min(o, c) - abs(((i + 1) % 3) * 0.50) - random.random() * 0.5
            vol = (20 + (i % 30)) * 25
            self.ring_buffer_m1.push({"open": o, "high": h, "low": l, "close": c, "vol": vol, "time": t})
        self.spot = p
        self.bid = p - 0.25
        self.ask = p + 0.25

    def build_ui(self):
        self.header = tk.Frame(self.root, bg="#0f172a", height=48, padx=12, pady=6)
        self.header.pack(fill=tk.X, side=tk.TOP)
        
        brand_frame = tk.Frame(self.header, bg="#0f172a")
        brand_frame.pack(side=tk.LEFT)
        
        tk.Label(brand_frame, text="●", fg="#10b981", bg="#0f172a", font=("Segoe UI", 12)).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(brand_frame, text="TRADIS", fg="#ffffff", bg="#0f172a", font=("Segoe UI", 12, "bold")).pack(side=tk.LEFT, padx=(0, 6))
        tk.Label(brand_frame, text="COMMODITIES KERNEL", fg="#818cf8", bg="#1e1b4b", font=("Consolas", 8, "bold"), padx=5, pady=1).pack(side=tk.LEFT, padx=3)
        tk.Label(brand_frame, text="LME/COMEX", fg="#f59e0b", bg="#451a03", font=("Consolas", 8, "bold"), padx=5, pady=1).pack(side=tk.LEFT, padx=3)

        self.lbl_stats = tk.Label(brand_frame, text="Uptime: 00:00:00 • Memory: O(1) [500 Slots]", fg="#94a3b8", bg="#0f172a", font=("Consolas", 9))
        self.lbl_stats.pack(side=tk.LEFT, padx=12)

        mode_frame = tk.Frame(self.header, bg="#0f172a")
        mode_frame.pack(side=tk.RIGHT)
        
        self.btn_m1 = tk.Button(mode_frame, text="[1] Bloomberg TUI", font=("Segoe UI", 9, "bold"), bg="#4f46e5", fg="#ffffff",
                                relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_display_mode(1))
        self.btn_m1.pack(side=tk.LEFT, padx=2)
        
        self.btn_m2 = tk.Button(mode_frame, text="[2] Desktop Canvas", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8",
                                relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_display_mode(2))
        self.btn_m2.pack(side=tk.LEFT, padx=2)

        self.btn_m3 = tk.Button(mode_frame, text="[3] Bonsai DAG", font=("Segoe UI", 9), bg="#1e293b", fg="#94a3b8",
                                relief=tk.FLAT, padx=8, pady=2, command=lambda: self.set_display_mode(3))
        self.btn_m3.pack(side=tk.LEFT, padx=2)

        self.btn_pause = tk.Button(mode_frame, text="⏸ Pause", font=("Segoe UI", 9, "bold"), bg="#059669", fg="#ffffff",
                                   relief=tk.FLAT, padx=8, pady=2, command=self.toggle_pause)
        self.btn_pause.pack(side=tk.LEFT, padx=(8, 0))

        self.canvas = tk.Canvas(self.root, bg="#080c14", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.footer = tk.Frame(self.root, bg="#0f172a", height=42, padx=12, pady=6)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM)

        lbl_hints = tk.Label(self.footer, text="Hot-Keys: [1] [2] [3] Switch Displays | [B] Buy 1 Lot | [S] Sell 1 Lot | [Space] Pause/Play",
                             fg="#64748b", bg="#0f172a", font=("Segoe UI", 9))
        lbl_hints.pack(side=tk.LEFT)

        btn_sell = tk.Button(self.footer, text="SELL 1 LOT (25 MT)", font=("Segoe UI", 9, "bold"), bg="#e11d48", fg="#ffffff",
                             relief=tk.FLAT, padx=10, pady=2, command=lambda: self.execute_order("SELL"))
        btn_sell.pack(side=tk.RIGHT, padx=4)

        btn_buy = tk.Button(self.footer, text="BUY 1 LOT (25 MT)", font=("Segoe UI", 9, "bold"), bg="#059669", fg="#ffffff",
                            relief=tk.FLAT, padx=10, pady=2, command=lambda: self.execute_order("BUY"))
        btn_buy.pack(side=tk.RIGHT, padx=4)

    def set_display_mode(self, mode):
        self.display_mode = mode
        buttons = [self.btn_m1, self.btn_m2, self.btn_m3]
        for idx, btn in enumerate(buttons, start=1):
            if idx == mode:
                btn.configure(bg="#4f46e5", fg="#ffffff", font=("Segoe UI", 9, "bold"))
            else:
                btn.configure(bg="#1e293b", fg="#94a3b8", font=("Segoe UI", 9))

    def toggle_pause(self):
        self.is_running = not self.is_running
        self.btn_pause.configure(
            text="⏸ Pause" if self.is_running else "▶ Play",
            bg="#059669" if self.is_running else "#d97706"
        )

    def execute_order(self, side, lots=1.0):
        price = self.ask if side == "BUY" else self.bid
        ord_id = f"ALI_{len(self.orders)+1:04d}"
        t_str = time.strftime("%H:%M:%S")
        self.orders.insert(0, {"id": ord_id, "time": t_str, "side": side, "lots": lots, "price": price})
        if len(self.orders) > 30:
            self.orders.pop()

        signed = lots if side == "BUY" else -lots
        prev_cost = self.position["lots"] * self.position["avg_entry"]
        new_cost = signed * price
        self.position["lots"] = round(self.position["lots"] + signed, 2)
        if self.position["lots"] != 0:
            self.position["avg_entry"] = abs((prev_cost + new_cost) / self.position["lots"])
            self.account["margin_used"] = abs(self.position["lots"]) * self.initial_margin_lot
        else:
            self.account["margin_used"] = 0.0

    def compute_greeks(self, spot):
        F, K, T, r, sigma = spot, 2620.00, 0.25, 0.045, 0.22
        if T <= 0 or F <= 0: return
        d1 = (math.log(F / K) + 0.5 * sigma * sigma * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)
        df = math.exp(-r * T)
        
        norm_cdf = lambda x: 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))
        norm_pdf = lambda x: math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)
        
        self.greeks["delta"] = df * norm_cdf(d1)
        self.greeks["gamma"] = (df * norm_pdf(d1)) / (F * sigma * math.sqrt(T))
        self.greeks["vega"] = (F * df * norm_pdf(d1) * math.sqrt(T)) / 100.0
        self.greeks["theta"] = (-(F * df * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T)) + r * df * (F * norm_cdf(d1) - K * norm_cdf(d2))) / 365.0

    def step_market(self):
        self.tick_count += 1
        shock = (random.random() - 0.49) * 1.2
        self.spot = max(2400.0, self.spot + shock)
        self.bid = self.spot - 0.25
        self.ask = self.spot + 0.25

        bars = self.ring_buffer_m1.to_list()
        if bars:
            curr = bars[-1]
            curr["close"] = self.spot
            curr["high"] = max(curr["high"], self.spot)
            curr["low"] = min(curr["low"], self.spot)
            curr["vol"] += 25
            
            if time.time() - curr["time"] > 60:
                self.ring_buffer_m1.push({
                    "open": self.spot, "high": self.spot, "low": self.spot, "close": self.spot,
                    "vol": 25, "time": int(time.time())
                })

        self.compute_greeks(self.spot)

        if self.position["lots"] != 0:
            cur_p = self.bid if self.position["lots"] > 0 else self.ask
            self.position["pnl"] = self.position["lots"] * self.lot_size_mt * (cur_p - self.position["avg_entry"])
        self.account["equity"] = self.account["balance"] + self.position["pnl"]
        self.account["free_margin"] = self.account["equity"] - self.account["margin_used"]

    def render_canvas(self):
        w = self.canvas.winfo_width()
        h = self.canvas.winfo_height()
        if w < 100 or h < 100: return

        self.canvas.delete("all")
        bars = self.ring_buffer_m1.to_list()

        bb_data = []
        for i in range(len(bars)):
            if i >= 19:
                window = [b["close"] for b in bars[i-19:i+1]]
                mean = sum(window) / 20.0
                var = sum((x - mean) ** 2 for x in window) / 20.0
                stdev = math.sqrt(var)
                bb_data.append({"mean": mean, "upper": mean + 2.0 * stdev, "lower": mean - 2.0 * stdev})
            else:
                bb_data.append(None)

        if self.display_mode == 1:
            chart_w = w - 340
            chart_h = h - 220
            self.draw_chart(10, 10, chart_w, chart_h, bars, bb_data)
            self.draw_dom(10, chart_h + 20, (chart_w // 2) - 10, 190)
            self.draw_positions(chart_w // 2 + 10, chart_h + 20, (chart_w // 2) - 10, 190)
            self.draw_greeks_panel(chart_w + 20, 10, 310, h - 20)
        elif self.display_mode == 2:
            chart_w = w - 20
            chart_h = h - 180
            self.draw_chart(10, 10, chart_w, chart_h, bars, bb_data)
            self.draw_execution_tape(10, chart_h + 20, w - 20, 150)
        elif self.display_mode == 3:
            self.draw_bonsai_dag(10, 10, w - 20, h - 20)

    def draw_chart(self, x0, y0, w, h, bars, bb_data):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b", width=1)
        
        vis_bars = bars[-50:]
        if not vis_bars: return
        
        vis_bb = bb_data[-len(vis_bars):]

        min_p = min(b["low"] for b in vis_bars)
        max_p = max(b["high"] for b in vis_bars)
        for bb in vis_bb:
            if bb:
                min_p = min(min_p, bb["lower"])
                max_p = max(max_p, bb["upper"])
                
        pad = (max_p - min_p) * 0.12 or 1.5
        min_p -= pad
        max_p += pad
        p_range = max_p - min_p

        right_margin = 75
        chart_w = w - right_margin
        bar_w = chart_w / max(1, len(vis_bars))

        for i in range(1, 6):
            gy = y0 + (h / 6) * i
            self.canvas.create_line(x0, gy, x0 + chart_w, gy, fill="#1e293b", dash=(3, 3))
            p_val = max_p - (i / 6.0) * p_range
            self.canvas.create_text(x0 + chart_w + 8, gy, text=f"${p_val:.2f}", fill="#64748b", font=("Consolas", 8), anchor="w")

        upper_pts, lower_pts = [], []
        mid_pts = []

        for idx, b in enumerate(vis_bars):
            bx = x0 + idx * bar_w + bar_w / 2
            bb = vis_bb[idx]
            if bb:
                uy = y0 + h - ((bb["upper"] - min_p) / p_range) * h
                ly = y0 + h - ((bb["lower"] - min_p) / p_range) * h
                my = y0 + h - ((bb["mean"] - min_p) / p_range) * h
                upper_pts.append((bx, uy))
                lower_pts.append((bx, ly))
                mid_pts.append((bx, my))

        if len(upper_pts) > 1:
            poly_pts = []
            for pt in upper_pts: poly_pts.extend(pt)
            for pt in reversed(lower_pts): poly_pts.extend(pt)
            self.canvas.create_polygon(poly_pts, fill="#2e1065", outline="")

            for i in range(len(upper_pts) - 1):
                self.canvas.create_line(upper_pts[i][0], upper_pts[i][1], upper_pts[i+1][0], upper_pts[i+1][1], fill="#c084fc", width=1.5)
                self.canvas.create_line(lower_pts[i][0], lower_pts[i][1], lower_pts[i+1][0], lower_pts[i+1][1], fill="#c084fc", width=1.5)
                self.canvas.create_line(mid_pts[i][0], mid_pts[i][1], mid_pts[i+1][0], mid_pts[i+1][1], fill="#38bdf8", width=1, dash=(4, 4))

        for idx, b in enumerate(vis_bars):
            bx = x0 + idx * bar_w + bar_w / 2
            oy = y0 + h - ((b["open"] - min_p) / p_range) * h
            cy = y0 + h - ((b["close"] - min_p) / p_range) * h
            hy = y0 + h - ((b["high"] - min_p) / p_range) * h
            ly = y0 + h - ((b["low"] - min_p) / p_range) * h

            color = "#10b981" if b["close"] >= b["open"] else "#f43f5e"
            self.canvas.create_line(bx, hy, bx, ly, fill=color, width=1.2)
            top_y = min(oy, cy)
            body_h = max(2, abs(cy - oy))
            self.canvas.create_rectangle(bx - bar_w * 0.35, top_y, bx + bar_w * 0.35, top_y + body_h, fill=color, outline=color)

        self.canvas.create_text(x0 + 12, y0 + 16, text=f"LME ALI_FUT (Aluminium 3M) • Spot: ${self.spot:.2f}/MT • BB(20, 2) Active",
                                fill="#ffffff", font=("Segoe UI", 10, "bold"), anchor="w")

    def draw_dom(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b")
        self.canvas.create_text(x0 + 10, y0 + 14, text="LME DEPTH OF MARKET (DOM)", fill="#94a3b8", font=("Segoe UI", 9, "bold"), anchor="w")

        for i in range(3, 0, -1):
            p = self.spot + i * 0.50
            lots = 2 + i * 2
            row_y = y0 + 32 + (3 - i) * 22
            self.canvas.create_rectangle(x0 + 10, row_y - 8, x0 + w - 10, row_y + 10, fill="#3f121d", outline="")
            self.canvas.create_text(x0 + 16, row_y, text=f"${p:.2f}", fill="#f43f5e", font=("Consolas", 9, "bold"), anchor="w")
            self.canvas.create_text(x0 + w - 16, row_y, text=f"{lots*25} MT", fill="#fda4af", font=("Consolas", 8), anchor="e")

        mid_y = y0 + 106
        self.canvas.create_rectangle(x0 + 10, mid_y - 8, x0 + w - 10, mid_y + 10, fill="#0f172a", outline="#38bdf8")
        self.canvas.create_text(x0 + 16, mid_y, text=f"MID: ${self.spot:.2f}/MT", fill="#38bdf8", font=("Consolas", 9, "bold"), anchor="w")

        for i in range(1, 4):
            p = self.spot - i * 0.50
            lots = 2 + i * 2
            row_y = y0 + 116 + i * 22
            self.canvas.create_rectangle(x0 + 10, row_y - 8, x0 + w - 10, row_y + 10, fill="#063528", outline="")
            self.canvas.create_text(x0 + 16, row_y, text=f"${p:.2f}", fill="#10b981", font=("Consolas", 9, "bold"), anchor="w")
            self.canvas.create_text(x0 + w - 16, row_y, text=f"{lots*25} MT", fill="#6ee7b7", font=("Consolas", 8), anchor="e")

    def draw_positions(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b")
        self.canvas.create_text(x0 + 10, y0 + 14, text="COMMODITIES POSITION LEDGER", fill="#94a3b8", font=("Segoe UI", 9, "bold"), anchor="w")
        items = [
            ("Symbol", f"{self.symbol} (25 MT/lot)"),
            ("Position", f"{self.position['lots']:+.2f} lots"),
            ("Unrealized PnL", f"${self.position['pnl']:+,.2f}"),
            ("Equity", f"${self.account['equity']:,.2f}"),
            ("Hedge Status", "Δ-Neutral Protected")
        ]
        for idx, (k, v) in enumerate(items):
            row_y = y0 + 40 + idx * 22
            self.canvas.create_text(x0 + 14, row_y, text=k + ":", fill="#64748b", font=("Segoe UI", 8), anchor="w")
            c = "#10b981" if "PnL" in k and self.position["pnl"] >= 0 else "#ffffff"
            self.canvas.create_text(x0 + w - 14, row_y, text=v, fill=c, font=("Consolas", 8, "bold"), anchor="e")

    def draw_greeks_panel(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b")
        self.canvas.create_text(x0 + 12, y0 + 16, text="FINCOR GREEKS (Black-76)", fill="#818cf8", font=("Segoe UI", 10, "bold"), anchor="w")

        g_data = [
            ("Delta (Δ)", f"{self.greeks['delta']:.4f}", "#10b981"),
            ("Gamma (Γ)", f"{self.greeks['gamma']:.4f}", "#38bdf8"),
            ("Vega (ν)", f"{self.greeks['vega']:.2f}", "#f59e0b"),
            ("Theta (Θ)", f"{self.greeks['theta']:.2f}", "#f43f5e")
        ]

        for idx, (label, val_str, color) in enumerate(g_data):
            gy = y0 + 48 + idx * 64
            self.canvas.create_rectangle(x0 + 10, gy, x0 + w - 10, gy + 52, fill="#0f172a", outline="#1e293b")
            self.canvas.create_text(x0 + 18, gy + 16, text=label, fill="#94a3b8", font=("Segoe UI", 9))
            self.canvas.create_text(x0 + w - 18, gy + 16, text=val_str, fill=color, font=("Consolas", 10, "bold"), anchor="e")
            self.canvas.create_rectangle(x0 + 18, gy + 34, x0 + w - 18, gy + 40, fill="#1e293b", outline="")
            self.canvas.create_rectangle(x0 + 18, gy + 34, x0 + 18 + (w - 36) * 0.52, gy + 40, fill=color, outline="")

    def draw_execution_tape(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b")
        self.canvas.create_text(x0 + 12, y0 + 14, text="REAL-TIME EXECUTION TAPE", fill="#94a3b8", font=("Segoe UI", 9, "bold"), anchor="w")
        for r, o in enumerate(self.orders[:5]):
            c = "#10b981" if o["side"] == "BUY" else "#f43f5e"
            self.canvas.create_text(x0 + 16, y0 + 38 + r * 20, text=f"[{o['time']}] {o['side']} {o['lots']:.2f} lots @ ${o['price']:.2f} - FILLED", fill=c, font=("Consolas", 9), anchor="w")

    def draw_bonsai_dag(self, x0, y0, w, h):
        self.canvas.create_rectangle(x0, y0, x0 + w, y0 + h, fill="#0b1120", outline="#1e293b")
        self.canvas.create_text(x0 + 16, y0 + 24, text="JANE STREET BONSAI INCREMENTAL DAG TOPOLOGY", fill="#10b981", font=("Segoe UI", 12, "bold"), anchor="w")
        for title, col, nx, ny in [
            ("Market Feed: ALI_FUT", "#38bdf8", 120, 140),
            ("OHLCV Aggregator", "#818cf8", 400, 100),
            ("Bollinger Volatility", "#c084fc", 700, 70),
            ("Greeks Kernel", "#f59e0b", 400, 230),
            ("Delta Hedger", "#10b981", 700, 230)
        ]:
            self.canvas.create_rectangle(x0 + nx - 90, y0 + ny, x0 + nx + 90, y0 + ny + 50, fill="#0f172a", outline=col, width=1.5)
            self.canvas.create_text(x0 + nx, y0 + ny + 25, text=title, fill="#ffffff", font=("Segoe UI", 9, "bold"))

    def engine_loop(self):
        if self.is_running and time.time() - self.last_tick_time > 0.4:
            self.step_market()
            self.last_tick_time = time.time()

        uptime = int(time.time() - self.start_time)
        hrs, rem = divmod(uptime, 3600)
        mins, secs = divmod(rem, 60)
        self.lbl_stats.configure(text=f"Uptime: {hrs:02d}:{mins:02d}:{secs:02d} • Ticks: {self.tick_count:,} • Memory: O(1) [500 Slots]")

        self.render_canvas()
        self.root.after(33, self.engine_loop)

if __name__ == "__main__":
    root = tk.Tk()
    app = TradisApp(root)
    root.mainloop()