import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Input from '@mui/joy/Input';
import SearchIcon from '@mui/icons-material/Search';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import Stack from '@mui/joy/Stack';
import { Add, Remove } from '@mui/icons-material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Divider from '@mui/joy/Divider';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemText from '@mui/material/ListItemText';

export default function OrderTable() {
  const [loans, setLoans] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [openReleaseModal, setOpenReleaseModal] = React.useState(false);
  const [currentLoanId, setCurrentLoanId] = React.useState(null); // Track current loan being edited
  const [loanDate, setLoanDate] = React.useState(null);
  const [loanAmount, setLoanAmount] = React.useState(null);
  const [clientName, setClientName] = React.useState(null);
  const [loanApprovers, setLoanApprovers] = useState({}); // Store approvers for each loan by ID
  const [approvers, setApprovers] = React.useState({}); // Initialize as an empty array
  const [releasedBy, setReleasedBy] = useState('');
  const [PaymentStartAt, setPaymentStartAt] = useState('');
  const urlApi = import.meta.env.VITE_API_URL;
  // Fetch Pending Loans
  const fetchLoans = useCallback(async () => {
    try {
      const response = await fetch(`${urlApi}/PendingLoans`);
      const data = await response.json();
      setLoans(data);
  
      // Initialize approvers for each loan as an empty array
      const initialApprovers = data.reduce((acc, loan) => {
        acc[loan.id] = [];
        return acc;
      }, {});
      setLoanApprovers(initialApprovers);
    } catch (error) {
      console.error('Error fetching loan data:', error);
      toast.error('Failed to fetch loan data', { autoClose: 2000, containerId: 'main-toast' }); // Set autoClose here
    }
  }, []);
  

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Submitting Approvers
  const handleSubmitApprover = async (loanId) => {
    try {
      const approvedDate = new Date().toISOString().split('T')[0];
  
      const response = await fetch(`${urlApi}/submitLoanApprovals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          approvedDate,
          approvers: loanApprovers[loanId] ?? [],
        }),
      });
  
      const data = await response.json();
  
      if (data.success) {
        toast.success('Loan approval submitted successfully', { autoClose: 2000, containerId: 'main-toast' });
        setOpen(false);
        fetchLoans(); 
      } else {
        toast.error(data.message || 'Failed to submit loan approvals', { autoClose: 2000, containerId: 'main-toast' });
      }
    } catch (error) {
      console.error('Fetch error:', error); 
      toast.error('Error submitting loan approvals', { autoClose: 2000, containerId: 'main-toast' });
    }
  };
  
  // Releasing
  const handleReleaseClick = async (loanId, loanDate, loanAmount, clientName) => {
    setOpenReleaseModal(true);
    setCurrentLoanId(loanId);
    setLoanDate(loanDate);
    setLoanAmount(loanAmount);
    setClientName(clientName);
    toast.dismiss();
    const releasedDate = new Date().toISOString().split('T')[0];
  
    // Function to add 15 business days (skip weekends)
    const addBusinessDays = (date, days) => {
      let result = new Date(date);
      let count = 0;
  
      while (count < days) {
        result.setDate(result.getDate() + 1);
  
        // Skip weekends (Saturday = 6, Sunday = 0)
        if (result.getDay() !== 6 && result.getDay() !== 0) {
          count++;
        }
      }
  
      return result.toISOString().split('T')[0]; // Return in YYYY-MM-DD format
    };
    const PaymentStartAt = addBusinessDays(releasedDate, 15); // Add 15 business days
    setPaymentStartAt(PaymentStartAt);
    try {
      const response = await fetch(`${urlApi}/fetchApprovers/${loanId}`);
      const data = await response.json();
      if (data.success) {
        setApprovers((prevState) => ({
          ...prevState,
          [loanId]: data.approvers,
        }));
      } else {
        toast.error('Error fetching approvers: ' + data.message , { autoClose: 2000, containerId: 'main-toast' });
      }
    } catch (error) {
      console.error('Error fetching approvers:', error);
      toast.error('Failed to fetch approvers', { autoClose: 2000, containerId: 'main-toast' });
    }
  };
  
  const handleReleasing = async (loanId) => {
    if (!releasedBy.trim()) {
      toast.error('Please enter who is releasing the loan', { autoClose: 2000, containerId: 'main-toast' });
      return;
    }
    const releasedDate = new Date().toISOString().split('T')[0];
  
    // Function to add 15 business days (skip weekends)
    const addBusinessDays = (date, days) => {
      let result = new Date(date);
      let count = 0;
  
      while (count < days) {
        result.setDate(result.getDate() + 1);
  
        // Skip weekends (Saturday = 6, Sunday = 0)
        if (result.getDay() !== 6 && result.getDay() !== 0) {
          count++;
        }
      }
  
      return result.toISOString().split('T')[0]; // Return in YYYY-MM-DD format
    };
    const PaymentStartAt = addBusinessDays(releasedDate, 15); // Add 15 business days
    setPaymentStartAt(PaymentStartAt);
  
    try {
      const response = await fetch(`${urlApi}/releaseLoan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId,
          releasedBy,
          releasedDate,
          PaymentStartAt, // Include calculated payment start date
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setOpenReleaseModal(false);
        toast.success('Loan released successfully', { autoClose: 2000, containerId: 'main-toast' });
        setReleasedBy('');
        fetchLoans();
      } else {
        toast.error(data.message || 'Failed to release loan', { autoClose: 2000, containerId: 'main-toast' });
      }
    } catch (error) {
      console.error('Error releasing loan:', error);
      toast.error('An error occurred while releasing the loan.', { autoClose: 2000, containerId: 'main-toast' });
    }
  };
  
  

  // Filter rows based on the search query
  const filteredLoans = loans.filter((loan) => {
    return (
      loan.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddApprover = (loanId) => {
    const updatedApprovers = { ...loanApprovers };
    updatedApprovers[loanId].push('');
    setLoanApprovers(updatedApprovers);
  };

  const handleRemoveApprover = (loanId, index) => {
    const updatedApprovers = { ...loanApprovers };
    updatedApprovers[loanId].splice(index, 1); 
    setLoanApprovers(updatedApprovers);
  };

  const handleApproverChange = (loanId, index, value) => {
    const updatedApprovers = { ...loanApprovers };
    updatedApprovers[loanId][index] = value;
    setLoanApprovers(updatedApprovers);
  };

  const handleLoanClick = (loanId) => {
    setCurrentLoanId(loanId);
    setOpen(true);
  };
  const formatDate = (loanDate) => {
    const date = new Date(loanDate); // Convert the string to a Date object
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options); // Format the date as 'Feb 17 2025'
  };
  return (
    <React.Fragment>
      <ToastContainer 
        position="top-center" 
        autoClose={2000}  // Set auto-close to 2 seconds
        pauseOnHover={false}  
        newestOnTop 
        closeOnClick 
        draggable={false}
        containerId="main-toast"
      />
      <Box sx={{ display: { xs: 'none', sm: 'block' }, marginBottom: 2 }}>
        {/* Search bar */}
        <Box sx={{ display: 'flex', gap: 1, marginBottom: 2, width: '20%' }}>
          <Input
            size="sm"
            placeholder="Search..."
            startDecorator={<SearchIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
        </Box>
        {/* Table for non-mobile devices */}
        <Sheet
          variant="outlined"
          sx={{
            width: '100%',
            borderRadius: 'sm',
            flexShrink: 1,
            overflow: 'auto',
            minHeight: 0,
          }}
        >
          <Table
            aria-labelledby="tableTitle"
            stickyHeader
            hoverRow
            sx={{
              '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
              '--Table-headerUnderlineThickness': '1px',
              '--TableRow-hoverBackground': 'var(--joy-palette-background-level1)',
              '--TableCell-paddingY': '4px',
              '--TableCell-paddingX': '8px',
            }}
            style={{
              width: '100%',
            }}
          >
            <thead
             style={{
              backgroundColor: "#212529", // Ensures background is black
            }}
            >
              <tr>
                {['Reference Number', 'Application Date', 'Loan Amount', 'Client', 'Status', 'Action'].map((header, index) => (
                  <th key={index} style={{ padding: '12px 6px', color: 'white',  backgroundColor: "#212529", }}>
                    <Typography variant="body-sm" sx={{ textAlign: 'center', display: 'block', color: "inherit", }}>
                      {header}
                    </Typography>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} sx={{ cursor: 'pointer' }}>
                    <td style={{ textAlign: 'center' }}>
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}>{loan.id}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}>{formatDate(loan.date)}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}><span>&#8369;</span>{loan.amount}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography level="body-xs" sx={{ cursor: 'pointer' }}>{loan.customer.name}</Typography>
                      </Box>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Chip
                        variant="soft"
                        size="sm"
                        startDecorator={
                          loan.status === 'Waiting for Approval' ? <HourglassEmptyIcon /> :
                          loan.status === 'Approved' ? <CheckCircleOutlineIcon /> : null
                        }
                        color={
                          loan.status === 'Waiting for Approval'
                            ? 'warning'
                            : loan.status === 'Approved'
                            ? 'success'
                            : {
                                Paid: 'success',
                                Refunded: 'neutral',
                                Cancelled: 'danger',
                              }[loan.status]
                        }
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleLoanClick(loan.id)} // Open modal for this loan
                      >
                        {loan.status === 'Waiting for Approval' ? 'Pending' :
                        loan.status === 'Approved' ? 'Ready for Release' : loan.status}
                      </Chip>
                    </td>
                    <td  style={{ textAlign: 'center'}}>
                        <Chip
                        variant='soft'
                        color='primary'
                        size='sm'
                        sx={{ cursor: 'pointer'}}
                        onClick={() =>handleReleaseClick(loan.id, loan.date, loan.amount, loan.customer.name)}

                        >
                          Release
                        </Chip>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    <Typography variant="body-sm">No results found</Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Sheet>
      </Box>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog>
          <DialogTitle>Approvers for this loan</DialogTitle>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmitApprover(currentLoanId); 
            }}
          >
            <Stack spacing={2}>
              {/* Dynamic Approver Inputs for the selected loan */}
              {loanApprovers[currentLoanId]?.map((approver, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                    width: '100%', // Ensuring full-width
                  }}
                >
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel sx={{ marginBottom: 2 }}>Approver {index + 1}</FormLabel>
                    <Input
                      value={approver}
                      onChange={(e) => handleApproverChange(currentLoanId, index, e.target.value)}
                      required
                      sx={{
                        marginRight: 1, // Adds space between the input and button
                        marginTop: -2,
                      }}
                    />
                  </FormControl>
                 <Stack>
                 <Chip
                    variant="outlined"
                    color="danger"
                    size="small"
                    startDecorator={<Remove />}
                    onClick={() => handleRemoveApprover(currentLoanId, index)}
                    disabled={loanApprovers[currentLoanId].length === 1}
                    sx={{
                      alignSelf: 'center',
                      cursor: 'pointer',
                      padding: '4px 8px', // Adjusts the button's size for better aesthetics
                      marginBottom: -2,
                    }}
                  >
                  </Chip>
                 </Stack>
                </Stack>
              ))}

              {/* Add Approver Button */}
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant="outlined"
                  startDecorator={<Add />}
                  onClick={() => handleAddApprover(currentLoanId)}
                >
                  Add Approver
                </Button>
              </Stack>

              {/* Submit Button */}
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button type="submit" sx={{ width: '100%' }}>
                  Submit
                </Button>
              </Stack>
            </Stack>
          </form>
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
          <Stack spacing={1} mb={2}>
            <Typography variant="body1">Loan Ref No. : <b>{currentLoanId}</b></Typography>
            <Typography variant="body1">Loan Amount: <b><span>&#8369;</span>{loanAmount}</b></Typography>
            <Typography variant="body1">Application Date: <b>{formatDate(loanDate)}</b></Typography>
            <Typography variant="body1">Initial Payment Date: <b>{formatDate(PaymentStartAt)}</b></Typography>
            <Typography variant="body1">Client Name: <b>{clientName}</b></Typography>
          </Stack>

          <Divider />

          {/* Approvers Section */}
          <Typography variant="h6" fontWeight="medium">
            Approvers:
          </Typography>
          <List
            sx={{
              maxHeight: '200px', // Set a fixed height (adjust as necessary)
              overflowY: 'auto', // Enable vertical scrolling
            }}
          >
            {approvers[currentLoanId]?.map((approver, index) => (
              <ListItem key={index} color="success" variant="soft">
                <HowToRegIcon sx={{ mr: 1 }} />
                <ListItemText primary={approver.name} />
              </ListItem>
            ))}
          </List>

          <Divider/>
            <Typography variant="h6" fontWeight="medium">
              Released By:
            </Typography>
            <Input
              fullWidth
              id="approver-name"
              label="Enter Approver Name"
              variant="outlined"
              size="small"
              sx={{
                padding: '5px 10px'
              }}
              value={releasedBy} // Bind the value to state
              onChange={(e) => setReleasedBy(e.target.value)}
            />
            {/* Buttons */}
            <Stack direction="row" justifyContent="center" spacing={1} mt={3}>
              <Button variant="outlined" color="danger" onClick={() => setOpenReleaseModal(false)}>
                Cancel
              </Button>
              <Button variant="solid" type="submit" color="primary" onClick={() => handleReleasing(currentLoanId)}>
                Disburse Loan
              </Button>
            </Stack>
        </ModalDialog>
      </Modal>
    </React.Fragment>
  );
}
