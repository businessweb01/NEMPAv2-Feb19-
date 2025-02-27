import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import SignInCard from '../components/SignInCard';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export default function SignInSide(props) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Stack
        direction="column"
        component="main"
        sx={{
          justifyContent: 'center',
          alignItems: 'center', // This centers the SignInCard horizontally
          height: '100vh', // Full height of the viewport
          position: 'relative', // Relative positioning for child components
        }}
      >
        {/* Just the SignInCard, centered in the container */}
        <SignInCard
          sx={{
            width: '100%', // Adjust width as needed
            maxWidth: 450, // You can define the max width for the SignInCard
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
