import React from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * Safely renders inline markdown (**bold**, *italic*, `code`) without raw HTML injection.
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
          return (
            <strong key={idx} className="font-semibold text-slate-100">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
          return (
            <em key={idx} className="italic text-slate-300">
              {token.slice(1, -1)}
            </em>
          );
        }
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
          return (
            <code
              key={idx}
              className="font-mono text-[0.9em] text-sky-300 bg-slate-800/80 px-1.5 py-0.5 rounded"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={idx}>{token}</React.Fragment>;
      })}
    </span>
  );
};
