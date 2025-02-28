import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import MainDashBoard from './MainDashBoard';
import UnauthorizedAccess from './UnauthorizedAccess'; 
import ProtectedRoute from './ProtectedRoute';
import './App.css';

function App() {
  const [inTransition, setInTransition] = useState(false);

  const handleRouteChange = () => {
    setInTransition(true);
    setTimeout(() => setInTransition(false), 500); // Transition lasts 500ms
  };

  return (
    <Router>
      <div className="app-container">
        <div
          className={`page ${inTransition ? 'page-exit' : 'page-enter-active'}`}
        >
          <Routes>
            <Route path="/SignIn" element={<SignIn />} />
            <Route path="/SignUp" element={<SignUp />} />
            <Route
              path="/MainDashBoard"
              element={
                <ProtectedRoute>
                  <MainDashBoard />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<UnauthorizedAccess />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
