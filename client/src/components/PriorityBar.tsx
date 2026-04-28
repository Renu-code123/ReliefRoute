//import React from 'react';

interface PriorityBarProps {
  score: number; // 0 to 1
}

export default function PriorityBar({ score }: PriorityBarProps) {
  const percentage = Math.min(100, Math.max(0, score * 100));
  
  let color = 'bg-green-500';
  if (score >= 0.7) color = 'bg-red-500';
  else if (score >= 0.4) color = 'bg-orange-500';

  return (
    <div className="w-full bg-slate-200 rounded-full h-2 mt-1 relative overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-500`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
