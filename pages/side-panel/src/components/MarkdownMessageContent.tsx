import type React from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckSquare, Square } from 'lucide-react';

// Component for standard markdown messages
export const MarkdownMessageContent: React.FC<{
  content: string;
  isLight: boolean;
}> = ({ content, isLight }) => {
  return (
    <div
      className={`prose ${!isLight ? 'prose-invert' : ''} max-w-full break-words overflow-wrap-anywhere text-sm leading-relaxed`}>
      <ReactMarkdown
        components={{
          // Enhanced code blocks with syntax highlighting
          code: props => {
            const { inline, className, children, ...otherProps } = props as {
              inline?: boolean;
              className?: string;
              children: React.ReactNode;
            };
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <div className="relative group">
                <pre
                  className={`p-3 rounded-md overflow-x-auto text-xs ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'} ${match ? `language-${match[1]}` : ''}`}>
                  <code className={className} {...otherProps}>
                    {children}
                  </code>
                </pre>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className={`p-1 rounded-md text-xs ${isLight ? 'bg-slate-300 text-slate-800 hover:bg-slate-400' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'}`}
                    onClick={() => {
                      navigator.clipboard.writeText(String(children));
                    }}>
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <code
                className={`px-1 py-0.5 rounded text-xs ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'}`}
                {...props}>
                {children}
              </code>
            );
          },
          // Enhanced links
          a: ({ children, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}>
              {children}
            </a>
          ),
          // Enhanced lists with special handling for checkbox markdown
          ul: ({ children, ...props }) => {
            // Don't apply task styling here - we detect and render tasks separately
            return (
              <ul className="pl-6 list-disc space-y-1 my-2" {...props}>
                {children}
              </ul>
            );
          },
          ol: ({ children, ...props }) => (
            <ol className="pl-7 list-decimal space-y-1 my-2" {...props}>
              {children}
            </ol>
          ),
          // Special handling for list items to convert checkbox markdown to interactive elements
          li: ({ children, ...props }) => {
            // Safe access to node content with proper type handling
            // We need to use a type assertion here to safely access the AST node structure
            const node = props.node as {
              children?: Array<{
                type?: string;
                children?: Array<{ value?: string }>;
              }>;
            };
            let textContent = '';

            // Safely extract text content from the node structure
            if (node?.children?.[0]?.children?.[0]?.value) {
              textContent = node.children[0].children[0].value;
            }

            // Match checkbox pattern if text content exists
            if (textContent) {
              const match = textContent.match(/^\[([ xX])\]\s*(.+)$/);

              if (match) {
                const checked = match[1].toLowerCase() === 'x';
                return (
                  <li className="!list-none -ml-5" {...props}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {checked ? (
                          <CheckSquare size={18} className="text-green-500" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </div>
                      <span className={`${checked ? 'line-through text-gray-500' : ''}`}>{match[2]}</span>
                    </div>
                  </li>
                );
              }
            }
            return (
              <li className="ml-1 pl-1" {...props}>
                {children}
              </li>
            );
          },
          // Enhanced headings
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-bold mt-6 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-bold mt-5 mb-2" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-md font-bold mt-4 mb-1" {...props}>
              {children}
            </h3>
          ),
        }}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
