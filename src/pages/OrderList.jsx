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
import HowToRegIcon from '@mui/icons-material/HowToReg';
export default function OrderList() {
  const [listItems, setListItems] = useState([]); // Renamed to listItems
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [openReleaseModal, setOpenReleaseModal] = useState(false);
  const [currentLoanId, setCurrentLoanId] = useState(null); // Track current loan being edited
  const [loanDate, setLoanDate] = useState(null);
  const [loanAmount, setLoanAmount] = useState(null);
  const [clientName, setClientName] = useState(null);
  const [loanApprovers, setLoanApprovers] = useState({}); // Store approvers for each loan by ID
  const [approvers, setApprovers] = useState({}); // Initialize as an empty array
  const [releasedBy, setReleasedBy] = useState('');

  // Fetch Pending Loans and set listItems to the fetched data
  const fetchLoans = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/PendingLoans');
      const data = await response.json();
      setListItems(data); // Set the fetched loans data into listItems

      // Initialize approvers for each loan as an empty array
      const initialApprovers = data.reduce((acc, loan) => {
        acc[loan.id] = []; // Fix: Use an empty array instead of ['']
        return acc;
      }, {});
      setLoanApprovers(initialApprovers);
    } catch (error) {
      console.error('Error fetching loan data:', error);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);
  // Submitting Approvers
  const handleSubmitApprover = (loanId) => {
    const approvedDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  
    fetch('http://localhost:5000/submitLoanApprovals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId,
        approvedDate,
        approvers: loanApprovers[loanId] ?? [], // Ensure an array
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setOpen(false);
          fetchLoans(); // Refresh loan data
          toast.success('Loan approval submitted successfully');
        } else {
          console.error('Error submitting loan approvals:', data.message);
        }
      })
      .catch((error) => console.error('Fetch error:', error));
  };

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

 // Releasing
 const handleReleaseClick = async (loanId, loanDate, loanAmount, clientName) => {
  setOpenReleaseModal(true);
  setCurrentLoanId(loanId);
  setLoanDate(loanDate);
  setLoanAmount(loanAmount);
  setClientName(clientName);

  try {
    const response = await fetch(`http://localhost:5000/fetchApprovers/${loanId}`);
    const data = await response.json();
    if (data.success) {
      setApprovers((prevState) => ({
        ...prevState,
        [loanId]: data.approvers,
      }));
    } else {
      console.error('Error fetching approvers:', data.message);
    }
  } catch (error) {
    console.error('Error fetching approvers:', error);
  }
};

const handleReleasing = async (loanId) => {
  if (releasedBy === '') {
    toast.error('Please enter the approver name');
    return;
  }
  const releasedDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  try {
    const response = await fetch('http://localhost:5000/releaseLoan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loanId: loanId,
        releasedBy: releasedBy,
        releasedDate: releasedDate,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      toast.success('Loan released successfully'); // Show success toast
      setOpenReleaseModal(false); // Close the modal
      fetchLoans();
    } else {
      toast.error(data.message || 'Failed to release loan'); // Show error toast if not successful
    }
  } catch (error) {
    console.error('Error releasing loan:', error);
    toast.error('An error occurred while releasing the loan.'); // Show error toast in case of an error
  }
};


  // Filter rows based on the search query
  const filteredListItems = listItems.filter((listItem) => {
    return (
      listItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listItem.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listItem.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listItem.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  const formatDate = (loanDate) => {
    const date = new Date(loanDate); // Convert the string to a Date object
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options); // Format the date as 'Feb 17 2025'
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
      {filteredListItems.map((listItem) => (
        <List key={listItem.id} size="sm" sx={{ '--ListItem-paddingX': 0 }}>
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
                  {listItem.customer.name}
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
                    <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}>{listItem.id}</Typography>
                  </Typography>
                  <Typography level="body-xs">Application Date:
                    <Typography level="body-xs" sx={{fontWeight:'bold', marginLeft:1}}>{formatDate(listItem.date)}</Typography>
                  </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Button variant='soft' color='primary'size="sm"  
                  sx={{ whiteSpace: 'nowrap', color: 'primary' }}
                  onClick={() => handleLoanClick(listItem.id)} // Open modal for this loan
                  >
                      Approve Loan
                  </Button>
                  <Button variant='soft' color='success' size="sm"  
                  sx={{ whiteSpace: 'nowrap', color: 'primary' }}
                  onClick={() =>handleReleaseClick(listItem.id, listItem.date, listItem.amount, listItem.customer.name)}
                  >
                      Release Loan
                  </Button>
                </Box>
              </div>
            </ListItemContent>
            <Chip
              variant="soft"
              size="sm"
              startDecorator={
                listItem.status === 'Waiting for Approval' ? <HourglassEmptyIcon /> :
                listItem.status === 'Approved' ? <CheckCircleOutlineIcon /> : null
              }
              color={
                listItem.status === 'Waiting for Approval'
                  ? 'warning'
                  : listItem.status === 'Approved'
                  ? 'success'
                  : {
                      Paid: 'success',
                      Refunded: 'neutral',
                      Cancelled: 'danger',
                    }[listItem.status]
              }
              sx={{ cursor: 'pointer' }}
            >
              {listItem.status === 'Waiting for Approval' ? 'Pending' :
              listItem.status === 'Approved' ? 'Ready for Release' : listItem.status}
            </Chip>
          </ListItem>
          <ListDivider />
        </List>
      ))}

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog>
          <DialogTitle>Approvers for this loan</DialogTitle>
          <form
            onSubmit={(event) => {
              handleSubmitApprover(currentLoanId); 
              event.preventDefault();
              console.log('Approvers Submitted for Loan ID:', currentLoanId);
              console.log('Approvers:', loanApprovers[currentLoanId]);
              setOpen(false);
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
            <Typography variant="body1">Loan ID: <b>{currentLoanId}</b></Typography>
            <Typography variant="body1">Loan Amount: <b>{loanAmount}</b></Typography>
            <Typography variant="body1">Loan Date: <b>{formatDate(loanDate)}</b></Typography>
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
    </Box>
  );
}
