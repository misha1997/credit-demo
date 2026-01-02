import React, { useState, useRef, useEffect } from 'react';

interface CustomSelectProps {
  label: string;
  options: { label: string; value: string | number; meta?: any }[];
  value: string | number;
  onChange: (value: string | number, meta?: any) => void;
  displayValue?: string; // Optional custom display text if different from selected option label
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, displayValue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const stripHtml = (input: string) => input.replace(/<[^>]*>/g, "").trim();
  const selectedLabel = selectedOption?.label ? stripHtml(selectedOption.label) : undefined;
  const textToDisplay = displayValue || selectedLabel || "Select...";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-[15px] relative" ref={containerRef}>
      <small className="block mb-[2px] text-[#7A7878] text-xs font-normal leading-[1] md:text-sm md:mb-[8px]">
        {label}
      </small>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center text-[13px] md:text-[14px] text-[#020001] w-full text-left bg-white border border-[#CCCCCC] rounded-[5px] h-[52px] md:h-[60px] py-[6px] md:py-[8px] pl-[10px] pr-[40px] cursor-pointer transition-all ${isOpen ? "after:rotate-180" : ""
            }`}
        >
          <span
            className="block overflow-hidden leading-[1.2]"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            {textToDisplay}
          </span>
          {/* Custom Arrow using SVG to match design */}
          <div className={`absolute top-1/2 right-[15px] -translate-y-1/2 w-[20px] h-[12px] pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <svg width="20" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        <ul
          className={`m-0 p-0 list-none absolute left-0 top-[55px] border border-[#CCCCCC] rounded-[5px] bg-white overflow-y-auto max-h-[250px] w-full z-10 transition-all duration-200 shadow-[0px_20px_20px_0px_rgba(0,0,0,0.2)] ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
        >
          {options.map((option, index) => (
            <li
              key={`${option.value}-${index}`}
              onClick={() => {
                onChange(option.value, option.meta);
                setIsOpen(false);
              }}
              className={`m-0 p-[15px] md:p-[10px] cursor-pointer text-sm text-[#020001] border-b border-[#e0e0e0] last:border-b-0 hover:bg-[#f5f8fa90] transition-colors ${option.value === value ? "bg-[#f5f8fa]" : ""
                }`}
              dangerouslySetInnerHTML={{ __html: option.label }} // Allowing HTML for the complex option formatting
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CustomSelect;
