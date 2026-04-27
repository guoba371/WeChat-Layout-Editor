import { useEffect, useRef } from 'react';
import type { CSSProperties, RefObject } from 'react';

type EditorPreviewProps = {
  editorRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  themeVariables: CSSProperties;
  onSaveSelection: () => void;
  onEditorInput: () => void;
  onImageSelected: (file: File) => void;
};

const initialHtml = `
  <h1>SaiWechatEdit：把时间留给灵感</h1>
  <p>把公众号文章粘贴到这里，选中文本后使用顶部工具栏调整标题、加粗、高亮和代码样式。</p>
  <blockquote>
    主题系统已接入。点击左侧主题后，这里会通过 CSS 变量更新文章背景、文字、标题和强调色。
  </blockquote>
  <p><br></p>
`;

function EditorPreview({
  editorRef,
  fileInputRef,
  themeVariables,
  onSaveSelection,
  onEditorInput,
  onImageSelected,
}: EditorPreviewProps) {
  const seededRef = useRef(false);

  useEffect(() => {
    if (!editorRef.current || seededRef.current) return;

    editorRef.current.innerHTML = initialHtml;
    seededRef.current = true;
  }, [editorRef]);

  return (
    <>
      <section
        className="editor-canvas min-h-[760px] rounded-[20px] bg-[var(--article-bg)] px-10 pb-16 pt-[92px] leading-[2] text-[var(--article-text)] shadow-[0_28px_80px_rgba(15,23,42,0.10)] transition-colors duration-200"
        style={themeVariables}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onMouseUp={onSaveSelection}
        onKeyUp={onEditorInput}
        onInput={onEditorInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onImageSelected(file);
          event.target.value = '';
        }}
      />
    </>
  );
}

export default EditorPreview;
