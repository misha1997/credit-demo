import React from 'react';
import type { CalculationResult } from '../types';

interface OffersProps {
  results: Record<string, CalculationResult>;
  visible: boolean;
  links?: Record<string, string>;
}

// Helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0
  }).format(Math.abs(val));
};

const Offers: React.FC<OffersProps> = ({ results, links }) => {
  // Config for the bank cards to iterate or render individually
  const bankCards = [
    {
      id: 'bank1',
      key: 'oschadbank',
      img: '/credit-demo/assets/img/oschadbank.jpg',
      alt: 'Ощадбанк',
      title: 'Кредит від Ощадбанк'
    },
    {
      id: 'bank2',
      key: 'agricole',
      img: '/credit-demo/assets/img/agricole.png',
      alt: 'Agricole',
      title: 'Кредит від Agricole'
    },
    {
      id: 'bank3',
      key: 'privatbank',
      img: '/credit-demo/assets/img/privat.png',
      alt: 'Приватбанк',
      title: 'Кредит від Приватбанк'
    },
    {
      id: 'bank4',
      key: 'privatbank24',
      img: '/credit-demo/assets/img/privat.png',
      alt: 'Приватбанк',
      title: 'Пільговий період від <br>Приватбанку на 24 місяці'
    },
    {
      id: 'bank5',
      key: 'privatbank36',
      img: '/credit-demo/assets/img/privat.png',
      alt: 'Приватбанк',
      title: 'Пільговий період від <br>Приватбанку на 36 місяців'
    }
  ];

  return (
    <section id="offers" className="pb-[10px]">
      <div className="max-w-[1290px] w-full px-3 mx-auto">
        <h4 className="mb-[15px] mt-[10px] md:mt-[30px] text-[#020001] text-[16px] md:text-[18px] font-bold leading-normal">
          Пропозиції від банків
        </h4>
        <div className="flex flex-wrap -mx-3">
          {bankCards.map((bank) => {
            const data = results[bank.key];
            if (!data || !data.visible) return null;
            const link = links?.[bank.key] || '#';

            return (
              <div key={bank.id} className="flex-none w-full md:w-1/3 px-3">
                <div className="relative p-0 pb-[25px] mb-[25px] border-b border-black/10 md:p-[10px] md:border-[2px] md:border-white md:rounded-[5px] md:transition-all md:duration-300 hover:border-[#3172E0] md:mb-0 md:border-b-[2px] offers-card">
                  <img src={bank.img} alt={bank.alt} className="absolute top-0 right-0 md:top-[10px] md:right-[10px] rounded-[5px] h-[45px] md:h-auto" />
                  <h5 className="m-0 mb-[8px] md:mb-0 text-[13px] font-normal uppercase leading-normal" dangerouslySetInnerHTML={{ __html: bank.title }}></h5>

                  <div className="mb-[-5px] mt-0">
                    <p className="mb-[5px] mt-0 text-[#7A7878] text-[12px] font-normal leading-normal">
                      Щомісячний платіж за кредитом
                    </p>
                    <div className="text-[#3172E0] text-[20px] md:text-[25px] font-bold leading-normal">
                      {formatCurrency(data.monthlyPayment)}
                    </div>
                  </div>

                  <div className="mb-[8px] md:mb-[10px]">
                    <p className="my-[5px] md:my-[10px] text-[#7A7878] text-[12px] font-normal leading-normal">
                      Початкові витрати за кредитом (вкл. початковий внесок, КАСКО, збір до ПФ та ін. комісії)
                    </p>
                    <div className="text-[#020001] text-[20px] md:text-[25px] font-bold leading-normal">
                      {formatCurrency(data.initialCost)}
                    </div>
                  </div>

                  <a href={link} className="w-full h-[40px] md:h-[50px] flex items-center justify-center text-white text-[14px] font-bold uppercase bg-[#0a3b81] rounded-[5px] hover:bg-[#235dc2] transition-all duration-300">
                    Деталі платежу
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Offers;
