import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const DashboardContents = () => {
  const [monthlyIncome, setMonthlyIncome] = useState(new Array(12).fill(0)); // Initialize with 0 values
  const [totalBalance, setTotalBalance] = useState(0);
  const [usedBalance, setUsedBalance] = useState(0);
  const [loanRequestsPerMonth, setLoanRequestsPerMonth] = useState(new Array(12).fill(0));
  const [releasedLoansPerMonth, setReleasedLoansPerMonth] = useState(new Array(12).fill(0)); // New state for released loans
  const [chartMounted, setChartMounted] = useState(false);
  const [beginningBalance, setBeginningBalance] = useState(0);
  const [interestGain, setInterestGain] = useState(0);

  useEffect(() => {
    setChartMounted(true);

    // Create WebSocket connection
    const socket = new WebSocket('ws:192.168.1.154:8080');
    // const socket = new WebSocket('ws://192.168.1.154:8080');
    // Listen for data from the WebSocket server
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'balance_data') {
        setTotalBalance(data.totalBalance ?? 0);
        setUsedBalance(data.usedBalance ?? 0);
        setBeginningBalance(data.beginningBalance ?? 0);
      }

      if (data.type === 'monthly_income_data') {
        setMonthlyIncome(data.monthlyIncome ?? new Array(12).fill(0));
      }

      if (data.type === 'loan_requests_data') {
        setLoanRequestsPerMonth(data.loanRequestsPerMonth ?? new Array(12).fill(0));
      }

      if (data.type === 'released_loans_data') {
        setReleasedLoansPerMonth(data.releasedLoansPerMonth ?? new Array(12).fill(0)); // Update released loans data
      }
    };

    // Cleanup WebSocket connection when the component unmounts
    return () => {
      setChartMounted(false);
      socket.close();
    };
  }, []);

  // Doughnut chart options and data for bank balance
  const doughnutOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Available Balance', 'Used Balance'],
    colors: ['#40916c', '#fcbf49'], // Added blue color for Interest Gain
    legend: {
      position: 'bottom'
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Balance',
              formatter: function (w) {
                return '₱' + (totalBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
              }
            }
          }
        }
      }
    }
  };

  const doughnutSeries = [
    Number(totalBalance.toFixed(2)), 
    Number(usedBalance.toFixed(2)), 
  ];

  // Bar chart options and data for monthly income
  const barOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yaxis: {
      title: {
        text: 'Income (₱)'
      }
    },
    colors: ['#40916c'],
    tooltip: {
      y: {
        formatter: function(value) {
          return `₱${value}`;
        }
      }
    }
  };

  const barSeries = [{
    name: 'Monthly Income',
    data: monthlyIncome, // Use the data received from the backend
  }];

  // Area chart options and data for loan requests per month
  const areaOptions = {
    chart: {
      type: 'area',
      height: 350
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yaxis: {
      title: {
        text: 'Loan Requests'
      }
    },
    colors: ['#40916c'],
    tooltip: {
      y: {
        formatter: function(value) {
          return value;
        }
      }
    }
  };

  const areaSeries = [{
    name: 'Loan Requests',
    data: loanRequestsPerMonth, // Data for the loan requests per month
  }];

  // Bar chart options for released loans per month
  const releasedLoansBarOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yaxis: {
      title: {
        text: 'Released Loans'
      }
    },
    colors: ['#40916c'],
    tooltip: {
      y: {
        formatter: function(value) {
          return value;
        }
      }
    }
  };

  const releasedLoansBarSeries = [{
    name: 'Released Loans',
    data: releasedLoansPerMonth, // Data for the released loans per month
  }];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'column' },
        gap: 1,
        width: '100%',
        height: '100%'
      }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile, row on medium and up
        gap: 2,
        width: '100%'
      }}>
        <Paper elevation={3} sx={{ width: { xs: '100%', md: '30%' } }}>
          <Typography variant="h6" sx={{ pt: 2, pl: 2 }}>Balance</Typography>
          <Box sx={{ height: 250 }}>
            {chartMounted && (
              <ReactApexChart
                options={doughnutOptions}
                series={doughnutSeries}
                type="donut"
                height="100%"
              />
            )}
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: '70%' } }}>
          <Typography variant="h6" gutterBottom>Cumulative Interest Payment on Fully Paid Loan</Typography>
          <Box sx={{ height: 250 }}>
            {chartMounted && (
              <ReactApexChart
                options={barOptions}
                series= {barSeries}
                type="bar"
                height="100%"
                
              />
            )}
          </Box>
        </Paper>
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile, row on medium and up
        gap: 2,
        width: '100%'
      }}>
        <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: '50%' } }}>
          <Typography variant="h6" gutterBottom>Loan Requests per Month</Typography>
          <Box sx={{ height: 250 }}>
            {chartMounted && (
              <ReactApexChart
                options={areaOptions}
                series={areaSeries}
                type="area"
                height="100%"
              />
            )}
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: '50%' } }}>
          <Typography variant="h6" gutterBottom>Released Loans per Month</Typography>
          <Box sx={{ height: 250 }}>
            {chartMounted && (
              <ReactApexChart
                options={releasedLoansBarOptions}
                series={releasedLoansBarSeries}
                type="bar"
                height="100%"
              />
            )}
          </Box>
        </Paper>
      </Box>

    </Box>
  );
};

export default DashboardContents;
