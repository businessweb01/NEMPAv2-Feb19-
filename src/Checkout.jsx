import * as React from 'react';
import { Button, Step, StepLabel, Stepper, Box, Paper, Grid, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import ClientInfo from './pages/DE_client_info';
import LoanForm from './pages/DE_Loan';

const steps = ['Client Information', 'Loan Amount'];

export default function Checkout() {
  const [activeStep, setActiveStep] = React.useState(0);
  const [toastActive, setToastActive] = React.useState(false); // Track if toast is active

  // Manage next step logic based on toastActive and activeStep
  const handleNext = () => {
    if (!toastActive) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);  // Reset to the first step
    setToastActive(false); // Reset toastActive state
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <ClientInfo setToastActive={setToastActive} />;
      case 1:
        return <LoanForm setToastActive={setToastActive} setActiveStep={setActiveStep} />;
      default:
        // Show the review message when the loan application is being reviewed
        return (
          <Box sx={{ textAlign: 'center', padding: 3 }}>
            <Typography variant="h5" sx={{ marginBottom: 2 }}>
              Your Loan Application is being Reviewed
            </Typography>
            <Typography variant="body1" sx={{ marginBottom: 2 }}>
              Please wait while we process your information.
            </Typography>
  
            {/* Show "Go to Client Info" button after review */}
            {activeStep === steps.length && (
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  onClick={handleReset}
                  variant="contained"
                  fullWidth
                  sx={{
                    height: 48,
                    backgroundColor: '#00796b', // Green button color
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#388e3c', // Darker green on hover
                    },
                  }}
                >
                  Go to Client Info
                </Button>
              </Grid>
            )}
          </Box>
        );
    }
  };

  return (
    <Box>
      <Paper sx={{ padding: 2, marginBottom: 3, boxShadow: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Box sx={{ marginBottom: 3, padding: 2, borderRadius: 1, boxShadow: 1, backgroundColor: '#fafafa' }}>
        {getStepContent(activeStep)}
      </Box>

      {/* Hide the buttons when at the final step (reviewing application) */}
      {activeStep !== 2 && (
        <Grid container spacing={2} justifyContent="center" alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              onClick={activeStep === steps.length - 1 ? handleBack : handleNext}
              startIcon={activeStep === steps.length - 1 ? <ChevronLeftRoundedIcon /> : null}
              endIcon={activeStep === steps.length - 1 ? null : <ChevronRightRoundedIcon />}
              variant={activeStep === steps.length - 1 ? 'outlined' : 'contained'}
              fullWidth
              sx={{ height: 48 }}
              disabled={toastActive} // Disable button when toast is active
            >
              {activeStep === steps.length - 1 ? 'Back' : 'Next'}
            </Button>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
