import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  badgeIcon: string;
  colorClass: string;
  bgBadgeClass: string;
}

export default function StatCard({ title, value, icon, badgeIcon, colorClass, bgBadgeClass }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Watermark Icon di Pojok Kanan Atas */}
      <div className="absolute top-2 right-2 p-2 opacity-5 pointer-events-none select-none">
        <span className={`material-symbols-outlined text-[75px] ${colorClass}`}>
          {icon}
        </span>
      </div>

      <div className="flex flex-col h-full relative z-10">
        {/* Kotak Icon Kecil */}
        <div className={`w-9 h-9 rounded-lg ${bgBadgeClass} ${colorClass} flex items-center justify-center mb-4`}>
          <span className="material-symbols-outlined text-[20px]">
            {badgeIcon}
          </span>
        </div>
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-3xl font-bold text-gray-900 mt-auto">{value}</h3>
      </div>
    </div>
  );
}