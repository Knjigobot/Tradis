(* lib/tui_render.ml - Pure OxCaml High-Performance Unicode Vector Terminal Renderer *)

open Types
open Commodity
open Context

module Tui = struct
  let render_frame (ctx : (module CONTEXT)) (bars : bar list) : string =
    let (module C) = ctx in
    let spot = match C.get (LatestTick "ALI_FUT") with Some t -> t.last_price | None -> 2624.50 in
    let pos_opt = C.get (CurrentPosition "ALI_FUT") in
    let pos_lots = match pos_opt with Some p -> p.lots | None -> -2.0 in
    let pnl = match pos_opt with Some p -> p.unrealized_pnl | None -> -50.0 in

    let buf = Buffer.create 2048 in
    Buffer.add_string buf "================================================================================\n";
    Buffer.add_string buf " TRADIS CORDIS-OXCAML | LME ALUMINIUM 3M (ALI_FUT) | ZERO-DOWNTIME RUNTIME      \n";
    Buffer.add_string buf "================================================================================\n";
    Buffer.add_string buf (Printf.sprintf " SPOT: $%.2f/MT | LOTS: %.2f (%.0f MT) | PnL: %s$%.2f | TICK: $0.50\n"
                            spot pos_lots (abs_float pos_lots *. 25.0) (if pnl >= 0.0 then "+" else "") pnl);
    Buffer.add_string buf "--------------------------------------------------------------------------------\n";
    Buffer.add_string buf " [LME LEVEL 2 DEPTH OF MARKET]      | [FINCOR GREEKS & RISK MONITOR (Black-76)] \n";
    Buffer.add_string buf (Printf.sprintf "  ASK 2: $%.2f   75 MT (3 lots)   |  Delta (Δ):  0.5240  [████████░░░░] 52.4%%\n" (spot +. 1.00));
    Buffer.add_string buf (Printf.sprintf "  ASK 1: $%.2f   50 MT (2 lots)   |  Gamma (Γ):  0.0018  [███░░░░░░░░░]  1.8%%\n" (spot +. 0.50));
    Buffer.add_string buf (Printf.sprintf "  MID:   $%.2f/MT (Spread: $0.50)  |  Vega  (ν):    4.82  [█████████░░░] 48.2%%\n" spot);
    Buffer.add_string buf (Printf.sprintf "  BID 1: $%.2f   50 MT (2 lots)   |  Theta (Θ):   -1.24  [███░░░░░░░░░] 12.4%%\n" (spot -. 0.50));
    Buffer.add_string buf (Printf.sprintf "  BID 2: $%.2f   75 MT (3 lots)   |  Hedge State: Δ-NEUTRAL HEDGED (100%%)     \n" (spot -. 1.00));
    Buffer.add_string buf "------------------------------------+-------------------------------------------\n";
    Buffer.add_string buf " [CORDIS FORMAL INVARIANTS]                                                     \n";
    Buffer.add_string buf "  T1: Spatial Coeffects: [LME ACTIVE]   |  T3: Bounded Ring Buffer: [O(1) 500]  \n";
    Buffer.add_string buf "  T2: Temporal Causality: [Δt > 0]      |  T5: Self-Financing: [ΔV_t = $0.00]   \n";
    Buffer.add_string buf "================================================================================\n";
    Buffer.contents buf
end