import * as monaco from "monaco-editor";
import { useEffect } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";

export type CollabRuntime = {
  runState: Y.Map<unknown>;
  settingsState: Y.Map<unknown>;
};

type Props = {
  padId: string;
  editor: monaco.editor.IStandaloneCodeEditor;
  me: { userId: string; name: string; color: string };
  wsUrl?: string;
  onReady?: (runtime: CollabRuntime | null) => void;
};

export function MonacoPresence({
  padId,
  editor,
  me,
  wsUrl = "ws://localhost:4100",
  onReady,
}: Props) {
  useEffect(() => {
    const model = editor.getModel();
    if (!model) return;

    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: padId,
      document: doc,
    });
    const yText = doc.getText("monaco");
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness,
    );
    const runState = doc.getMap<unknown>("run");
    const settingsState = doc.getMap<unknown>("settings");
    const style = document.createElement("style");
    document.head.appendChild(style);

    const updateRemoteCursorStyles = () => {
      if (!provider.awareness) return;

      const rules: string[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (clientId === doc.clientID) return;
        const user =
          typeof state.user === "object" && state.user !== null
            ? (state.user as { color?: unknown })
            : null;
        const color = typeof user?.color === "string" ? user.color : "#60a5fa";

        rules.push(
          `.yRemoteSelection-${clientId} { background-color: ${color}33; }`,
          `.yRemoteSelectionHead-${clientId} { border-left: 2px solid ${color}; }`,
          `.yRemoteSelectionHead-${clientId}::after { background: ${color}; }`,
        );
      });
      style.textContent = rules.join("\n");
    };

    provider.awareness?.setLocalStateField("user", {
      userId: me.userId,
      name: me.name,
      color: me.color,
    });
    provider.awareness?.on("change", updateRemoteCursorStyles);
    updateRemoteCursorStyles();
    onReady?.({ runState, settingsState });

    return () => {
      onReady?.(null);
      provider.awareness?.off("change", updateRemoteCursorStyles);
      provider.awareness?.setLocalState(null);
      style.remove();
      binding.destroy();
      provider.destroy();
      doc.destroy();
    };
  }, [editor, me.color, me.name, me.userId, onReady, padId, wsUrl]);

  return null;
}
