'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ReactNode, useMemo } from 'react';

interface AppThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          background: {
            default: '#ffffff',
            paper: '#ffffff',
          },
          text: {
            primary: '#171717',
            secondary: '#757575',
          },
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              html: {
                backgroundColor: '#ffffff',
              },
              body: {
                backgroundColor: '#ffffff !important',
                color: '#171717 !important',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#ccc',
                  },
                  '&:hover fieldset': {
                    borderColor: '#999',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                  '& input': {
                    color: '#171717 !important',
                    backgroundColor: '#ffffff !important',
                    '&::placeholder': {
                      color: '#757575',
                    },
                  },
                  '& textarea': {
                    color: '#171717 !important',
                    backgroundColor: '#ffffff !important',
                    '&::placeholder': {
                      color: '#757575',
                    },
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#757575',
                  '&.Mui-focused': {
                    color: '#1976d2',
                  },
                },
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ccc',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#999',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                },
                '& .MuiSelect-select': {
                  color: '#171717 !important',
                  backgroundColor: '#ffffff !important',
                },
              },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              root: {
                '& input': {
                  color: '#171717 !important',
                  backgroundColor: '#ffffff !important',
                },
                '& textarea': {
                  color: '#171717 !important',
                  backgroundColor: '#ffffff !important',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: '#ffffff',
                '&.MuiPaper-elevation1': {
                  boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                '&.MuiButton-contained': {
                  color: '#ffffff',
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                },
                '&.MuiButton-outlined': {
                  color: '#1976d2',
                  borderColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    borderColor: '#1565c0',
                  },
                },
              },
            },
          },
          MuiList: {
            styleOverrides: {
              root: {
                backgroundColor: '#ffffff',
              },
            },
          },
          MuiListItem: {
            styleOverrides: {
              root: {
                '&.MuiListItem-divider': {
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                },
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                color: '#757575',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                '&.MuiAlert-standardError': {
                  backgroundColor: '#fdeded',
                  color: '#5f2120',
                },
                '&.MuiAlert-standardWarning': {
                  backgroundColor: '#fff4e5',
                  color: '#663c00',
                },
                '&.MuiAlert-standardInfo': {
                  backgroundColor: '#e3f2fd',
                  color: '#01579b',
                },
                '&.MuiAlert-standardSuccess': {
                  backgroundColor: '#edf7ed',
                  color: '#1e4620',
                },
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#1976d2',
                },
              },
            },
          },
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}