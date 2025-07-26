import { Box, Button, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { LANGUAGE_VERSION, type UiLanguage } from "../constants.ts";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type Props = {
  language: string;
  onSelect: (lang: UiLanguage) => void;
};

const languages = Object.keys(LANGUAGE_VERSION) as UiLanguage[];

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
        className="btn-ghost"
        variant="text"
        disableElevation
        disableRipple
        aria-controls={open ? "lang-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
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
        {languages.map((lang) => (
          <MenuItem
            key={lang}
            onClick={() => {
              onSelect(lang);
              handleClose();
            }}
          >
            {lang}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
