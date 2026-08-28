(* lib/plugin.ml - Hot-Swappable Plugin Subsystem with Fault Isolation *)

open Types
open Context

module type PLUGIN = sig
  val id : string
  val name : string
  val version : string
  val on_init : (module CONTEXT) -> unit
  val on_event : (module CONTEXT) -> system_event -> command list
  val on_shutdown : (module CONTEXT) -> unit
end

type plugin_status =
  | Active
  | Disabled
  | Quarantined of { reason : string; timestamp : float }

type plugin_entry = {
  plugin_module : (module PLUGIN);
  id : string;
  name : string;
  version : string;
  mutable status : plugin_status;
  mutable error_count : int;
  mutable processed_events : int;
}

module Registry = struct
  let plugins : (string, plugin_entry) Hashtbl.t = Hashtbl.create 32

  let register (m : (module PLUGIN)) (ctx : (module CONTEXT)) : unit =
    let (module P) = m in
    (try P.on_init ctx with _ -> ());
    let entry = {
      plugin_module = m;
      id = P.id;
      name = P.name;
      version = P.version;
      status = Active;
      error_count = 0;
      processed_events = 0;
    } in
    Hashtbl.replace plugins P.id entry

  let unregister (plugin_id : string) (ctx : (module CONTEXT)) : unit =
    match Hashtbl.find_opt plugins plugin_id with
    | Some entry ->
      let (module P) = entry.plugin_module in
      (try P.on_shutdown ctx with _ -> ());
      Hashtbl.remove plugins plugin_id
    | None -> ()

  let hot_reload (m : (module PLUGIN)) (ctx : (module CONTEXT)) : unit =
    let (module P) = m in
    unregister P.id ctx;
    register m ctx

  let enable (plugin_id : string) : bool =
    match Hashtbl.find_opt plugins plugin_id with
    | Some entry -> entry.status <- Active; true
    | None -> false

  let disable (plugin_id : string) : bool =
    match Hashtbl.find_opt plugins plugin_id with
    | Some entry -> entry.status <- Disabled; true
    | None -> false

  let get_status (plugin_id : string) : plugin_status option =
    match Hashtbl.find_opt plugins plugin_id with
    | Some entry -> Some entry.status
    | None -> None

  let list_plugins () : (string * string * string * plugin_status) list =
    Hashtbl.fold (fun _ entry acc ->
      (entry.id, entry.name, entry.version, entry.status) :: acc
    ) plugins []

  (* Fault-Isolated Event Dispatcher: Never throws or crashes the engine *)
  let dispatch_event (ctx : (module CONTEXT)) (ev : system_event) (current_time : float) : command list =
    let all_commands = ref [] in
    Hashtbl.iter (fun _ entry ->
      match entry.status with
      | Active ->
        let (module P) = entry.plugin_module in
        (try
           let cmds = P.on_event ctx ev in
           entry.processed_events <- entry.processed_events + 1;
           all_commands := List.rev_append cmds !all_commands
         with exn ->
           entry.error_count <- entry.error_count + 1;
           let err_msg = Printexc.to_string exn in
           entry.status <- Quarantined { reason = err_msg; timestamp = current_time };
           let alert_cmd = LogMessage (Error, Printf.sprintf ""[PLUGIN QUARANTINED] %s (id: %s) failed: %s"" entry.name entry.id err_msg) in
           all_commands := alert_cmd :: !all_commands)
      | Disabled | Quarantined _ -> ()
    ) plugins;
    List.rev !all_commands
end
