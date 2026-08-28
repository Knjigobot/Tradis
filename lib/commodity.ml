(* lib/commodity.ml - Industrial & Agricultural Commodities Futures Specification *)

type commodity_id =
  | LME_Aluminium_3M
  | LME_Copper_GradeA
  | LME_Zinc_SHG
  | LME_Nickel_Primary
  | NYMEX_WTI_Crude

type contract_spec = {
  id : commodity_id;
  symbol : string;
  name : string;
  exchange : string;
  lot_size_mt : float;      (* Metric Tons per contract *)
  tick_size : float;        (* Minimum price fluctuation *)
  tick_value : float;       (* USD value per tick per lot *)
  currency : string;
  initial_margin_per_lot : float;
}

let spec_of_id = function
  | LME_Aluminium_3M -> {
      id = LME_Aluminium_3M;
      symbol = "ALI_FUT";
      name = "LME Primary Aluminium 3M Futures";
      exchange = "LME";
      lot_size_mt = 25.0;     (* 25 Metric Tons *)
      tick_size = 0.50;       (* $0.50 / MT *)
      tick_value = 12.50;     (* 25 MT * $0.50 = $12.50 *)
      currency = "USD";
      initial_margin_per_lot = 3250.00;
    }
  | LME_Copper_GradeA -> {
      id = LME_Copper_GradeA;
      symbol = "COPPER_FUT";
      name = "LME Grade A Copper Futures";
      exchange = "LME";
      lot_size_mt = 25.0;
      tick_size = 0.50;
      tick_value = 12.50;
      currency = "USD";
      initial_margin_per_lot = 5200.00;
    }
  | LME_Zinc_SHG -> {
      id = LME_Zinc_SHG;
      symbol = "ZINC_FUT";
      name = "LME Special High Grade Zinc";
      exchange = "LME";
      lot_size_mt = 25.0;
      tick_size = 0.50;
      tick_value = 12.50;
      currency = "USD";
      initial_margin_per_lot = 3100.00;
    }
  | LME_Nickel_Primary -> {
      id = LME_Nickel_Primary;
      symbol = "NICKEL_FUT";
      name = "LME Primary Nickel Futures";
      exchange = "LME";
      lot_size_mt = 6.0;      (* 6 Metric Tons *)
      tick_size = 1.00;
      tick_value = 6.00;
      currency = "USD";
      initial_margin_per_lot = 6200.00;
    }
  | NYMEX_WTI_Crude -> {
      id = NYMEX_WTI_Crude;
      symbol = "CRUDE_FUT";
      name = "WTI Crude Oil Futures";
      exchange = "NYMEX";
      lot_size_mt = 1000.0;   (* 1,000 Barrels *)
      tick_size = 0.01;
      tick_value = 10.00;
      currency = "USD";
      initial_margin_per_lot = 4500.00;
    }

let calculate_notional_value (spec : contract_spec) ~(lots : float) ~(price_per_unit : float) : float =
  abs_float lots *. spec.lot_size_mt *. price_per_unit

let calculate_pnl (spec : contract_spec) ~(lots : float) ~(entry_price : float) ~(exit_price : float) : float =
  lots *. spec.lot_size_mt *. (exit_price -. entry_price)