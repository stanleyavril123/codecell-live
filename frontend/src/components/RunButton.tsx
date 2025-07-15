import { Button } from "@mui/material";

type Props = {
  language: string;
  source: string;
};

const RunButton = ({ language, source }: Props) => {
  return <Button>Run code</Button>;
};
export default RunButton;
