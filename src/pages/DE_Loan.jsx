import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import  jwtDecode  from 'jwt-decode'; 
import { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  // maxWidth: '800px',  // Increased width for better alignment
  // padding: theme.spacing(4),
  gap: theme.spacing(2),
  // margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  overflowY: 'auto',
  maxHeight: '100vh',
  '&::-webkit-scrollbar': {
    display: 'none',
  }
}));

const LoanContainer = styled(Stack)(({ theme }) => ({
  // height: '100vh',
  // minHeight: '100%',
  // padding: theme.spacing(2),
  // [theme.breakpoints.up('sm')]: {
  //   padding: theme.spacing(4),
  // },
  overflowY: 'auto',
  maxHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  backgroundImage:
    'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
  backgroundRepeat: 'no-repeat',
}));

export default function ED_Loan({setToastActive ,setActiveStep}) {
  const [loanAmount, setLoanAmount] = React.useState('');
  const [loanInterest, setLoanInterest] = React.useState(1); // 1% Monthly Interest
  const [noOfMonths, setNoOfMonths] = React.useState(12);
  const [total, setTotal] = React.useState(0);
  const [loanDate, setLoanDate] = React.useState(new Date().toISOString().slice(0, 10)); // Default to today's date
  const [clientId, setClientId] = useState(null);
  const [biWeeklyAmortization, setBiWeeklyAmortization] = useState(0);
  
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      const decodedToken = jwtDecode(token);
      setClientId(decodedToken.clientId); // Set ClientId from the token
    } else {
     console.error('No token found');
    }
  }, []);
  const handleLoanAmountChange = (event) => {
    const amount = parseFloat(event.target.value);
    setLoanAmount(amount);
    calculateTotal(amount, noOfMonths);
  };

  const handleNoOfMonthsChange = (event) => {
    const months = parseInt(event.target.value);
    setNoOfMonths(months);
    calculateTotal(loanAmount, months);
  };

  const calculateTotal = (amount, months) => {
    // Calculate interest per month (1% monthly interest)
    const interestPerMonth = (amount * (loanInterest / 100));
    // Calculate total interest for the loan duration
    const totalInterest = interestPerMonth * months;
    // Calculate total loan amount
    const totalAmount = amount + totalInterest;
    const biWeeklyAmort = totalAmount/(months * 2);
    setTotal(totalAmount.toFixed(2));  // Fix to 2 decimal places
    setBiWeeklyAmortization(biWeeklyAmort.toFixed(2));
  };

  const handleLoanSubmit = async (event) => {
    event.preventDefault();
    if (!clientId) {
      console.log("ClientId is still not set");
      return; // Prevent form submission if ClientId is not yet set
    }
    setToastActive(true);
    const loanData = {
      clientId,
      loanAmount,
      loanInterest,
      noOfMonths,
      loanDate,  // Include loanDate in the data sent to the backend
      total,
      biWeeklyAmortization,
    };
   console.log(loanData); 
    try {
      const response = await fetch('http://localhost:5000/submit-loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanData),
      });
  
      const result = await response.json();
      if (response.ok) {
        toast.success('Loan Data Inserted Successfully', {
          duration: 1500,
        });
        setTimeout(() => {
          setToastActive(false);
          setActiveStep(2); 
        }, 2000);
        console.log(result);
        const loanRefNo = result.loanRefNo;
        console.log("Loan Ref No:", loanRefNo);
          
      } else {
        toast.error('Failed to insert loan data');
      }
    } catch (error) {
      console.error('Error submitting loan data:', error);
      toast.error('Error submitting loan data');
    }
  };
  

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ToastContainer position="top-center" autoClose={1500} />
      <LoanContainer direction="column" justifyContent="space-between">
        <Card>
          {/* <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Loan Data Entry
          </Typography> */}
          <Box
            component="form"
            onSubmit={handleLoanSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent:"center" }}
          >
            <Grid container spacing={2}>
              {/* Loan Amount */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="loanAmount">Loan Amount</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="loanAmount"
                    name="loanAmount"
                    value={loanAmount}
                    onChange={handleLoanAmountChange}
                    placeholder="100000"
                    type="number"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px',
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* Loan Interest */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="loanInterest">Monthly Interest (%)</FormLabel>
                  <TextField
                    fullWidth
                    id="loanInterest"
                    name="loanInterest"
                    value={loanInterest}
                    readOnly
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px',
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* No. of Months */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="noOfMonths">No. of Months</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="noOfMonths"
                    name="noOfMonths"
                    value={noOfMonths}
                    onChange={handleNoOfMonthsChange}
                    placeholder="12"
                    type="number"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px',
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* Loan Date */}
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <FormLabel htmlFor="loanDate">Loan Date</FormLabel>
                        <TextField
                        required
                        fullWidth
                        id="loanDate"
                        name="loanDate"
                        value={new Date().toLocaleDateString()} // Set today's date
                        readOnly // Make it not editable
                        sx={{
                            '& .MuiInputBase-root': {
                            height: '45px',
                            },
                        }}
                        />
                    </FormControl>
                </Grid>

              {/* Total */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="total">Total</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="total"
                    name="total"
                    value={total}
                    readOnly
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px',
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12} sm={4}>
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '10px',
                  }}
                >
                  <Button type="submit" fullWidth variant="contained">
                    Submit
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Card>
      </LoanContainer>
    </ThemeProvider>
  );
}
