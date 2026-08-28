# Tradis: Cordis-Style 24/7/365 High-Availability Trading Runtime in OxCaml

**Tradis** is a resilient, zero-reboot trading engine runtime built on the **Cordis meta-framework paradigm** (Spatiotemporal Composability) and **OxCaml** (unboxed primitives, bounded memory footprints, and algebraic effects). 

It is engineered to run continuously for months/years without restarts or memory leaks while dynamically hot-loading, upgrading, and isolating trading plugins (such as **Fincor** quantitative Greeks & risk models).

---

## ?? Architecture & Philosophy

`
+-----------------------------------------------------------------------------------------------+
|                                      TRADIS RUNTIME                                           |
+-----------------------------------------------------------------------------------------------+
|  SPATIAL SUBSYSTEM (Context Manifold)         |  TEMPORAL SUBSYSTEM (Algebraic Effects)       |
|  - GADT Market Keys (Tick, Position, Account) |  - Continuous Heartbeat & Tick Event Stream   |
|  - Zero-Copy Dynamic Observable Coeffects     |  - Multi-Timeframe Bounded Bar Aggregator     |
|  - Reversible History & Time-Series Buffers   |  - Deterministic Event Causality              |
+-----------------------------------------------------------------------------------------------+
|  HOT-SWAPPABLE PLUGIN REGISTRY & SUPERVISOR (Erlang/OTP Fault Isolation in Pure OxCaml)       |
|  - Dynamic Register / Unregister / Hot-Reload at runtime without engine downtime              |
|  - Rogue strategy exception sandboxing & automated quarantine (Zero Engine Crashes)           |
+-----------------------------------------------------------------------------------------------+
                                                ¦
                                                ?
+-----------------------------------------------------------------------------------------------+
|                     FINCOR FORMALIZED QUANTITATIVE & GREEKS PLUGINS                           |
|  - Real-time Black-Scholes & Monte Carlo Greeks (Delta, Gamma, Vega, Theta)                   |
|  - Automated dynamic delta-neutral hedging order emission                                     |
|  - Arbitrage-free Martingale invariant verification                                           |
+-----------------------------------------------------------------------------------------------+
`

---

## ? Key Pillars for Zero-Downtime Multi-Year Operation

### 1. Bounded Memory Lifecycles (Zero Leaks / Zero GC Pressure)
Traditional event-driven engines suffer from memory bloat over billions of ticks. Tradis guarantees (1)$ memory consumption via pre-allocated, fixed-capacity circular ring buffers (Tradis.RingBuffer) across all tick streams and multi-timeframe OHLCV bar series (M1, M5, H1, D1).

### 2. Hot-Swappable Plugins (Add/Update Without Restarts)
Trading strategies, indicator calculators, risk checks, and mathematical models are encapsulated as first-class Tradis.Plugin.PLUGIN modules. You can:
- **Register** new strategies at runtime.
- **Hot-Reload** modified models with zero tick drops.
- **Disable/Enable** plugins instantaneously via the registry.

### 3. Fault Isolation & Supervisor Sandboxing
If a rogue strategy throws an unhandled exception (e.g., division by zero, null lookups, assert failures), the Tradis supervisor:
1. Intercepts the failure at the effect handler level.
2. Quarantines the faulty plugin and records diagnostic logs.
3. Continues processing market ticks for all other strategies uninterrupted.

### 4. Direct Bridge to Fincor Formalized Plugins
Tradis natively interfaces with the **Fincor** quantitative kernel:
- Feeds spatial market observables into Fincor.Market.CONTEXT.
- Computes analytical and Monte Carlo Greeks ($\Delta, \Gamma, \nu, \Theta, \rho$).
- Emits delta-neutral rebalancing orders to maintain portfolio invariants.

---

## ?? Directory Structure

`
Tradis/
+-- dune-project
+-- tradis.opam
+-- README.md
+-- lib/
¦   +-- dune
¦   +-- types.ml           (* Ticks, Bars, Orders, Positions, Events & Commands *)
¦   +-- ring_buffer.ml     (* Bounded circular memory buffers for infinite streams *)
¦   +-- context.ml         (* Cordis Spatial Coeffect GADT Manifold *)
¦   +-- plugin.ml          (* Hot-swappable supervisor with fault isolation *)
¦   +-- engine.ml          (* Cordis non-stop spatiotemporal runtime loop *)
¦   +-- fincor_plugin.ml   (* Fincor Greeks & delta-neutral hedging plugin *)
¦   +-- tradis.ml          (* Top-level public interface *)
+-- test/
    +-- dune
    +-- test_tradis.ml     (* Continuous runtime & supervision test suite *)
`

---

## ?? Building & Testing

`ash
dune build
dune runtest
`

## ?? License
MIT License
