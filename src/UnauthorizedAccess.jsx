import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Button, Box, CssBaseline } from '@mui/material';
import PanToolIcon from '@mui/icons-material/PanTool'; // Import the icon

const UnauthorizedAccess = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'black' // Set the background to black
      }}
    >
      <CssBaseline /> {/* Global styles */}
      <Container 
        maxWidth="xs" 
        sx={{
          textAlign: 'center',
          p: 4,
          boxShadow: 3,
          bgcolor: 'black', // Set the background to black
          borderRadius: 2,
          color: 'red', // Set text color to red
        }}
      >
        {/* Red PanTool Icon with larger size */}
        <PanToolIcon sx={{ color: 'red', fontSize: '3rem', mb: 2 }} /> 
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2, color: 'red' }}>
          Unauthorized Access
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, color: 'red' }}>
          You are not authorized to access this page. Please log in first to continue.
        </Typography>
        <Link to="/SignIn" style={{ textDecoration: 'none' }}>
          <Button 
            variant="contained" 
            color="error" // Button with a red color
            fullWidth 
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Link>
      </Container>
    </Box>
  );
};

export default UnauthorizedAccess;
