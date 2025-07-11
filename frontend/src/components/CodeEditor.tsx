import type * as Monaco from "monaco-editor";
import Editor from "@monaco-editor/react";
import { useRef } from "react";
import { useTheme } from "../theme";

type EditorType = Monaco.editor.IStandaloneCodeEditor;

const CodeEditor = () => {
  const editorRef = useRef<EditorType | null>(null);
  const { theme } = useTheme();

  const onMount = (editor: EditorType) => {
    editorRef.current = editor;
    editor.focus();
  };
  return (
    <Editor
      height="90vh"
      value=""
      theme={theme === "dark" ? "vs-dark" : "vs-light"}
      onMount={onMount}
      defaultLanguage="javascript"
    />
  );
};

export default CodeEditor;
