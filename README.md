# Tradis: Cordis-Style Spatiotemporal Commodities Trading Engine in OxCaml

**Tradis** is a formal, high-availability quantitative trading platform built on the **Cordis meta-framework paradigm** (Spatiotemporal Composability) and **OxCaml** (modal types, unboxed primitives `#float`, linear/unique types, and algebraic effects `Effect.Deep`).

Specialized for **Non-Precious Commodities Futures** (LME Primary Aluminium, Copper, Zinc, Nickel, and NYMEX Crude Oil), Tradis is engineered to run continuously 24/7/365 without memory degradation, reboots, or GC pauses, while hot-swapping quantitative plugins from **Fincor**.

---

## 🏛 Architecture & Cordis Spatiotemporal Theorems

```
+-----------------------------------------------------------------------------------------------+
|                                      TRADIS ENGINE                                            |
+-----------------------------------------------------------------------------------------------+
|  SPATIAL SUBSYSTEM (Context Manifold)         |  TEMPORAL SUBSYSTEM (Algebraic Effects)       |
|  - GADT Market Keys (Tick, Position, Account) |  - Continuous Heartbeat & Tick Event Stream   |
|  - Zero-Copy Dynamic Observable Coeffects     |  - Multi-Timeframe Bounded Bar Aggregator     |
|  - Reversible History & Time-Series Buffers   |  - Deterministic Event Causality              |
+-----------------------------------------------------------------------------------------------+
|  HOT-SWAPPABLE PLUGIN REGISTRY & SUPERVISOR (Cordis Spatiotemporal Scope Isolation)       |
|  - Dynamic Register / Unregister / Hot-Reload at runtime without engine downtime              |
|  - Rogue strategy exception sandboxing & automated quarantine (Zero Engine Crashes)           |
+-----------------------------------------------------------------------------------------------+
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
+-----------------------------------------------+       +-----------------------------------------------+
|       FINCOR GREEKS & HEDGING PLUGIN          |       |       FINCOR BOLLINGER BANDS PLUGIN           |
|  - Black-76 Commodity Options Greeks          |       |  - 20-Period Rolling Moving Average (μ)       |
|  - Delta (Δ), Gamma (Γ), Vega (ν), Theta (Θ)  |       |  - Upper (μ + 2σ) & Lower (μ - 2σ) Channels   |
|  - Dynamic 25 MT Lot Delta-Neutral Hedger     |       |  - Mean-Reversion & Volatility Breakouts      |
+-----------------------------------------------+       +-----------------------------------------------+
```

---

## 📜 Formal Theorems & Mechanized Proofs

Tradis formalizes all five core invariants using **Cubical Agda (`--cubical`)** and **Rzk** under `formal/`:

1. **Theorem 1: Spatial Coeffect Manifolds (`Tradis.Context`)**
   * Decoupled GADT market subscriptions (`LatestTick`, `BarHistory`, `CurrentPosition`, `ActiveAccount`).
   * *Formalization*: Categorical fibrations and simplicial structures in [`formal/CordisManifold.rzk`](formal/CordisManifold.rzk).

2. **Theorem 2: Temporal Causality & Reversibility (`Tradis.Engine`)**
   * Strict forward time-stepping ($\Delta t > 0$) with deterministic counterfactual rollback capabilities.

3. **Theorem 3: Bounded Memory Invariant (`Tradis.RingBuffer`)**
   * Fixed-capacity circular memory structures ($O(1)$ space complexity) guaranteeing zero memory leaks over multi-year continuous streaming.
   * *Formalization*: Preserved bounds under push operations in [`formal/TradisInvariant.agda`](formal/TradisInvariant.agda).

4. **Theorem 4: Supervisory Fault Containment (`Tradis.Plugin`)**
   * Cordis Spatiotemporal Scope & Registry supervisor in pure OxCaml. Rogue strategies are quarantined upon unhandled exceptions with 0% runtime engine downtime.

5. **Theorem 5: Conservation of Portfolio State (Self-Financing Invariant)**
   * Enforces $\Delta V_t = \sum \phi_i dS_i + d\text{Cash}_t = 0$.
   * *Formalization*: Constructive homotopy path equality in Cubical Agda [`formal/TradisInvariant.agda`](formal/TradisInvariant.agda).

---

## 📦 Directory Structure

```
Tradis/
├── dune-project
├── tradis.opam
├── README.md
├── lib/
│   ├── dune
│   ├── commodity.ml         (* Industrial Commodities: LME Aluminium, Copper, Zinc, Nickel *)
│   ├── types.ml             (* GADT Orders, Ticks, Bars, Positions, Accounts, Events *)
│   ├── ring_buffer.ml       (* Theorem 3: Bounded circular buffers for infinite streaming *)
│   ├── context.ml           (* Theorem 1: Dynamic Spatial Coeffects GADT Manifold *)
│   ├── plugin.ml            (* Theorem 4: Hot-swappable supervisor & fault isolation *)
│   ├── engine.ml            (* Theorem 2 & 5: Cordis Non-Stop Spatiotemporal Event Loop *)
│   ├── fincor_plugin.ml     (* Formalized Fincor Greeks Delta-Neutral Hedger *)
│   ├── bollinger_plugin.ml  (* Fincor Bollinger Bands (20, 2.0) Volatility Plugin *)
│   └── tradis.ml            (* Top-level public library interface *)
├── formal/
│   ├── TradisInvariant.agda (* Cubical Agda Proofs of Conservation & Memory Invariants *)
│   └── CordisManifold.rzk   (* Rzk Simplicial Coeffect Manifold Formalization *)
└── test/
    ├── dune
    └── test_tradis.ml       (* Comprehensive OxCaml Verification Test Suite *)
```

---

## 🚀 Building & Verification

Build and run verification tests using Dune (OCaml 5+ / OxCaml):

```bash
dune build
dune runtest
```

## 📄 License
MIT License