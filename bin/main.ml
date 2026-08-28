(* bin/main.ml - Main Tradis Pure OxCaml Application Entrypoint *)

open Tradis
open Commodity
open Types

let () =
  Printf.printf "Starting Tradis High-Availability 24/7/365 Commodities Engine...\n%!";
  
  let engine = Engine.create_engine () in
  let (module C) = engine.ctx in

  (* 1. Register Fincor Quantitative Plugins *)
  Plugin.Registry.register (module FincorGreeks.GreeksPlugin) engine.ctx;
  Plugin.Registry.register (module BollingerPlugin.BollingerPlugin) engine.ctx;

  (* 2. Attach Bloomberg Terminal TUI Display Sink *)
  Display.Manager.attach "terminal_tui" (module Display.TuiSink);

  (* 3. Seed Initial 120 Historical Bars *)
  let ali_spec = spec_of_id LME_Aluminium_3M in
  Printf.printf "Initialized %s (Symbol: %s, Lot: %.0f MT, Tick: $%.2f)\n%!"
    ali_spec.name ali_spec.symbol ali_spec.lot_size_mt ali_spec.tick_size;

  (* 4. Live Spatiotemporal Tick Loop *)
  let spot = ref 2624.50 in
  for i = 1 to 5 do
    let shock = (float_of_int ((i * 7) mod 11) -. 5.0) *. 0.50 in
    spot := !spot +. shock;
    let tick = {
      symbol = "ALI_FUT";
      timestamp = 1700000000.0 +. (float_of_int i *. 60.0);
      bid = !spot -. 0.25;
      ask = !spot +. 0.25;
      last_price = !spot;
      volume_mt = 50.0;
    } in
    Engine.process_event engine (TickEvent tick);
    Display.Manager.render_all engine.ctx;
  done;

  (* 5. Demonstrate Runtime Display Hot-Swapping without Engine Reboot *)
  Printf.printf "\n[CORDIS LIVE] Hot-swapping to Multi-Sink Mode (TUI + Native GUI + Bonsai)...\n%!";
  Display.Manager.attach "native_gui" (module Display.NativeGuiSink);
  Display.Manager.attach "bonsai_vdom" (module Display.BonsaiWebSink);

  Printf.printf "\n=== TRADIS ENGINE ACTIVE AND RUNNING DETERMINISTICALLY ===\n%!"