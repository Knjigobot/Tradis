(* lib/types.ml - Core Trading Types with GADT Order Lifecycles *)

open Commodity

type symbol = string

type timeframe =
  | M1
  | M5
  | M15
  | H1
  | H4
  | D1

let timeframe_to_seconds = function
  | M1 -> 60.0
  | M5 -> 300.0
  | M15 -> 900.0
  | H1 -> 3600.0
  | H4 -> 14400.0
  | D1 -> 86400.0

type tick = {
  symbol : symbol;
  timestamp : float;
  bid : float;
  ask : float;
  last_price : float;
  volume_mt : float;
}

type bar = {
  symbol : symbol;
  timeframe : timeframe;
  open_time : float;
  open_p : float;
  high_p : float;
  low_p : float;
  close_p : float;
  volume_mt : float;
}

type order_direction = Buy | Sell

type order_type =
  | Market
  | Limit of float
  | Stop of float

(* GADT Order State Machine: Making invalid lifecycle transitions unrepresentable *)
type pending = Pending
type active  = Active
type filled  = Filled
type canceled = Canceled

type _ order_state =
  | New : pending order_state
  | Submitted : { broker_id : int; time : float } -> active order_state
  | PartFilled : { filled_lots : float; remaining_lots : float } -> active order_state
  | Done : { fill_price : float; total_lots : float; fill_time : float } -> filled order_state
  | Expired : { reason : string } -> canceled order_state
  | Rejected : { reason : string } -> canceled order_state

type order = {
  id : string;
  symbol : symbol;
  direction : order_direction;
  order_type : order_type;
  lots : float;
  mutable status_str : string;
  created_time : float;
}

type position = {
  symbol : symbol;
  spec : contract_spec;
  mutable lots : float;
  mutable avg_entry_price : float;
  mutable unrealized_pnl : float;
}

type account = {
  id : string;
  mutable balance : float;
  mutable equity : float;
  mutable margin_used : float;
  mutable free_margin : float;
  leverage : float;
}

type system_event =
  | TickEvent of tick
  | BarEvent of bar
  | OrderUpdate of order
  | AccountUpdate of account
  | TimerHeartbeat of float
  | CustomEvent of string * string

type command =
  | SubmitOrder of order
  | CancelOrder of string
  | ModifyPosition of symbol * float (* target lots *)
  | LogMessage of [ `Info | `Warn | `Error ] * string
  | NotifyPlugin of string * string