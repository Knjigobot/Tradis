(* lib/fincor_plugin.ml - Fincor Formalized Greeks Delta-Neutral Hedging Plugin for Tradis *)

open Types
open Context
open Plugin

module GreeksPlugin : PLUGIN = struct
  let id = "fincor_greeks_hedger"
  let name = "Fincor Aluminium Commodity Options Greeks Hedger"
  let version = "1.0.0"

  let strike = 2620.00 (* $2,620/MT Aluminium Option *)
  let maturity = 0.25  (* 3-month option *)
  let r = 0.045        (* 4.5% rate *)
  let sigma = 0.22     (* 22% Volatility *)
  let target_option_lots = 5.0 (* Long 5 Option Contracts (125 MT) *)

  let on_init (_ctx : (module CONTEXT)) : unit =
    Printf.printf "[FINCOR PLUGIN] Initialized Aluminium Greeks Hedger (K=%.2f, T=%.2f, vol=%.1f%%)\n%!"
      strike maturity (sigma *. 100.0)

  let on_event (ctx : (module CONTEXT)) (ev : system_event) : command list =
    match ev with
    | TickEvent t when t.symbol = "ALI_FUT" || t.symbol = "TEST_ASSET" ->
      let spot = t.last_price in
      
      (* 1. Black-76 Commodity Options Analytical Delta *)
      let d1 = (log (spot /. strike) +. (0.5 *. sigma *. sigma) *. maturity) /. (sigma *. sqrt maturity) in
      let delta_per_lot = exp (-. r *. maturity) *. (0.5 *. (1.0 +. Float.erf (d1 /. sqrt 2.0))) in
      let total_portfolio_delta_lots = target_option_lots *. delta_per_lot in
      
      (* 2. Query current underlying futures position in Tradis *)
      let (module C) = ctx in
      let current_pos_opt = C.get (CurrentPosition t.symbol) in
      let current_futures_lots = match current_pos_opt with Some p -> p.lots | None -> 0.0 in
      
      (* 3. Delta-neutral condition: Target hedge = - total_portfolio_delta_lots *)
      let desired_hedge_lots = -. total_portfolio_delta_lots in
      let delta_discrepancy = desired_hedge_lots -. current_futures_lots in
      
      if abs_float delta_discrepancy >= 0.20 then (
        let dir = if delta_discrepancy > 0.0 then Buy else Sell in
        let rebal_order = {
          id = Printf.sprintf "DELTA_HEDGE_%d" (int_of_float (t.timestamp *. 1000.0));
          symbol = t.symbol;
          direction = dir;
          order_type = Market;
          lots = abs_float delta_discrepancy;
          status_str = "PENDING";
          created_time = t.timestamp;
        } in
        [
          LogMessage (`Info, Printf.sprintf "[FINCOR GREEKS] Spot=$%.2f/MT | Delta=%.4f | Target Hedge=%.2f lots | Rebal: %s %.2f lots"
                        spot delta_per_lot desired_hedge_lots (match dir with Buy -> "BUY" | Sell -> "SELL") (abs_float delta_discrepancy));
          SubmitOrder rebal_order;
        ]
      ) else []
      
    | _ -> []

  let on_shutdown (_ctx : (module CONTEXT)) : unit =
    Printf.printf "[FINCOR PLUGIN] Shutdown Aluminium Greeks Plugin cleanly.\n%!"
end