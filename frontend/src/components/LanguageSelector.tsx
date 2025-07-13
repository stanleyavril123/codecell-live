import { Box, Button, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { LANGUAGE_VERSION } from "../constants.ts";

type Props = {
  language: string;
  onSelect: (lang: string) => void;
};

const languages = Object.entries(LANGUAGE_VERSION);

const LanguageSelector = ({ language, onSelect }: Props) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
      >
        {language}
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            "aria-labelledby": "basic-button",
          },
        }}
      >
        {languages.map(([lang, version]) => (
          <MenuItem
            key={lang}
            onClick={() => {
              onSelect(lang);
              handleClose();
            }}
          >
            {lang} - v{version}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
