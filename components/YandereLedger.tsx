import React from 'react';
import { YandereLedger as LedgerType } from '../types';
import { Activity, HeartCrack, Lock, Skull } from 'lucide-react';

interface Props {
  ledger: LedgerType;
}

const StatBar = ({ label, value, color, icon: Icon }: { label: string, value: number, color: string, icon: any }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-1 text-xs font-mono-code text-gray-400">
      <span className="flex items-center gap-2"><Icon size={12} /> {label.toUpperCase()}</span>
      <span>{value.toFixed(1)}%</span>
    </div>
    <div className="w-full h-2 bg-gray-900 border border-gray-800 relative overflow-hidden">
      <div 
        className={`h-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${value}%` }}
      />
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full animate-[shimmer_2s_infinite] transform -skew-x-12" />
    </div>
  </div>
);

export const YandereLedgerUI: React.FC<Props> = ({ ledger }) => {
  return (
    <div className="p-6 bg-black/80 border-l border-[#4a0404] h-full flex flex-col font-header">
      <h2 className="text-xl text-[#d4af37] mb-6 border-b border-[#d4af37]/30 pb-2 tracking-widest">
        YANDERE LEDGER v3.0
      </h2>
      
      <div className="space-y-2">
        <StatBar 
          label="Physical Integrity" 
          value={ledger.physicalIntegrity} 
          color="bg-emerald-900" 
          icon={Activity}
        />
        <StatBar 
          label="Trauma Level" 
          value={ledger.traumaLevel} 
          color="bg-red-700" 
          icon={HeartCrack}
        />
        <StatBar 
          label="Shame/Pain Abyss" 
          value={ledger.shamePainAbyssLevel} 
          color="bg-purple-900" 
          icon={Skull}
        />
        <StatBar 
          label="Compliance" 
          value={ledger.complianceScore} 
          color="bg-blue-900" 
          icon={Lock}
        />
        <StatBar 
          label="Hope Level" 
          value={ledger.hopeLevel} 
          color="bg-yellow-600" 
          icon={Activity}
        />
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <div className="text-xs font-mono-code text-gray-500">
          <p>PHASE: {ledger.phase}</p>
          <p>TURN: {ledger.turnCount}</p>
          <p>STATUS: <span className="text-red-500 animate-pulse">OPERATIONAL</span></p>
        </div>
      </div>
    </div>
  );
};
