import { Check, Copy, LoaderCircle, RotateCcw, Sparkles, StopCircle, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { aiLayoutConfig, hasRemoteAiConfig } from '../config/aiLayout';
import type { AiLayoutMode } from '../config/aiLayout';
import { stripCodeFence, useAIService } from '../hooks/useAIService';

type RightPanelProps = {
  editorRef: RefObject<HTMLDivElement | null>;
};

type AiStatus = 'idle' | 'loading' | 'success';
type LayoutEngine = 'smart' | 'basic';

const modeCopy: Record<AiLayoutMode, string> = {
  smooth: '顺稿微调：优化排版的同时微调润色文案，使内容更顺滑。',
  faithful: '保真模式：仅优化样式与间距，保持原文词句完全不变。',
};

const STREAM_RENDER_INTERVAL = 140;
const STREAM_SCROLL_INTERVAL = 420;

function RightPanel({ editorRef }: RightPanelProps) {
  const [mode, setMode] = useState<AiLayoutMode>('smooth');
  const [layoutEngine, setLayoutEngine] = useState<LayoutEngine>('smart');
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [copyToastVisible, setCopyToastVisible] = useState(false);
  const [message, setMessage] = useState('等待处理，可直接写回编辑器');
  const [processedCount, setProcessedCount] = useState(0);
  const historyStackRef = useRef<string[]>([]);
  const stopRequestedRef = useRef(false);
  const copyToastTimerRef = useRef<number | null>(null);
  const remoteEnabled = hasRemoteAiConfig();
  const { streamLayout, abort } = useAIService();

  const modelLabel = useMemo(() => {
    if (layoutEngine === 'basic') return '基础排版 / 零成本';
    return remoteEnabled ? `${aiLayoutConfig.provider} / ${aiLayoutConfig.model}` : '本地模拟 / 未配置 API Key';
  }, [layoutEngine, remoteEnabled]);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current !== null) {
        window.clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  async function copyLayoutResult() {
    const editor = editorRef.current;
    if (!editor) return;

    const html = serializeEditorHtmlForClipboard(editor);
    const text = editor.innerText;

    if ('ClipboardItem' in window && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(html);
    }

    showCopyToast();
    setProcessedCount(editor.innerText.trim().length);
  }

  function showCopyToast() {
    if (copyToastTimerRef.current !== null) {
      window.clearTimeout(copyToastTimerRef.current);
    }

    setCopyToastVisible(true);
    copyToastTimerRef.current = window.setTimeout(() => {
      setCopyToastVisible(false);
      copyToastTimerRef.current = null;
    }, 1800);
  }

  async function startAILayout() {
    const editor = editorRef.current;
    if (!editor) return;

    if (aiStatus === 'loading') {
      stopAndRestore();
      return;
    }

    const sourceHtml = editor.innerHTML;
    historyStackRef.current.push(sourceHtml);
    stopRequestedRef.current = false;

    setAiStatus('loading');
    setMessage('AI 正在理解内容...');
    setProcessedCount(0);
    editor.innerHTML = '';

    let pendingHtml = '';
    let renderTimer: number | null = null;
    let lastScrollAt = 0;

    const flushRender = (forceScroll = false) => {
      if (!pendingHtml || stopRequestedRef.current) return;

      editor.innerHTML = stripCodeFence(pendingHtml);
      setProcessedCount(editor.innerText.trim().length);

      const now = Date.now();
      if (forceScroll || now - lastScrollAt > STREAM_SCROLL_INTERVAL) {
        lastScrollAt = now;
        requestAnimationFrame(() => softlyFollowGeneratedContent(editor));
      }
    };

    const scheduleRender = (fullHtml: string) => {
      pendingHtml = fullHtml;
      if (renderTimer !== null) return;

      renderTimer = window.setTimeout(() => {
        renderTimer = null;
        flushRender();
      }, STREAM_RENDER_INTERVAL);
    };

    try {
      await streamLayout({
        engine: layoutEngine === 'smart' ? 'token' : 'local',
        html: sourceHtml,
        mode,
        onStatus: setMessage,
        onChunk: (_chunk, fullHtml) => {
          if (stopRequestedRef.current) return;

          scheduleRender(fullHtml);
        },
      });

      if (renderTimer !== null) {
        window.clearTimeout(renderTimer);
        renderTimer = null;
      }
      flushRender(true);
      ensureTrailingParagraph(editor);
      setAiStatus('success');
      setMessage('排版完成，已写回编辑器');
      setProcessedCount(editor.innerText.trim().length);
    } catch (error) {
      if (renderTimer !== null) {
        window.clearTimeout(renderTimer);
        renderTimer = null;
      }

      if (stopRequestedRef.current) return;

      const snapshot = historyStackRef.current.pop();
      if (snapshot) editor.innerHTML = snapshot;
      setAiStatus('idle');
      setMessage(error instanceof Error ? error.message : 'AI 排版失败，已恢复原文');
      setProcessedCount(editor.innerText.trim().length);
    }
  }

  function stopAndRestore() {
    const editor = editorRef.current;
    if (!editor) return;

    stopRequestedRef.current = true;
    abort();
    const snapshot = historyStackRef.current.pop();
    if (snapshot) {
      editor.innerHTML = snapshot;
      setProcessedCount(editor.innerText.trim().length);
    }

    setAiStatus('idle');
    setMessage('已停止，并恢复到原始版本');
  }

  function restoreOriginal() {
    const editor = editorRef.current;
    if (!editor) return;

    const snapshot = historyStackRef.current.pop();
    if (!snapshot) return;

    editor.innerHTML = snapshot;
    setAiStatus('idle');
    setMessage('已回退到原始版本');
    setProcessedCount(editor.innerText.trim().length);
  }

  const isLoading = aiStatus === 'loading';
  const statusTitle = isLoading ? message : message;

  return (
    <aside className="right-panel space-y-4 lg:sticky lg:top-[90px] lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto lg:pr-1">
      <button
        type="button"
        onClick={copyLayoutResult}
        aria-live="polite"
        className={[
          'right-panel-copy flex h-14 w-full items-center justify-center gap-3 rounded-[18px] text-sm font-black text-white transition',
          copyToastVisible
            ? 'bg-[#10c866] shadow-[0_16px_36px_rgba(16,200,102,0.28)] hover:bg-[#10c866]'
            : 'bg-[#ad7e80] shadow-[0_16px_36px_rgba(173,126,128,0.30)] hover:bg-[#b9898b]',
        ].join(' ')}
      >
        {copyToastVisible ? <Check size={20} strokeWidth={2.8} /> : <Copy size={20} strokeWidth={2.4} />}
        {copyToastVisible ? '内容已复制' : '复制正文内容'}
      </button>

      <section className="right-panel-card rounded-[18px] border border-slate-200/80 bg-white/92 px-6 py-7 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-[18px] dark:border-[#322426] dark:bg-[#0f0b0c]/92 dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="flex items-center gap-4">
          <span className="right-panel-icon grid h-11 w-11 place-items-center rounded-2xl bg-[#f7e9ea] text-[#b7797e] dark:bg-white/7 dark:text-[#c69296]">
            <Sparkles size={22} strokeWidth={2.2} />
          </span>
          <h2 className="right-panel-title text-[21px] font-black tracking-normal">AI 一键排版</h2>
        </div>

        <div className="right-panel-tabs mt-7 grid h-11 grid-cols-2 rounded-[18px] bg-slate-100 p-1 text-sm font-black text-slate-400 dark:bg-white/7 dark:text-white/38">
          <button
            type="button"
            onClick={() => setMode('smooth')}
            disabled={isLoading}
            className={[
              'rounded-[14px] transition disabled:cursor-not-allowed',
              mode === 'smooth'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-white/25 dark:text-white'
                : 'hover:text-slate-600 dark:hover:text-white/70',
            ].join(' ')}
          >
            顺稿微调
          </button>
          <button
            type="button"
            onClick={() => setMode('faithful')}
            disabled={isLoading}
            className={[
              'rounded-[14px] transition disabled:cursor-not-allowed',
              mode === 'faithful'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-white/25 dark:text-white'
                : 'hover:text-slate-600 dark:hover:text-white/70',
            ].join(' ')}
          >
            保真排版
          </button>
        </div>

        <p className="right-panel-desc mt-6 min-h-[56px] text-[13px] font-medium leading-7 text-slate-500 dark:text-white/42">
          {isLoading ? 'AI 正在理解内容，并逐段写回编辑器。' : modeCopy[mode]}
        </p>

        <div
          key={`${aiStatus}-${message}`}
          className="right-panel-status ai-status-fade mt-5 rounded-[18px] border border-slate-200 bg-slate-50/85 px-5 py-5 dark:border-white/9 dark:bg-white/[0.035]"
        >
          <p className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            {isLoading ? <LoaderCircle size={18} className="animate-spin text-[#ad7e80]" /> : null}
            {statusTitle}
          </p>
          <div className="my-4 h-px bg-slate-200 dark:bg-white/8" />
          <p className="px-0.5 text-sm font-bold text-slate-500 dark:text-white/38">
            已处理 {processedCount} 个字符
          </p>
          <p className="mt-2 truncate px-0.5 text-[11px] font-medium text-slate-400 dark:text-white/28">
            {modelLabel}
          </p>
        </div>

        <div className="mt-5 rounded-lg bg-slate-100 p-1 text-[12px] font-black text-slate-400 dark:bg-white/5 dark:text-white/38">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setLayoutEngine('smart')}
              disabled={isLoading}
              className={[
                'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 transition disabled:cursor-not-allowed',
                layoutEngine === 'smart'
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-white/20 dark:text-white'
                  : 'hover:text-slate-600 dark:hover:text-white/70',
              ].join(' ')}
            >
              <Sparkles size={15} />
              <span>智选排版</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutEngine('basic')}
              disabled={isLoading}
              className={[
                'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 transition disabled:cursor-not-allowed',
                layoutEngine === 'basic'
                  ? 'bg-white text-slate-950 shadow-sm dark:bg-white/20 dark:text-white'
                  : 'hover:text-slate-600 dark:hover:text-white/70',
              ].join(' ')}
            >
              <Zap size={15} />
              <span>基础排版</span>
            </button>
          </div>
        </div>

        <p className="mt-3 min-h-5 text-[12px] font-bold text-slate-500 dark:text-white/38">
          {layoutEngine === 'smart'
            ? '智选模式：基于 GPT-5.5 深度理解内容逻辑。'
            : '基础模式：基于本地规则快速优化间距与样式。'}
        </p>

        <button
          type="button"
          onClick={startAILayout}
          className={[
            'right-panel-main-button mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[18px] text-sm font-black text-white transition',
            isLoading
              ? 'ai-breathing-button bg-[#b84d57] shadow-[0_18px_42px_rgba(184,77,87,0.42)] hover:bg-[#a9414b]'
              : 'bg-[#ad7e80] shadow-[0_16px_36px_rgba(173,126,128,0.34)] hover:bg-[#b9898b]',
          ].join(' ')}
        >
          {isLoading ? (
            <>
              <StopCircle size={20} strokeWidth={2.2} />
              停止并恢复
            </>
          ) : (
            <>
              <Zap size={20} fill="currentColor" strokeWidth={2.2} />
              一键 AI 排版
              <span className="inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-full bg-white/16 px-2 text-xs">
                <Zap size={12} fill="currentColor" />
                1
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={restoreOriginal}
          disabled={historyStackRef.current.length === 0 || isLoading}
          className="right-panel-restore-button mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-[16px] border border-slate-200 bg-white text-sm font-black text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/12 dark:bg-white/[0.035] dark:text-white/62 dark:hover:border-white/20 dark:hover:text-white"
        >
          <RotateCcw size={18} />
          回退到原始版本
        </button>
      </section>
    </aside>
  );
}

function ensureTrailingParagraph(editor: HTMLDivElement) {
  if (editor.lastElementChild?.tagName === 'P') return;

  const paragraph = document.createElement('p');
  paragraph.innerHTML = '<br>';
  editor.appendChild(paragraph);
}

function softlyFollowGeneratedContent(editor: HTMLDivElement) {
  editor.scrollTop = editor.scrollHeight;

  const rect = editor.getBoundingClientRect();
  const viewportPadding = 120;
  const overflow = rect.bottom - window.innerHeight + viewportPadding;

  if (overflow <= 0) return;

  window.scrollBy({
    top: Math.min(overflow, 220),
    behavior: 'auto',
  });
}

function serializeEditorHtmlForClipboard(editor: HTMLDivElement) {
  const clone = editor.cloneNode(true) as HTMLDivElement;

  clone.querySelectorAll('pre').forEach((pre) => {
    const element = pre as HTMLElement;
    element.style.maxWidth = '100%';
    element.style.boxSizing = 'border-box';
    element.style.whiteSpace = 'pre-wrap';
    element.style.overflowWrap = 'anywhere';
    element.style.wordBreak = 'break-word';
    element.style.overflow = 'hidden';
    element.style.tabSize = '2';
  });

  clone.querySelectorAll('pre code, code').forEach((code) => {
    const element = code as HTMLElement;
    element.style.display = 'block';
    element.style.maxWidth = '100%';
    element.style.whiteSpace = 'pre-wrap';
    element.style.overflowWrap = 'anywhere';
    element.style.wordBreak = 'break-word';
  });

  return clone.innerHTML;
}

export default RightPanel;
