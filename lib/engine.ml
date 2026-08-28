(* lib/engine.ml - Cordis Continuous Non-Stop Spatiotemporal Trading Engine *)

open Effect
open Effect.Deep
open Types
open Context

type _ Effect.t +=
  | Dispatch_Command : command -> unit Effect.t
  | Trigger_Event : system_event -> unit Effect.t

type engine_state = {
  ctx : (module CONTEXT);
  mutable is_running : bool;
  mutable tick_count : int;
  mutable order_seq : int;
  orders : (string, order) Hashtbl.t;
  positions : (symbol, position) Hashtbl.t;
  accounts : (string, account) Hashtbl.t;
  bar_builders : (symbol * timeframe, bar ref) Hashtbl.t;
}

let create_engine () =
  let ctx = InMemoryContext.create () in
  let (module C) = ctx in
  let default_acc = {
    id = ""DEFAULT"";
    balance = 100_000.0;
    equity = 100_000.0;
    margin_used = 0.0;
    free_margin = 100_000.0;
    leverage = 100.0;
  } in
  C.set (ActiveAccount ""DEFAULT"") (Some default_acc);
  let accounts = Hashtbl.create 8 in
  Hashtbl.add accounts ""DEFAULT"" default_acc;
  {
    ctx;
    is_running = true;
    tick_count = 0;
    order_seq = 0;
    orders = Hashtbl.create 256;
    positions = Hashtbl.create 64;
    accounts;
    bar_builders = Hashtbl.create 32;
  }

(* Mark-to-market position updates *)
let update_positions_on_tick (state : engine_state) (t : tick) : unit =
  let (module C) = state.ctx in
  match Hashtbl.find_opt state.positions t.symbol with
  | Some pos when pos.qty <> 0.0 ->
    let current_price = if pos.qty > 0.0 then t.bid else t.ask in
    pos.unrealized_pnl <- pos.qty *. (current_price -. pos.avg_entry_price);
    C.set (CurrentPosition t.symbol) (Some pos)
  | _ -> ()

(* Bounded Timeframe Bar Builder *)
let update_bars_on_tick (state : engine_state) (t : tick) : bar option list =
  let (module C) = state.ctx in
  let completed_bars = ref [] in
  let timeframes = [ M1; M5; H1; D1 ] in
  
  List.iter (fun tf ->
    let tf_sec = timeframe_to_seconds tf in
    let bar_start = floor (t.timestamp /. tf_sec) *. tf_sec in
    let key = (t.symbol, tf) in
    
    (* Ensure ring buffer exists *)
    if not (C.has (BarHistory key)) then (
      let rb = Ring_buffer.create 500 in
      C.set (BarHistory key) rb
    );
    let rb = C.get (BarHistory key) in
    
    match Hashtbl.find_opt state.bar_builders key with
    | Some current_bar_ref ->
      let b = !current_bar_ref in
      if b.open_time = bar_start then (
        (* Update current bar *)
        b.high_p <- max b.high_p t.last_price;
        b.low_p <- min b.low_p t.last_price;
        b.close_p <- t.last_price;
        b.volume <- b.volume +. t.volume
      ) else (
        (* Bar completed! Push to bounded ring buffer *)
        Ring_buffer.push rb b;
        completed_bars := b :: !completed_bars;
        (* Start new bar *)
        current_bar_ref := {
          symbol = t.symbol;
          timeframe = tf;
          open_time = bar_start;
          open_p = t.last_price;
          high_p = t.last_price;
          low_p = t.last_price;
          close_p = t.last_price;
          volume = t.volume;
        }
      )
    | None ->
      let new_bar = {
        symbol = t.symbol;
        timeframe = tf;
        open_time = bar_start;
        open_p = t.last_price;
        high_p = t.last_price;
        low_p = t.last_price;
        close_p = t.last_price;
        volume = t.volume;
      } in
      Hashtbl.add state.bar_builders key (ref new_bar)
  ) timeframes;
  !completed_bars

