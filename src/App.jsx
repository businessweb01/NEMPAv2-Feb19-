import * as React from 'react';
import AddCardIcon from '@mui/icons-material/AddCard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
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
  useMediaQuery,
  Chip,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Neeco from '../public/NeecoLogo.svg';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Pages
import Loan from './Checkout';
import PendingLoan from './PendingLoans';
import OnGoingLoan from './OnGoing';
import Dashboard from './Dashboard';
import PaidLoans from './PaidLoans';
import TransactionHistory from './TransactHistory';
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
const name = "Eugene Van Linsangan";
const email = "vaneugene01@gmail.com";
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
    '/loans/Paid': <PaidLoans />,
    '/transactionhistory': <TransactionHistory />,
  };

  const currentPage = PAGE_COMPONENTS[currentPath] || <Dashboard />;

  const drawerContent = (
    <Box sx={{ 
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#EFEFF6',
      padding: '10px',
    }}>
      <List
      sx={{
        marginTop: '10px',
        backgroundColor: '#FCFCFF',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
        padding: '10px',
      }}
      >
        {/* Dashboard Item */}
        <ListItemButton
          onClick={() => handleNavigation('/dashboard')}
          sx={{
            borderRadius: '8px',
            padding: '6px 12px',  // Reduced padding
            fontSize: '0.8em',  // Smaller font size
            '&:hover': {
              backgroundColor: '#b2dfdb',
            },
            backgroundColor: currentPath === '/dashboard' ? '#b2dfdb' : 'transparent',
          }}>
          <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
            <DashboardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Dashboard" sx={{ fontSize: '0.8em' }} />
        </ListItemButton>
  
        {/* Loans Item */}
        <ListItemButton
          onClick={handleLoansClick}
          sx={{
            borderRadius: '8px',
            padding: '6px 12px',  // Reduced padding
            fontSize: '0.8em',  // Smaller font size
            '&:hover': {
              backgroundColor: '#b2dfdb',
            },
            backgroundColor: ['/loans/Pending', '/loans/OnGoing', '/loans/Paid'].includes(currentPath) ? '#b2dfdb' : 'transparent',
          }}>
          <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
            <AccountBalanceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Loans" sx={{ fontSize: '0.8em' }} />
          {loansOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
  
        {/* Loans Collapse Items */}
        <Collapse in={loansOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {/* Pending Loans */}
            <ListItemButton 
              sx={{
                borderRadius: '8px',
                pl: 4,
                padding: '6px 12px',
                fontSize: '0.8em',
                backgroundColor: currentPath === '/loans/Pending' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' },
              }}
              onClick={() => handleNavigation('/loans/Pending')}>
              <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
                <PendingActionsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Pending Loans" sx={{ fontSize: '0.8em' }} />
              <Chip label={pendingLoansCount} sx={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold', fontSize: '0.75em' }} />
            </ListItemButton>
  
            {/* On Going Loans */}
            <ListItemButton 
              sx={{
                borderRadius: '8px',
                pl: 4,
                padding: '6px 12px',
                fontSize: '0.8em',
                backgroundColor: currentPath === '/loans/OnGoing' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' },
              }} 
              onClick={() => handleNavigation('/loans/OnGoing')}>
              <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
                <AssuredWorkloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="On Going Loans" sx={{ fontSize: '0.8em' }} />
              <Chip label={releasedLoansCount} sx={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold', fontSize: '0.75em' }} />
            </ListItemButton>
  
            {/* Paid Loans */}
            <ListItemButton 
              sx={{
                borderRadius: '8px',
                pl: 4,
                padding: '6px 12px',
                fontSize: '0.8em',
                backgroundColor: currentPath === '/loans/Paid' ? '#b2dfdb' : 'transparent',
                '&:hover': { backgroundColor: '#b2dfdb' },
              }}
              onClick={() => handleNavigation('/loans/Paid')}>
              <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
                <CreditScoreIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Paid Loans" sx={{ fontSize: '0.8em' }} />
            </ListItemButton>
          </List>
        </Collapse>
  
        {/* Other Items */}
        <ListItemButton 
          onClick={() => handleNavigation('/loanApplication')}
          sx={{
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.8em',
            '&:hover': { backgroundColor: '#b2dfdb' },
            backgroundColor: currentPath === '/loanApplication' ? '#b2dfdb' : 'transparent',
          }}>
          <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
            <AddCardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Loan Application" sx={{ fontSize: '0.8em' }} />
        </ListItemButton>
  
        <ListItemButton 
          onClick={() => handleNavigation('/transactionhistory')}
          sx={{
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.8em',
            '&:hover': { backgroundColor: '#b2dfdb' },
            backgroundColor: currentPath === '/transactionhistory' ? '#b2dfdb' : 'transparent',
          }}>
          <ListItemIcon sx={{ minWidth: 35 }}> {/* Smaller icon size */}
            <ReceiptLongIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Transaction History" sx={{ fontSize: '0.8em' }} />
        </ListItemButton>
      </List>
      <Box sx={{ mt: 'auto', mb: 2 }}>
        <Box
          sx={{
            borderRadius: '12px',
            padding: '16px',
            backgroundColor: '#FCFCFF',
            boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
            transition: 'all 0.2s ease-in-out',
            display: 'flex',
            alignItems: 'center', // Aligns content horizontally
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#2c3e50',
              }}
            >
              {name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                opacity: 0.7,
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {email}
            </Typography>
          </Box>
          <Box>
            <LogoutRoundedIcon sx={{ color: '#d90429', fontSize: '1.5rem' }} />
          </Box>
        </Box>
      </Box>

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
            <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
              <img src={Neeco} alt="Neeco Logo" style={{ width: '30px', height: 'auto', marginRight: '10px' }} />
               NEECO II AREA 1
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
            scrollbarWidth: 'none',
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
