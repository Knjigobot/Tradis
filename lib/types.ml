(* lib/types.ml - Core Trading Engine Types *)

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
  volume : float;
}

type bar = {
  symbol : symbol;
  timeframe : timeframe;
  open_time : float;
  open_p : float;
  high_p : float;
  low_p : float;
  close_p : float;
  volume : float;
}

type order_direction = Buy | Sell

type order_type =
  | Market
  | Limit of float
  | Stop of float

type order_status =
  | Pending
  | Active
  | Filled of { fill_price : float; fill_time : float }
  | Canceled of string
  | Rejected of string

type order = {
  id : string;
  symbol : symbol;
  direction : order_direction;
  order_type : order_type;
  qty : float;
  mutable status : order_status;
  created_time : float;
}

type position = {
  symbol : symbol;
  mutable qty : float;
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
  | ModifyPosition of symbol * float
  | LogMessage of [ Info | Warn | Error ] * string
  | NotifyPlugin of string * string
