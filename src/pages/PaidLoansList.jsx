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
import Input from '@mui/joy/Input';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/joy/Button';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import Stack from '@mui/joy/Stack';
import { ToastContainer, toast } from 'react-toastify';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
export default function OrderList() {
  const [loans, setLoans] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [openReleaseModal, setOpenReleaseModal] = React.useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [currentLoanId, setCurrentLoanId] = useState(null);
  const [loanPayments, setLoanPayments] = useState([]);
  const [loanApprovers, setLoanApprovers] = useState([]);
  const [releasedBy, setReleasedBy] = useState(null);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanInterest, setLoanInterest] = useState(1);
  const [noOfMonths, setNoOfMonths] = useState(0);
  const [total, setTotalAmount] = useState(0);
  const [biWeeklyAmortization, setBiWeeklyAmortization] = useState(0);
  const [clientId, setClientId] = useState(null);
  const urlApi = import.meta.env.VITE_API_URL;
  const fetchLoans = useCallback(async () => {
    try {
      const response = await fetch(`${urlApi}/PaidLoans`);
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error("Error fetching loan data:", error);
      toast.error("Failed to fetch loan data", { autoClose: 2000, containerId: "main-toast" });
    }
  }, []);
  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);
  // Filter rows based on the search query
  const filteredLoans = loans.filter((loan) => {
    return (
      loan.id.toLowerCase().includes(searchQuery.toLowerCase())||
      loan.customer.name.toLowerCase().includes(searchQuery.toLowerCase())

    );
  });
  
  const formatDate = (loanDate) => {
    const date = new Date(loanDate); // Convert the string to a Date object
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options); // Format the date as 'Feb 17 2025'
  };
  const handleClick = (id, event) => {
    setCurrentLoanId(id); // Store the current loan ID
    setAnchorEl(event.currentTarget); // Set the element where the menu will be anchored
    setOpenMenu(true); // Open the menu
    console.log(id); // Log the ID for debugging
  };
  const handleClose = () => {
    setAnchorEl(null);
    setOpenMenu(false);
    setLoanPayments([]);
    setLoanApprovers([]);
    setReleasedBy(null);
    setLoanAmount(0);
    setLoanInterest(1);
    setNoOfMonths(0);
    setTotalAmount(0);
    setBiWeeklyAmortization(0);
  };
  // Close the menu if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (anchorEl && !anchorEl.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [anchorEl]);

  const handleViewLoanDetails = async () => {
    setOpenReleaseModal(true);
    const loanId = currentLoanId;
    // Ensure currentLoanId is set before this
    try{
      const response = await fetch(`${urlApi}/FetchLoanDetails/${loanId}`);
      
      if (response.ok) {
        const data = await response.json();
        setLoanPayments(data.loanPayments);
        setLoanApprovers(data.loanApprovers);
        setReleasedBy(data.releasedByWho);
        setClientId(data.clientId[0].client_id);
        setLoanInterest(data.loanInterest);
        console.log(data.clientId);
        console.log(data.loanPayments);
        console.log(data.loanApprovers);
        console.log(data.releasedByWho);
      } else {
        console.error('Failed to fetch loan details.');
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
    }
  };
  const handleRequestLoan = () => {
    console.log(currentLoanId); // Log the current loan ID
    setOpen(true);
  };

  useEffect(() => {
    const loanAmountNumber = parseFloat(loanAmount);
    const interestRateNumber = parseFloat(loanInterest);
    const noOfMonthsNumber = parseInt(noOfMonths, 10);
  
    if (loanAmountNumber && interestRateNumber && noOfMonthsNumber) {
      // Calculate the total amount
      const calculatedTotalAmount = loanAmountNumber + (loanAmountNumber * (interestRateNumber / 100) * noOfMonthsNumber);
      setTotalAmount(calculatedTotalAmount);
  
      // Calculate bi-weekly amortization
      const biWeeklyAmortization = calculatedTotalAmount / (noOfMonthsNumber * 2);
      setBiWeeklyAmortization(biWeeklyAmortization);
  
      setLoanAmount(loanAmountNumber);
      setLoanInterest(interestRateNumber);
      setNoOfMonths(noOfMonthsNumber);
    }
  }, [loanAmount, loanInterest, noOfMonths]);
  

 const handleSubmitLoanApplication = async () => {
  const loanDate = new Date();
  // Make sure the variables are correctly set
  console.log("Loan Amount:", loanAmount);
  console.log("Interest Rate:", loanInterest);
  console.log("No. of Months:", noOfMonths);
  console.log("Total Amount:", total);
  console.log("Bi-Weekly Amortization:", biWeeklyAmortization);

  try {
    const response = await fetch(`${urlApi}/submit-loan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Ensure this header is set for JSON data
      },
      body: JSON.stringify({
        OldloanId: currentLoanId,
        loanAmount,
        loanInterest,
        noOfMonths,
        loanDate,
        total: total,  // Send total amount calculated
        biWeeklyAmortization: biWeeklyAmortization.toFixed(2),  // Send the bi-weekly amortization
      }),
    });

    if (response.ok) {
      toast.success('Loan application submitted successfully', { autoClose: 2000, containerId: "main-toast" });
    } else {
      toast.error('Error submitting loan application', { autoClose: 2000, containerId: "main-toast" });
    }
  } catch (error) {
    console.error('Error submitting loan application:', error);
  }
};

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
      {filteredLoans.map((loan) => (  
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

                <Box sx={{ display: 'flex',flexDirection:'column', gap: 1 }}>
                  <Typography level="body-xs">Loan Amount:
                      <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}><span>&#8369;</span>{loan.loanAmount}</Typography>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex',flexDirection:'column', gap: 1 }}>
                  <Typography level="body-xs">Interest Rate:
                      <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}>{loan.loanInterest ? loan.loanInterest : 1}%</Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex',flexDirection:'column', gap: 1 }}>
                  <Typography level="body-xs">Total Amount Paid:
                      <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}><span>&#8369;</span>{loan.totalAmountPaid}</Typography>
                  </Typography>
                </Box>


              </div>
            </ListItemContent>
            <Stack direction={'column'} spacing={5}>
            <Chip variant='soft' color='success' size='sm' sx={{cursor: 'pointer'}}>
            Paid On {formatDate(loan.fullyPaidAt)}
            </Chip>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'right', gap: 1, mb: 1 }}>
              <Button variant='soft' color='primary' size='sm'
                sx={{cursor: 'pointer'}} 
                onClick={(event) => {
                  handleClick(loan.id, event);
                }}
              >
                Options
              </Button>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleClose}
              placement="bottom-end"
            >
              <MenuItem onClick={handleViewLoanDetails}>View Loan Details</MenuItem>
              <MenuItem onClick={handleRequestLoan}>Request Loan</MenuItem>
            </Menu>
            </Stack>
          </ListItem>
          <ListDivider />
        </List>
      ))}
      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog>
          <DialogTitle>Loan Application</DialogTitle>
          <Divider />
          <div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmitLoanApplication();
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', mb: 2 }}>
                <Typography>Loan Amount</Typography>
                <Input
                  placeholder='Loan Amount'
                  type='number'
                  startDecorator={<span>&#8369;</span>}
                  value={loanAmount}
                  onChange={(event) => setLoanAmount(event.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', mb: 2 }}>
                <Typography>Interest Rate (in %)/Month</Typography>
                <Input
                  placeholder='Interest Rate'
                  type='number'
                  value={loanInterest}
                  readOnly
                  onChange={(event) => setLoanInterest(event.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', mb: 2 }}>
                <Typography>No. of Months</Typography>
                <Input
                  placeholder='No. of Months'
                  type='number'
                  value={noOfMonths}
                  onChange={(event) => setNoOfMonths(event.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px', mb: 2 }}>
                <Typography>Total Amount</Typography>
                <Input
                  placeholder='Total Amount'
                  type='number'
                  startDecorator={<span>&#8369;</span>}
                  readOnly
                  value={total}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <Button variant='outlined' color='danger' onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit'>Submit</Button>
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
            maxWidth: 600,
            p: 3,
            borderRadius: 10,
            bgcolor: 'background.paper',
            boxShadow: 3,
            overflowY: 'auto',
          }}
        >
          <Typography id="nested-modal-title" variant="h5" fontWeight="bold" gutterBottom>
            Loan Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {/* Loan Payments Table */}
          <Typography variant="h6" sx={{ mb: 1 }}>Loan Payments</Typography>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <table style={{ marginBottom: '16px', width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date From</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date To</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {loanPayments.map((payment, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{formatDate(payment.PaymentDateFrom)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{formatDate(payment.PaymentDateTo)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><span>&#8369;</span> {payment.PaymentAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Display Approvers as a list below the table */}
          {loanApprovers.length > 0 && (
            <div sx={{ mb: 2, height: '100px', overflowY: 'auto', maxHeight: '100px' }}>
              <Typography variant="h6" >Loan Approvers:</Typography>
              <ul style={{listStyleType: 'disc', padding: 2, marginLeft: 20}}>
                {loanApprovers.map((approver, index) => (
                  <li key={index} sx={{ fontWeight: 'bold'}}>{approver.approver_name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Released By */}
          <Typography variant="h6" >Released By:</Typography>
          <Typography sx={{fontWeight: 'bold'}}>{releasedBy ? releasedBy[0].releasedBy : "N/A"}</Typography>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
