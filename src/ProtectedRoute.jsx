import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Check if the user is authenticated (e.g., check if there's an auth token in localStorage)
  const isAuthenticated = localStorage.getItem('authToken');

  if (!isAuthenticated) {
    // If not authenticated, redirect to Unauthorized Access page
    return <Navigate to="/unauthorized" />;
  }

  return children; // If authenticated, render the requested component
};

export default ProtectedRoute;
