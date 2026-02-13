export type AssetType = 
  | "listed_equity_stt" 
  | "listed_security_other"
  | "land_building"
  | "other_capital_asset"
  | "specified_mutual_fund_50aa"
  | "market_linked_debenture_50aa"
  | "unlisted_bond_debenture_50aa"
  | "virtual_digital_asset";

export interface TaxComputeRequest {
  asset_type: AssetType;
  acquired_date: string;
  sold_date: string;
  purchase_value: number;
  sale_value: number;
  transfer_expenses: number;
  stt_paid?: boolean;
  fmv_31jan2018?: number;
  other_112a_ltcg_in_same_fy?: number;
  basic_exemption_remaining?: number;
  marginal_rate?: number;
  surcharge_rate?: number;
  cess_rate?: number;
  improvement_cost?: number;
  improvement_date?: string;
  resident_individual_or_huf?: boolean;
}

export interface TaxCore {
  classification: string;
  holding_days: number;
  holding_period_rule: string;
  taxable_gain: number;
  base_rate: number;
  methodology: string;
  notes: string[];
  earliest_ltcg_date?: string;
}

export interface TaxScenarioRow {
  label: string;
  sale_value: number;
  gain: number;
  total_tax: number;
  post_tax_proceeds: number;
}

export interface TaxComputeResponse extends TaxCore {
  run_id: string;
  asset_type: AssetType;
  gain: number;
  base_tax: number;
  surcharge: number;
  cess: number;
  total_tax: number;
  post_tax_proceeds: number;
  scenario_rows: TaxScenarioRow[];
  tax_if_sold_on_earliest_ltcg_date?: number | null;
  tax_saving_if_wait?: number | null;
}