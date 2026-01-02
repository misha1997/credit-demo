export interface CarModel {
  MODEL_NAME: string;
  FULL_MODEL_CODE: string;
  BODY_LABEL: string;
  GRADE_LABLE: string;
  PRICE: number;
  YEAR: number;
  EGINE_LABEL: string;
  TRANSMISSION: string;
  FUEL_TYPE: string;
  PHOTO_LINK: string;
}

export interface BankRateMatrix {
  individual: number[][]; // [advanceIndex][termIndex]
  legal: number[][];
  preferential_individual_24?: number[][]; // For privat
  preferential_individual_36?: number[][]; // For privat
  commission: number[]; // [termIndex] - Simplified
}

export interface BankData {
  privatbank: BankRateMatrix;
  oshadbank: BankRateMatrix;
  agricole: BankRateMatrix;
}

export const ClientType = {
  Individual: 1,
  Legal: 2,
} as const;

export type ClientType = typeof ClientType[keyof typeof ClientType];

export const RepaymentType = {
  Classic: 1,
  Annuity: 2,
} as const;

export type RepaymentType = typeof RepaymentType[keyof typeof RepaymentType];

export interface CalculationResult {
  monthlyPayment: number;
  initialCost: number;
  bankName: string;
  visible: boolean;
  rate: number;
}
