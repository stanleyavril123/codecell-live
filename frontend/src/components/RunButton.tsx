import { Button } from "@mui/material";
import { trpc } from "../trcp";
import type { ApiLanguage } from "../constants";
type Props = {
  language: ApiLanguage;
  source: string;
  onStarted: (jobId: string) => void;
};

type Chunk =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "exit"; data: number };

const RunButton = ({ language, source , onStarted}: Props) => {
  const { mutate: runCode, isPending } = trpc.runCode.useMutation({
    onSuccess({ jobId }) {
      onStarted?.(jobId);
      const ws = new WebSocket(`ws://localhost:4000/stream?jobId=${jobId}`) ;
      ws.onopen = () => console.log("WS open");
      ws.onerror = (e) => console.error("WS error", e);
      ws.onmessage = (e) => {
        try {
          const chunk: Chunk = JSON.parse(e.data as string);

          switch (chunk.type) {
            case "stdout":
            case "stderr":
            case "exit":
          }
        } catch (err) {
          console.log("Failed WS");
        }
      };
    },
  });
  return (
    <Button
      sx={{
        backgroundColor: "#000000",
        color: "#efeee7",
      }}
      onClick={() => runCode({ language, source })}
      disabled={isPending}
      variant="contained"
    >
      {isPending ? "Running..." : "Run Code"}
    </Button>
  );
};
export default RunButton;
