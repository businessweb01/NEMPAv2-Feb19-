import * as React from 'react';
import Box from '@mui/material/Box';
import DashboardContents from './components/DashBoardContents';
export default function Dashboard() {
  return (
    <Box sx={{ 
      display: 'flex', 
      width: '100%', 
      maxWidth: '100%',
      height: '100%',
      flexDirection: { xs: 'column', md: 'row' },
      gap: 2,
      overflow: 'hidden',
      p: 1,
    }}>
      <Box sx={{ 
        width: '100%',
        flexGrow: 1,
        height: '100%'
      }}>
        <DashboardContents />
        
      </Box>
    </Box>
  );
}
