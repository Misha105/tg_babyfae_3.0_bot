import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface GrowthChartProps {
  data: { date: string; value: number }[];
  color: string;
  unit: string;
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ data, color, unit }) => {
  const { t } = useTranslation();
  const sortedData = useMemo(() => 
    [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );

  if (sortedData.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm bg-slate-900/30 rounded-2xl border border-slate-800/50">
        {t('growth.not_enough_data')}
      </div>
    );
  }

  const values = sortedData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // Add padding to range
  const padding = range * 0.2;
  const yMin = Math.max(0, min - padding);
  const yMax = max + padding;
  const yRange = yMax - yMin;

  const width = 100;
  const height = 50;

  const points = sortedData.map((d, i) => {
    const x = (i / (sortedData.length - 1)) * width;
    const y = height - ((d.value - yMin) / yRange) * height;
    return `${x},${y}`;
  }).join(' ');

  // Create fill area path
  const fillPath = `
    M 0,${height} 
    L ${points.split(' ')[0]} 
    ${points.split(' ').map(p => `L ${p}`).join(' ')} 
    L ${width},${height} 
    Z
  `;

  return (
    <div className="w-full h-48 relative bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="0" x2={width} y2="0" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.2" />
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.2" />
        <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.2" />

        {/* Area Fill */}
        <path d={fillPath} className={`${color.replace('text-', 'fill-')} opacity-10`} />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          className={color}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {sortedData.map((d, i) => {
          const x = (i / (sortedData.length - 1)) * width;
          const y = height - ((d.value - yMin) / yRange) * height;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="1.5"
              className={`${color} fill-slate-900`}
              stroke="currentColor"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="absolute top-2 right-4 text-xs font-mono text-slate-500">
        {max} {unit}
      </div>
      <div className="absolute bottom-2 right-4 text-xs font-mono text-slate-500">
        {min} {unit}
      </div>
    </div>
  );
};
