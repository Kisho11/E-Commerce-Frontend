import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

const ToolbarButton = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-white'
        : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

function TipTapEditor({
  value = '',
  onChange,
  placeholder = 'Write something...',
  disabled = false,
  onImageUpload,
  imageUploadAccept = 'image/png,image/jpeg,.png,.jpg,.jpeg',
  imageUploadMultiple = true,
}) {
  const imageInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const handleImageButtonClick = () => {
    if (disabled || isUploadingImage) return;
    imageInputRef.current?.click();
  };

  const handleImageInputChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !onImageUpload) return;

    setIsUploadingImage(true);
    try {
      const imageUrls = await onImageUpload(files);
      imageUrls.forEach((url) => {
        if (url) editor.chain().focus().setImage({ src: url }).run();
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${disabled ? 'border-slate-200 bg-slate-50' : 'border-gray-300 focus-within:border-primary'}`}>
      {!disabled && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <span className="line-through">S</span>
          </ToolbarButton>
          <span className="mx-1 border-l border-slate-300" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            H3
          </ToolbarButton>
          <span className="mx-1 border-l border-slate-300" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            &#8226; List
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            1. List
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            &#10077;&#10078;
          </ToolbarButton>
          {onImageUpload ? (
            <>
              <span className="mx-1 border-l border-slate-300" />
              <ToolbarButton onClick={handleImageButtonClick} active={false} title="Insert image">
                {isUploadingImage ? 'Uploading...' : 'Image'}
              </ToolbarButton>
              <input
                ref={imageInputRef}
                type="file"
                accept={imageUploadAccept}
                multiple={imageUploadMultiple}
                onChange={handleImageInputChange}
                className="hidden"
              />
            </>
          ) : null}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="tiptap-content px-4 py-3 min-h-[120px] text-slate-800 focus:outline-none"
      />
    </div>
  );
}

export default TipTapEditor;
