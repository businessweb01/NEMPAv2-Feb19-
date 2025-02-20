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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import moment from 'moment';
import { ToastContainer, toast } from 'react-toastify';
import { useState } from 'react';

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
  maxWidth: '100%',  // Increased width for better alignment
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

const SignUpContainer = styled(Stack)(({ theme }) => ({
  // height: '100vh',
  minHeight: '100%',
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
export default function SignUp({setToastActive}) {
  // const [toastActive, setToastActive] = useState(false);
  const [birthday, setBirthday] = useState(null);
  const [validIdFile, setValidIdFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      // Get First Name and Last Name from the form fields
      const firstName = document.getElementById("firstName").value;
      const lastName = document.getElementById("lastName").value;

      // Extract file extension
      const fileExtension = file.name.split(".").pop();

      // Create the new file name
      const newFileName = `${firstName}${lastName}(ValidID).${fileExtension}`;

      // Store the file object and the renamed file name in state
      setValidIdFile({
        file: file,             // Actual file to upload
        newFileName: newFileName // Renamed file name
      });
    }
  };

 
  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setToastActive(true);
    // Show confirmation dialog using react-toastify
    const toastId = toast.info(
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6">Are you sure the information is correct?</Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              toast.dismiss(toastId);
              setToastActive(false);

              // Prepare form data for submission
              const formData = new FormData();
              formData.append('lastName', data.get('lastName'));
              formData.append('firstName', data.get('firstName'));
              formData.append('middleName', data.get('middleName'));
              formData.append('birthday', birthday ? moment(birthday).format('MM/DD/YYYY') : '');
              formData.append('contactNumber', data.get('contactNumber'));
              formData.append('address', data.get('address'));
              formData.append('dataRegistered', new Date().toLocaleDateString());

              if (validIdFile) {
                formData.append('validId', validIdFile.file);
                formData.append('validIdName', validIdFile.newFileName);
              }

              try {
                const response = await fetch('http://localhost:5000/submit', {
                  method: 'POST',
                  body: formData,
                });

                const result = await response.json();
                // ✅ Ensure `@token` exists in localStorage
                if (result.token) {
                  localStorage.setItem('jwtToken', result.token);
                  toast.success('Client Information Inserted Successfully', {
                    autoClose: 1500,
                    onOpen: () => setToastActive(true),
                    onClose: () => setToastActive(false)
                  });
                }
              } catch (error) {
                console.error('Error submitting form data:', error);
                toast.error('Error submitting form data');
              }
            }}
          >
            Confirm
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              toast.dismiss(toastId);
              setToastActive(false);
            }}
          >
            Cancel
          </Button>
        </Box>
      </Box>,
      {
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        onClose: () => setToastActive(false)
      }
    );
  };

                                                            
  return ( 
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ToastContainer position="top-center" />
      <SignUpContainer direction="column" justifyContent="space-between">
        <Card>
          {/* <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Data Entry of Client Info
          </Typography> */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Grid container spacing={2}>
              {/* 1st Row: Last Name | First Name | Middle Name */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="lastName">Last Name</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    autoComplete="family-name"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="firstName">First Name</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    autoComplete="given-name"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="middleName">Middle Name</FormLabel>
                  <TextField
                    fullWidth
                    id="middleName"
                    name="middleName"
                    placeholder="William"
                    autoComplete="additional-name"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* 2nd Row: Birthday | Contact Number | Address */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="birthday">Birthday</FormLabel>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      value={birthday}
                      onChange={setBirthday}
                      renderInput={(params) => <TextField {...params} required fullWidth />}
                    />
                  </LocalizationProvider>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="contactNumber">Contact Number</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="09123456789"
                    autoComplete="tel"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="address">Address</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="address"
                    name="address"
                    placeholder="123 Main St"
                    autoComplete="street-address"
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>

              {/* 3rd Row: Valid ID | Date Registered | Submit Button */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="validId">Valid ID</FormLabel>
                  <input
                    type="file"
                    id="validId"
                    name="validId"
                    accept="image/jpeg, image/jpg, image/png" // Accept only JPEG, JPG, and PNG file types
                    onChange={handleFileChange}
                    style={{
                      padding: '10px',
                      borderRadius: '5px',
                      width: '100%',
                      height: '45px', // Ensure consistent height with other inputs
                      border: '1px solid #ccc', // Add border to the file input
                    }}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <FormLabel htmlFor="dataRegistered">Date Registered</FormLabel>
                  <TextField
                    required
                    fullWidth
                    id="dataRegistered"
                    name="dataRegistered"
                    value={new Date().toLocaleDateString()}
                    disabled
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '45px', // Set height for all inputs
                      },
                    }}
                  />
                </FormControl>
              </Grid>
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
      </SignUpContainer>
    </ThemeProvider>
  );
}
