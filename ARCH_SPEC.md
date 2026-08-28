# RFC / Architecture Spec: Cordis-OxCaml Spatiotemporal Trading Engine (Tradis), Fincor Quant Kernel, and Corplex Complexity Integration

**Issue Links**:
* `Cordis-OxCaml`: [https://github.com/Knjigobot/Cordis-OxCaml/issues/1](https://github.com/Knjigobot/Cordis-OxCaml/issues/1)
* `Tradis`: [https://github.com/Knjigobot/Tradis/issues/1](https://github.com/Knjigobot/Tradis/issues/1)

---

## 1. Core Architectural Pillars & Cordis Meta-Framework

The system is founded upon **Cordis Spatiotemporal Composability** and **OxCaml** (OCaml 5+ with Jane Street modal types, unboxed primitives `#float`, linear/unique types, and algebraic effects `Effect.Deep`).

```
+-------------------------------------------------------------------------------------------------------------------+
|                                            CORDIS-OXCAML ECOSYSTEM                                                |
+-------------------------------------------------------------------------------------------------------------------+
|  TRADIS (Runtime Platform)         |  FINCOR (Quant Kernel)              |  CORPLEX (Complexity & Tracing)       |
|  - 24/7/365 Non-Stop Engine        |  - Black-76 Commodity Greeks        |  - Master Theorem Recurrences         |
|  - LME Commodities Futures Ledger  |  - Bollinger Bands (20, 2.0σ)       |  - Amortized Potential Invariants Φ   |
|  - Multi-Sink Display Multiplexer  |  - Delta-Neutral Dynamic Hedger     |  - Magic-Trace Nanosecond Diagnostics |
|  - Bounded Memory Circular Buffers |  - Martingale Arbitrage Guards      |  - Perfetto Flame Graph Export        |
+------------------------------------+-------------------------------------+---------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------------------------------------------------+
|                                  FORMAL VERIFICATION & INVARIANTS                                                |
|  - Cubical Agda ({-# OPTIONS --cubical #-}): Self-Financing Homotopy Path Equality & Memory Bounds                |
|  - Rzk: Synthetic Simplicial Homotopy Type Theory on Coeffect Manifolds (Δ^1 = 2)                                 |
+-------------------------------------------------------------------------------------------------------------------+
```

---

## 2. The Five Spatiotemporal Theorems (Tradis Invariants)

1. **Theorem 1: Dynamic Spatial Coeffects (`Tradis.Context`)**
   * Market observables (Spot, Level 2 Depth-of-Market, Position Ledgers, Greeks) are organized as a decoupled GADT Manifold.
   * Consumers (displays, trading strategies) attach as passive observers; zero polling is required.

2. **Theorem 2: Strict Temporal Filtration (`Tradis.Engine`)**
   * Discrete event stepping enforces $\Delta t > 0$ with deterministic causality and counterfactual time-travel replayability.

3. **Theorem 3: Bounded Memory Complexity ($O(1)$ Space Bound, `Tradis.RingBuffer`)**
   * Pre-allocated circular ring buffers (500 slots/timeframe) enforce strictly bounded resident memory across multi-year infinite streaming with 0% GC growth.
   * Verified constructively in `formal/TradisInvariant.agda` and amortized in Corplex ($\Phi$ potential).

4. **Theorem 4: Erlang-Style Supervisory Fault Containment (`Tradis.Plugin`)**
   * Fault isolation in pure OxCaml. Unhandled strategy exceptions (e.g. division-by-zero singularities) are caught and automatically quarantined without crashing or stopping the core market engine.

5. **Theorem 5: Conservation of Portfolio Wealth (Self-Financing Invariant)**
   * Every rebalancing operation satisfies $\Delta V_t = \sum \phi_i dS_i + d\text{Cash}_t = 0$.
   * Mechanized in Cubical Agda:
     $$\text{thm-self-financing-invariant} : (p : \text{CommodityPortfolio}) (d : \text{Real}) \to \text{valuation}(\text{rebalance } p\ d) \equiv \text{valuation } p$$

---

## 3. Specialized Commodities Focus (Non-Precious Commodities)

Tradis specializes strictly in industrial and energy commodities futures:

| Symbol | Underlying Contract | Exchange | Lot Size | Tick Size | Tick Value / Lot |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ALI_FUT`** | **LME Primary Aluminium 3M** | LME | **25 Metric Tons** | **$0.50 / MT** | **$12.50** |
| **`COPPER_FUT`** | **LME Grade A Copper** | LME | **25 Metric Tons** | **$0.50 / MT** | **$12.50** |
| **`ZINC_FUT`** | **LME SHG Zinc** | LME | **25 Metric Tons** | **$0.50 / MT** | **$12.50** |
| **`NICKEL_FUT`** | **LME Primary Nickel** | LME | **6 Metric Tons** | **$1.00 / MT** | **$6.00** |
| **`CRUDE_FUT`** | **NYMEX WTI Light Sweet Crude** | NYMEX | **1,000 Barrels** | **$0.01 / BBL** | **$10.00** |

* **Valuation Formula**:
  $$\text{Notional} = |\text{Lots}| \times \text{LotSize}_{\text{MT}} \times \text{SpotPrice}$$
  $$\text{Unrealized PnL} = \text{Lots} \times \text{LotSize}_{\text{MT}} \times (\text{CurrentPrice} - \text{AvgEntryPrice})$$

---

## 4. Multi-Sink Display Multiplexer (Jane Street Bonsai & TUI)

Display sinks subscribe directly to the Cordis Coeffect Manifold and can be hot-swapped at runtime via keys `1`, `2`, `3` with zero state loss:

* **Mode 1 (`[1]`): Bloomberg 3-Pane Workstation**: Left LME DOM Ladder + Center Candlestick/Bollinger Chart + Right Greeks Monitor.
* **Mode 2 (`[2]`): Expanded Full-Width Desktop Canvas**: Sidebars collapse to give 100% full-width to the 65-bar Candlestick chart, EMA 20 overlay, volume histogram, and trade match blotter.
* **Mode 3 (`[3]`): Jane Street Bonsai Incremental DAG Visualizer**: Interactive Directed Acyclic Graph showing node computation topology and sub-millisecond execution telemetry ($< 0.028\text{ms}$).

---

## 5. Corplex Complexity Integration

**Corplex** provides static and dynamic runtime verification:
1. **Magic-Trace Nanosecond Tracing**: Circular buffers recording microsecond latency profiles across market tick iterations.
2. **Amortized Analysis ($\Phi$ Potential)**: Proves that ring buffer push operations operate in $O(1)$ amortized time.
3. **Master Theorem Recurrence Solver**: Validates that multi-timeframe bar aggregation ($M1 \to M5 \to H1 \to D1$) scales deterministically.

---

## 6. Verification and Execution Guide

To build and test the pure OxCaml engines:

```bash
# In Tradis:
dune build
dune runtest
dune exec tradis --watch

# In Corplex:
dune build
dune runtest
dune exec bin/main.exe
```