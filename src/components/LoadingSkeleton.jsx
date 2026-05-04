import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 border-b border-surface-variant">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-surface-container-high rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm animate-pulse">
          <div className="h-4 bg-surface-container-high rounded w-1/3 mb-4" />
          <div className="h-8 bg-surface-container-high rounded w-1/2 mb-2" />
          <div className="h-3 bg-surface-container-high rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-md border border-surface-variant shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="h-4 bg-surface-container-high rounded w-1/3" />
        <div className="w-10 h-10 bg-surface-container-high rounded-lg" />
      </div>
      <div className="h-8 bg-surface-container-high rounded w-1/2" />
    </div>
  );
}
