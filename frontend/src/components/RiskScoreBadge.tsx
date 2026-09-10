import React from 'react';

interface Props {
  score: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  size?: 'sm' | 'md' | 'lg';
}

export const RiskScoreBadge: React.FC<Props> = ({ score, severity, size = 'md' }) => {
  const getColors = () => {
    if (score >= 80 || severity === 'CRITICAL') {
      return {
        bg: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
        dot: 'bg-rose-500 animate-pulse',
        label: 'CRITICAL RISK'
      };
    }
    if (score >= 60 || severity === 'HIGH') {
      return {
        bg: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
        dot: 'bg-orange-500',
        label: 'HIGH RISK'
      };
    }
    if (score >= 30 || severity === 'MEDIUM') {
      return {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        dot: 'bg-amber-500',
        label: 'MEDIUM RISK'
      };
    }
    return {
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
      dot: 'bg-emerald-500',
      label: 'LOW RISK'
    };
  };

  const style = getColors();
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3.5 py-1.5 font-bold'
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 border rounded-full font-medium ${style.bg} ${sizeClasses}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      <span>{score}/100</span>
      <span className="opacity-80 text-[11px] font-semibold tracking-wider uppercase">
        ({severity || style.label})
      </span>
    </div>
  );
};
