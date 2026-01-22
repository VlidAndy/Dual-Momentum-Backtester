
import React from 'react';

interface Props {
  label: string;
  value: string | number;
  subValue?: string;
  icon: string;
  colorClass: string;
}

const MetricsCard: React.FC<Props> = ({ label, value, subValue, icon, colorClass }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start space-x-4">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <i className={`fa-solid ${icon} text-xl ${colorClass.replace('bg-', 'text-')}`}></i>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subValue && <p className="text-xs font-semibold mt-1 text-emerald-600">{subValue}</p>}
      </div>
    </div>
  );
};

export default MetricsCard;
