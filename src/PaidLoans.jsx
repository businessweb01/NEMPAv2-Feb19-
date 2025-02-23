import * as React from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PaidLoansTable from './pages/PaidLoansTable';
import PaidLoansList from './pages/PaidLoansList';

export default function JoyOrderDashboardTemplate() {
  return (
    <CssVarsProvider disableTransitionOnChange>
    <CssBaseline />
    <Box sx={{ display: 'flex', minHeight: '100dvh', width:'100%' }}>
      <Box
        component="main"
        className="MainContent"
        sx={{
          // px: { xs: 2, md: 6 },
          // pb: { xs: 2, sm: 2, md: 3 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          gap: 1,
        }}
      >
        <PaidLoansTable />
        <PaidLoansList />
      </Box>
    </Box>
  </CssVarsProvider>
  );
}