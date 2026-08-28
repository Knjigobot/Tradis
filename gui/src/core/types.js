/**
 * Tradis Core: Commodities Futures Contract Specifications
 * Specializing in Industrial & Agricultural Commodities (Excl. Gold & Silver)
 */
export const COMMODITY_SPECS = {
  'ALI_FUT': {
    symbol: 'ALI_FUT',
    name: 'LME Aluminium 3M Futures',
    exchange: 'LME',
    lotSizeMT: 25, // 25 Metric Tons per contract
    tickSize: 0.50, // $0.50 per MT ($12.50 per lot)
    currency: 'USD',
    unit: 'USD/MT',
    basePrice: 2624.50,
    initialMarginPerLot: 3250.00
  },
  'COPPER_FUT': {
    symbol: 'COPPER_FUT',
    name: 'LME Grade A Copper Futures',
    exchange: 'LME',
    lotSizeMT: 25,
    tickSize: 0.50,
    currency: 'USD',
    unit: 'USD/MT',
    basePrice: 9480.00,
    initialMarginPerLot: 5200.00
  },
  'ZINC_FUT': {
    symbol: 'ZINC_FUT',
    name: 'LME Special High Grade Zinc',
    exchange: 'LME',
    lotSizeMT: 25,
    tickSize: 0.50,
    currency: 'USD',
    unit: 'USD/MT',
    basePrice: 2890.00,
    initialMarginPerLot: 3100.00
  },
  'NICKEL_FUT': {
    symbol: 'NICKEL_FUT',
    name: 'LME Primary Nickel Futures',
    exchange: 'LME',
    lotSizeMT: 6,
    tickSize: 1.00,
    currency: 'USD',
    unit: 'USD/MT',
    basePrice: 16850.00,
    initialMarginPerLot: 6200.00
  },
  'CRUDE_FUT': {
    symbol: 'CRUDE_FUT',
    name: 'WTI Crude Oil Futures',
    exchange: 'NYMEX',
    lotSizeMT: 1000, // Barrels
    tickSize: 0.01,
    currency: 'USD',
    unit: 'USD/BBL',
    basePrice: 78.50,
    initialMarginPerLot: 4500.00
  }
};