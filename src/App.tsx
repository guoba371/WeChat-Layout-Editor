import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import BackToTopButton from './components/BackToTopButton';
import EditorPreview from './components/EditorPreview';
import RightPanel from './components/RightPanel';
import ThemePanel from './components/ThemePanel';
import TopBar from './components/TopBar';
import type { ActiveEditorState, EditorCommand, HeadingLevel } from './components/TopBar';

export type ThemeDefinition = {
  name: string;
  colors: [string, string];
  variables: CSSProperties & {
    '--article-bg': string;
    '--article-text': string;
    '--article-heading': string;
    '--article-accent': string;
    '--article-soft': string;
  };
};

const themes: ThemeDefinition[] = [
  {
    name: '极简黑白',
    colors: ['#0a0b0c', '#64748b'],
    variables: {
      '--article-bg': '#ffffff',
      '--article-text': '#111827',
      '--article-heading': '#050505',
      '--article-accent': '#0a0b0c',
      '--article-soft': '#f6f7f9',
    },
  },
  {
    name: '森染新机',
    colors: ['#2e9f57', '#79ed93'],
    variables: {
      '--article-bg': '#fbfffc',
      '--article-text': '#1f3528',
      '--article-heading': '#0f3d22',
      '--article-accent': '#2e9f57',
      '--article-soft': '#ecfdf3',
    },
  },
  {
    name: '蓝灰专业',
    colors: ['#2563eb', '#64748b'],
    variables: {
      '--article-bg': '#ffffff',
      '--article-text': '#1e293b',
      '--article-heading': '#1e3a8a',
      '--article-accent': '#2563eb',
      '--article-soft': '#eff6ff',
    },
  },
  {
    name: '轻杂志风',
    colors: ['#7c2d12', '#c08457'],
    variables: {
      '--article-bg': '#fffaf6',
      '--article-text': '#38251c',
      '--article-heading': '#431407',
      '--article-accent': '#9a3412',
      '--article-soft': '#fff1e7',
    },
  },
  {
    name: '温和奶油',
    colors: ['#a16207', '#f8dca5'],
    variables: {
      '--article-bg': '#fffdf7',
      '--article-text': '#3f3424',
      '--article-heading': '#70480f',
      '--article-accent': '#b7791f',
      '--article-soft': '#fff7df',
    },
  },
  {
    name: '青提夏日',
    colors: ['#10b981', '#a3e635'],
    variables: {
      '--article-bg': '#fcfff6',
      '--article-text': '#243422',
      '--article-heading': '#27611f',
      '--article-accent': '#65a30d',
      '--article-soft': '#f1fbdc',
    },
  },
  {
    name: '山见晨雾',
    colors: ['#64748b', '#cbd5e1'],
    variables: {
      '--article-bg': '#fbfcfd',
      '--article-text': '#334155',
      '--article-heading': '#1f2937',
      '--article-accent': '#64748b',
      '--article-soft': '#f1f5f9',
    },
  },
  {
    name: '海盐气泡',
    colors: ['#0891b2', '#67e8f9'],
    variables: {
      '--article-bg': '#f8feff',
      '--article-text': '#164e63',
      '--article-heading': '#155e75',
      '--article-accent': '#0891b2',
      '--article-soft': '#ecfeff',
    },
  },
  {
    name: '秋日森林',
    colors: ['#c2410c', '#15803d'],
    variables: {
      '--article-bg': '#fffaf4',
      '--article-text': '#3a2a1e',
      '--article-heading': '#7c2d12',
      '--article-accent': '#c2410c',
      '--article-soft': '#ffedd5',
    },
  },
  {
    name: '薄荷苏打',
    colors: ['#14b8a6', '#22c55e'],
    variables: {
      '--article-bg': '#f7fffc',
      '--article-text': '#134e4a',
      '--article-heading': '#0f766e',
      '--article-accent': '#14b8a6',
      '--article-soft': '#ccfbf1',
    },
  },
  {
    name: '幽夜深蓝',
    colors: ['#1e3a8a', '#0f172a'],
    variables: {
      '--article-bg': '#111827',
      '--article-text': '#cbd5e1',
      '--article-heading': '#eff6ff',
      '--article-accent': '#60a5fa',
      '--article-soft': '#172033',
    },
  },
  {
    name: '炭黑商务',
    colors: ['#0a0b0c', '#475569'],
    variables: {
      '--article-bg': '#171717',
      '--article-text': '#d4d4d8',
      '--article-heading': '#ffffff',
      '--article-accent': '#a3a3a3',
      '--article-soft': '#242424',
    },
  },
  {
    name: '宣纸墨韵',
    colors: ['#171717', '#d6d3d1'],
    variables: {
      '--article-bg': '#fbfaf6',
      '--article-text': '#292524',
      '--article-heading': '#171717',
      '--article-accent': '#44403c',
      '--article-soft': '#f3eee5',
    },
  },
  {
    name: '赛博朋克',
    colors: ['#eab308', '#06b6d4'],
    variables: {
      '--article-bg': '#061017',
      '--article-text': '#bdeeff',
      '--article-heading': '#fef08a',
      '--article-accent': '#06b6d4',
      '--article-soft': '#0b2330',
    },
  },
];

