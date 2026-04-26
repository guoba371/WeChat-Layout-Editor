import { useCallback, useRef } from 'react';
import { aiLayoutConfig } from '../config/aiLayout';
import type { AiLayoutMode } from '../config/aiLayout';

export type AILayoutEngine = 'token' | 'local';

type StreamLayoutInput = {
  engine: AILayoutEngine;
  html: string;
  mode: AiLayoutMode;
  onChunk: (chunk: string, fullHtml: string) => void;
  onStatus?: (message: string) => void;
};

type LocalLayoutChunk = {
  html: string;
  message: string;
};

const systemPrompt = [
  '你是微信公众号排版助手。',
  '只返回可以直接写入 contentEditable 编辑器的 HTML 片段。',
  '不要返回 Markdown 代码围栏，不要解释。',
  '保留文章原意，优化标题层级、段落节奏、重点加粗、引用块和代码块。',
  '可使用的标签仅包括：h1, h2, h3, p, strong, mark, blockquote, pre, ul, ol, li, hr, br。',
].join('\n');

export function useAIService() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const streamLayout = useCallback(
    async ({ engine, html, mode, onChunk, onStatus }: StreamLayoutInput) => {
      abort();

      if (engine === 'token' && !aiLayoutConfig.apiKey) {
        throw new Error('缺少 VITE_AI_API_KEY，请先配置中转站 API Key');
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (engine === 'local') {
        let fullHtml = '';
        onStatus?.('基础排版正在解析内容...');

        try {
          for await (const chunk of localRuleEngine(html, mode, controller.signal)) {
            if (controller.signal.aborted) return stripCodeFence(fullHtml);

            fullHtml += chunk.html;
            onChunk(chunk.html, stripCodeFence(fullHtml));
            onStatus?.(chunk.message);
          }

          onStatus?.('排版完成，已写回编辑器');
          return stripCodeFence(fullHtml);
        } finally {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        }
      }

      onStatus?.('AI 正在理解内容...');

      try {
        const response = await fetch(getChatCompletionsUrl(), {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiLayoutConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: aiLayoutConfig.model || 'gpt-5.5',
            temperature: aiLayoutConfig.temperature,
            stream: true,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: [
                  `排版模式：${mode === 'smooth' ? '顺稿微调，可轻微润色' : '保真排版，不改变原文词句'}`,
                  '请优化下面 HTML，并流式返回优化后的 HTML 片段：',
                  html,
                ].join('\n\n'),
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`AI 请求失败：${response.status}`);
        }

        if (!response.body) {
          throw new Error('AI 响应不支持流式读取');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullHtml = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') {
              onStatus?.('排版完成，已写回编辑器');
              return stripCodeFence(fullHtml);
            }

            const chunk = readOpenAIContentDelta(payload);
            if (!chunk) continue;

            fullHtml += chunk;
            onChunk(chunk, stripCodeFence(fullHtml));
            onStatus?.('正在实时写回编辑器...');
          }
        }

        return stripCodeFence(fullHtml);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [abort],
  );

  return { streamLayout, abort };
}

function readOpenAIContentDelta(payload: string) {
  try {
    const data = JSON.parse(payload);
    const delta = data?.choices?.[0]?.delta?.content ?? data?.choices?.[0]?.message?.content;
    return typeof delta === 'string' ? delta : '';
  } catch {
    return '';
  }
}

async function* localRuleEngine(
  html: string,
  mode: AiLayoutMode,
  signal: AbortSignal,
): AsyncGenerator<LocalLayoutChunk> {
  const paragraphs = extractTextBlocks(html);
  const total = paragraphs.length;

  for (const [index, block] of paragraphs.entries()) {
    throwIfAborted(signal);
    await abortableDelay(randomBetween(index === 0 ? 120 : 180, index === 0 ? 260 : 420), signal);

    const htmlChunk = formatLocalBlock(block, index, mode, total);
    const baseMessage =
      index === 0 ? '基础排版正在整理标题...' : `基础排版正在处理第 ${index + 1}/${total} 段...`;

    for await (const chunk of streamFormattedHtml(htmlChunk, baseMessage, signal)) {
      yield chunk;
    }
  }
}

async function* streamFormattedHtml(
  html: string,
  message: string,
  signal: AbortSignal,
): AsyncGenerator<LocalLayoutChunk> {
  for (const token of tokenizeFormattedHtml(html)) {
    throwIfAborted(signal);

    if (isHtmlToken(token)) {
      yield { html: token, message };
      continue;
    }

    const characters = Array.from(token);
    let cursor = 0;

    while (cursor < characters.length) {
      throwIfAborted(signal);

      const sliceSize = Math.floor(randomBetween(8, 22));
      const sliceCharacters = characters.slice(cursor, cursor + sliceSize);
      const slice = sliceCharacters.join('');
      cursor += sliceCharacters.length;

      const speed = randomBetween(100, 200);
      const jitter = randomBetween(18, 90);
      await abortableDelay((countVisibleCharacters(slice) / speed) * 1000 + jitter, signal);

      yield {
        html: slice,
        message,
      };
    }
  }
}

