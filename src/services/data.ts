import type { BankData, CarModel } from "../types";
import data from "../data/data.json";

type RawRateRow = Array<string | number | null>;
type RawRateMatrix = RawRateRow[];

interface CreditApiBankData {
  individual: RawRateMatrix;
  legal?: RawRateMatrix;
  preferential_individual_24?: RawRateMatrix;
  preferential_individual_36?: RawRateMatrix;
}

interface CreditApiResponse {
  privatbank: CreditApiBankData;
  oshadbank: CreditApiBankData;
  agricole: CreditApiBankData;
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeMatrix = (matrix?: RawRateMatrix): number[][] => {
  if (!matrix || matrix.length === 0) return [];
  return matrix.map((row) => row.map(toNumber));
};

const splitRatesAndCommission = (matrix?: RawRateMatrix) => {
  const normalized = normalizeMatrix(matrix);
  if (normalized.length === 0) return { rates: [], commission: [] as number[] };
  const commission = normalized[normalized.length - 1] || [];
  const rates = normalized.slice(0, -1);
  return { rates, commission };
};

export const fetchCarData = async (): Promise<CarModel[]> => {
  return data as CarModel[];
};

export const fetchBankData = async (): Promise<BankData> => {
  const response = await fetch("https://stellantis-finance.com.ua/api/credit/peugeot");
  if (!response.ok) {
    throw new Error("Failed to fetch bank data");
  }
  const data = (await response.json()) as CreditApiResponse;

  const privatIndividual = splitRatesAndCommission(data.privatbank.individual);
  const privatLegal = splitRatesAndCommission(data.privatbank.legal);
  const oshadIndividual = splitRatesAndCommission(data.oshadbank.individual);
  const oshadLegal = splitRatesAndCommission(data.oshadbank.legal);
  const agricoleIndividual = splitRatesAndCommission(data.agricole.individual);
  const agricoleLegal = splitRatesAndCommission(data.agricole.legal);

  return {
    privatbank: {
      individual: privatIndividual.rates,
      legal: privatLegal.rates,
      preferential_individual_24: normalizeMatrix(data.privatbank.preferential_individual_24),
      preferential_individual_36: normalizeMatrix(data.privatbank.preferential_individual_36),
      commission: privatIndividual.commission
    },
    oshadbank: {
      individual: oshadIndividual.rates,
      legal: oshadLegal.rates,
      commission: oshadIndividual.commission
    },
    agricole: {
      individual: agricoleIndividual.rates,
      legal: agricoleLegal.rates,
      commission: agricoleIndividual.commission
    }
  };
};
