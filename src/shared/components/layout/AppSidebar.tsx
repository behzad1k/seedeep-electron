import React, { memo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  open: boolean;
  hovered: boolean;
  activeTab: string;
  items: SidebarItem[];
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTabChange: (tabId: string) => void;
}

export const AppSidebar = memo<AppSidebarProps>(({
                                                   open,
                                                   hovered,
                                                   activeTab,
                                                   items,
                                                   onToggle,
                                                   onMouseEnter,
                                                   onMouseLeave,
                                                   onTabChange
                                                 }) => {
  const { darkMode, toggleTheme } = useTheme();
  const drawerWidth = open || hovered ? 240 : 60;

  return (
    <Drawer
      variant="permanent"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider'
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          minHeight: 64,
        }}
      >
        <IconButton
          onClick={onToggle}
          sx={{ mr: open || hovered ? 1 : 0 }}
        >
          <Menu />
        </IconButton>
        {(open || hovered) && (
          <Typography variant="h6" fontWeight="bold" color="primary">
            SeeDeep
          </Typography>
        )}
      </Box>

      <Divider />

      <List sx={{ flexGrow: 1, pt: 1 }}>
        {items.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={activeTab === item.id}
              onClick={() => onTabChange(item.id)}
              sx={{
                minHeight: 48,
                justifyContent: open || hovered ? 'initial' : 'center',
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open || hovered ? 3 : 'auto',
                  justifyContent: 'center',
                  color: activeTab === item.id ? 'inherit' : 'text.primary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {(open || hovered) && (
                <ListItemText
                  primary={item.label}
                  sx={{
                    opacity: open || hovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={toggleTheme}
          sx={{
            minHeight: 48,
            justifyContent: open || hovered ? 'initial' : 'center',
            borderRadius: 1,
            bgcolor: 'action.hover'
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: open || hovered ? 3 : 'auto',
              justifyContent: 'center',
            }}
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </ListItemIcon>
          {(open || hovered) && (
            <ListItemText
              primary={darkMode ? "Light Mode" : "Dark Mode"}
              sx={{
                opacity: open || hovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  );
});

AppSidebar.displayName = 'AppSidebar';