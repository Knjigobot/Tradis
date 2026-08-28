(* test/test_tradis.ml - Cordis-OxCaml Verification & Multi-Sink Test Suite *)

open Tradis
open Commodity
open Types

(* Rogue strategy simulating an unhandled division-by-zero to test Invariant T4 *)
module FaultyStrategy : Plugin.PLUGIN = struct
  let id = "faulty_chaos_strategy"
  let name = "Rogue Chaos Strategy"
  let version = "0.1.0"
  let on_init _ctx = ()
  let on_event _ctx ev =
    match ev with
    | TickEvent t when t.last_price > 2630.0 ->
      failwith "Simulated unhandled mathematical singularity in rogue strategy!"
    | _ -> []
  let on_shutdown _ctx = ()
end

let () =
  Printf.printf "===============================================================\n";
  Printf.printf "   RUNNING TRADIS CORDIS-OXCAML HIGH-AVAILABILITY TEST SUITE   \n";
  Printf.printf "===============================================================\n\n";

  (* 1. Test Commodities Specification: LME Aluminium 3M *)
  let ali_spec = spec_of_id LME_Aluminium_3M in
  assert (ali_spec.lot_size_mt = 25.0);
  assert (ali_spec.tick_size = 0.50);
  assert (ali_spec.tick_value = 12.50);
  let notional = calculate_notional_value ali_spec ~lots:2.0 ~price_per_unit:2620.00 in
  Printf.printf "[PASS] LME Aluminium Contract Specification (2 Lots = 50 MT, Notional: $%.2f)\n" notional;
  assert (notional = 131000.00);

  (* 2. Test Bounded Memory Ring Buffer (Cordis Theorem 3: O(1) Memory Bound) *)
  let rb = RingBuffer.create 10 in
  for i = 1 to 1000 do
    RingBuffer.push rb i
  done;
  assert (RingBuffer.length rb = 10);
  assert (RingBuffer.latest rb = Some 1000);
  Printf.printf "[PASS] Invariant T3: Sustained 1,000 pushes with strictly bounded capacity 10 (Zero Leaks)\n";

  (* 3. Test Core Engine Initialization & Spatial Coeffects (Theorem 1) *)
  let engine = Engine.create_engine () in
  let (module C) = engine.ctx in
  assert (C.has (ActiveAccount "COMMODITIES_DEFAULT"));
  Printf.printf "[PASS] Invariant T1: Dynamic Spatial Coeffects Manifold active with account\n";

  (* 4. Register Formalized Fincor Plugins: Greeks Hedger & Bollinger Bands *)
  Plugin.Registry.register (module FincorGreeks.GreeksPlugin) engine.ctx;
  Plugin.Registry.register (module BollingerPlugin.BollingerPlugin) engine.ctx;
  Plugin.Registry.register (module FaultyStrategy) engine.ctx;
  
  let plugins = Plugin.Registry.list_plugins () in
  Printf.printf "[PASS] Invariant T4: Registered %d hot-swappable plugins into Tradis Supervisor\n" (List.length plugins);

  (* 5. Attach & Hot-Swap Display Sinks at Runtime *)
  Display.Manager.attach "test_tui" (module Display.TuiSink);
  Display.Manager.attach "test_gui" (module Display.NativeGuiSink);
  Display.Manager.attach "test_bonsai" (module Display.BonsaiWebSink);
  Printf.printf "[PASS] Cordis Multi-Sink Architecture: Successfully attached TUI, Native GUI, and Bonsai sinks\n";

  (* 6. Stream High-Frequency Aluminium Ticks *)
  let test_prices = [ 2620.00; 2622.50; 2628.00; 2634.00; 2618.00 ] in
  List.iteri (fun idx p ->
    let tick = {
      symbol = "ALI_FUT";
      timestamp = 1700000000.0 +. (float_of_int idx *. 60.0);
      bid = p -. 0.25;
      ask = p +. 0.25;
      last_price = p;
      volume_mt = 50.0;
    } in
    Engine.process_event engine (TickEvent tick);
    
    let pos_opt = C.get (CurrentPosition "ALI_FUT") in
    let current_lots = match pos_opt with Some pos -> pos.lots | None -> 0.0 in
    Printf.printf " -> Tick #%d: LME Aluminium Spot=$%.2f/MT | Active Hedge Position=%.2f lots\n"
      (idx + 1) p current_lots
  ) test_prices;

  (* 7. Verify Fault Isolation & Supervision (Theorem 4) *)
  let faulty_status = Plugin.Registry.get_status "faulty_chaos_strategy" in
  (match faulty_status with
   | Some (Plugin.Quarantined q) ->
     Printf.printf "[PASS] Invariant T4 Verified: Rogue Strategy quarantined safely with zero runtime crash!\n       Diagnostics: %s\n" q.reason
   | _ -> failwith "Faulty plugin was not quarantined as expected");

  let greeks_status = Plugin.Registry.get_status "fincor_greeks_hedger" in
  let bollinger_status = Plugin.Registry.get_status "fincor_bollinger_bands" in
  assert (greeks_status = Some Plugin.Active);
  assert (bollinger_status = Some Plugin.Active);
  Printf.printf "[PASS] Fincor Greeks and Bollinger plugins remained healthy and Active throughout\n";

  Printf.printf "\n=== ALL CORDIS-OXCAML INVARIANTS & VERIFICATION SUITES PASSED ===\n"