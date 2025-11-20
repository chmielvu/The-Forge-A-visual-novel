import React from 'react';
import { Brain, TrendingUp, Zap } from 'lucide-react';

interface Props {
  insights?: {
    hiddenPlots?: string[];
    futureHooks?: string[];
    tropeEntropy?: number;
  };
}

export const DirectorInsights: React.FC<Props> = ({ insights }) => {
  if (!insights) return null;

  const entropyColor = insights.tropeEntropy && insights.tropeEntropy < 0.35
    ? 'text-red-500'
    : insights.tropeEntropy && insights.tropeEntropy > 0.7
    ? 'text-green-500'
    : 'text-yellow-500';

  return (
    <div className="p-4 bg-black/70 border border-[#d4af37]/30 backdrop-blur-md h-full flex flex-col">
      <h3 className="text-[#d4af37] font-header text-sm mb-3 flex items-center gap-2">
        <Brain size={16} /> DIRECTOR INSIGHTS
      </h3>
      
      {insights.tropeEntropy !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs font-mono-code text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp size={12} /> NARRATIVE ENTROPY
            </span>
            <span className={entropyColor}>
              {(insights.tropeEntropy * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
            <div 
              className={`h-full ${entropyColor.replace('text', 'bg')}`}
              style={{ width: `${insights.tropeEntropy * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {insights.tropeEntropy < 0.35 && '⚠️  Narrative stagnation detected'}
            {insights.tropeEntropy > 0.7 && '✓ High novelty maintained'}
          </p>
        </div>
      )}
      
      {insights.hiddenPlots && insights.hiddenPlots.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-gray-400 font-mono-code mb-1 flex items-center gap-1">
            <Zap size={10} /> HIDDEN PLOTS
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            {insights.hiddenPlots.slice(0, 2).map((plot, i) => (
              <div key={i} className="truncate">• {plot}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
