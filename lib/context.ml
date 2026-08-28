(* lib/context.ml - Spatial Coeffect Context for Tradis Runtime (Cordis Theorem 1) *)

open Types

type _ key =
  | LatestTick : symbol -> tick option key
  | BarHistory : symbol * timeframe -> bar Ring_buffer.t key
  | CurrentPosition : symbol -> position option key
  | ActiveAccount : string -> account option key
  | Arbitrary : string -> 'a key

module type CONTEXT = sig
  val get : 'a key -> 'a
  val has : 'a key -> bool
  val set : 'a key -> 'a -> unit
  val with_binding : 'a key -> 'a -> (unit -> 'b) -> 'b
end

module InMemoryContext : sig
  include CONTEXT
  val create : unit -> (module CONTEXT)
  val clear : unit -> unit
end = struct
  type entry = Entry : 'a key * 'a ref -> entry
  let registry : entry list ref = ref []

  let rec find_entry : type a. a key -> entry list -> a ref option =
    fun target entries ->
      match entries with
      | [] -> None
      | Entry (k, v_ref) :: rest ->
        match (target, k) with
        | LatestTick s1, LatestTick s2 when s1 = s2 -> Some (Obj.magic v_ref)
        | BarHistory (s1, tf1), BarHistory (s2, tf2) when s1 = s2 && tf1 = tf2 -> Some (Obj.magic v_ref)
        | CurrentPosition s1, CurrentPosition s2 when s1 = s2 -> Some (Obj.magic v_ref)
        | ActiveAccount a1, ActiveAccount a2 when a1 = a2 -> Some (Obj.magic v_ref)
        | Arbitrary id1, Arbitrary id2 when id1 = id2 -> Some (Obj.magic v_ref)
        | _ -> find_entry target rest

  let get : type a. a key -> a =
    fun k ->
      match find_entry k !registry with
      | Some v_ref -> !v_ref
      | None ->
        match k with
        | LatestTick _ -> (None : a)
        | CurrentPosition _ -> (None : a)
        | ActiveAccount _ -> (None : a)
        | BarHistory _ -> failwith "BarHistory not initialized in context"
        | Arbitrary name -> failwith ("Arbitrary key '" ^ name ^ "' not found in context")

  let has : type a. a key -> bool =
    fun k ->
      match find_entry k !registry with
      | Some _ -> true
      | None -> false

  let set : type a. a key -> a -> unit =
    fun k v ->
      match find_entry k !registry with
      | Some v_ref -> v_ref := v
      | None -> registry := Entry (k, ref v) :: !registry

  let with_binding : type a b. a key -> a -> (unit -> b) -> b =
    fun k v f ->
      let prev_entry = find_entry k !registry in
      let prev_val = match prev_entry with Some r -> Some !r | None -> None in
      set k v;
      Fun.protect ~finally:(fun () ->
        match prev_val with
        | Some pv -> set k pv
        | None -> ()
      ) f

  let clear () = registry := []

  let create () = (module struct
    let get = get
    let has = has
    let set = set
    let with_binding = with_binding
  end : CONTEXT)
end