import {
  Bold,
  ChevronDown,
  Code2,
  Highlighter,
  Image,
  List,
  ListOrdered,
  Minus,
  Moon,
  Quote,
  Sun,
} from 'lucide-react';
import { useState } from 'react';

type TopBarProps = {
  isDark: boolean;
  activeEditorState: ActiveEditorState;
  onToggleDark: () => void;
  onEditorCommand: (command: EditorCommand) => void;
};

export type HeadingLevel = 'paragraph' | 'h1' | 'h2' | 'h3';

export type ActiveEditorState = {
  heading: HeadingLevel;
  bold: boolean;
  highlight: boolean;
};

export type EditorCommand =
  | 'bold'
  | 'highlight'
  | 'quote'
  | 'code'
  | 'unordered-list'
  | 'ordered-list'
  | 'image'
  | 'divider'
  | { type: 'heading'; level: HeadingLevel };

const headingOptions: Array<{ label: string; meta: string; level: HeadingLevel }> = [
  { label: '正文', meta: '18px', level: 'paragraph' },
  { label: 'H1', meta: '52px', level: 'h1' },
  { label: 'H2', meta: '34px', level: 'h2' },
  { label: 'H3', meta: '24px', level: 'h3' },
];

const toolbarItems = [
  { label: '加粗', tooltip: '加粗：让选中文本更醒目', icon: Bold, command: 'bold' as const },
  { label: '高亮', tooltip: '高亮：给选中文本添加黄色标记', icon: Highlighter, command: 'highlight' as const },
  { label: '引用', tooltip: '引用：将当前段落变为引用块', icon: Quote, command: 'quote' as const },
  { label: '代码块', tooltip: '代码块：将当前段落变为代码块', icon: Code2, command: 'code' as const },
  { label: '无序列表', tooltip: '无序列表：创建项目符号列表', icon: List, command: 'unordered-list' as const },
  { label: '有序列表', tooltip: '有序列表：创建编号列表', icon: ListOrdered, command: 'ordered-list' as const },
  { label: '插入图片', tooltip: '插入图片：在光标处加入本地图片', icon: Image, command: 'image' as const },
  { label: '分割线', tooltip: '分割线：插入段落分隔线', icon: Minus, command: 'divider' as const },
];

function TopBar({ isDark, activeEditorState, onToggleDark, onEditorCommand }: TopBarProps) {
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const activeHeadingLabel =
    headingOptions.find((option) => option.level === activeEditorState.heading)?.label ?? '正文';

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-white/88 px-4 py-3 backdrop-blur-[18px] dark:border-white/10 dark:bg-[#0a0b0c]/82 lg:grid lg:h-[72px] lg:grid-cols-[270px_minmax(420px,1fr)_270px] lg:px-6 lg:py-0">
      <div className="flex min-w-0 flex-1 items-baseline gap-3 lg:flex-none">
        <span className="text-[23px] font-black tracking-normal text-black dark:text-white">SaiWechatEdit</span>
        <span className="hidden font-serif text-[13px] italic tracking-[0.28em] text-slate-400 sm:inline">
          灵感流转，由此开始
        </span>
      </div>

      <nav
        aria-label="排版工具栏"
        className="toolbar-scroll order-3 w-full overflow-x-auto rounded-[18px] border border-slate-200/70 bg-white/78 px-2 py-1.5 shadow-sm backdrop-blur-[18px] dark:border-white/10 dark:bg-black/55 lg:order-none lg:w-auto lg:justify-self-center lg:px-3"
      >
        <div className="flex h-11 w-max items-center gap-1 text-slate-500 dark:text-white/55">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={headingMenuOpen}
              onMouseDown={(event) => {
                event.preventDefault();
                setHeadingMenuOpen((value) => !value);
              }}
              className={[
                'inline-flex h-11 min-w-18 items-center justify-center gap-1 rounded-xl px-3 text-sm transition',
                activeEditorState.heading !== 'paragraph'
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white',
              ].join(' ')}
            >
              {activeHeadingLabel}
              <ChevronDown size={14} strokeWidth={2} />
            </button>

            {headingMenuOpen ? (
              <div className="absolute left-0 top-[52px] z-30 w-36 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-[18px] dark:border-white/10 dark:bg-[#111]/95">
                {headingOptions.map((option) => {
                  const selected = option.level === activeEditorState.heading;

                  return (
                    <button
                      type="button"
                      key={option.level}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onEditorCommand({ type: 'heading', level: option.level });
                        setHeadingMenuOpen(false);
                      }}
                      className={[
                        'grid h-10 w-full grid-cols-[1fr_auto] items-center rounded-xl px-2 text-left text-xs transition',
                        selected
                          ? 'bg-slate-950 font-bold text-white dark:bg-white dark:text-slate-950'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white',
                      ].join(' ')}
                    >
                      <span>{option.label}</span>
                      <span className="text-[10px] opacity-60">{option.meta}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <span className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />
          {toolbarItems.map((item) => {
            const hasCommand = 'command' in item;
            const active =
              (hasCommand && item.command === 'bold' && activeEditorState.bold) ||
              (hasCommand && item.command === 'highlight' && activeEditorState.highlight);

            return (
              <span key={item.label} className="group relative inline-flex">
                <button
                  type="button"
                  aria-label={item.label}
                  aria-describedby={'tooltip' in item ? `toolbar-tip-${item.command}` : undefined}
                  aria-disabled={!hasCommand}
                  disabled={!hasCommand}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (hasCommand) onEditorCommand(item.command);
                  }}
                  onClick={(event) => event.preventDefault()}
                  className={[
                    'inline-flex h-11 w-11 items-center justify-center rounded-xl transition',
                    active
                      ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                      : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white',
                    hasCommand ? '' : 'cursor-not-allowed opacity-35 hover:bg-transparent dark:hover:bg-transparent',
                  ].join(' ')}
                >
                  <item.icon size={18} strokeWidth={2.2} />
                </button>
                <span
                  id={`toolbar-tip-${item.command}`}
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-[52px] z-40 hidden w-max -translate-x-1/2 translate-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-[#161616] dark:text-white/80 lg:block"
                >
                  {item.tooltip}
                </span>
              </span>
            );
          })}
        </div>
      </nav>

      <div className="flex items-center justify-end gap-2 lg:justify-self-end">
        <button
          type="button"
          aria-label={isDark ? '切换到浅色预览' : '切换到深色预览'}
          onClick={onToggleDark}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-[15px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-white"
        >
          登录
        </button>
      </div>
    </header>
  );
}

export default TopBar;