function tokenizeFormattedHtml(html: string) {
  return html.match(/<[^>]+>|&[a-zA-Z0-9#]+;|[^<&]+/g) ?? [];
}

function isHtmlToken(token: string) {
  return token.startsWith('<') || /^&[a-zA-Z0-9#]+;$/.test(token);
}

function countVisibleCharacters(value: string) {
  return Array.from(value.replace(/&[a-zA-Z0-9#]+;/g, 'x')).length || 1;
}

function extractTextBlocks(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const selector = 'h1, h2, h3, p, li, blockquote, pre';
  const nodes = Array.from(template.content.querySelectorAll(selector));
  const blocks = nodes
    .map((node) => ({
      tagName: node.tagName.toLowerCase(),
      text: normalizeText(node.textContent ?? ''),
    }))
    .filter((block) => block.text.length > 0);

  if (blocks.length > 0) return blocks;

  const fallbackText = normalizeText(template.content.textContent ?? html);
  if (!fallbackText) {
    return [{ tagName: 'p', text: '请输入公众号正文内容。' }];
  }

  return fallbackText.split(/\n{2,}|(?<=。)\s+/).map((text) => ({
    tagName: 'p',
    text: normalizeText(text),
  }));
}

function formatLocalBlock(
  block: { tagName: string; text: string },
  index: number,
  mode: AiLayoutMode,
  total: number,
) {
  const text = block.text;
  const escaped = escapeHtml(text);

  if (block.tagName === 'pre') {
    return `<pre><code>${escaped}</code></pre>`;
  }

  if (block.tagName === 'blockquote' || /^(&gt;|>|引用[:：])/.test(text)) {
    return `<blockquote>${escapeHtml(text.replace(/^(>|引用[:：])\s*/, ''))}</blockquote>`;
  }

  if (isTitleLike(block.tagName, text, index)) {
    return index === 0 ? `<h1>${escaped}</h1>` : `<h2>${escaped}</h2>`;
  }

  const bodyText = mode === 'smooth' ? text.replace(/\s*([，。！？；：])/g, '$1') : text;
  const paragraphs = splitReadableParagraphs(bodyText, total);

  return paragraphs.map((paragraph) => `<p>${emphasizeKeyPhrases(paragraph)}</p>`).join('');
}

function isTitleLike(tagName: string, text: string, index: number) {
  if (/^h[1-3]$/.test(tagName)) return true;
  if (index === 0 && text.length <= 32) return true;
  if (text.length > 42) return false;
  return /^(第[一二三四五六七八九十\d]+[章节部分]|[一二三四五六七八九十\d]+[、.．]|#{1,3}\s+)/.test(text);
}

function splitReadableParagraphs(text: string, total: number) {
  if (text.length < 110 || total > 4) return [text];

  const sentences = splitSentences(text);
  const paragraphs: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > 92 && current) {
      paragraphs.push(current);
      current = sentence;
      continue;
    }

    current += sentence;
  }

  if (current) paragraphs.push(current);
  return paragraphs;
}

function emphasizeKeyPhrases(text: string) {
  const labelMatch = text.match(/^([^。！？!?；;：:]{2,12}[：:])(.*)$/);

  if (labelMatch) {
    return `<strong>${escapeHtml(labelMatch[1])}</strong>${emphasizeKeywords(labelMatch[2])}`;
  }

  return emphasizeKeywords(text);
}

function emphasizeKeywords(text: string) {
  return escapeHtml(text).replace(
    /(重点|关键|注意|总结|建议|核心|必须|推荐|优势|结论|风险|机会)/g,
    '<strong>$1</strong>',
  );
}

function splitSentences(text: string) {
  const matches = text.match(/[^。！？!?]+[。！？!?]?/g);
  return matches?.filter(Boolean) ?? [text];
}

function normalizeText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function escapeHtml(value: string) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

function abortableDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      rejectAbort();
      return;
    }

    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    function handleAbort() {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', handleAbort);
      rejectAbort();
    }

    function rejectAbort() {
      reject(new DOMException('AI layout aborted', 'AbortError'));
    }

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('AI layout aborted', 'AbortError');
  }
}

export function stripCodeFence(value: string) {
  return value
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/```\s*$/g, '')
    .trim();
}

function getChatCompletionsUrl() {
  if (import.meta.env.DEV) return '/ai-api/chat/completions';

  const baseUrl = aiLayoutConfig.baseUrl.replace(/\/$/, '');
  const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  return `${normalizedBaseUrl}/chat/completions`;
}
