import type * as Monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useRef } from "react";

type EditorType = Monaco.editor.IStandaloneCodeEditor;

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);

  const onMount = (editor: EditorType) => {
    editorRef.current = editor;
    editor.focus();
  };
  return (
    <Editor
      height="90vh"
      value=""
      theme="vs-dark"
      onMount={onMount}
      defaultLanguage="javascript"
    />
  );
};

export default CodeEditor;
