(* lib/bonsai_ui.ml - Jane Street Bonsai Reactive Incremental Desktop Component Tree *)

open Types
open Context
open Vdom

module BonsaiDashboard = struct
  let render_workspace (ctx : (module CONTEXT)) : vnode =
    let (module C) = ctx in
    let spot = match C.get (LatestTick "ALI_FUT") with Some t -> t.last_price | None -> 2624.50 in
    let pos_opt = C.get (CurrentPosition "ALI_FUT") in
    let pos_lots = match pos_opt with Some p -> p.lots | None -> -2.0 in
    let pnl = match pos_opt with Some p -> p.unrealized_pnl | None -> -50.0 in

    (* Top Navigation Bar *)
    let header_node = Element {
      tag = "header";
      attrs = [Class "h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-white"];
      children = [
        Element {
          tag = "div";
          attrs = [Class "flex items-center space-x-3"];
          children = [
            Element { tag = "span"; attrs = [Class "font-bold text-base"]; children = [Text "TRADIS CORDIS-OXCAML"] };
            Element { tag = "span"; attrs = [Class "text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono"]; children = [Text "COMMODITIES KERNEL"] };
            Element { tag = "span"; attrs = [Class "text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono"]; children = [Text "LME/COMEX"] };
          ];
        };
        Element {
          tag = "div";
          attrs = [Class "flex items-center space-x-4 text-xs text-slate-400 font-mono"];
          children = [
            Element { tag = "span"; attrs = []; children = [Text (Printf.sprintf "Spot: $%.2f/MT" spot)] };
            Element { tag = "span"; attrs = []; children = [Text (Printf.sprintf "Position: %.2f lots" pos_lots)] };
            Element { tag = "span"; attrs = [Class (if pnl >= 0.0 then "text-emerald-400 font-bold" else "text-rose-400 font-bold")];
                      children = [Text (Printf.sprintf "PnL: %s$%.2f" (if pnl >= 0.0 then "+" else "") pnl)] };
          ];
        };
      ];
    } in

    (* Depth of Market Ladder *)
    let dom_node = Element {
      tag = "div";
      attrs = [Class "p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 font-mono text-xs"];
      children = [
        Element { tag = "div"; attrs = [Class "font-bold text-slate-400 uppercase text-[11px] mb-2"]; children = [Text "LME Depth of Market (DOM)"] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-rose-400 bg-rose-500/10 p-1 rounded"]; children = [Text (Printf.sprintf "$%.2f" (spot +. 1.00)); Text "100 MT (4 lots)"] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-rose-400 bg-rose-500/10 p-1 rounded"]; children = [Text (Printf.sprintf "$%.2f" (spot +. 0.50)); Text "50 MT (2 lots)"] };
        Element { tag = "div"; attrs = [Class "text-center font-bold text-sky-400 py-1 bg-slate-950/80 rounded border border-slate-800"]; children = [Text (Printf.sprintf "MID: $%.2f/MT" spot)] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-emerald-400 bg-emerald-500/10 p-1 rounded"]; children = [Text (Printf.sprintf "$%.2f" (spot -. 0.50)); Text "50 MT (2 lots)"] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-emerald-400 bg-emerald-500/10 p-1 rounded"]; children = [Text (Printf.sprintf "$%.2f" (spot -. 1.00)); Text "100 MT (4 lots)"] };
      ];
    } in

    (* Fincor Greeks Card *)
    let greeks_node = Element {
      tag = "div";
      attrs = [Class "p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 font-mono text-xs"];
      children = [
        Element { tag = "div"; attrs = [Class "font-bold text-indigo-400 uppercase text-[11px]"]; children = [Text "Fincor Greeks & Risk Monitor (Black-76)"] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-slate-300"]; children = [Text "Delta (Δ):"; Element { tag = "strong"; attrs = [Class "text-emerald-400"]; children = [Text "0.5240"] }] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-slate-300"]; children = [Text "Gamma (Γ):"; Element { tag = "strong"; attrs = [Class "text-sky-400"]; children = [Text "0.0018"] }] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-slate-300"]; children = [Text "Vega (ν):"; Element { tag = "strong"; attrs = [Class "text-amber-400"]; children = [Text "4.82"] }] };
        Element { tag = "div"; attrs = [Class "flex justify-between text-slate-300"]; children = [Text "Theta (Θ):"; Element { tag = "strong"; attrs = [Class "text-rose-400"]; children = [Text "-1.24"] }] };
      ];
    } in

    (* Main Master Layout *)
    Element {
      tag = "div";
      attrs = [Class "h-screen bg-slate-950 flex flex-col font-sans select-none"];
      children = [
        header_node;
        Element {
          tag = "div";
          attrs = [Class "flex-1 flex p-3 space-x-3 overflow-hidden"];
          children = [
            Element { tag = "div"; attrs = [Class "w-72 space-y-3"]; children = [dom_node; greeks_node] };
            Element { tag = "div"; attrs = [Class "flex-1 flex flex-col space-y-3"]; children = [
              Element { tag = "div"; attrs = [Class "flex-1 bg-slate-900 rounded-lg border border-slate-800 p-2"]; children = [Text "Candlestick Chart Canvas Active"] }
            ] };
          ];
        };
      ];
    }
end