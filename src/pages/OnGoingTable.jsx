import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Chip from '@mui/joy/Chip';
import Typography from '@mui/joy/Typography';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Input from '@mui/joy/Input';
import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/joy/Button';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import Stack from '@mui/joy/Stack';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Divider from '@mui/joy/Divider';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemText from '@mui/material/ListItemText';
import PaymentsIcon from '@mui/icons-material/Payments';
import Switch from '@mui/joy/Switch';

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
  const [runningBalance, setRunningBalance] = useState('0'); // Default value
  const [biWeeklyPay, setBiWeeklyPay] = useState('0'); // Default value
  const [customAmount, setCustomAmount] = useState('0'); // Default value
  const [isBiWeekly, setIsBiWeekly] = useState(true); // Bi-weekly ON by default
  const [isCustom, setIsCustom] = useState(false); // Custom OFF by default
  // Fetch Pending Loans
const fetchLoans = useCallback(async () => {
  try {
    const response = await fetch("http://localhost:5000/OnGoingLoans");
    const data = await response.json();
    
    setLoans(data);

    // ✅ Set Running Balance from first loan in the list (if exists)
    if (data.length > 0) {
      setRunningBalance(data[0].amount);  
      
      // ✅ Ensure bi-weekly payment does not exceed the running balance
      setBiWeeklyPay((prev) => {
        return data[0].amount < data[0].biWeeklyPay ? data[0].amount : data[0].biWeeklyPay;
      });
    }

    // Initialize approvers for each loan as an empty array
    const initialApprovers = data.reduce((acc, loan) => {
      acc[loan.id] = [];
      return acc;
    }, {});
    setLoanApprovers(initialApprovers);

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
    setBiWeeklyPay('0'); // Reset bi-weekly pay when switching to Custom
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
  const handleLoanClick = (loanId, loanAmount, biWeeklyPay) => {
    setCurrentLoanId(loanId);
    setRunningBalance(loanAmount);
    setBiWeeklyPay(biWeeklyPay);
    setOpen(true);
    if(runningBalance<biWeeklyPay){
      setBiWeeklyPay(runningBalance);
    }else{
      setBiWeeklyPay(biWeeklyPay);
    }
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
    const paymentAmount = isCustom ? customAmount : biWeeklyPay; // Use custom if selected
  
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
        toast.success(data.message || "Payment successful!", { autoClose: 2000, containerId: 'main-toast'  });
          setRunningBalance(data.updatedLoanAmount);  // Correct field name
          if(data.updatedLoanAmount<data.updatedbiWeeklyAmount){
            setBiWeeklyPay(data.updatedLoanAmount);
          }
          else{
            setBiWeeklyPay(data.updatedbiWeeklyAmount);
          }
          fetchLoans();
      } else {
        toast.error(data.message || "Payment failed!", { autoClose: 2000, containerId: 'main-toast'  });
      }
    } catch (error) {
      console.error("Error making payment:", error);
      toast.error("An error occurred while making the payment.", { autoClose: 2000 , containerId: 'main-toast' });
    }
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
                {[
                  "Reference Number",
                  "Running Balance",
                  "Bi-Weekly Payment",
                  "Client",
                  "Installment Due Date",
                  "Action",
                ].map((header, index) => (
                  <th
                    key={index}
                    style={{
                      padding: "12px 6px",
                      color: "white", // Ensures text is white
                      backgroundColor: "#212529", // Fix: Apply background to each <th>
                    }}
                  >
                    <Typography
                      variant="body-sm"
                      sx={{
                        textAlign: "center",
                        display: "block",
                        color: "inherit",
                      }}
                    >
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
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}><span>&#8369;</span>{loan.amount}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}><span>&#8369;</span>{loan.biWeeklyPay}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Typography level="body-xs" sx={{ cursor: 'pointer' }}>{loan.customer.name}</Typography>
                      </Box>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Typography level="body-xs" sx={{ cursor: 'pointer' }}>{formatDate(loan.dueDate)}</Typography>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                    <Chip
                      variant="soft"
                      size="sm"
                      endDecorator={<PaymentsIcon />}
                      color="success"
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleLoanClick(loan.id, loan.amount, loan.biWeeklyPay)}
                    >
                      Make Payment
                    </Chip>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center' }}>
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
          <DialogTitle>Loan Payment</DialogTitle>
          <Divider/>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleMakePayment();
            }}
            style={{display: 'flex', flexDirection: 'column', gap: '10px'}}
            >
              <Typography>
                Running Balance
              </Typography>
                <Input
                  label="Running Balance"
                  variant="outlined"
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
                    value={isBiWeekly ? biWeeklyPay : ""}
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
                  value={isCustom ? customAmount : '0'} // Provide a fallback value
                  onChange={(e) => setCustomAmount(e.target.value)}
                  disabled={!isCustom}
                />
                  <Switch checked={isCustom} onChange={handleCustomToggle} />
                </Box>
              </Box>
              <Box sx={{display: 'flex', justifyContent: 'center'}}>
                <Button variant="outlined" color="primary" type="submit">
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
          <Stack spacing={1} mb={2}>
            <Typography variant="body1">Loan ID: <b>{currentLoanId}</b></Typography>
            <Typography variant="body1">Loan Amount: <b>{loanAmount}</b></Typography>
            <Typography variant="body1">Loan Date: <b>{formatDate(loanDate)}</b></Typography>
            <Typography variant="body1">Payment Start At: <b>{PaymentStartAt}</b></Typography>
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
