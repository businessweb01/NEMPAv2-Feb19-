import * as React from 'react';
import AddCardIcon from '@mui/icons-material/AddCard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useDemoRouter } from '@toolpad/core/internal';
import { useState, useEffect, useRef } from 'react';
// Pages
import Loan from './Checkout';
import PendingLoan from './PendingLoans';
import OnGoingLoan from './OnGoing';
// Theme setup
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#00796b', // Teal green
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const DashboardLayoutBasic = () => {
  const [pendingLoansCount, setPendingLoansCount] = useState(0);
  const router = useDemoRouter('/dashboard');
  const [releasedLoansCount, setReleasedLoansCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        return; // Prevent duplicate connections
      }

      wsRef.current = new WebSocket("ws://localhost:8080");

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttempts.current = 0; // Reset reconnect attempts
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

      // wsRef.current.onerror = (error) => {
      //   console.error("WebSocket error:", error);
      // };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, attempting to reconnect...");

        if (reconnectAttempts.current < 5) { // Limit reconnection attempts
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, 5000); // 🔄 Retry after 5 seconds
        } else {
          console.error("Max reconnect attempts reached. WebSocket stopped.");
        }
      };
    };

    connectWebSocket();

    return () => wsRef.current && wsRef.current.close();
  }, []);


  // Function to render the correct page based on pathname
  function renderPage() {
    const { pathname } = router;
    switch (pathname) {
      case '/loanApplication':
        return <Loan />;
      case '/loans/Pending':
        return <PendingLoan />;
      case '/loans/OnGoing':
        return <OnGoingLoan/>;
      default:
        return;
    }
  }

  // Navigation setup
  const NAVIGATION = [
    {
      segment: 'dashboard',
      title: 'Dashboard',
      icon: <DashboardIcon />,
    },
    {
      segment: 'loans',
      title: 'Loans',
      icon: <AccountBalanceIcon />,
      children: [
        {
          segment: 'Pending',
          title: 'Pending Loans',
          icon: <PendingActionsIcon />,
          action: (
            <Chip
              label={pendingLoansCount}
              color="warning"
              style={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold' }}
            />
          ),
          route: '/loans/Pending',
          component: <PendingLoan />,
        },
        {
          segment: 'OnGoing',
          title: 'On Going Loans',
          icon: <AssuredWorkloadIcon />,
          action: (
            <Chip
              label={releasedLoansCount}
              color="warning"
              style={{ backgroundColor: '#023e8a', color: '#ffffff', fontWeight: 'bold' }}
            />
          ),
          route: '/loans/OnGoing',
          component: <OnGoingLoan />,
        },
        {
          segment: 'Paid',
          title: 'Paid Loans',
          icon: <CreditScoreIcon />,
          route: '/loans/Paid',
        },
      ],
    },
    {
      segment: 'loanApplication',
      title: 'Loan Application',
      icon: <AddCardIcon />,
      route: '/loanApplication',
      component: <Loan />,
    },
    {
      segment: 'transactionhistory',
      title: 'Transaction History',
      icon: <ReceiptLongIcon />,
      route: '/integrations',
    },
  ];

  // Custom header for the app title
  function CustomAppTitle() {
    return (
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h6">Loan Application</Typography>
      </Stack>
    );
  }

  return (
    <AppProvider navigation={NAVIGATION} router={router} theme={theme}>
      <DashboardLayout
      disableCollapsibleSidebar
        slots={{
          appTitle: CustomAppTitle,
        }}
      >
        <PageContainer sx={{ paddingTop: 1, paddingBottom: 3 }}>
          <Grid container justifyContent="center">
            <Grid item xs={12} sm={8} md={6}>
              {renderPage()}
            </Grid>
          </Grid>
        </PageContainer>
      </DashboardLayout>
    </AppProvider>
  );
};

export default DashboardLayoutBasic;
