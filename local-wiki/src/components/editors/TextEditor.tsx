
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";

interface TextEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export function TextEditor({
  content,
  onChange,
}: TextEditorProps) {
  return (
    <div className="h-full min-h-0 overflow-auto">
      <CodeMirror
        value={content}
        height="100%"
        extensions={[markdown()]}
        onChange={onChange}
        theme="dark"
      />
    </div>
  );
}
