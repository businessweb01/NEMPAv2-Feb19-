import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import toast, { Toaster } from 'react-hot-toast';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

// Define MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

const Payment = () => {
  const [loanRefNo, setLoanRefNo] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [loanData, setLoanData] = useState(null);  // Initially null
  const [fixedAmortizationPayment, setFixedAmortizationPayment] = useState(0);
  const [fixedPrincipalPayment, setFixedPrincipalPayment] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [noOfMonths, setNoOfMonths] = useState(0);
  const [numberOfPayments, setNumberOfPayments] = useState(0);
  const [advancePayments, setAdvancePayments] = useState(0);  // Number of advance payments selected
  
  // Fetch loan data using the loanRefNo and clientId extracted from the token
  useEffect(() => {
    const loanRefNoToken = localStorage.getItem('jwtToken');
    if (loanRefNoToken) {
      const decodedToken = jwtDecode(loanRefNoToken);
      setLoanRefNo(decodedToken.loanRefNo);
      setClientId(decodedToken.clientId);

      // Fetch loan data from the server
      fetchLoanData(decodedToken.loanRefNo, decodedToken.clientId);
    } else {
      console.error('No loanRefNo token found');
    }
  }, []);

  const fetchLoanData = async (loanRefNo, clientId) => {
    try {
      const response = await fetch(`http://localhost:5000/loanData`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLoanData(data);
        // Set the state variables based on the fetched loan data
        const { loan_amount, no_of_months, interest, bi_weekly_amort } = data;
        setLoanAmount(loan_amount);
        setNoOfMonths(no_of_months);

        // Calculate fixed payments
        const annualInterestRate = interest * 12 / 100;
        setTotalAmount(loan_amount * annualInterestRate + loan_amount);
        const fixedPrincipalPayment = loan_amount / (no_of_months * 2);
        setFixedPrincipalPayment(fixedPrincipalPayment);
        setFixedAmortizationPayment(bi_weekly_amort);
        setNumberOfPayments(no_of_months * 2);
        console.log(fixedAmortizationPayment);
      } else {
        console.error('Failed to fetch loan data');
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
    }
  };

  // Function to handle the "Pay" button click and update the loan data
  const handlePayment = async () => {
    const totalAdvancePayment = advancePayments * fixedAmortizationPayment;
    const updatedLoanAmount = loanAmount - (fixedPrincipalPayment + totalAdvancePayment);
    const updatedTotalAmount = totalAmount - (fixedAmortizationPayment * (advancePayments + 1));

    try {
      // Make a request to the server to update the loan data
      const response = await fetch(`http://localhost:5000/updateLoanData`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
        },
        body: JSON.stringify({
          loanRefNo,
          clientId,
          updatedLoanAmount,
          updatedTotalAmount,
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();

        // Check if the loan is finished (i.e., loan amount and total are 0)
        if (updatedData.updatedLoanAmount === 0 || updatedData.updatedTotalAmount === 0) {
          toast.success('Loan is paid off completely!');
        } else {
          toast.success('Payment made successfully');
        }

        // Update the loan data with the new values
        setLoanData(updatedData);
        setLoanAmount(updatedLoanAmount);
        setTotalAmount(updatedTotalAmount);
      } else {
        console.error('Failed to update loan data');
      }
    } catch (error) {
      console.error('Error updating loan data:', error);
    }
  };

  if (!loanData) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div>Loading loan data...</div> {/* Display a loading message */}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster />
      <div style={{ margin: '20px' }}>
        <TextField
          label="Fixed Payment Amortization"
          id="outlined-size-small"
          size="small"
          value={fixedAmortizationPayment}
          disabled
        />
      </div>
      <div style={{ margin: '20px' }}>
        <TextField
          label="Principal Payment"
          id="outlined-size-small"
          size="small"
          value={fixedPrincipalPayment ? fixedPrincipalPayment.toFixed(2) : '0.00'}
          disabled
        />
      </div>
      <div style={{ margin: '20px' }}>
        <TextField
          label="Number of Months"
          id="outlined-size-small"
          size="small"
          value={noOfMonths}
          disabled
        />
      </div>
      <div style={{ margin: '20px' }}>
        <TextField
          label="Number of Terms"
          id="outlined-size-small"
          size="small"
          value={numberOfPayments}
          disabled
        />
      </div>

      {/* Dropdown for selecting advance payments */}
      <div style={{ margin: '20px' }}>
        <FormControl fullWidth>
          <InputLabel id="advance-payments-label">Advance Payments</InputLabel>
          <Select
            labelId="advance-payments-label"
            value={advancePayments}
            onChange={(e) => setAdvancePayments(e.target.value)}
            label="Advance Payments"
          >
            {/* Options for advance payments (from 0 to the max number of payments) */}
            {[...Array(noOfMonths * 2 + 1).keys()].map((index) => (
              <MenuItem key={index} value={index}>
                {index} payments
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      <div style={{ margin: '20px' }}>
        <Button variant="contained" onClick={handlePayment}>Pay</Button>
      </div>
    </ThemeProvider>
  );
};

export default Payment;
