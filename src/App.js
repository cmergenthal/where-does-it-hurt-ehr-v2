import './App.css';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import EHRApp from './components/EHRApp';
import { WebexProvider } from './webex/WebexProvider';

const theme = createTheme({
  palette: {
    primary: {
      main: '#087f7a',
      dark: '#075f63',
      light: '#d7f3ef',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#e97b59'
    },
    background: {
      default: '#f4f7f8',
      paper: '#ffffff'
    },
    text: {
      primary: '#17313b',
      secondary: '#60737b'
    },
    divider: '#dfe7e9'
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h4: {
      letterSpacing: '-0.03em'
    },
    h6: {
      letterSpacing: '-0.015em'
    },
    button: {
      fontWeight: 700,
      textTransform: 'none'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px rgba(15, 44, 68, 0.03)'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: '#60737b',
          fontWeight: 750,
          backgroundColor: '#f7f9fa'
        }
      }
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebexProvider>
        <EHRApp />
      </WebexProvider>
    </ThemeProvider>
  );
}

export default App;
