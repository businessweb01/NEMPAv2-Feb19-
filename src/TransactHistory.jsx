import React, { useEffect, useState, useCallback } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, List, ListItem, Paper, useTheme, TextField } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

const TransactionHistory = () => {
    const [loanData, setLoanData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        async function fetchLoanDetails() {
            try {
                const response = await fetch('http://localhost:5000/fetch-all-loan-details');
                const data = await response.json();
                setLoanData(data);
                console.log(data);
            } catch (error) {
                console.error('Error fetching loan details:', error);
            }
        }

        fetchLoanDetails();
    }, []);

    const filteredLoanData = useCallback(() => {
        return loanData.filter(loan =>
            loan.LoanRefNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.ReleasedBy.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [loanData, searchTerm]);

    const renderMobileView = useCallback(() => (
        <>
            <Box sx={{ mb: 2 }}>
                <TextField
                    placeholder="Search by reference number or released by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: 'background.paper',
                        }
                    }}
                />
            </Box>
            <List sx={{ p: 0 }}>
                {filteredLoanData().length > 0 ? (
                    filteredLoanData().flatMap(loan =>
                        loan.Payments.map((payment, index) => (
                            <ListItem
                                key={`${loan.LoanRefNo}-${index}`}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    mb: 3,
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    p: 3,
                                    boxShadow: 1,
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column' }}>
                                    <Typography variant="body2" color="text.secondary">Reference No:</Typography>
                                    <Typography>{loan.LoanRefNo}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column' }}>
                                    <Typography variant="body2" color="text.secondary">Payment Amount:</Typography>
                                    <Typography>₱{payment.PaymentAmount?.toLocaleString()}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column' }}>
                                    <Typography variant="body2" color="text.secondary">Payment Date:</Typography>
                                    <Typography>{payment.PaymentDate}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column' }}>
                                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                                    <Typography>{loan.Status === 'Released' ? 'On Going' : loan.Status}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column' }}>
                                    <Typography variant="body2" color="text.secondary">Released By:</Typography>
                                    <Typography>{loan.ReleasedBy}</Typography>
                                </Box>
                            </ListItem>
                        ))
                    )
                ) : (
                    <Typography align="center" color="text.secondary">No transactions found</Typography>
                )}
            </List>
        </>
    ), [loanData, searchTerm]);

    const renderDesktopView = useCallback(() => (
        <>
            <Box sx={{ mb: 2 }}>
                <TextField
                    placeholder="Search by reference number or released by..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: 'background.paper',
                        }
                    }}
                />
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: '#212529' }}>
                        <TableRow>
                            {["Reference Number", "Amount", "Date", "Status", "Released By"].map((header, index) => (
                                <TableCell
                                    key={index}
                                    align="center"
                                    sx={{
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredLoanData().length > 0 ? (
                            filteredLoanData().map(loan => (
                                loan.Payments.map((payment, index) => (
                                    <TableRow key={`${loan.LoanRefNo}-${index}`}>
                                        <TableCell align="center">{loan.LoanRefNo}</TableCell>
                                        <TableCell align="center">₱{payment.PaymentAmount?.toLocaleString()}</TableCell>
                                        <TableCell align="center">{payment.PaymentDate}</TableCell>
                                        <TableCell align="center">
                                            {loan.Status === 'Released' ? 'On Going' : loan.Status}
                                        </TableCell>
                                        <TableCell align="center">{loan.ReleasedBy}</TableCell>
                                    </TableRow>
                                ))
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography color="text.secondary">No transactions found</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    ), [loanData, searchTerm]);

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.default' }}>
            {isMobile ? renderMobileView() : renderDesktopView()}
        </Box>
    );
};

export default TransactionHistory;
