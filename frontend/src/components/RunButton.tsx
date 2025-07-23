import { Button } from "@mui/material";
import { trpc } from "../trcp";

type Props = {
  language: string;
  source: string;
};

const RunButton = ({ language, source }: Props) => {
const {mutate: runCode, isLoading} = trpc.runCode.useMutation()
  return <Button>Run code</Button>;
};
export default RunButton;
