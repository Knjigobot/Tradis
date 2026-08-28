(* lib/ring_buffer.ml - Bounded Memory Ring Buffer for Non-Stop Operation *)

type 'a t = {
  buffer : 'a option array;
  capacity : int;
  mutable head : int;
  mutable count : int;
}

let create capacity =
  if capacity <= 0 then invalid_arg ""RingBuffer capacity must be positive"";
  {
    buffer = Array.make capacity None;
    capacity;
    head = 0;
    count = 0;
  }

let push (rb : 'a t) (item : 'a) : unit =
  rb.buffer.(rb.head) <- Some item;
  rb.head <- (rb.head + 1) mod rb.capacity;
  if rb.count < rb.capacity then rb.count <- rb.count + 1

let length (rb : 'a t) : int = rb.count

let capacity (rb : 'a t) : int = rb.capacity

let is_full (rb : 'a t) : bool = rb.count = rb.capacity

let latest (rb : 'a t) : 'a option =
  if rb.count = 0 then None
  else
    let idx = (rb.head - 1 + rb.capacity) mod rb.capacity in
    rb.buffer.(idx)

let to_list (rb : 'a t) : 'a list =
  let result = ref [] in
  for i = 0 to rb.count - 1 do
    let idx = (rb.head - 1 - i + rb.capacity) mod rb.capacity in
    match rb.buffer.(idx) with
    | Some v -> result := v :: !result
    | None -> ()
  done;
  List.rev !result
