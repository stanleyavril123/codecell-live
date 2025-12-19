import * as monaco from "monaco-editor";
import { useRef, useMemo, useEffect } from "react";
import { createCollabWS, type Peer } from "./wsClient";
type Props = {
  padId: string;
  editor: monaco.editor.IStandaloneCodeEditor;
  me: { userId: string; name: string };
  wsUrl?: string;
};

export function MonacoPresence({
  padId,
  editor,
  me,
  wsUrl = "ws://localhost:4100/ws",
}: Props) {
  const peers = useRef(new Map<string, Peer>());
  const decos = useRef(new Map<string, string[]>());

  const connection = useMemo(() =>
    createCollabWS({
      url: wsUrl,
      padId,
      userId: me.userId,
      name: me.name,
      handlers: {
        onWelcome(peers, you){
          peers.push
        },
      },
    }),
  );
}
