import { Button } from "@mui/material";
import { trpc } from "../trcp";
import type { ApiLanguage } from "../constants";

type Props = {
  language: ApiLanguage;
  source: string;
};

const RunButton = ({ language, source }: Props) => {
  const { mutate: runCode, isPending } = trpc.runCode.useMutation({
    onSuccess({ jobId }) {
      const ws = new WebSocket(`ws://localhost:4000/stream/${jobId}`);
      ws.onmessage = (e) => {
        const chunk = JSON.parse(e.data);
      };
    },
  });
  return (
    <Button
      onClick={() => runCode({ language, source })}
      disabled={isPending}
      variant="contained"
    >
      {isPending ? "Running..." : "Run Code"}
    </Button>
  );
};
export default RunButton;
