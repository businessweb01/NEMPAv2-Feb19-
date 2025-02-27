import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUp from './pages/SignUp.jsx'; // Import SignUp from the correct file path
import SignIn from './pages/SignIn.jsx'; // Import SignIn from the correct file path
import MainDashBoard from './MainDashBoard.jsx'; // Import MainDashBoard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        
        {/* Route for SignUp page */}
        <Route path="/SignUp" element={<SignUp />} />
        
        {/* Route for SignIn page */}
        <Route path="/SignIn" element={<SignIn />} />
        
        {/* Route for MainDashBoard */}
        <Route path="/MainDashBoard" element={<MainDashBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
