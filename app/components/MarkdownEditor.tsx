'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Convert Tiptap JSON to Markdown
function editorToMarkdown(editor: any): string {
  const json = editor.getJSON();
  return jsonToMarkdown(json);
}

function jsonToMarkdown(node: any): string {
  if (!node) return '';
  
  const { type, content, marks, attrs, text } = node;
  
  // Handle text nodes with marks
  if (type === 'text') {
    let result = text || '';
    if (marks) {
      marks.forEach((mark: any) => {
        if (mark.type === 'bold') result = `**${result}**`;
        if (mark.type === 'italic') result = `_${result}_`;
      });
    }
    return result;
  }
  
  // Handle block nodes
  const childContent = content ? content.map(jsonToMarkdown).join('') : '';
  
  switch (type) {
    case 'doc':
      return childContent;
    case 'paragraph':
      return childContent + '\n\n';
    case 'heading':
      const level = attrs?.level || 1;
      return '#'.repeat(level) + ' ' + childContent + '\n\n';
    case 'bulletList':
      return content.map((item: any) => {
        const itemText = jsonToMarkdown(item).trim();
        return '- ' + itemText.replace(/\n\n$/, '\n');
      }).join('') + '\n';
    case 'orderedList':
      return content.map((item: any, index: number) => {
        const itemText = jsonToMarkdown(item).trim();
        return `${index + 1}. ` + itemText.replace(/\n\n$/, '\n');
      }).join('') + '\n';
    case 'listItem':
      return childContent;
    case 'horizontalRule':
      return '---\n\n';
    default:
      return childContent;
  }
}

// Convert Markdown to HTML for Tiptap
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$2</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Bullet lists
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    if (!match.includes('<ul>')) return '<ol>' + match + '</ol>';
    return match;
  });
  
  // Paragraphs (blank line separated)
  const lines = html.split('\n\n');
  html = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    if (line.startsWith('<h') || line.startsWith('<ul>') || line.startsWith('<ol>') || line.startsWith('<hr>')) {
      return line;
    }
    return '<p>' + line + '</p>';
  }).join('');
  
  return html;
}

export default function MarkdownEditor({ value, onChange, placeholder = 'Start typing...', minHeight = '200px' }: MarkdownEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownToHtml(value || ''),
    onUpdate: ({ editor }) => {
      const markdown = editorToMarkdown(editor);
      onChange(markdown.trim());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[' + minHeight + '] p-3',
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editorToMarkdown(editor).trim()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(markdownToHtml(value || ''));
      // Restore cursor position if possible
      if (from === to) {
        editor.commands.setTextSelection(from);
      }
    }
  }, [value, editor]);

  if (!isMounted || !editor) {
    return (
      <div className="rounded-lg border-2 border-orange-200 bg-white p-3" style={{ minHeight }}>
        <div className="text-gray-400 text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-orange-200 bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-orange-100 p-2 bg-orange-50/30">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-3 py-1 text-sm font-semibold transition ${
            editor.isActive('bold')
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Bold (Ctrl/Cmd + B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-3 py-1 text-sm italic transition ${
            editor.isActive('italic')
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Italic (Ctrl/Cmd + I)"
        >
          I
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-3 py-1 text-sm font-semibold transition ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-3 py-1 text-sm font-semibold transition ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded px-3 py-1 text-sm font-semibold transition ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Heading 3"
        >
          H3
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-3 py-1 text-sm transition ${
            editor.isActive('bulletList')
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-3 py-1 text-sm transition ${
            editor.isActive('orderedList')
              ? 'bg-orange-200 text-orange-900'
              : 'bg-white text-gray-700 hover:bg-orange-100'
          }`}
          title="Numbered List"
        >
          1. List
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="rounded px-3 py-1 text-sm bg-white text-gray-700 hover:bg-orange-100 transition"
          title="Horizontal Line"
        >
          ―
        </button>
        
        <div className="w-px bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => {
            const placeholder = '[PHOTO PLACEHOLDER - Insert emailed photo here]';
            editor.chain().focus().insertContent(placeholder).run();
          }}
          className="rounded px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition font-medium"
          title="Insert Photo Placeholder"
        >
          📷 Photo
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="text-amber-700"
        style={{ minHeight }}
      />
    </div>
  );
}
