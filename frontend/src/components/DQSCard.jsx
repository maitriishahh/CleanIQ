import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';

export default function DQSCard({ sessionData }) {
  const targetDQS = sessionData?.profile?.dqs || 0;
  const [dqs, setDqs] = useState(0);
  
  // Animate count up
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = targetDQS / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= targetDQS) {
        setDqs(targetDQS);
        clearInterval(timer);
      } else {
        setDqs(Math.floor(start * 10) / 10);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [targetDQS]);

  let dqsColor = "text-rose-500";
  let ringColor = "ring-rose-100";
  if (targetDQS > 60) {
    dqsColor = "text-amber-500";
    ringColor = "ring-amber-100";
  }
  if (targetDQS > 85) {
    dqsColor = "text-emerald-500";
    ringColor = "ring-emerald-100";
  }
  
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-8 flex flex-col items-center justify-center h-full text-center relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-indigo-500"></div>
      
      <div className={`bg-white p-4 rounded-2xl ${dqsColor} mb-6 border border-slate-100 ring-4 ${ringColor} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
        <Target size={32} />
      </div>
      
      <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">
        Data Quality Score
      </h3>
      
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-6xl font-black tracking-tighter ${dqsColor}`}>
          {dqs}
        </span>
        <span className="text-xl font-bold text-slate-300">/100</span>
      </div>
      
      <p className="text-slate-500 text-sm mt-4 leading-relaxed max-w-[200px]">
        Composite multi-modal AI metric evaluating structural data integrity.
      </p>
    </div>
  );
}
