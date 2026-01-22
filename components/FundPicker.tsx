
import React, { useState, useEffect, useRef } from 'react';
import { searchFunds, SearchResult } from '../services/dataService';

interface Props {
  label: string;
  code: string;
  name: string;
  onUpdate: (res: { code: string; name: string }) => void;
  placeholder: string;
}

const FundPicker: React.FC<Props> = ({ label, code, name, onUpdate, placeholder }) => {
  const [inputValue, setInputValue] = useState(code);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setInputValue(code), [code]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inputValue.length >= 2 && !inputValue.match(/^\d{6}$/)) {
        const res = await searchFunds(inputValue);
        setResults(res);
        setShowDropdown(true);
      } else if (inputValue.match(/^\d{6}$/)) {
        const res = await searchFunds(inputValue);
        if (res.length > 0 && res[0].code === inputValue) {
          onUpdate({ code: inputValue, name: res[0].name });
        } else {
          onUpdate({ code: inputValue, name: name || '自定义代码' });
        }
        setShowDropdown(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col relative w-full" ref={dropdownRef}>
      <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-1 tracking-tighter">{label}</label>
      <div className="relative">
        <input 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder={placeholder}
          onFocus={() => inputValue.length >= 2 && setShowDropdown(true)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full shadow-sm transition-all font-semibold text-slate-700" 
        />
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 w-full md:w-[400px] bg-white border border-slate-200 shadow-2xl rounded-2xl mt-2 z-50 max-h-[300px] overflow-y-auto">
            {results.map((res) => (
              <div 
                key={res.code} 
                onClick={() => { onUpdate({ code: res.code, name: res.name }); setInputValue(res.code); setShowDropdown(false); }}
                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-black text-slate-900">{res.code}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold border bg-blue-100 text-blue-700">{res.type}</span>
                </div>
                <div className="text-xs text-slate-600 font-bold line-clamp-1">{res.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FundPicker;
