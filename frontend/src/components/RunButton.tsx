import { Button } from "@mui/material";
import { trpc } from "../trpc";
import type { ApiLanguage } from "../constants";
type Props = {
  language: ApiLanguage;
  source: string;
  onStarted: (jobId: string) => void;
};

const RunButton = ({ language, source, onStarted }: Props) => {
  const { mutate: runCode, isPending } = trpc.runCode.useMutation({
    onSuccess({ jobId }) {
      onStarted?.(jobId);
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
