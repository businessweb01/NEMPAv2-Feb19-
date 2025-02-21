import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ReactApexChart from 'react-apexcharts';

const DashboardContents = () => {
  // Doughnut chart options and data for bank balance
  const doughnutOptions = {
    chart: {
      type: 'donut',
    },
    labels: ['Available Balance', 'Used Balance'],
    colors: ['#40916c', '#fcbf49'],
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
                return '$' + w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            }
          }
        }
      }
    }
  };

  const doughnutSeries = [75000, 25000];

  // Area chart options and data for monthly income
  const areaOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yaxis: {
      title: {
        text: 'Income ($)'
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        colorStops: [
          {
            offset: 0,
            color: '#40916c',
            opacity: 1
          },
          {
            offset: 100,
            color: '#40916c',
            opacity: 0.3
          }
        ]
      }
    },
    colors: ['#40916c'], // Set the stroke color
    tooltip: {
      y: {
        formatter: function(value) {
          return `$${value}`;
        }
      }
    }
  };
  
  const areaSeries = [{
    name: 'Monthly Income',
    data: [4500, 5200, 4800, 5500, 6000, 5800, 6200, 6500, 6300, 6800, 7000, 7200]
  }];
  

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' }, // Stack on mobile, row on medium and up
      gap: 2,
      width: '100%'
    }}>
      <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: '30%' } }}>
        <Typography variant="h6" gutterBottom>Beggining Balance</Typography>
        <Box sx={{ height: 250 }}>
          <ReactApexChart 
            options={doughnutOptions}
            series={doughnutSeries}
            type="donut"
            height="100%"
          />
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: '70%' } }}>
        <Typography variant="h6" gutterBottom>Monthly Income</Typography>
        <Box sx={{ height: 250 }}>
          <ReactApexChart 
            options={areaOptions}
            series={areaSeries}
            type="area"
            height="100%"
          />
        </Box>
      </Paper>
      
    </Box>
  );
};

export default DashboardContents;
