import React from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Node, mergeAttributes } from '@tiptap/core';
import { normalizeProductContent, isProductContentEmpty } from '../utils/productContent';

// ---------------------------------------------------------------------------
// Column / TwoColumn read-only views
// ---------------------------------------------------------------------------

function ColumnView() {
  return (
    <NodeViewWrapper
      as="div"
      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-5"
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
// Callout read-only view
// ---------------------------------------------------------------------------

function CalloutView({ node }) {
  return (
    <NodeViewWrapper as="div" className="my-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
      {node.attrs.title && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-amber-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01M10.3 3.9 1.8 18.4A1.2 1.2 0 0 0 2.8 20h18.4a1.2 1.2 0 0 0 1-1.6L13.7 3.9a1.2 1.2 0 0 0-2.4 0Z" />
            </svg>
          </span>
          <span className="text-sm font-bold text-amber-800">{node.attrs.title}</span>
        </div>
      )}
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
// Renderer
// ---------------------------------------------------------------------------

const EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  Link.configure({ openOnClick: true, autolink: true }),
  Image.configure({ inline: false }),
  Column,
  TwoColumn,
  Callout,
];

function ProductContentRenderer({ content }) {
  const normalized = normalizeProductContent(content);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: normalized,
    editable: false,
  });

  // Sync content when the prop changes (e.g. tab switching)
  React.useEffect(() => {
    if (!editor) return;
    const next = normalizeProductContent(content);
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(next)) {
      editor.commands.setContent(next, false);
    }
  }, [editor, content]);

  if (isProductContentEmpty(content)) return null;
  if (!editor) return null;

  return (
    <>
      <EditorContent editor={editor} className="prose-renderer" />
      <style>{`
        .prose-renderer .ProseMirror { outline: none; }
        .prose-renderer .ProseMirror p { margin: 0 0 0.75em; color: #334155; line-height: 1.75; }
        .prose-renderer .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; color: #e11d48; margin: 1em 0 0.25em; }
        .prose-renderer .ProseMirror h2 { font-size: 1.15rem; font-weight: 700; color: #e11d48; margin: 0.9em 0 0.25em; }
        .prose-renderer .ProseMirror h3 { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0.8em 0 0.25em; }
        .prose-renderer .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0.25em 0 0.75em; color: #475569; }
        .prose-renderer .ProseMirror ol { list-style: decimal; padding-left: 1.5em; margin: 0.25em 0 0.75em; color: #475569; }
        .prose-renderer .ProseMirror li { margin-bottom: 0.25em; }
        .prose-renderer .ProseMirror blockquote { border-left: 4px solid #e11d48; background: #f8fafc; padding: 0.75em 1em; margin: 0.75em 0; border-radius: 0 0.75rem 0.75rem 0; color: #475569; font-style: italic; }
        .prose-renderer .ProseMirror a { color: #e11d48; text-decoration: underline; }
        .prose-renderer .ProseMirror img { max-width: 100%; border-radius: 0.75rem; margin: 0.75em 0; }
        .prose-renderer .ProseMirror hr { border-color: #e2e8f0; margin: 1.5em 0; }
        .prose-renderer .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
        .prose-renderer .ProseMirror th, .prose-renderer .ProseMirror td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; }
        .prose-renderer .ProseMirror th { background: #f8fafc; font-weight: 600; }
        .prose-renderer .ProseMirror code { background: #f1f5f9; border-radius: 0.3rem; padding: 0.1em 0.4em; font-size: 0.85em; font-family: ui-monospace, 'Cascadia Code', monospace; color: #0f172a; }
        .prose-renderer .ProseMirror pre { background: #1e293b; border-radius: 0.75rem; padding: 1em 1.25em; margin: 0.75em 0; overflow-x: auto; }
        .prose-renderer .ProseMirror pre code { background: none; color: #e2e8f0; padding: 0; font-size: 0.875em; }
      `}</style>
    </>
  );
}

export default ProductContentRenderer;
