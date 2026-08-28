(* lib/bollinger_plugin.ml - Fincor Bollinger Bands Volatility Plugin for Tradis *)

open Types
open Context
open Plugin

module BollingerPlugin : PLUGIN = struct
  let id = "fincor_bollinger_bands"
  let name = "Fincor Commodity Bollinger Bands (20, 2.0)"
  let version = "1.0.0"

  let period = 20
  let k = 2.0

  let on_init (_ctx : (module CONTEXT)) : unit =
    Printf.printf "[FINCOR BOLLINGER] Initialized Bollinger Bands Plugin (N=%d, K=%.1f)\n%!" period k

  let on_event (ctx : (module CONTEXT)) (ev : system_event) : command list =
    match ev with
    | TickEvent t when t.symbol = "ALI_FUT" || t.symbol = "TEST_ASSET" ->
      let (module C) = ctx in
      let key = (t.symbol, M1) in
      if C.has (BarHistory key) then (
        let rb = C.get (BarHistory key) in
        let bars = Ring_buffer.to_list rb in
        let len = List.length bars in
        if len >= period then (
          let recent_bars = List.filteri (fun i _ -> i >= len - period) bars in
          let prices = Array.of_list (List.map (fun (b : bar) -> b.close_p) recent_bars) in
          match Fincor.BollingerBands.compute_bands ~period ~k prices with
          | Some bands ->
            let spot = t.last_price in
            if spot >= bands.upper then
              [ LogMessage (`Warn, Printf.sprintf "[BOLLINGER] Spot $%.2f pierced Upper Band ($%.2f) - Overbought" spot bands.upper) ]
            else if spot <= bands.lower then
              [ LogMessage (`Warn, Printf.sprintf "[BOLLINGER] Spot $%.2f pierced Lower Band ($%.2f) - Oversold" spot bands.lower) ]
            else []
          | None -> []
        ) else []
      ) else []
    | _ -> []

  let on_shutdown (_ctx : (module CONTEXT)) : unit =
    Printf.printf "[FINCOR BOLLINGER] Shutdown Bollinger Bands Plugin cleanly.\n%!"
end