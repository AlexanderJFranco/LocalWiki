
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({
  content,
}: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-auto bg-gray-950 p-6 text-gray-100">
      <article className="wiki-markdown mx-auto max-w-3xl">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