function App() {
  const [isDark, setIsDark] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeDefinition>(themes[0]);
  const [activeEditorState, setActiveEditorState] = useState<ActiveEditorState>({
    heading: 'paragraph',
    bold: false,
    highlight: false,
  });
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);

  function rangeBelongsToEditor(range: Range | null) {
    const editor = editorRef.current;
    if (!editor || !range) return false;

    try {
      return editor.contains(range.commonAncestorContainer);
    } catch {
      return false;
    }
  }

  function getNodeElement(node: Node | null) {
    if (!node) return null;
    return node.nodeType === Node.TEXT_NODE ? node.parentElement : node instanceof HTMLElement ? node : null;
  }

  function findAncestorElement(node: Node | null, predicate: (element: HTMLElement) => boolean) {
    let element = getNodeElement(node);

    while (element && element !== editorRef.current) {
      if (predicate(element)) return element;
      element = element.parentElement;
    }

    return null;
  }

  function getHeadingLevelFromElement(element: HTMLElement | null): HeadingLevel {
    if (!element) return 'paragraph';
    if (element.tagName === 'H1') return 'h1';
    if (element.tagName === 'H2') return 'h2';
    if (element.tagName === 'H3') return 'h3';
    return 'paragraph';
  }

  function updateActiveEditorState(range: Range | null = savedSelectionRef.current) {
    if (!rangeBelongsToEditor(range)) {
      setActiveEditorState({ heading: 'paragraph', bold: false, highlight: false });
      return;
    }

    const block = getCurrentBlockElement(false, range);
    setActiveEditorState({
      heading: getHeadingLevelFromElement(block),
      bold:
        Boolean(
          findAncestorElement(range?.startContainer ?? null, (element) =>
            ['STRONG', 'B'].includes(element.tagName),
          ),
        ) || document.queryCommandState('bold'),
      highlight: Boolean(
        findAncestorElement(range?.startContainer ?? null, (element) => {
          if (element.tagName === 'MARK') return true;
          const backgroundColor = element.style.backgroundColor;
          return element.tagName === 'SPAN' && backgroundColor !== '' && backgroundColor !== 'transparent';
        }),
      ),
    });
  }

  function saveEditorSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!rangeBelongsToEditor(range)) return;

    savedSelectionRef.current = range.cloneRange();
    updateActiveEditorState(savedSelectionRef.current);
  }

  function restoreEditorSelection() {
    const range = savedSelectionRef.current;
    if (!rangeBelongsToEditor(range)) return;

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function focusEditorWithSelection() {
    const editor = editorRef.current;
    if (!editor) return false;

    editor.focus({ preventScroll: true });
    restoreEditorSelection();

    const selection = window.getSelection();
    return Boolean(selection && selection.rangeCount > 0 && rangeBelongsToEditor(selection.getRangeAt(0)));
  }

  function placeCaretAtEnd(element: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedSelectionRef.current = range.cloneRange();
    updateActiveEditorState(range);
  }

  function getCurrentBlockElement(shouldRestore = true, explicitRange?: Range | null) {
    if (shouldRestore) restoreEditorSelection();

    const selection = window.getSelection();
    const range = explicitRange ?? (selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
    if (!range || !rangeBelongsToEditor(range)) return null;

    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== editorRef.current) {
      if (
        node instanceof HTMLElement &&
        ['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'LI'].includes(node.tagName)
      ) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  }

  function convertBlock(block: HTMLElement, tagName: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote' | 'pre') {
    const nextBlock = document.createElement(tagName);
    nextBlock.innerHTML = block.innerHTML.trim() ? block.innerHTML : '<br>';
    block.replaceWith(nextBlock);
    placeCaretAtEnd(nextBlock);
    normalizeEditorContent();
  }

  function setCurrentBlockTag(level: HeadingLevel) {
    const block = getCurrentBlockElement();
    if (!block) return;

    const currentLevel = getHeadingLevelFromElement(block);
    const nextLevel = currentLevel === level ? 'paragraph' : level;
    const nextTag = nextLevel === 'paragraph' ? 'p' : nextLevel;
    convertBlock(block, nextTag);
  }

  function runInlineEditorCommand(command: 'bold' | 'backColor') {
    if (!focusEditorWithSelection()) return;

    if (command === 'bold') {
      document.execCommand('bold');
    } else {
      const range = window.getSelection()?.getRangeAt(0) ?? null;
      const hasHighlight = Boolean(
        findAncestorElement(range?.startContainer ?? null, (element) => {
          if (element.tagName === 'MARK') return true;
          const backgroundColor = element.style.backgroundColor;
          return element.tagName === 'SPAN' && backgroundColor !== '' && backgroundColor !== 'transparent';
        }),
      );
      document.execCommand('backColor', false, hasHighlight ? 'transparent' : '#fde68a');
    }

    saveEditorSelection();
    normalizeEditorContent();
  }

  function runBlockEditorCommand(tagName: 'blockquote' | 'pre') {
    if (!focusEditorWithSelection()) return;

    const block = getCurrentBlockElement(false);
    const nextTagName = block?.tagName === tagName.toUpperCase() ? 'p' : tagName;
    document.execCommand('formatBlock', false, nextTagName);
    saveEditorSelection();
    normalizeEditorContent();
  }

  function runListCommand(command: 'insertUnorderedList' | 'insertOrderedList') {
    if (!focusEditorWithSelection()) return;

    document.execCommand(command);
    saveEditorSelection();
    normalizeEditorContent();
  }

  function insertDivider() {
    if (!focusEditorWithSelection()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!rangeBelongsToEditor(range)) return;

    const divider = document.createElement('hr');
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';

    range.deleteContents();
    range.insertNode(paragraph);
    range.insertNode(divider);
    placeCaretAtEnd(paragraph);
    normalizeEditorContent();
  }

  function normalizeEditorContent() {
    const editor = editorRef.current;
    if (!editor) return;

    if (!editor.textContent?.trim() && editor.querySelectorAll('img,hr').length === 0) {
      editor.innerHTML = '<p><br></p>';
      const paragraph = editor.querySelector('p');
      if (paragraph) placeCaretAtEnd(paragraph);
      return;
    }

    const lastElement = editor.lastElementChild;
    if (!lastElement || ['H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'HR'].includes(lastElement.tagName)) {
      const paragraph = document.createElement('p');
      paragraph.innerHTML = '<br>';
      editor.appendChild(paragraph);
    }
  }

  function handleEditorInput() {
    normalizeEditorContent();
    saveEditorSelection();
  }

  function runEditorCommand(command: EditorCommand) {
    if (typeof command === 'object' && command.type === 'heading') {
      setCurrentBlockTag(command.level);
      return;
    }

    if (command === 'bold') {
      runInlineEditorCommand('bold');
      return;
    }

    if (command === 'highlight') {
      runInlineEditorCommand('backColor');
      return;
    }

    if (command === 'quote') {
      runBlockEditorCommand('blockquote');
      return;
    }

    if (command === 'code') {
      runBlockEditorCommand('pre');
      return;
    }

    if (command === 'unordered-list') {
      runListCommand('insertUnorderedList');
      return;
    }

    if (command === 'ordered-list') {
      runListCommand('insertOrderedList');
      return;
    }

    if (command === 'divider') {
      insertDivider();
      return;
    }

    if (command === 'image') {
      fileInputRef.current?.click();
    }
  }

  return (
    <main
      className={[
        'min-h-screen text-[var(--text)] transition-colors duration-200',
        isDark ? 'app-dark dark text-[var(--dark-text)]' : '',
      ].join(' ')}
    >
      <TopBar
        isDark={isDark}
        activeEditorState={activeEditorState}
        onToggleDark={() => setIsDark((value) => !value)}
        onEditorCommand={runEditorCommand}
      />

      <section className="mx-auto mt-4 grid max-w-[1160px] grid-cols-[170px_minmax(560px,768px)_290px] items-start gap-8 pb-20">
        <ThemePanel themes={themes} activeTheme={activeTheme} onSelectTheme={setActiveTheme} />

        <EditorPreview
          editorRef={editorRef}
          fileInputRef={fileInputRef}
          themeVariables={activeTheme.variables}
          onSaveSelection={saveEditorSelection}
          onEditorInput={handleEditorInput}
        />

        <RightPanel editorRef={editorRef} />
      </section>

      <BackToTopButton />
    </main>
  );
}

export default App;
