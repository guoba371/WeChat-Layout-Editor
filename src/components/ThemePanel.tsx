import { Check, ChevronDown } from 'lucide-react';
import type { ThemeDefinition } from '../App';

type ThemePanelProps = {
  themes: ThemeDefinition[];
  activeTheme: ThemeDefinition;
  onSelectTheme: (theme: ThemeDefinition) => void;
};

function ThemePanel({ themes, activeTheme, onSelectTheme }: ThemePanelProps) {
  return (
    <aside className="glass-panel sticky top-[90px] max-h-[calc(100vh-120px)] overflow-hidden rounded-2xl">
      <div className="flex h-12 items-center gap-2 border-b border-[var(--border)] px-3 dark:border-white/10">
        <ThemeSwatches colors={activeTheme.colors} />
        <strong className="min-w-0 flex-1 truncate text-sm font-black">{activeTheme.name}</strong>
        <ChevronDown size={14} className="text-slate-400 dark:text-white/45" />
      </div>

      <div className="max-h-[calc(100vh-170px)] overflow-y-auto px-2 py-3">
        <section>
          <p className="px-2 pb-2 text-[11px] font-bold text-slate-400">全部主题</p>
          <div className="space-y-1">
            {themes.map((theme) => {
              const selected = theme.name === activeTheme.name;

              return (
                <button
                  key={theme.name}
                  onClick={() => onSelectTheme(theme)}
                  className={[
                    'grid h-10 w-full grid-cols-[28px_1fr_18px] items-center rounded-xl px-2 text-left text-xs transition',
                    selected
                      ? 'bg-white font-bold text-slate-950 shadow-sm dark:bg-white/12 dark:text-white'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white',
                  ].join(' ')}
                >
                  <ThemeSwatches colors={theme.colors} />
                  <span className="truncate">{theme.name}</span>
                  {selected ? <Check size={15} /> : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}

function ThemeSwatches({ colors }: { colors: [string, string] }) {
  return (
    <span className="flex -space-x-1">
      <i className="h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: colors[0] }} />
      <i className="h-3.5 w-3.5 rounded-full border border-white" style={{ backgroundColor: colors[1] }} />
    </span>
  );
}

export default ThemePanel;
