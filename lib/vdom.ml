(* lib/vdom.ml - Pure OxCaml Virtual DOM & Vector Graphics Engine (Jane Street Paradigm) *)

open Types
open Commodity

type attr =
  | Attr of string * string
  | Style of (string * string) list
  | Class of string

type vnode =
  | Text of string
  | Element of {
      tag : string;
      attrs : attr list;
      children : vnode list;
    }
  | SvgElement of {
      tag : string;
      attrs : (string * string) list;
      children : vnode list;
    }

(* Pure OxCaml Visual Vector Candlestick & Bollinger Chart Builder *)
module Chart = struct
  let render_svg_candlestick_chart
      ~(bars : bar list)
      ~(bb_data : (float * float * float) option list)
      ~(width : int)
      ~(height : int) : vnode =
    
    let right_margin = 75 in
    let chart_w = width - right_margin in
    let n = List.length bars in
    if n = 0 then Element { tag = "div"; attrs = [Class "empty"]; children = [Text "No Market Data"] }
    else
      let bar_w = float_of_int chart_w /. float_of_int (max 1 n) in
      
      (* Determine Min/Max Price Bounds *)
      let min_p = ref max_float in
      let max_p = ref min_float in
      
      List.iter (fun (b : bar) ->
        if b.low_p < !min_p then min_p := b.low_p;
        if b.high_p > !max_p then max_p := b.high_p
      ) bars;
      
      List.iter (function
        | Some (lower, _, upper) ->
          if lower < !min_p then min_p := lower;
          if upper > !max_p then max_p := upper
        | None -> ()
      ) bb_data;
      
      let pad = max 1.5 ((!max_p -. !min_p) *. 0.12) in
      let min_p = !min_p -. pad in
      let max_p = !max_p +. pad in
      let p_range = max 1.0 (max_p -. min_p) in
      let h_f = float_of_int height in
      
      let price_to_y p =
        h_f -. (((p -. min_p) /. p_range) *. h_f)
      in
      
      (* 1. Grid Lines *)
      let grid_lines = ref [] in
      for i = 1 to 5 do
        let y = (h_f /. 6.0) *. float_of_int i in
        let p_val = max_p -. ((float_of_int i /. 6.0) *. p_range) in
        grid_lines := SvgElement {
          tag = "line";
          attrs = [
            ("x1", "0"); ("y1", Printf.sprintf "%.1f" y);
            ("x2", string_of_int chart_w); ("y2", Printf.sprintf "%.1f" y);
            ("stroke", "#1e293b"); ("stroke-dasharray", "3,3");
          ];
          children = [];
        } :: SvgElement {
          tag = "text";
          attrs = [
            ("x", Printf.sprintf "%d" (chart_w + 8));
            ("y", Printf.sprintf "%.1f" (y +. 4.0));
            ("fill", "#64748b"); ("font-size", "10px"); ("font-family", "monospace");
          ];
          children = [Text (Printf.sprintf "$%.2f" p_val)];
        } :: !grid_lines
      done;
      
      (* 2. Bollinger Bands Polygon *)
      let bb_elements = ref [] in
      let upper_pts = ref [] in
      let lower_pts = ref [] in
      let mid_pts = ref [] in
      
      List.iteri (fun idx bb_opt ->
        let bx = (float_of_int idx *. bar_w) +. (bar_w /. 2.0) in
        match bb_opt with
        | Some (lower, mid, upper) ->
          let uy = price_to_y upper in
          let ly = price_to_y lower in
          let my = price_to_y mid in
          upper_pts := (bx, uy) :: !upper_pts;
          lower_pts := (bx, ly) :: !lower_pts;
          mid_pts := (bx, my) :: !mid_pts
        | None -> ()
      ) bb_data;
      
      let upper_pts = List.rev !upper_pts in
      let lower_pts = List.rev !lower_pts in
      let mid_pts = List.rev !mid_pts in
      
      if List.length upper_pts > 1 then (
        let poly_str =
          let u_str = String.concat " " (List.map (fun (x, y) -> Printf.sprintf "%.1f,%.1f" x y) upper_pts) in
          let l_str = String.concat " " (List.map (fun (x, y) -> Printf.sprintf "%.1f,%.1f" x y) (List.rev lower_pts)) in
          u_str ^ " " ^ l_str
        in
        bb_elements := SvgElement {
          tag = "polygon";
          attrs = [("points", poly_str); ("fill", "rgba(168, 85, 247, 0.12)"); ("stroke", "none")];
          children = [];
        } :: !bb_elements
      );
      
      (* 3. Candlesticks (Bodies & Wicks) *)
      let candle_elements = ref [] in
      List.iteri (fun idx (b : bar) ->
        let bx = (float_of_int idx *. bar_w) +. (bar_w /. 2.0) in
        let oy = price_to_y b.open_p in
        let cy = price_to_y b.close_p in
        let hy = price_to_y b.high_p in
        let ly = price_to_y b.low_p in
        
        let is_up = b.close_p >= b.open_p in
        let color = if is_up then "#10b981" else "#f43f5e" in
        
        (* Wick *)
        let wick = SvgElement {
          tag = "line";
          attrs = [
            ("x1", Printf.sprintf "%.1f" bx); ("y1", Printf.sprintf "%.1f" hy);
            ("x2", Printf.sprintf "%.1f" bx); ("y2", Printf.sprintf "%.1f" ly);
            ("stroke", color); ("stroke-width", "1.2");
          ];
          children = [];
        } in
        
        (* Body *)
        let top_y = min oy cy in
        let body_h = max 2.0 (abs_float (cy -. oy)) in
        let half_w = bar_w *. 0.35 in
        let body = SvgElement {
          tag = "rect";
          attrs = [
            ("x", Printf.sprintf "%.1f" (bx -. half_w));
            ("y", Printf.sprintf "%.1f" top_y);
            ("width", Printf.sprintf "%.1f" (half_w *. 2.0));
            ("height", Printf.sprintf "%.1f" body_h);
            ("fill", color);
          ];
          children = [];
        } in
        candle_elements := body :: wick :: !candle_elements
      ) bars;
      
      SvgElement {
        tag = "svg";
        attrs = [
          ("width", string_of_int width);
          ("height", string_of_int height);
          ("viewBox", Printf.sprintf "0 0 %d %d" width height);
          ("style", "background-color: #0b1120; border-radius: 8px;");
        ];
        children = List.concat [ List.rev !grid_lines; List.rev !bb_elements; List.rev !candle_elements ];
      }
end