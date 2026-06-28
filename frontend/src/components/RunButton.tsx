import { Button } from "@mui/material";

type Props = {
  disabled?: boolean;
  isRunning?: boolean;
  onRun: () => void;
};

const RunButton = ({ disabled = false, isRunning = false, onRun }: Props) => {
  return (
    <Button
      sx={{
        backgroundColor: "#000000",
        color: "#efeee7",
      }}
      onClick={onRun}
      disabled={disabled}
      variant="contained"
    >
      {isRunning ? "Running..." : "Run Code"}
    </Button>
  );
};
export default RunButton;
