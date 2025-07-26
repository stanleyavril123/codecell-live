import { Button } from "@mui/material";
import { trpc } from "../trcp";
import type { ApiLanguage } from "../constants";
import { useTheme } from "../theme";
type Props = {
  language: ApiLanguage;
  source: string;
};

type Chunk =
  | { type: "stdout"; data: string }
  | { type: "stderr"; data: string }
  | { type: "exit"; data: number };

const RunButton = ({ language, source }: Props) => {
  const { theme } = useTheme();
  const { mutate: runCode, isPending } = trpc.runCode.useMutation({
    onSuccess({ jobId }) {
      const ws = new WebSocket(`ws://localhost:4000/stream?jobId=${jobId}`);
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
        backgroundColor: theme === "dark" ? "#efeee7" : "#000000",
        color: theme === "dark" ? "#000000" : "#efeee7",
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
