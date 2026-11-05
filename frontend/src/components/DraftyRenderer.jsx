import React from 'react';
import { isDrafty, parseFromMarkdown, toTree, ENTITY_TYPES, STYLE_TYPES } from '../protocol/drafty.js';
import { FileText, ExternalLink } from 'lucide-react';

/**
 * DraftyRenderer: Pure React AST-based rich text renderer
 * 
 * Safely renders Tinode Drafty documents and Markdown text
 * with 0% risk of XSS injection (no dangerouslySetInnerHTML).
 */
export default function DraftyRenderer({
  content,
  onMentionClick,
  onHashtagClick,
  onMediaClick,
  className = ''
}) {
  if (!content) return null;

  // Determine Drafty representation
  let draftyDoc;
  if (isDrafty(content)) {
    draftyDoc = content;
  } else if (typeof content === 'string') {
    // If it looks like plain text or markdown, parse it
    draftyDoc = parseFromMarkdown(content);
  } else {
    return <span className={className}>{String(content)}</span>;
  }

  const tree = toTree(draftyDoc);

  // Recursive node renderer
  const renderNode = (node, index) => {
    if (typeof node === 'string') {
      return <React.Fragment key={index}>{node}</React.Fragment>;
    }

    if (!node || typeof node !== 'object') {
      return null;
    }

    const { type, data = {}, children = [] } = node;
    const renderedChildren = children.map((child, i) => renderNode(child, `${index}_${i}`));

    switch (type) {
      case STYLE_TYPES.ST:
        return <strong key={index} className="font-bold">{renderedChildren}</strong>;

      case STYLE_TYPES.EM:
        return <em key={index} className="italic">{renderedChildren}</em>;

      case STYLE_TYPES.DL:
        return <del key={index} className="line-through opacity-80">{renderedChildren}</del>;

      case STYLE_TYPES.CO:
        return (
          <code
            key={index}
            className="font-mono text-[13px] bg-black/10 dark:bg-white/15 px-1 py-0.5 rounded border border-black/5 dark:border-white/10"
          >
            {renderedChildren}
          </code>
        );

      case STYLE_TYPES.HL:
        return (
          <mark
            key={index}
            className="bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 text-yellow-900 px-1 rounded"
          >
            {renderedChildren}
          </mark>
        );

      case STYLE_TYPES.BR:
        return <br key={index} />;

      case ENTITY_TYPES.LN: {
        const url = data.url || '#';
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline text-blue-500 hover:text-blue-600 dark:text-blue-400 break-all font-medium inline-flex items-center gap-0.5"
          >
            {renderedChildren}
          </a>
        );
      }

      case ENTITY_TYPES.MN: {
        const username = data.val || '';
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onMentionClick?.(username);
            }}
            className="font-semibold text-messenger-blue dark:text-blue-400 hover:underline cursor-pointer"
          >
            {renderedChildren}
          </span>
        );
      }

      case ENTITY_TYPES.HT: {
        const tag = data.val || '';
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(tag);
            }}
            className="font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
          >
            {renderedChildren}
          </span>
        );
      }

      case ENTITY_TYPES.IM: {
        const src = data.url || data.ref;
        return (
          <div key={index} className="my-1.5 overflow-hidden rounded-xl">
            <img
              src={src}
              alt="attachment"
              onClick={() => onMediaClick?.(src)}
              className="max-h-72 w-auto object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
            />
          </div>
        );
      }

      case ENTITY_TYPES.EX: {
        return (
          <div
            key={index}
            className="flex items-center gap-2.5 p-2.5 my-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 max-w-sm"
          >
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div className="flex-1 truncate text-xs">
              <p className="font-semibold truncate">{data.name || 'Attachment'}</p>
              {data.size && <p className="text-gray-400">{Math.round(data.size / 1024)} KB</p>}
            </div>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-600 dark:text-gray-300"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      }

      default:
        return <React.Fragment key={index}>{renderedChildren}</React.Fragment>;
    }
  };

  return (
    <div className={`drafty-content leading-relaxed select-text ${className}`}>
      {tree.map((node, i) => renderNode(node, i))}
    </div>
  );
}
