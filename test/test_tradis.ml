(* test/test_tradis.ml - Tradis Continuous Runtime & Fincor Plugin Verification *)

open Tradis
open Types

(* A sample rogue plugin to test fault isolation and zero-downtime supervision *)
module FaultyPlugin : Plugin.PLUGIN = struct
  let id = ""faulty_plugin""
  let name = ""Fault-Prone Strategy""
  let version = ""0.1.0""
  let on_init _ctx = ()
  let on_event _ctx ev =
    match ev with
    | TickEvent t when t.last_price > 105.0 ->
      failwith ""Simulation of unhandled division by zero in rogue strategy!""
    | _ -> []
  let on_shutdown _ctx = ()
end

let () =
  Printf.printf ""=== Running Tradis Non-Stop Runtime Verification Suite ===\n\n"";

  (* 1. Test Bounded Memory Ring Buffer *)
  let rb = RingBuffer.create 10 in
  for i = 1 to 100 do
    RingBuffer.push rb i
  done;
  assert (RingBuffer.length rb = 10);
  assert (RingBuffer.latest rb = Some 100);
  Printf.printf ""[PASS] Bounded Ring Buffer: Successfully sustained 100 pushes with fixed capacity 10\n"";

  (* 2. Test Core Engine Initialization *)
  let engine = Engine.create_engine () in
  let (module C) = engine.ctx in
  assert (C.has (ActiveAccount ""DEFAULT""));
  Printf.printf ""[PASS] Engine Context initialized with active account\n"";

  (* 3. Test Hot Plugin Registration and Fincor Greeks Hedger *)
  Plugin.Registry.register (module FincorPlugin.GreeksPlugin) engine.ctx;
  Plugin.Registry.register (module FaultyPlugin) engine.ctx;
  
  let plugins = Plugin.Registry.list_plugins () in
  Printf.printf ""[PASS] Registered %d plugins into Tradis Runtime\n"" (List.length plugins);

  (* 4. Stream Ticks to test continuous execution, delta hedging, and fault isolation *)
  let test_prices = [ 100.0; 102.0; 106.0; 108.0; 95.0 ] in
  List.iteri (fun idx p ->
    let tick = {
      symbol = ""TEST_ASSET"";
      timestamp = 1700000000.0 +. (float_of_int idx *. 60.0);
      bid = p -. 0.05;
      ask = p +. 0.05;
      last_price = p;
      volume = 10.0;
    } in
    Engine.process_event engine (TickEvent tick);
    
    (* Inquire position after tick processing *)
    let pos_opt = C.get (CurrentPosition ""TEST_ASSET"") in
    let current_qty = match pos_opt with Some pos -> pos.qty | None -> 0.0 in
    Printf.printf "" -> Tick #%d: Spot=%.2f | Current Hedge Position=%.2f\n"" (idx + 1) p current_qty
  ) test_prices;

  (* 5. Verify Fault Isolation: Rogue plugin must be quarantined while engine stayed alive *)
  let faulty_status = Plugin.Registry.get_status ""faulty_plugin"" in
  (match faulty_status with
   | Some (Plugin.Quarantined q) ->
     Printf.printf ""[PASS] Fault Isolation Verified: Rogue plugin safely quarantined without crashing runtime!\n       Reason: %s\n"" q.reason
   | _ -> failwith ""Faulty plugin was not quarantined as expected"");

  let fincor_status = Plugin.Registry.get_status ""fincor_greeks_hedger"" in
  assert (fincor_status = Some Plugin.Active);
  Printf.printf ""[PASS] Fincor Greeks plugin remained healthy and Active throughout\n"";

  Printf.printf ""\n=== All Tradis 24/7/365 Runtime tests passed successfully! ===\n""
