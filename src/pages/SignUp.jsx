import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { useState } from 'react'
import zxcvbn from 'zxcvbn';  // Import zxcvbn library
import bcrypt from 'bcryptjs';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import Neeco from '../../public/NeecoLogo.svg'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { InputAdornment, IconButton } from '@mui/material';
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
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  borderBottomLeftRadius:'10px',
  borderBottomRightRadius:'10px',
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100%',
  width: '100%',
  padding: theme.spacing(4),
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

export default function SignUp(props) {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [nameError, setNameError] = React.useState(false);
  const [nameErrorMessage, setNameErrorMessage] = React.useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // State to hold the password strength score
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const validateInputs = () => {
    let isValid = true;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password || password.length < 8) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 8 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!name || name.length < 1) {
      setNameError(true);
      setNameErrorMessage('Name is required.');
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage('');
    }

    return isValid;
  };

  const handlePasswordChange = (event) => {
    const password = event.target.value;
    const result = zxcvbn(password);  // Get password strength
    setPasswordStrength(result.score);  // Set password strength score
  };
  const getPasswordStrengthColor = (score) => {
    if (score === 1) return 'red';
    if (score === 2) return 'orange';
    if (score === 3) return '#ffee32';
    if (score === 4) return 'green';
    return 'green';  // score 4 is the highest strength
  };

  // Calculate the width of the loading bar based on password strength
  const getPasswordStrengthWidth = (score) => {
    return `${score * 25}%`; // Score of 0 = 0%, 1 = 25%, 2 = 50%, 3 = 75%, 4 = 100%
  };
  const passwordStrengthText = () => {
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Medium';
    if (passwordStrength === 3) return 'Fair';
    if (passwordStrength === 4) return 'Strong';
    return 'Strong';
  };
  const passwordStrengthTextColor = () => {
    if (passwordStrength === 1) return 'white';
    if (passwordStrength === 2) return 'white';
    if (passwordStrength === 3) return 'white';
    if (passwordStrength === 4) return 'white';
    return 'white';
  };

  const formatDate = (loanDate) => {
    const date = new Date(loanDate); // Convert the string to a Date object
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options); // Format the date as 'Feb 17 2025'
  };
  const handleSubmit = async (event) => {
    if (validateInputs()) {
      const regDate = new Date();
      try {
        // Hash the password with a salt of 10 rounds
        const salt = await bcrypt.genSalt(10);  // Generating salt with 10 rounds
        const hashedPassword = await bcrypt.hash(password, salt); // Hashing the password
        const response = await fetch('http://localhost:5000/create-coop-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({name: name, lastName: lastName, email: email, password: hashedPassword, regDate: formatDate(regDate) }),
        });
        if (response.ok) {
          toast.success('Account created successfully');
        } else {
          toast.error('Failed to create account');
        }
      } catch (error) {
        console.error('Error hashing password:', error);
      }
      event.preventDefault();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <SignUpContainer direction="column">
      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}

      />
        <Card variant="outlined">
        <Typography variant="h6" noWrap component="div" sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#03431c' }}>
                <img src={Neeco} alt="Neeco Logo" style={{ width: '50px', height: 'auto', marginRight: '10px' }} />
                NEECO II AREA 1
            </Typography>
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Sign up
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <FormControl>
              <FormLabel htmlFor="name">First Name</FormLabel>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                placeholder="Jon Snow"
                error={nameError}
                helperText={nameErrorMessage}
                color={nameError ? 'error' : 'primary'}
                size='small'
                onChange={(e) => setName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="name">Last Name</FormLabel>
              <TextField
                autoComplete="name"
                name="name"
                required
                fullWidth
                id="name"
                placeholder="Jon Snow"
                error={nameError}
                helperText={nameErrorMessage}
                color={nameError ? 'error' : 'primary'}
                size='small'
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                required
                fullWidth
                id="email"
                placeholder="your@email.com"
                name="email"
                autoComplete="email"
                variant="outlined"
                error={emailError}
                helperText={emailErrorMessage}
                color={passwordError ? 'error' : 'primary'}
                size='small'
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                required
                fullWidth
                name="password"
                placeholder="••••••"
                type={showPassword ? 'text' : 'password'}  // Toggle the input type based on showPassword state
                id="password"
                autoComplete="new-password"
                variant="outlined"
                error={passwordError}
                helperText={passwordErrorMessage}
                color={passwordError ? 'error' : 'primary'}
                size="small"
                onChange={(e) => handlePasswordChange(e)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}  // Toggle showPassword state
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}  {/* Toggle icon */}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {/* Password strength indicator as a loading bar */}
              <Box
                sx={{
                  width: getPasswordStrengthWidth(passwordStrength),
                  height: '15px',
                  marginTop: '5px',
                  backgroundColor: getPasswordStrengthColor(passwordStrength),
                  transition: 'width 0.5s ease', // Smooth transition for the loading bar
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: passwordStrengthTextColor(), fontSize: '12px', fontWeight: 'bold' }}>
                  {passwordStrengthText()}
                </Typography>
              </Box>
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
                validateInputs();
              }}
            >
              Sign up
            </Button>
            <Box sx={{display: 'flex', flexDirection: 'row', gap: '10px', justifyContent: 'center'}}>
                <Typography>Already have an account?</Typography>
                <Link href="/SignIn">Sign in</Link> 
            </Box>
          </Box>
        </Card>
      </SignUpContainer>
    </ThemeProvider>
  );
}
