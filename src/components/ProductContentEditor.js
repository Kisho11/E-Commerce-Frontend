import React, { useCallback } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Node, mergeAttributes } from '@tiptap/core';
import { normalizeProductContent } from '../utils/productContent';
import UiIcon from './UiIcon';

// ---------------------------------------------------------------------------
// Custom node: TwoColumn
// ---------------------------------------------------------------------------

function ColumnView() {
  return (
    <NodeViewWrapper
      as="div"
      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4"
    >
      <NodeViewContent as="div" />
    </NodeViewWrapper>
  );
}

const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  isolating: true,
  parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column' }), 0];
  },
  addNodeView() { return ReactNodeViewRenderer(ColumnView); },
});

function TwoColumnView() {
  return (
    <NodeViewWrapper as="div" className="my-2">
      <NodeViewContent as="div" className="flex gap-4" />
    </NodeViewWrapper>
  );
}

const TwoColumn = Node.create({
  name: 'twoColumn',
  group: 'block',
  content: 'column{2}',
  parseHTML() { return [{ tag: 'div[data-type="two-column"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'two-column' }), 0];
  },
  addNodeView() { return ReactNodeViewRenderer(TwoColumnView); },
});

// ---------------------------------------------------------------------------
// Custom node: Callout
// ---------------------------------------------------------------------------

function CalloutView({ node, updateAttributes }) {
  return (
    <NodeViewWrapper as="div" className="my-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-amber-600">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 3.9 1.8 18.4A1.2 1.2 0 0 0 2.8 20h18.4a1.2 1.2 0 0 0 1-1.6L13.7 3.9a1.2 1.2 0 0 0-2.4 0Z" />
          </svg>
        </span>
        <input
          type="text"
          value={node.attrs.title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="Callout title"
          className="flex-1 bg-transparent text-sm font-bold text-amber-800 placeholder-amber-400 focus:outline-none"
        />
      </div>
      <NodeViewContent as="div" className="text-sm text-amber-900" />
    </NodeViewWrapper>
  );
}

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  isolating: true,
  addAttributes() {
    return { title: { default: 'Important Information' } };
  },
  parseHTML() { return [{ tag: 'div[data-type="callout"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
  },
  addNodeView() { return ReactNodeViewRenderer(CalloutView); },
});

// ---------------------------------------------------------------------------
// Toolbar button helpers
// ---------------------------------------------------------------------------

function TBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-semibold transition
        ${active
          ? 'bg-slate-900 text-white'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
    >
      {children}
    </button>
  );
}

function TBtnIcon({ icon, ...rest }) {
  return (
    <TBtn {...rest}>
      <UiIcon name={icon} className="h-4 w-4" />
    </TBtn>
  );
}

function TSep() {
  return <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />;
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true }),
  Image.configure({ inline: false }),
  Placeholder.configure({ placeholder: 'Start writing…' }),
  Column,
  TwoColumn,
  Callout,
];

function insertTwoColumn(editor) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: 'twoColumn',
      content: [
        { type: 'column', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Column heading' }] }, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }] }] }] },
        { type: 'column', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Column heading' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] },
      ],
    })
    .run();
}

function insertCallout(editor) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: 'callout',
      attrs: { title: 'Important Information' },
      content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add your note here' }] }] }] }],
    })
    .run();
}

function insertImage(editor) {
  const url = window.prompt('Image URL');
  if (!url) return;
  editor.chain().focus().setImage({ src: url }).run();
}

function setLink(editor) {
  const prev = editor.getAttributes('link').href;
  const url = window.prompt('URL', prev || 'https://');
  if (url === null) return;
  if (!url) { editor.chain().focus().unsetLink().run(); return; }
  editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
}

function ProductContentEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: normalizeProductContent(value),
    onUpdate({ editor: e }) {
      onChange(e.getJSON());
    },
  });

  // Sync external value resets (e.g. form reset or edit-mode load)
  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (!editor) return;
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    const normalized = normalizeProductContent(value);
    // Only replace if the document actually changed to avoid cursor jumping
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(normalized)) {
      editor.commands.setContent(normalized, false);
    }
  }, [editor, value]);

  const is = useCallback(
    (name, attrs) => (editor ? editor.isActive(name, attrs) : false),
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
        {/* Inline formatting */}
        <TBtnIcon icon="bold"      title="Bold"      active={is('bold')}      onClick={() => editor.chain().focus().toggleBold().run()} />
        <TBtnIcon icon="italic"    title="Italic"    active={is('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()} />
        <TBtnIcon icon="underline" title="Underline" active={is('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <TBtn title="Strikethrough" active={is('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through text-sm font-bold leading-none">S</span>
        </TBtn>
        <TBtnIcon icon="link" title="Link" active={is('link')} onClick={() => setLink(editor)} />

        <TSep />

        {/* Headings */}
        <TBtn title="Heading 1" active={is('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <span className="text-xs font-bold">H1</span>
        </TBtn>
        <TBtn title="Heading 2" active={is('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <span className="text-xs font-bold">H2</span>
        </TBtn>
        <TBtn title="Heading 3" active={is('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <span className="text-xs font-bold">H3</span>
        </TBtn>

        <TSep />

        {/* Lists */}
        <TBtnIcon icon="list"        title="Bullet list"   active={is('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <TBtnIcon icon="orderedList" title="Numbered list" active={is('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <TBtnIcon icon="quote"       title="Blockquote"    active={is('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()} />

        <TSep />

        {/* Media */}
        <TBtnIcon icon="image" title="Insert image" active={false} onClick={() => insertImage(editor)} />

        <TSep />

        {/* Custom blocks */}
        <TBtn title="Insert two-column layout" active={false} onClick={() => insertTwoColumn(editor)}>
          <span className="text-xs font-semibold whitespace-nowrap">Two Columns</span>
        </TBtn>
        <TBtn title="Insert callout box" active={false} onClick={() => insertCallout(editor)}>
          <span className="text-xs font-semibold whitespace-nowrap">Callout</span>
        </TBtn>
      </div>

      {/* Editor body */}
      <EditorContent
        editor={editor}
        className="min-h-[200px] px-5 py-4 focus-within:outline-none prose-editor"
      />

      <style>{`
        .prose-editor .ProseMirror { outline: none; min-height: 200px; }
        .prose-editor .ProseMirror p { margin: 0 0 0.75em; color: #334155; line-height: 1.75; }
        .prose-editor .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; color: #0f172a; margin: 1em 0 0.5em; }
        .prose-editor .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0.9em 0 0.4em; }
        .prose-editor .ProseMirror h3 { font-size: 1.05rem; font-weight: 600; color: #1e293b; margin: 0.8em 0 0.4em; }
        .prose-editor .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0 0.75em; color: #475569; }
        .prose-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0 0.75em; color: #475569; }
        .prose-editor .ProseMirror li { margin-bottom: 0.25em; }
        .prose-editor .ProseMirror blockquote { border-left: 4px solid #e11d48; background: #f8fafc; padding: 0.75em 1em; margin: 0.75em 0; border-radius: 0 0.75rem 0.75rem 0; color: #475569; font-style: italic; }
        .prose-editor .ProseMirror a { color: #e11d48; text-decoration: underline; }
        .prose-editor .ProseMirror img { max-width: 100%; border-radius: 0.75rem; margin: 0.75em 0; }
        .prose-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; float: left; height: 0; }
        .prose-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
        .prose-editor .ProseMirror th, .prose-editor .ProseMirror td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; text-align: left; }
        .prose-editor .ProseMirror th { background: #f8fafc; font-weight: 600; }
        .prose-editor .ProseMirror .selectedCell { background: #fef3c7; }
        .prose-editor .ProseMirror code { background: #f1f5f9; border-radius: 0.3rem; padding: 0.1em 0.4em; font-size: 0.85em; font-family: ui-monospace, 'Cascadia Code', monospace; color: #0f172a; }
        .prose-editor .ProseMirror pre { background: #1e293b; border-radius: 0.75rem; padding: 1em 1.25em; margin: 0.75em 0; overflow-x: auto; }
        .prose-editor .ProseMirror pre code { background: none; color: #e2e8f0; padding: 0; font-size: 0.875em; }
      `}</style>
    </div>
  );
}

export default ProductContentEditor;
