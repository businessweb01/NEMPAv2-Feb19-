import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import toast, { Toaster } from 'react-hot-toast';
import { Container, Grid, Card, CardContent, Typography, Box } from '@mui/material';

// Define MUI theme
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

const Payment = () => {
  const [loanRefNo, setLoanRefNo] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [loanData, setLoanData] = useState(null); // Initially null
  const [fixedAmortizationPayment, setFixedAmortizationPayment] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loanAmount, setLoanAmount] = useState(null); // Default loan amount
  const [interestRate, setInterestRate] = useState(null); // Default interest rate 12% annually
  const [noOfMonths, setNoOfMonths] = useState(null); // Default to 24 months (bi-monthly payments)
  const [remainingLoanBalance, setRemainingLoanBalance] = useState(0);
  const [advancePayments, setAdvancePayments] = useState(''); // Now a custom value set by the user
  const [isAdvancePaymentExceeding, setIsAdvancePaymentExceeding] = useState(false); // State to track validation
  const [isAdvancePaymentTooLow, setIsAdvancePaymentTooLow] = useState(false); 

  useEffect(() => {
    const loanRefNoToken = localStorage.getItem('jwtToken');
    if (loanRefNoToken) {
      const decodedToken = jwtDecode(loanRefNoToken);
      setLoanRefNo(decodedToken.loanRefNo);
      setClientId(decodedToken.clientId);
      fetchLoanData(decodedToken.loanRefNo, decodedToken.clientId);
    } else {
      console.error('No loanRefNo token found');
    }
  }, []);
  useEffect(() => {
    if (remainingLoanBalance < fixedAmortizationPayment) {
      // If the remaining balance is less than the fixed amortization, adjust the fixed amortization payment
      setFixedAmortizationPayment(remainingLoanBalance);
    }
  }, [remainingLoanBalance]);  // Trigger effect whenever these two values change

  useEffect(() => {
    if (remainingLoanBalance < advancePayments) {
      // If the remaining balance is less than the fixed amortization, adjust the fixed amortization payment
      setAdvancePayments(remainingLoanBalance);
    }
  }, [remainingLoanBalance]);  // Trigger effect whenever these two values change
    
  const fetchLoanData = async (loanRefNo, clientId) => {
    try {
      const response = await fetch(`http://localhost:5000/loanData`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        },
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch loan data with status: ${response.status}`);
      }
  
      const data = await response.json();
  
      // Validate essential fields
      const { LoanAmount, interest, noOfMonths, TotalAmount, biWeeklyPay, running_balance } = data;
      if (typeof LoanAmount !== 'number' || LoanAmount <= 0) {
        throw new Error('Invalid Loan Amount');
      }
      if (typeof interest !== 'number' || interest < 0) {
        throw new Error('Invalid Interest Rate');
      }
      if (typeof TotalAmount !== 'number' || TotalAmount <= 0) {
        throw new Error('Invalid Total Amount');
      }
      if (typeof biWeeklyPay !== 'number' || biWeeklyPay <= 0) {
        throw new Error('Invalid Bi-weekly Payment');
      }
      if (typeof running_balance !== 'number') {
        throw new Error('Invalid Running Balance');
      }
  
      setLoanData(data);
      setLoanAmount(LoanAmount);
      setInterestRate(interest);
      setTotalAmount(TotalAmount);
      setRemainingLoanBalance(running_balance);
  
      // Determine fixed amortization payment
      let payment = biWeeklyPay; // default
      if (running_balance < biWeeklyPay) {
        payment = running_balance;
      } else if (advancePayments > 0) {
        payment = advancePayments;
      }
      
      if (advancePayments > 0) {
        setFixedAmortizationPayment(advancePayments);  // If advance payments are set, use that as the fixed payment
      } else {
        setFixedAmortizationPayment(payment);  // Otherwise, default to calculated payment
      }
      
    } catch (error) {
      console.error('Error fetching loan data:', error.message);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Function to handle the "Pay" button click and update the loan data
  const handlePayment = async () => {
    let payment;
    
    if (remainingLoanBalance < fixedAmortizationPayment) {
      payment = remainingLoanBalance;
    } else if (advancePayments > fixedAmortizationPayment) {
      payment = advancePayments;
    } else if (advancePayments > remainingLoanBalance) {
      payment = remainingLoanBalance;
    } else {
      payment = fixedAmortizationPayment;
    }
  
    try {
      const response = await fetch(`http://localhost:5000/make-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        },
        body: JSON.stringify({
          clientId,
          loanRefNo,
          paymentDate: new Date().toISOString(), // Current timestamp as payment date
          payment,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to make payment with status: ${response.status}`);
      }
  
      const updatedData = await response.json();
  
      // Check if the loan is finished (i.e., loan amount and total are 0)
      if (updatedData.updatedLoanAmount <= 0) {
        toast.success('Loan is paid off completely!');
      } else {
        toast.success('Payment made successfully');
      }
  
      // Update the loan data with the new values after the payment is processed
      setLoanData(updatedData);
      setRemainingLoanBalance(updatedData.updatedLoanAmount);
      setTotalAmount(updatedData.updatedTotalAmount);
      setAdvancePayments(''); // Clear the advance payment field
      setIsAdvancePaymentExceeding(false); // Reset the exceeding flag
      setIsAdvancePaymentTooLow(false); // Reset the too-low flag
      if(updatedData.updatedTotalAmount < updatedData.updatedbiWeeklyAmount) {
        setFixedAmortizationPayment(updatedData.updatedTotalAmount);
      }else if(updatedData.updatedTotalAmount < advancePayments){
        setAdvancePayments(updatedData.updatedTotalAmount);
      }else{
        setAdvancePayments(null);
      }
  
    } catch (error) {
      console.error('Error making payment:', error.message);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle advance payment input change and validate if it exceeds remaining balance
  const handleAdvancePaymentChange = (e) => {
    const value = Number(e.target.value);
    setAdvancePayments(value);

    // Check if the advance payment exceeds remaining balance
    if (value > remainingLoanBalance) {
      setIsAdvancePaymentExceeding(true);
    } else {
      setIsAdvancePaymentExceeding(false);
    }

    // Check if the advance payment is lower than the fixed amortization payment
    if (value === 0 || value === '' || value > fixedAmortizationPayment) {
      setIsAdvancePaymentTooLow(false); // Reset to false if valid or zero
    } else {
      setIsAdvancePaymentTooLow(true); // If it's lower than fixed amortization
    }
  };

  if (!loanData) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div>Loading loan data...</div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster />
      <Container maxWidth="sm">
        <Box mt={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" align="center" gutterBottom>
                Loan Payment Dashboard
              </Typography>

              <Grid container spacing={2}>
                {/* Loan Amount Input */}
                <Grid item xs={12}>
                  <TextField
                    label="Loan Amount"
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    value={loanAmount}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                {/* Interest Rate Input */}
                <Grid item xs={12}>
                  <TextField
                    label="Interest Rate Per Month (%)"
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    value={interestRate}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                {/* Fixed Amortization Payment */}
                <Grid item xs={12}>
                  <TextField
                    label="Fixed Amortization Payment"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={fixedAmortizationPayment}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                {/* Remaining Loan Balance */}
                <Grid item xs={12}>
                  <TextField
                    label="Remaining Loan Balance"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={remainingLoanBalance}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                {/* Custom Advance Payments Input */}
                <Grid item xs={12}>
                  <TextField
                    label="Advance Payment"
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    value={advancePayments}
                    onChange={handleAdvancePaymentChange}
                    error={isAdvancePaymentExceeding || isAdvancePaymentTooLow}
                    helperText={
                      isAdvancePaymentExceeding
                        ? 'Advance payment exceeds remaining loan balance.'
                        : isAdvancePaymentTooLow
                        ? `Advance payment must be at least ${fixedAmortizationPayment}`
                        : ''
                    }
                  />
                </Grid>

                {/* Pay Button */}
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handlePayment}
                    disabled={isAdvancePaymentExceeding || isAdvancePaymentTooLow} // Disable if advance payment exceeds remaining balance
                  >
                    Pay
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Payment;
