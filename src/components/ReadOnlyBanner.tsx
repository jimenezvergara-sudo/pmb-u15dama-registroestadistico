import React from 'react';
import { Eye, Lock } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/**
 * Banner shown when a category-restricted user is viewing data
 * from a category they cannot modify. Visible across all screens.
 */
const ReadOnlyBanner: React.FC = () => {
  const { isReadOnlyView, assignedCategory, activeCategory } = useApp();
  if (!isReadOnlyView) return null;

  return (
    <div className="mx-3 mt-3 rounded-xl border border-amber-400/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 flex items-center gap-2 shadow-sm">
      <Eye className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
      <p className="text-[11px] text-amber-900 dark:text-amber-200 font-semibold leading-tight flex-1">
        Modo solo lectura — viendo <strong>{activeCategory}</strong>.
        Solo podés modificar datos de <strong>{assignedCategory}</strong>.
      </p>
      <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
    </div>
  );
};

export default ReadOnlyBanner;
