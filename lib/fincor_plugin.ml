(* lib/fincor_plugin.ml - Fincor Formalized Quantitative & Greeks Plugin for Tradis *)

open Types
open Context
open Plugin

module GreeksPlugin : PLUGIN = struct
  let id = ""fincor_greeks_hedger""
  let name = ""Fincor Greeks Delta-Neutral Hedging Engine""
  let version = ""1.0.0""

  let strike = 100.0
  let maturity = 1.0
  let r = 0.05
  let sigma = 0.20
  let target_contract_qty = 10.0 (* Long 10 call options *)

  let on_init (_ctx : (module CONTEXT)) : unit =
    Printf.printf ""[FINCOR PLUGIN] Initialized Greeks Delta Hedger (K=%.1f, T=%.1f, vol=%.1f%%)\n"" strike maturity (sigma *. 100.0)

  let on_event (ctx : (module CONTEXT)) (ev : system_event) : command list =
    match ev with
    | TickEvent t when t.symbol = ""EUR_USD"" || t.symbol = ""TEST_ASSET"" ->
      let spot = t.last_price in
      
      (* 1. Calculate Analytical Black-Scholes Delta *)
      let d1 = (log (spot /. strike) +. (r +. 0.5 *. sigma *. sigma) *. maturity) /. (sigma *. sqrt maturity) in
      let delta_per_contract = 0.5 *. (1.0 +. Float.erf (d1 /. sqrt 2.0)) in
      let total_portfolio_delta = target_contract_qty *. delta_per_contract in
      
      (* 2. Inquire current underlying stock/asset position in Tradis *)
      let (module C) = ctx in
      let current_pos_opt = C.get (CurrentPosition t.symbol) in
      let current_stock_qty = match current_pos_opt with Some p -> p.qty | None -> 0.0 in
      
      (* 3. Delta-neutral condition: Target hedge = - total_portfolio_delta *)
      let desired_stock_qty = -. total_portfolio_delta in
      let delta_discrepancy = desired_stock_qty -. current_stock_qty in
      
      if abs_float delta_discrepancy >= 0.1 then (
        let dir = if delta_discrepancy > 0.0 then Buy else Sell in
        let rebal_order = {
          id = Printf.sprintf ""DELTA_HEDGE_%d"" (int_of_float (t.timestamp *. 1000.0));
          symbol = t.symbol;
          direction = dir;
          order_type = Market;
          qty = abs_float delta_discrepancy;
          status = Pending;
          created_time = t.timestamp;
        } in
        [
          LogMessage (Info, Printf.sprintf ""[FINCOR GREEKS] Spot=%.2f | Opt Delta=%.4f | Portfolio ?=%.4f | Rebal Ord: %s %.2f""
                        spot delta_per_contract total_portfolio_delta (match dir with Buy -> ""BUY"" | Sell -> ""SELL"") (abs_float delta_discrepancy));
          SubmitOrder rebal_order;
        ]
      ) else []
      
    | _ -> []

  let on_shutdown (_ctx : (module CONTEXT)) : unit =
    Printf.printf ""[FINCOR PLUGIN] Shutdown Greeks Plugin cleanly.\n""
end