(* Order Execution & Fill Simulation *)
let execute_order (state : engine_state) (ord : order) (exec_price : float) (exec_time : float) : unit =
  let (module C) = state.ctx in
  ord.status <- Filled { fill_price = exec_price; fill_time = exec_time };
  let signed_qty = match ord.direction with Buy -> ord.qty | Sell -> -. ord.qty in
  
  let pos = match Hashtbl.find_opt state.positions ord.symbol with
    | Some p -> p
    | None ->
      let p = { symbol = ord.symbol; qty = 0.0; avg_entry_price = exec_price; unrealized_pnl = 0.0 } in
      Hashtbl.add state.positions ord.symbol p;
      p
  in
  
  if pos.qty = 0.0 then (
    pos.qty <- signed_qty;
    pos.avg_entry_price <- exec_price
  ) else if (pos.qty > 0.0 && signed_qty > 0.0) || (pos.qty < 0.0 && signed_qty < 0.0) then (
    let total_cost = (pos.qty *. pos.avg_entry_price) +. (signed_qty *. exec_price) in
    pos.qty <- pos.qty +. signed_qty;
    pos.avg_entry_price <- total_cost /. pos.qty
  ) else (
    (* Closing or reversing position *)
    pos.qty <- pos.qty +. signed_qty
  );
  C.set (CurrentPosition ord.symbol) (Some pos)

(* Command Handler *)
let handle_command (state : engine_state) (cmd : command) : unit =
  match cmd with
  | SubmitOrder ord ->
    state.order_seq <- state.order_seq + 1;
    Hashtbl.replace state.orders ord.id ord;
    let (module C) = state.ctx in
    (match C.get (LatestTick ord.symbol) with
     | Some t ->
       let exec_p = match ord.direction with Buy -> t.ask | Sell -> t.bid in
       execute_order state ord exec_p t.timestamp
     | None -> ord.status <- Active)
  | CancelOrder id ->
    (match Hashtbl.find_opt state.orders id with
     | Some ord -> ord.status <- Canceled ""Canceled by runtime request""
     | None -> ())
  | ModifyPosition (sym, target_qty) ->
    let (module C) = state.ctx in
    (match C.get (LatestTick sym) with
     | Some t ->
       let pos_opt = C.get (CurrentPosition sym) in
       let current_qty = match pos_opt with Some p -> p.qty | None -> 0.0 in
       let diff = target_qty -. current_qty in
       if abs_float diff > 1e-6 then (
         let dir = if diff > 0.0 then Buy else Sell in
         let ord = {
           id = Printf.sprintf ""REBAL_%s_%d"" sym state.order_seq;
           symbol = sym;
           direction = dir;
           order_type = Market;
           qty = abs_float diff;
           status = Pending;
           created_time = t.timestamp;
         } in
         state.order_seq <- state.order_seq + 1;
         let exec_p = match dir with Buy -> t.ask | Sell -> t.bid in
         execute_order state ord exec_p t.timestamp
       )
     | None -> ())
  | LogMessage (level, msg) ->
    let prefix = match level with Info -> ""[INFO]"" | Warn -> ""[WARN]"" | Error -> ""[ERROR]"" in
    Printf.printf ""%s %s\n%s"" prefix msg (flush_all (); """")
  | NotifyPlugin _ -> ()

(* Main Non-Stop Event Dispatcher with Cordis Algebraic Effects *)
let process_event (state : engine_state) (ev : system_event) : unit =
  let (module C) = state.ctx in
  let current_time = match ev with
    | TickEvent t -> t.timestamp
    | BarEvent b -> b.open_time
    | OrderUpdate o -> o.created_time
    | TimerHeartbeat t -> t
    | _ -> 0.0
  in
  
  (* 1. Spatial context update *)
  (match ev with
   | TickEvent t ->
     state.tick_count <- state.tick_count + 1;
     C.set (LatestTick t.symbol) (Some t);
     update_positions_on_tick state t;
     let completed_bars = update_bars_on_tick state t in
     List.iter (fun b ->
       let cmds = Plugin.Registry.dispatch_event state.ctx (BarEvent b) b.open_time in
       List.iter (handle_command state) cmds
     ) completed_bars
   | _ -> ());
  
  (* 2. Dispatch to plugins and execute resulting commands *)
  let commands = Plugin.Registry.dispatch_event state.ctx ev current_time in
  List.iter (handle_command state) commands

let run_event_loop (state : engine_state) (event_stream : unit -> system_event option) : unit =
  try_with (fun () ->
    let rec loop () =
      if state.is_running then
        match event_stream () with
        | Some ev ->
          process_event state ev;
          loop ()
        | None -> ()
    in
    loop ()
  ) ()
  { effc = (fun (type c) (eff : c Effect.t) ->
      match eff with
      | Dispatch_Command cmd -> Some (fun (k : (c, _) continuation) ->
          handle_command state cmd;
          continue k ())
      | Trigger_Event ev -> Some (fun (k : (c, _) continuation) ->
          process_event state ev;
          continue k ())
      | _ -> None) }
