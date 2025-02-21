import * as React from 'react';
import AddCardIcon from '@mui/icons-material/AddCard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MenuIcon from '@mui/icons-material/Menu';
import { 
  Box, 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton, 
  Collapse, 
  AppBar, 
  Toolbar, 
  Typography, 
  CssBaseline, 
  IconButton, 
  useMediaQuery 
}from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Neeco from '../public/NeecoLogo.svg';
// Pages
import Loan from './Checkout';
import PendingLoan from './PendingLoans';
import OnGoingLoan from './OnGoing';
import Dashboard from './Dashboard';

const drawerWidth = 280;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
  })
);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00796b',
    },
    background: {
      paper: '#ffffff',
    },
  },
});

const DashboardLayoutBasic = () => {
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const [releasedLoansCount, setReleasedLoansCount] = useState(0);
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [loansOpen, setLoansOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

      wsRef.current = new WebSocket("ws://localhost:8080");

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttempts.current = 0; 
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "loanCounts") {
            setPendingLoansCount(data.pendingCount);
            setReleasedLoansCount(data.releasedCount);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, attempting to reconnect...");
        if (reconnectAttempts.current < 5) {
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, 5000);
        } else {
          console.error("Max reconnect attempts reached. WebSocket stopped.");
        }
      };
    };

    connectWebSocket();
    return () => wsRef.current && wsRef.current.close();
  }, []);

  const handleNavigation = (path) => {
    setCurrentPath(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLoansClick = () => {
    setLoansOpen(!loansOpen);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const PAGE_COMPONENTS = {
    '/dashboard': <Dashboard />,
    '/loanApplication': <Loan />,
    '/loans/Pending': <PendingLoan />,
    '/loans/OnGoing': <OnGoingLoan />,
  };

  const currentPage = PAGE_COMPONENTS[currentPath] || <Dashboard />;

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        <ListItemButton
          onClick={() => handleNavigation('/dashboard')}
          sx={{
            backgroundColor: currentPath === '/dashboard' ? '#b2dfdb' : 'transparent',
            '&:hover': {
              backgroundColor: '#b2dfdb',
            },
          }}>
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
  
        <ListItemButton
          onClick={handleLoansClick}
          sx={{
            backgroundColor: ['/loans/Pending', '/loans/OnGoing', '/loans/Paid'].includes(currentPath) ? '#b2dfdb' : 'transparent',
            '&:hover': {
              backgroundColor: '#b2dfdb',
            },
          }}>
          <ListItemIcon><AccountBalanceIcon /></ListItemIcon>
          <ListItemText primary="Loans" />
          {loansOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={loansOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton 
              sx={{   
                pl: 4,
                backgroundColor: currentPath === '/loans/Pending' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' }
              }}
              onClick={() => handleNavigation('/loans/Pending')}>
              <ListItemIcon><PendingActionsIcon /></ListItemIcon>
              <ListItemText primary="Pending Loans" />
              <Chip label={pendingLoansCount} sx={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold' }} />
            </ListItemButton>
  
            <ListItemButton 
              sx={{ 
                pl: 4,
                backgroundColor: currentPath === '/loans/OnGoing' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' }
              }} 
              onClick={() => handleNavigation('/loans/OnGoing')}>
              <ListItemIcon><AssuredWorkloadIcon /></ListItemIcon>
              <ListItemText primary="On Going Loans" />
              <Chip label={releasedLoansCount} sx={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold' }} />
            </ListItemButton>
  
            <ListItemButton 
              sx={{ 
                pl: 4,
                backgroundColor: currentPath === '/loans/Paid' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' }
              }}
              onClick={() => handleNavigation('/loans/Paid')}>
              <ListItemIcon><CreditScoreIcon /></ListItemIcon>
              <ListItemText primary="Paid Loans" />
            </ListItemButton>
          </List>
        </Collapse>
  
        <ListItemButton 
          onClick={() => handleNavigation('/loanApplication')}
          sx={{
            backgroundColor: currentPath === '/loanApplication' ? '#b2dfdb' : 'transparent',
            '&:hover': { backgroundColor: '#b2dfdb' }
          }}>
          <ListItemIcon><AddCardIcon /></ListItemIcon>
          <ListItemText primary="Loan Application" />
        </ListItemButton>
  
        <ListItemButton 
          onClick={() => handleNavigation('/transactionhistory')}
          sx={{
            backgroundColor: currentPath === '/transactionhistory' ? '#b2dfdb' : 'transparent',
            '&:hover': { backgroundColor: '#b2dfdb' }
          }}>
          <ListItemIcon><ReceiptLongIcon /></ListItemIcon>
          <ListItemText primary="Transaction History" />
        </ListItemButton>
      </List>
    </Box>
  );
  
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" color="inherit" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center' }}>
              <img src={Neeco} alt="Neeco Logo" style={{ width: '30px', height: 'auto', marginRight: '10px' }} />
              Loan Application
            </Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>

        <Main
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%', // Makes sure it takes full width
            padding: (theme) => theme.spacing(3),
          }}
        >
          <Toolbar />
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
            }}
          >
            {currentPage}
          </Box>
        </Main>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardLayoutBasic;
