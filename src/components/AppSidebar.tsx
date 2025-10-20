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

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  open: boolean;
  hovered: boolean;
  activeTab: string;
  darkMode: boolean;
  items: SidebarItem[];
  onToggle: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTabChange: (tabId: string) => void;
  onThemeToggle: () => void;
}

export const AppSidebar = memo<AppSidebarProps>(({
                                                   open,
                                                   hovered,
                                                   activeTab,
                                                   darkMode,
                                                   items,
                                                   onToggle,
                                                   onMouseEnter,
                                                   onMouseLeave,
                                                   onTabChange,
                                                   onThemeToggle
                                                 }) => {
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
          backgroundColor: darkMode ? '#1a1a1a' : '#fafafa',
          borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
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
                  backgroundColor: darkMode ? 'rgba(46, 125, 50, 0.16)' : 'rgba(46, 125, 50, 0.12)',
                  '&:hover': {
                    backgroundColor: darkMode ? 'rgba(46, 125, 50, 0.24)' : 'rgba(46, 125, 50, 0.16)',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open || hovered ? 3 : 'auto',
                  justifyContent: 'center',
                  color: activeTab === item.id ? 'primary.main' : 'inherit',
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
          onClick={onThemeToggle}
          sx={{
            minHeight: 48,
            justifyContent: open || hovered ? 'initial' : 'center',
            borderRadius: 1,
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
              primary="Toggle Theme"
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