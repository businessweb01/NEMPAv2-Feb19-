import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import Divider from '@mui/joy/Divider';
import Typography from '@mui/joy/Typography';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemContent from '@mui/joy/ListItemContent';
import ListDivider from '@mui/joy/ListDivider';
import ListItemText from '@mui/material/ListItemText';
import Input from '@mui/joy/Input';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import Stack from '@mui/joy/Stack';
import { Add, Remove } from '@mui/icons-material';
import { ToastContainer, toast } from 'react-toastify';
import { TbCalendarDue } from "react-icons/tb";
import Switch from '@mui/joy/Switch';
export default function OrderList() {
  const [loans, setLoans] = React.useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = React.useState(false);
  const [openReleaseModal, setOpenReleaseModal] = React.useState(false);
  const [currentLoanId, setCurrentLoanId] = React.useState(null); 
  const [runningBalance, setRunningBalance] = useState('0');
  const [biWeeklyPay, setBiWeeklyPay] = useState('0'); 
  const [customAmount, setCustomAmount] = useState('0');
  const [isBiWeekly, setIsBiWeekly] = useState(true); 
  const [isCustom, setIsCustom] = useState(false);
  const [recomputeDate, setRecomputeDate] = useState(value => value < 0 ? 0 : value || '');
  const [startOfPayment, setStartOfPayment] = useState('');
  const[recomputedAmount, setRecomputedAmount] = useState('0');
  const[loanValue, setLoanValue] = useState('0');
  const [totalAmount, setTotalAmount] = useState('0');
  const [interestRate, setInterestRate] = useState('0');
  const [runningBalanceRecompute, setRunningBalanceRecompute] = useState('0');
  const [openRecomputeModal, setOpenRecomputeModal] = useState(false);
  const [recomputeInterestValue, setRecomputeInterestValue] = useState('0');
  const [oldTotalInterest, setOldTotalInterest] = useState('0');
  const [BalanceRecompute, setBalanceRecompute] = useState('0');
  const [rebateAmount, setRebateAmount] = useState('0');
  const [totalPayments, setTotalPayments] = useState('0');
  const [interestAmount, setInterestAmount] = useState('0');

  const fetchLoans = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/OnGoingLoans");
      const data = await response.json();
      
      setLoans(data);
  
      // ✅ Store running balance for each loan and parse it as a number
      const loanBalances = data.reduce((acc, loan) => {
        // Ensure loan amount is parsed as a number
        acc[loan.id] = parseFloat(loan.amount);
        return acc;
      }, {});
  
      // Only set runningBalance when a loan is selected (you'll update this separately when selecting a loan)
      // We don't set runningBalance here globally unless needed
  
      // ✅ Ensure bi-weekly payment does not exceed the loan amount
      const initialBiWeeklyPayments = data.reduce((acc, loan) => {
        acc[loan.id] = parseFloat(loan.biWeeklyPay) > parseFloat(loan.amount) 
          ? parseFloat(loan.amount) 
          : parseFloat(loan.biWeeklyPay);
        return acc;
      }, {});
      setBiWeeklyPay(initialBiWeeklyPayments); // Set bi-weekly payments per loan ID
  
      // Initialize approvers for each loan as an empty array
      const initialApprovers = data.reduce((acc, loan) => {
        acc[loan.id] = [];
        return acc;
      }, {});
    } catch (error) {
      console.error("Error fetching loan data:", error);
      toast.error("Failed to fetch loan data", { autoClose: 2000, containerId: "main-toast" });
    }
  }, []);
  
  
   
  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleBiWeeklyToggle = () => {
    setIsBiWeekly(true);
    setIsCustom(false);
    setCustomAmount('0'); // Reset custom amount when switching to Bi-Weekly
  };
  
  const handleCustomToggle = () => {
    setIsCustom(true);
    setIsBiWeekly(false);
  };

  // Filter rows based on the search query
  const getFilteredLoans = () => loans.filter((loan) => {
    return (
      loan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer.name.toLowerCase().includes(searchQuery.toLowerCase())

    );
  });
  const handleLoanClick = (loanId, loanAmount, biWeeklyPay) => {
    // First, determine the correct biWeeklyPay based on the loan amount and the biWeeklyPay.
    const validBiWeeklyPay = loanAmount < biWeeklyPay ? loanAmount : biWeeklyPay;
  
    // Update the state with the correct values
    setCurrentLoanId(loanId);
    setRunningBalance(loanAmount);
    setBiWeeklyPay(validBiWeeklyPay);  // Set biWeeklyPay only once based on the condition
    setOpen(true);  // Open the modal
  };
  
  const formatDate = (loanDate) => {
    const date = new Date(loanDate); // Convert the string to a Date object
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options); // Format the date as 'Feb 17 2025'
  };

  const handleMakePayment = async () => {
    if (!currentLoanId) {
      toast.error("Missing Loan Reference Number!", { autoClose: 2000 });
      return;
    }
  
    const paymentDate = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    const paymentAmount = customAmount !== '0' ? customAmount : biWeeklyPay;
  
    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Invalid payment amount!", { autoClose: 2000 });
      return;
    }
  
    try {
      const response = await fetch("http://localhost:5000/make-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentLoanId, paymentDate, payment: paymentAmount }),
      });
  
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "Payment successful!", { autoClose: 2000, containerId: 'main-toast' });
        setRunningBalance(data.updatedLoanAmount);
        if (data.updatedLoanAmount < data.updatedbiWeeklyAmount) {
          setBiWeeklyPay(data.updatedLoanAmount);
        } else {
          setBiWeeklyPay(data.updatedbiWeeklyAmount);
        }
  
        // Refresh the loan data after payment
        fetchLoans();
      } else {
        toast.error(data.message || "Payment failed!", { autoClose: 2000, containerId: 'main-toast' });
      }
    } catch (error) {
      console.error("Error making payment:", error);
      toast.error("An error occurred while making the payment.", { autoClose: 2000, containerId: 'main-toast' });
    }
  };

  const calculateMonthsDifference = (startOfPayment) => {
    // Step 1: Convert the startOfPayment string to a Date object
    const startDate = new Date(startOfPayment); // 'yyyy-mm-dd' format is directly parsed by JavaScript's Date constructor
    
    // Ensure that the date was correctly parsed
    if (isNaN(startDate)) {
      console.error("Error parsing the start date");
      return NaN; // Return NaN if the date parsing fails
    }
  
    // Get the current date
    const currentDate = new Date();
  
    // Step 2: Calculate the difference in months between the current date and the start date
    const yearDiff = currentDate.getFullYear() - startDate.getFullYear();
    const monthDiff = currentDate.getMonth() - startDate.getMonth();
    const dayDiff = currentDate.getDate() - startDate.getDate();
  
    let totalMonths = yearDiff * 12 + monthDiff;
    if (dayDiff < 0) totalMonths -= 1; // Subtract one month if the current day is before the start date's day.
  
    return totalMonths; // The number of months passed since the start date
  };
  
  const handleRecompute = async (loanId) => {
    setCurrentLoanId(loanId);
    setOpenReleaseModal(true);
    
    try{
      const response = await fetch("http://localhost:5000/fetchLoanDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
      });
      const data = await response.json();
      console.log(data);
      setLoanValue(data.LoanAmount);
      setStartOfPayment(data.PaymentStartAt);
      setTotalAmount(data.TotalAmount);
      setInterestRate(data.Interest);
      setRunningBalanceRecompute(data.running_balance);
      setBalanceRecompute(data.running_balance);
      setTotalPayments(data.TotalPayments);
      setInterestAmount(data.interest_Amount);
      const monthsPassed = calculateMonthsDifference(data.PaymentStartAt);
      let months;
      if(monthsPassed === 0){
        months = '';
      }else{
        months = monthsPassed;
      }
      setRecomputeDate(months);
      const OldInterest = data.TotalAmount - data.LoanAmount;
      setOldTotalInterest(OldInterest);
    }catch(error){
      console.error("Error recomputing:", error);
      toast.error("An error occurred while recomputing.", { autoClose: 2000, containerId: 'main-toast' });
    }

  };
  const handleDateChange = (e) => {
    // Get the new value
    const value = e.target.value;

    // Check if the value is a number and greater than 0
    if (value < 0) {
      setRecomputeDate(0);  // Update the state if the value is positive
    }else{
      setRecomputeDate(value);
    }
  };
  const computeRecompute = () => {
    let daterecomputed;
    if(recomputeDate === 0 || recomputeDate < 0 ){
      daterecomputed = 0;
      setRecomputedAmount(runningBalanceRecompute); // Fixed variable name
      setRebateAmount(0);
      setRecomputeInterestValue(interestAmount);
    }else{
      daterecomputed = recomputeDate;
      let InterestValue = loanValue * (interestRate / 100); //Calculate the Monthly Interest
      let TotalInterest = InterestValue * daterecomputed; //Calculate the Total Interest
      let loanAmountWithInterest = loanValue + TotalInterest; //Calculate the Loan Amount with Interest
      let newRecomputedAmount = loanAmountWithInterest - totalPayments; //Calculate the remaining amount to be paid
      let rebateAmount = totalAmount - loanAmountWithInterest; //Calculate the rebate amount
      
      setRecomputedAmount(newRecomputedAmount);
      setRecomputeInterestValue(TotalInterest);
      setRebateAmount(rebateAmount);
    }
    setOpenRecomputeModal(true);
  }
  const isDueToday = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today.setHours(0, 0, 0, 0) === due.setHours(0, 0, 0, 0); // Compare dates only (ignores time)
  };
  
  const isPassedDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today > due; // Checks if today is after the due date (without time)
  };
  const filteredLoans = loans.filter((loan) => {
    return (
      loan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleRecomputeSubmit = async (loanId) => {
    setCurrentLoanId(loanId);
    setOpenRecomputeModal(true);
    const dateNow = new Date().toISOString().split("T")[0];
    const status = 'Recomputed';
    const balance = 0;
    let daterecomputed;
    if(recomputeDate === 0){
      daterecomputed = 0;
    }else if(recomputeDate>0){
      daterecomputed = recomputeDate;
    }else{
      daterecomputed = recomputeDate;
    }
    try{
      const response = await fetch("http://localhost:5000/PayRecomputedLoan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, recomputedAmount, recomputeInterestValue, dateNow, status, balance, startOfPayment, daterecomputed})
      });
      const data = await response.json();
      if(response.ok){
        toast.success(data.message || "Recomputed successfully!", { autoClose: 2000, containerId: 'main-toast' });
        fetchLoans();
      }else{
        toast.error(data.message || "An error occurred while recomputing.", { autoClose: 2000, containerId: 'main-toast' });
      }
    }catch(error){
      console.error("Error recomputing:", error);
      toast.error("An error occurred while recomputing.", { autoClose: 2000, containerId: 'main-toast' });
    }
  }

  return (
    <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
     <ToastContainer position="top-center" autoClose={1000}  />
      <Input
        size="sm"
        placeholder="Search..."
        startDecorator={<SearchIcon />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ flexGrow: 1, marginBottom: 3}}
      />
      {getFilteredLoans().map((loan) => (  
        <List key={loan.id} size="sm" sx={{ '--ListItem-paddingX': 0 }}>
          <ListItem
             sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              borderRadius: 2, // Rounded corners for a card-like shape
              boxShadow: 5, // Stronger shadow for the card effect (higher values = stronger shadows)
            }}
            >
            <ListItemContent sx={{ display: 'flex', gap: 2, alignItems: 'start' }}>
              <div item={true}>
                <Typography gutterBottom sx={{ fontWeight: 600 }}>
                  {loan.customer.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.5,
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex',flexDirection:'column', gap: 1 }}>
                  <Typography level="body-xs">Loan Ref. No:
                      <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}>{loan.id}</Typography>
                  </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Button variant='soft' color='primary'size="sm"  
                  sx={{ whiteSpace: 'nowrap', color: 'primary' }}
                  onClick={() => handleRecompute(loan.id, loan.amount, loan.biWeeklyPay)}
                  >
                      Recompute
                  </Button>
                  <Button variant='soft' color='success' size="sm"  
                  sx={{ whiteSpace: 'nowrap', color: 'primary' }}
                  onClick={() => handleLoanClick(loan.id, loan.amount, loan.biWeeklyPay)}
                  >
                    Make Payment
                  </Button>
                </Box>
              </div>
            </ListItemContent>
            {isDueToday(loan.dueDate) ? (
              <Chip label="Due Today" variant="soft" color="warning" endDecorator={<TbCalendarDue />}>
                <Typography level="body-xs" sx={{ cursor: 'pointer' }}>
                  Due Today
                </Typography>
              </Chip>
            ) : isPassedDue(loan.dueDate) ? (
              <Chip label="Passed Due" variant="soft" color="error" endDecorator={<TbCalendarDue />}>
                <Typography level="body-xs" sx={{ cursor: 'pointer' }}>
                  Passed Due
                </Typography>
              </Chip>
            ) : (
              <Typography level="body-xs" sx={{ cursor: 'pointer' }}>
               Due On {formatDate(loan.dueDate)}
              </Typography>
            )}
          </ListItem>
          <ListDivider />
        </List>
      ))}

<Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog>
          <DialogTitle>Loan Payment</DialogTitle>
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMakePayment();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <Typography>Running Balance</Typography>
              <Input
                label="Running Balance"
                variant="outlined"
                startDecorator={<span>&#8369;</span>}
                value={runningBalance ?? '0'} // Ensure it's always a string
                onChange={(e) => setRunningBalance(e.target.value)}
                readOnly
              />
              <Box>
                {/* Bi-Weekly Payment Section */}
                <Typography>Bi-Weekly Payment</Typography>
                <Box sx={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                  <Input
                    label="Payment Amount"
                    variant="outlined"
                    type='number'
                    value={isBiWeekly ? biWeeklyPay : ""}  // Only show biWeeklyPay if isBiWeekly is true
                    onChange={(e) => setBiWeeklyPay(e.target.value)}
                    startDecorator={<span>&#8369;</span>}
                    readOnly
                  />
                  <Switch checked={isBiWeekly} onChange={handleBiWeeklyToggle} />
                </Box>

                {/* Custom Payment Section */}
                <Typography>Custom Payment</Typography>
                <Box sx={{ display: "flex", flexDirection: "row", gap: "10px" }}>
                  <Input
                    label="Custom Payment"
                    variant="outlined"
                    type="number"
                    startDecorator={<span>&#8369;</span>}
                    value={isCustom ? customAmount : '0'} // Only show customAmount if isCustom is true
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={!isCustom}
                  />
                  <Switch checked={isCustom} onChange={handleCustomToggle} />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button variant="outlined" color="success" type="submit">
                  Make Payment
                </Button>
              </Box>
            </form>
          </div>
        </ModalDialog>
      </Modal>

      
      {/* Modal for Releasing */}
      <Modal open={openReleaseModal} onClose={() => setOpenReleaseModal(false)}>
        <ModalDialog
          aria-labelledby="nested-modal-title"
          aria-describedby="nested-modal-description"
          sx={{
            maxWidth: 400,
            p: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 3,
          }}
        >
          {/* Loan Details */}
          <Typography id="nested-modal-title" variant="h5" fontWeight="bold" gutterBottom>
            Loan Details
          </Typography>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              computeRecompute();
            }}
          >
              <Stack spacing={1} mb={2}>
                <Box>
                <Typography variant="body1">Loan Reference Number:</Typography>
                <Input
                  label="Loan Reference Number"
                  variant="outlined"
                  value={currentLoanId}
                  onChange={(e) => setCurrentLoanId(e.target.value)}
                  sx={{ width: '100%', padding: '5px 10px' }}
                  readOnly
                >
                </Input>
                </Box>
                <Box>
                  <Typography variant="body1">Principal Amount</Typography>
                  <Input
                    label="Principal Amount"
                    variant="outlined"
                    startDecorator={<span>&#8369;</span>}
                    value={loanValue}
                    readOnly
                  />
                </Box>
                <Box>
                  <Typography variant="body1">Interest Rate/Month</Typography>
                  <Input
                    label="Interest Rate"
                    variant="outlined"
                    type="number"
                    startDecorator={<span>%</span>}
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    sx={{ width: '100%', padding: '5px 10px' }}
                  />
                </Box>
              <Box>
              <Typography variant="body1">Total Amount</Typography>
              <Input
                    label="Total Amount"
                    variant="outlined"
                    startDecorator={<span>&#8369;</span>}
                    value={totalAmount}
                    readOnly
                  />
              </Box>
              <Box>
                <Typography variant="body1">Loan Issuance Date</Typography>
                <Input
                label="Loan Issuance Date"
                variant="outlined"
                value={formatDate(startOfPayment)}
                readOnly
                >
                </Input>
              </Box>
              <Box>
                <Typography variant="body1">Payment Months (Paid + Due)</Typography>
                <Input
                label="Months Passed"
                variant="outlined"
                value={recomputeDate < 0 ? 0 : recomputeDate}
                type='number'
                step={1}
                onChange={handleDateChange}
                readOnly={recomputeDate === '' ? true : false}
                />
              </Box>
            </Stack>
            {/* Buttons */}
            <Stack direction="row" justifyContent="center" spacing={1}>
              <Button variant="outlined" color="danger" onClick={() => setOpenReleaseModal(false)}>
                Cancel
              </Button>
              <Button variant="outlined" type="submit" color="primary" onClick={() => setOpenRecomputeModal(true)}>
                Recompute
              </Button>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>

      <Modal open={openRecomputeModal} onClose={() => setOpenRecomputeModal(false)}>
        <ModalDialog>
          <Box
            sx={{
              width: '100%',
              maxWidth: 400,
              margin: '0 auto',
              padding: '16px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <Typography variant="h6" align="center" sx={{ marginBottom: '16px', fontWeight: 'bold' }}>
              Recomputation Breakdown
            </Typography>

            <Stack direction="column" spacing={2}>
              {/* Interest Value Section */}
              <Box sx={{ display: 'flex',flexDirection:'column', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                <Typography variant="body1">Old Interest Value:</Typography>
                <Typography variant="body1">₱ {oldTotalInterest}</Typography>
              </Box>

              {/* Total Interest */}
              <Box sx={{ display: 'flex',flexDirection:'column', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                <Typography variant="body1">Running Balance:</Typography>
                <Typography variant="body1">₱ {BalanceRecompute}</Typography>
              </Box>

              {/* Loan Amount with Interest */}
              <Box sx={{ display: 'flex',flexDirection:'column', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                <Typography variant="body1">Recomputed Interest Value:</Typography>
                <Typography variant="body1">₱ {recomputeInterestValue}</Typography>
              </Box>

              {/* Recomputed Amount */}
              <Box sx={{ display: 'flex',flexDirection:'column', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                <Typography variant="body1">Recomputed Loan Amount:</Typography>
                <Typography variant="body1">₱ {recomputedAmount}</Typography>
              </Box>
              <Box sx={{ display: 'flex',flexDirection:'column', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                <Typography variant="body1">Rebate Amount:</Typography>
                <Typography variant="body1">₱ {rebateAmount}</Typography>
              </Box>
            </Stack>
          </Box>
          <Divider />
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="outlined" color="danger" onClick={() => setOpenRecomputeModal(false)}>
                Cancel
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="outlined" color="success"onClick={() => handleRecomputeSubmit(currentLoanId)}>
                Make Payment
              </Button>
            </Box>
          </div>
        </ModalDialog>

      </Modal>
    </Box>
  );
}
