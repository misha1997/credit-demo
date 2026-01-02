import { useState, useEffect, useCallback, useMemo } from 'react';
import CustomSelect from './components/CustomSelect';
import Offers from './components/Offers';
import { fetchBankData, fetchCarData } from './services/data';
import { type BankData, type CalculationResult, type CarModel, ClientType, RepaymentType } from './types';

// Constants
const MIN_LOAN_TERM = 12;
const MAX_LOAN_TERM_INDIVIDUAL = 84;
const MAX_LOAN_TERM_LEGAL = 60;
const ADVANCE_MIN_INDIVIDUAL = 20;
const ADVANCE_MIN_LEGAL = 30;

function App() {
  // State
  const [loading, setLoading] = useState(true);
  const [bankData, setBankData] = useState<BankData | null>(null);
  const [cars, setCars] = useState<CarModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [selectedCardPrice, setSelectedCardPrice] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  // Calculator Inputs
  const [priceAdjustment, setPriceAdjustment] = useState<number>(0); // Range slider
  const [loanTerm, setLoanTerm] = useState<number>(12);
  const [advancePercent, setAdvancePercent] = useState<number>(30);
  const [clientType, setClientType] = useState<ClientType>(ClientType.Individual);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>(RepaymentType.Classic);

  // Results
  const [calculationResults, setCalculationResults] = useState<Record<string, CalculationResult>>({});
  const [cardItems, setCardItems] = useState<unknown[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Computed Values
  const availableModels = useMemo(() => Array.from(new Set(cars.map(c => c.MODEL_NAME))), [cars]);

  const currentModelCars = useMemo(() =>
    cars.filter(c => c.MODEL_NAME === selectedModel),
    [cars, selectedModel]);

  const selectedCar = useMemo(() =>
    cars.find(c => c.FULL_MODEL_CODE === selectedOptionId) || cars[0],
    [cars, selectedOptionId]);

  const displayedPrice = useMemo(() => {
    const basePrice = selectedCardPrice ?? (selectedCar ? selectedCar.PRICE : 0);
    return basePrice + priceAdjustment;
  }, [selectedCardPrice, selectedCar, priceAdjustment]);

  const advanceAmount = useMemo(() =>
    Math.round(displayedPrice * (advancePercent / 100)),
    [displayedPrice, advancePercent]);

  const carsByVariant = useMemo(() => {
    const map = new Map<string, CarModel>();
    cars.forEach((car) => {
      map.set(car.FULL_MODEL_CODE, car);
    });
    return map;
  }, [cars]);

  const pickValue = <T,>(item: any, keys: string[], fallback: T): T => {
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null) return item[key] as T;
    }
    return fallback;
  };

  const parseNumber = (value: string | number, fallback: number) => {
    if (typeof value === 'number') return value;
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const resolveModelName = (value: string) => {
    if (!value) return value;
    const match = availableModels.find((model) => model.toLowerCase() === value.toLowerCase());
    return match || value;
  };

  const buildPhotoUrl = (value: string) => {
    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/app/')) return `https://carsapi.peugeot.ua${value}`;
    return `https://carsapi.peugeot.ua/app/${value}`;
  };

  const buildCardMeta = (item: any, index: number) => {
    const variantCode = pickValue<string>(item, ['FULL_MODEL_CODE', 'VariantCode', 'variantCode', 'variant_code'], '');
    const fallbackCar = carsByVariant.get(variantCode) || selectedCar || currentModelCars[0];
    const rawModelName = pickValue<string>(item, ['MODEL_NAME', 'ModelName', 'modelName', 'model'], fallbackCar?.MODEL_NAME || '');
    const modelName = resolveModelName(rawModelName);
    const gradeLabel = pickValue<string>(item, ['GRADE_LABLE', 'GradeLabel', 'gradeLabel', 'complect'], fallbackCar?.GRADE_LABLE || '');
    const engineLabel = pickValue<string>(item, ['EGINE_LABEL', 'EngineLabel', 'engineLabel', 'property1'], fallbackCar?.EGINE_LABEL || '');
    const transmission = pickValue<string>(item, ['TRANSMISSION', 'Transmission', 'transmission', 'property2', 'filter_transmission'], fallbackCar?.TRANSMISSION || '');
    const fuelType = pickValue<string>(item, ['FUEL_TYPE', 'FuelType', 'fuelType', 'property3', 'palevo'], fallbackCar?.FUEL_TYPE || '');
    const status = pickValue<string>(item, ['STATUS', 'Status', 'status'], 'В дорозі');
    const displayStatus = status === 'Stock' ? 'В наявності' : status;
    const photoLink = pickValue<string>(item, ['PHOTO_LINK', 'PhotoLink', 'photoLink', 'photo'], fallbackCar?.PHOTO_LINK || '');
    const photoUrl = buildPhotoUrl(photoLink);
    const rawPrice = pickValue<number | string>(item, ['PRICE', 'Price', 'price', 'priceNew', 'PriceLC'], fallbackCar?.PRICE || 0);
    const price = parseNumber(rawPrice, fallbackCar?.PRICE || 0);
    const co2 = pickValue<string | number | null>(item, ['CO2', 'Co2', 'co2'], null);
    const consumption = pickValue<string | number | null>(item, ['Consumption', 'FuelConsumption', 'fuelConsumption', 'rashod'], null);
    const rawId = pickValue<string | number>(item, ['id', 'ID', 'code'], '');
    const idPart = rawId !== '' ? String(rawId) : String(index);
    const cardKey = variantCode ? `${variantCode}-${idPart}` : idPart;
    const vin = pickValue<string>(item, ['vin', 'VIN', 'title'], '');
    const year = pickValue<string | number>(item, ['year', 'YEAR'], fallbackCar?.YEAR || '');
    const title = pickValue<string>(item, ['title'], vin);

    return {
      variantCode,
      modelName,
      gradeLabel,
      engineLabel,
      transmission,
      fuelType,
      displayStatus,
      photoUrl,
      price,
      co2,
      consumption,
      cardKey,
      vin,
      year: String(year),
      title
    };
  };

  const normalizeCardItems = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.variants)) return payload.variants;
    if (Array.isArray(payload.result)) return payload.result;
    return [payload];
  };

  // Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      try {
        const [banks, carData] = await Promise.all([fetchBankData(), fetchCarData()]);
        setBankData(banks);
        setCars(carData);
        if (carData.length > 0) {
          setSelectedModel(carData[0].MODEL_NAME);
          setSelectedOptionId(carData[0].FULL_MODEL_CODE);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Update logic constraints when Client Type changes
  useEffect(() => {
    if (clientType === ClientType.Legal) {
      setRepaymentType(RepaymentType.Classic); // Legal only allows Classic
      if (loanTerm > MAX_LOAN_TERM_LEGAL) setLoanTerm(MAX_LOAN_TERM_LEGAL);
      if (advancePercent < ADVANCE_MIN_LEGAL) setAdvancePercent(ADVANCE_MIN_LEGAL);
    }
  }, [clientType, loanTerm, advancePercent]);

  // Calculations
  const calculate = useCallback(() => {
    if (!bankData || !selectedCar) return;

    const termIndex = Math.min(Math.floor(loanTerm / 12) - 1, 6);
    // Determine Advance Index: Logic based on original code (advance / 10 - 1)
    let avanceIndex = Math.floor(advancePercent / 10) - 1;
    if (avanceIndex > 6) avanceIndex = 6;
    if (avanceIndex < 0) avanceIndex = 0;

    const loanAmount = displayedPrice - advanceAmount;

    // Helper for Rate Retrieval
    const getRate = (matrix: number[][]) => {
      if (!matrix[avanceIndex]) return 0;
      return matrix[avanceIndex][termIndex] || 0;
    };

    // Calculate Payment
    const calculatePayment = (rate: number, isAnnuity: boolean) => {
      if (rate === 0 && loanAmount > 0) return 0; // Guard

      if (repaymentType === RepaymentType.Classic || !isAnnuity) {
        // Classic: (Loan * (1 + Rate% * Term/12 * 360/365)) / Term ?? 
        // Original logic: (price - prepaid) * (1 + Number(individualPrivatePercent) / 100 * term / 12 * 360 / 365) / term;
        return loanAmount * (1 + rate / 100 * loanTerm / 12 * 360 / 365) / loanTerm;
      } else {
        // Annuity Formula
        // Rate per month
        const monthlyRate = rate / 100 / 12;
        // Denominator: 1 - (1 + r)^-n
        const denominator = 1 - Math.pow(1 + monthlyRate, -loanTerm);
        if (denominator === 0) return 0;
        return (monthlyRate * loanAmount) / denominator;
      }
    };

    // Calculate Initial Costs (Start Billing)
    // Original Logic: prepaid + (price * 0.0695 + price / 1.2 * getReriredPersent(price, 'privatbank') / 100)
    // Simplified for demo as exact pension fund logic is complex in original (dependent on price tiers)
    const getPensionFundRate = (price: number) => {
      if (price <= 499620) return 3;
      if (price < 878120) return 4;
      return 5;
    };

    const calculateInitialCost = (bankKey: string) => {
      let bankFeeRate = 0;
      if (bankKey === 'privatbank') bankFeeRate = 0.0695; // Rough estimate from original code constant
      if (bankKey === 'oshadbank') bankFeeRate = 0.065;
      if (bankKey === 'agricole') bankFeeRate = 0.065;

      // Add pension fund
      const pensionFund = (displayedPrice / 1.2) * (getPensionFundRate(displayedPrice) / 100);
      return advanceAmount + (displayedPrice * bankFeeRate) + pensionFund; // Simplified formula
    };


    const results: Record<string, CalculationResult> = {};

    // 1. Oschadbank
    const oschadRate = clientType === ClientType.Individual ? getRate(bankData.oshadbank.individual) : getRate(bankData.oshadbank.legal);
    results['oschadbank'] = {
      monthlyPayment: calculatePayment(oschadRate, repaymentType === RepaymentType.Annuity),
      initialCost: calculateInitialCost('oshadbank') + 1090, // +1090 fixed fee from original
      bankName: 'Oschadbank',
      visible: true, // Legal entity hides Bank 3, not 1 or 2
      rate: oschadRate
    };

    // 2. Agricole
    const agricoleRate = clientType === ClientType.Individual ? getRate(bankData.agricole.individual) : getRate(bankData.agricole.legal);
    results['agricole'] = {
      monthlyPayment: calculatePayment(agricoleRate, repaymentType === RepaymentType.Annuity),
      initialCost: calculateInitialCost('agricole'),
      bankName: 'Agricole',
      visible: loanTerm <= 60, // Hidden if term > 60
      rate: agricoleRate
    };

    // 3. Privatbank (Standard)
    const privatRate = clientType === ClientType.Individual ? getRate(bankData.privatbank.individual) : getRate(bankData.privatbank.legal);
    const privatMonthlyPayment = calculatePayment(privatRate, repaymentType === RepaymentType.Annuity);
    results['privatbank'] = {
      monthlyPayment: privatMonthlyPayment,
      initialCost: calculateInitialCost('privatbank'),
      bankName: 'Privatbank',
      visible: clientType === ClientType.Individual && privatMonthlyPayment > 0,
      rate: privatRate
    };

    // 4. Privatbank 24 (Special)
    // Only visible for Term 60, Individual, Annuity
    const showSpecials = loanTerm === 60 && clientType === ClientType.Individual && repaymentType === RepaymentType.Annuity;

    // Note: Special logic from original code uses fixed rates for specials
    const privat24Rate = 3.9;
    results['privatbank24'] = {
      monthlyPayment: calculatePayment(privat24Rate, true),
      initialCost: calculateInitialCost('privatbank'),
      bankName: 'Privatbank 24',
      visible: showSpecials,
      rate: privat24Rate
    };

    const privat36Rate = 0.01;
    results['privatbank36'] = {
      monthlyPayment: calculatePayment(privat36Rate, true),
      initialCost: calculateInitialCost('privatbank'),
      bankName: 'Privatbank 36',
      visible: showSpecials,
      rate: privat36Rate
    };

    setCalculationResults(results);

  }, [bankData, selectedCar, displayedPrice, advanceAmount, advancePercent, loanTerm, clientType, repaymentType]);

  // Trigger calculation on input changes
  useEffect(() => {
    calculate();
  }, [calculate]);

  const utmParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '' };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || ''
    };
  }, []);

  const selectedCardMeta = useMemo(() => {
    if (!selectedCardId) return null;
    for (let index = 0; index < cardItems.length; index += 1) {
      const meta = buildCardMeta(cardItems[index], index);
      if (meta.cardKey === selectedCardId) return meta;
    }
    return null;
  }, [cardItems, selectedCardId, carsByVariant, selectedCar, currentModelCars, availableModels]);

  const buildBankLink = (bankKey: string) => {
    if (!selectedCardMeta) return '#';
    const rate = calculationResults[bankKey]?.rate ?? '';
    const params = new URLSearchParams({
      prepaid: String(advancePercent),
      term: String(loanTerm),
      type: String(repaymentType),
      procent: String(rate),
      photo: selectedCardMeta.photoUrl,
      price: String(selectedCardMeta.price),
      year: selectedCardMeta.year,
      title: selectedCardMeta.title,
      engine: selectedCardMeta.engineLabel,
      model: selectedCardMeta.modelName,
      utmsourceProp: utmParams.utm_source,
      utmmediumProp: utmParams.utm_medium,
      utmcampaignPropu: utmParams.utm_campaign,
      utmcontentPropu: utmParams.utm_content,
      source: 'false'
    });

    if (bankKey === 'agricole') {
      params.set('customer', clientType === ClientType.Individual ? '1' : '0');
      return `https://stellantis-finance.com.ua/credit2/peugeot/agricole?${params.toString()}`;
    }

    const base = bankKey.startsWith('privatbank')
      ? 'https://stellantis-finance.com.ua/credit2/peugeot/privatbank'
      : 'https://stellantis-finance.com.ua/credit2/peugeot/oshadbank';
    return `${base}?${params.toString()}`;
  };

  const bankLinks = {
    oschadbank: buildBankLink('oschadbank'),
    agricole: buildBankLink('agricole'),
    privatbank: buildBankLink('privatbank'),
    privatbank24: buildBankLink('privatbank24'),
    privatbank36: buildBankLink('privatbank36')
  };

  // Fetch card data on complectation selection
  useEffect(() => {
    if (!selectedOptionId) return;
    const controller = new AbortController();
    const loadCards = async () => {
      try {
        setCardLoading(true);
        setCardError(null);
        const response = await fetch(
          `https://carsapi.peugeot.ua/api/calculator?VariantCode=${encodeURIComponent(selectedOptionId)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const payload = await response.json();
        setCardItems(normalizeCardItems(payload));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to load card data', err);
          setCardItems([]);
          setCardError('Failed to load card data');
        }
      } finally {
        setCardLoading(false);
      }
    };
    loadCards();
    return () => controller.abort();
  }, [selectedOptionId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-[#0a3b81] font-bold text-xl">Loading Calculator...</div>;
  }

  // --- Render Helpers ---

  // Build options for Model dropdown
  const modelOptions = availableModels.map(m => ({ label: m, value: m }));

  // Build options for Car Config dropdown
  const configOptions = currentModelCars.map(c => ({
    label: `${c.BODY_LABEL} ${c.GRADE_LABLE} ${c.YEAR} <br> ${c.EGINE_LABEL} ${c.TRANSMISSION}`,
    value: c.FULL_MODEL_CODE,
    meta: c
  }));

  // Handle Model Change
  const handleModelChange = (val: string | number) => {
    const model = val as string;
    setSelectedModel(model);
    // Default to first car of that model
    const firstCar = cars.find(c => c.MODEL_NAME === model);
    if (firstCar) {
      setSelectedOptionId(firstCar.FULL_MODEL_CODE);
      setPriceAdjustment(0);
      setSelectedCardPrice(null);
      setSelectedCardId('');
    }
  };

  return (
    <div className="font-sans antialiased text-[13px] md:text-[14px]">
      {/* Header */}
      <header className="p-[10px] md:p-[15px] bg-[#020001]">
        <div className="max-w-[1290px] w-full px-3 mx-auto">
          <div className="flex items-center justify-between">
            <img src="/assets/img/pngwing.png" alt="Logo" className="max-h-[40px] md:max-h-[45px]" />
            <div className="flex flex-col text-right">
              <span className="text-white text-[15px] md:text-[26px]">
                BUY<strong>EASY</strong> - КУПУЙ В КРЕДИТ ЛЕГКО!
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col justify-center min-h-[calc(100vh-65px)]">
        {/* Calculator Form */}
        <div className="py-[15px] md:py-[30px] border-b border-black/10 overflow-hidden bg-white">
          <div className="max-w-[1290px] w-full px-3 mx-auto">
            <div className="flex flex-wrap flex-col-reverse lg:flex-row -mx-3">

              {/* Left Column: Inputs */}
              <div className="w-full lg:w-1/2 px-3 mt-[30px] lg:mt-0">
                <div className="flex flex-wrap -mx-3">

                  {/* Model Select */}
                  <div className="w-full md:w-1/2 px-3">
                    <CustomSelect
                      label="Модель"
                      options={modelOptions}
                      value={selectedModel}
                      onChange={handleModelChange}
                    />
                  </div>

                  {/* Complectation Select */}
                  <div className="w-full md:w-1/2 px-3">
                    <CustomSelect
                      label="Комплектація"
                      options={configOptions}
                      value={selectedOptionId}
                      onChange={(val) => {
                        setSelectedOptionId(val as string);
                        setPriceAdjustment(0);
                        setSelectedCardPrice(null);
                        setSelectedCardId('');
                      }}
                    />
                  </div>

                  {/* Price Range */}
                  <div className="w-full md:w-1/2 px-3">
                    <div className="mb-[15px] md:mb-[20px]">
                      <small className="block mb-[2px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">
                        Вартість авто, грн
                      </small>
                      <div className="flex items-center px-[10px] h-[40px] md:h-[50px] bg-white border border-[#CCCCCC] rounded-[5px] mb-[15px] text-[14px]">
                        {new Intl.NumberFormat('ru-RU').format(displayedPrice).replace(/,/g, ' ')}
                      </div>
                      <input
                        type="range"
                        className="custom-range w-full"
                        min="0" max="100000" step="1000"
                        value={priceAdjustment}
                        onChange={(e) => setPriceAdjustment(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Term Range */}
                  <div className="w-full md:w-1/2 px-3">
                    <div className="mb-[15px] md:mb-[20px]">
                      <small className="block mb-[2px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">
                        Термін кредиту, міс
                      </small>
                      <div className="flex items-center px-[10px] h-[40px] md:h-[50px] bg-white border border-[#CCCCCC] rounded-[5px] mb-[15px] text-[14px]">
                        {loanTerm}
                      </div>
                      <input
                        type="range"
                        className="custom-range w-full"
                        min={MIN_LOAN_TERM}
                        max={clientType === ClientType.Individual ? MAX_LOAN_TERM_INDIVIDUAL : MAX_LOAN_TERM_LEGAL}
                        step="12"
                        value={loanTerm}
                        onChange={(e) => setLoanTerm(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Advance Payment Range */}
                  <div className="w-full md:w-1/2 px-3">
                    <div className="mb-[15px] md:mb-[20px]">
                      <small className="block mb-[2px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">
                        Авансовий внесок, грн {advancePercent}%
                      </small>
                      <div className="flex items-center px-[10px] h-[40px] md:h-[50px] bg-white border border-[#CCCCCC] rounded-[5px] mb-[15px] text-[14px]">
                        {new Intl.NumberFormat('ru-RU').format(advanceAmount).replace(/,/g, ' ')}
                      </div>
                      <input
                        type="range"
                        className="custom-range w-full"
                        min={clientType === ClientType.Individual ? ADVANCE_MIN_INDIVIDUAL : ADVANCE_MIN_LEGAL}
                        max="90" step="5"
                        value={advancePercent}
                        onChange={(e) => setAdvancePercent(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Radio Groups */}
                  <div className="w-full md:w-1/2 px-3">
                    {/* Client Type */}
                    <div className="mb-[9px] md:mb-[15px]">
                      <small className="block mb-[2px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">Тип клієнта</small>
                      <div className="flex items-center radio-custom">
                        <div className="mr-[15px] md:mr-[30px]">
                          <input
                            type="radio" id="individual"
                            name="clientType"
                            checked={clientType === ClientType.Individual}
                            onChange={() => setClientType(ClientType.Individual)}
                          />
                          <label htmlFor="individual">Фіз. особа</label>
                        </div>
                        <div>
                          <input
                            type="radio" id="legal"
                            name="clientType"
                            checked={clientType === ClientType.Legal}
                            onChange={() => setClientType(ClientType.Legal)}
                          />
                          <label htmlFor="legal">Юр. особа</label>
                        </div>
                      </div>
                    </div>

                    {/* Repayment Type */}
                    <div className={`mb-[15px] md:mb-[20px] transition-opacity duration-300 ${clientType === ClientType.Legal ? 'opacity-50 pointer-events-none' : ''}`}>
                      <small className="block mb-[5px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">Тип погашення</small>
                      <div className="flex items-center radio-custom">
                        <div className="mr-[15px] md:mr-[30px]">
                          <input
                            type="radio" id="classic"
                            name="repaymentType"
                            checked={repaymentType === RepaymentType.Classic}
                            onChange={() => setRepaymentType(RepaymentType.Classic)}
                          />
                          <label htmlFor="classic">Класичний</label>
                        </div>
                        <div>
                          <input
                            type="radio" id="annuity"
                            name="repaymentType"
                            checked={repaymentType === RepaymentType.Annuity}
                            onChange={() => setRepaymentType(RepaymentType.Annuity)}
                          />
                          <label htmlFor="annuity">Ануїтетний</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Button (Hidden on Desktop usually, but per design styles it shows on mobile) */}
                  <div className="w-[calc(100%-24px)] mx-auto md:hidden">
                    <button
                      onClick={() => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full h-[40px] flex items-center justify-center text-white text-[14px] font-bold uppercase bg-[#3172E0] rounded-[5px] transition-all active:bg-[#0f2750]"
                    >
                      Розрахувати
                    </button>
                  </div>

                </div>
              </div>

              {/* Right Column: Image */}
              <div className="w-full lg:w-1/2 px-3">
                <div className="relative flex items-center justify-center h-full min-h-[200px] lg:min-h-auto">
                  {selectedCar && (
                    <img
                      key={selectedCar.PHOTO_LINK} // Force re-render for animation
                      src={"https://carsapi.peugeot.ua/app/" + selectedCar.PHOTO_LINK}
                      alt={selectedCar.MODEL_NAME}
                      className="w-full h-full object-contain max-h-[400px] animate-car"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Car Cards Section */}
        {(selectedOptionId || cardLoading || cardError) && (
          <div className="py-[20px] md:py-[35px] bg-[#F6F6F6]">
            <div className="max-w-[1290px] w-full px-3 mx-auto">
              {cardLoading && (
                <div className="mb-[10px] text-[12px] text-[#7A7878]">Оновлення даних...</div>
              )}
              {cardError && (
                <div className="mb-[10px] text-[12px] text-[#b00020]">Не вдалося завантажити дані для карток.</div>
              )}
              <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-4">
                {cardItems.map((item, index) => {
                  const cardMeta = buildCardMeta(item, index);
                  const storeUrl = cardMeta.vin ? `https://cars.peugeot.ua/car/${cardMeta.vin}` : '';
                  const isSelected = selectedCardId === cardMeta.cardKey;
                  const variantCode = cardMeta.variantCode;
                  const modelName = cardMeta.modelName;
                  const gradeLabel = cardMeta.gradeLabel;
                  const engineLabel = cardMeta.engineLabel;
                  const transmission = cardMeta.transmission;
                  const fuelType = cardMeta.fuelType;
                  const displayStatus = cardMeta.displayStatus;
                  const photoLink = cardMeta.photoUrl;
                  const price = cardMeta.price;
                  const co2 = cardMeta.co2;
                  const consumption = cardMeta.consumption;
                  const cardKey = cardMeta.cardKey;

                  return (
                    <div
                      key={cardKey}
                      className={`car-card bg-white border rounded-[5px] px-[16px] md:px-[20px] pt-[16px] pb-[18px] shadow-[0_2px_0_rgba(0,0,0,0.15)] cursor-pointer transition-shadow hover:shadow-[0_6px_0_rgba(0,0,0,0.18)] ${isSelected ? 'border-[#3172E0] shadow-[0_2px_0_rgba(49,114,224,0.35)]' : 'border-[#020001]'}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!variantCode) return;
                        setSelectedModel(modelName || selectedModel);
                        setSelectedOptionId(variantCode);
                        setSelectedCardPrice(price);
                        setSelectedCardId(cardKey);
                        setPriceAdjustment(0);
                      }}
                      onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && variantCode) {
                          event.preventDefault();
                          setSelectedModel(modelName || selectedModel);
                          setSelectedOptionId(variantCode);
                          setSelectedCardPrice(price);
                          setSelectedCardId(cardKey);
                          setPriceAdjustment(0);
                        }
                      }}
                    >
                      <div className="text-center uppercase font-bold text-[14px] md:text-[16px] leading-[1.1]">
                        <span className="block">{modelName}</span>
                        <span className="block">{gradeLabel}</span>
                      </div>
                      <div className="mt-[8px] flex items-center justify-center flex-wrap text-[12px] text-[#1f1f1f]">
                        <span>{engineLabel}</span>
                        <span className="mx-[6px] text-[#7a7878]">●</span>
                        <span>{transmission}</span>
                        <span className="mx-[6px] text-[#7a7878]">●</span>
                        <span>{fuelType}</span>
                      </div>
                      <div className="mt-[6px] text-center font-semibold text-[12px]">{displayStatus}</div>
                      <div className="flex items-center justify-center">
                        <img
                          src={photoLink}
                          alt={`${modelName} ${gradeLabel}`}
                          className="w-full max-h-[160px] object-contain"
                        />
                      </div>
                      <div className="mt-[6px] flex items-center justify-between text-[#7A7878] text-[12px]">
                        <div className="flex items-center gap-[6px]">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#7A7878"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 12a8 8 0 1 0-16 0" />
                            <path d="M5 12h14" />
                            <path d="M12 8v4l3 3" />
                          </svg>
                          <span>{co2 !== null ? `${co2} g/km` : '151 g/km'}</span>
                        </div>
                        <div className="flex items-center gap-[6px]">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#7A7878"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 2.5s5.5 6.1 5.5 11.1A5.5 5.5 0 1 1 6.5 13.6C6.5 8.6 12 2.5 12 2.5z" />
                          </svg>
                          <span>{consumption !== null ? `${consumption} l/100km` : '5,3 l/100km'}</span>
                        </div>
                      </div>
                      <div className="mt-[10px] pt-[10px] border-t border-black/10 text-center text-[16px] md:text-[18px] font-bold">
                        {new Intl.NumberFormat('ru-RU').format(price).replace(/,/g, ' ')} грн
                      </div>
                      {storeUrl && (
                        <div className="detail-link mt-[10px] text-center">
                          <a
                            target="_blank"
                            href={storeUrl}
                            className="inline-flex items-center justify-center h-[34px] px-[18px] text-[12px] font-bold uppercase text-white bg-[#3172E0] rounded-[5px] transition-colors hover:bg-[#0f2750]"
                          >
                            Детальніше
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Offers Section */}
        <Offers results={calculationResults} links={bankLinks} visible={true} />
      </div>
    </div>
  );
}

export default App;
