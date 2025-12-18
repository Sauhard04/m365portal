import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated } from "@azure/msal-react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ExchangeReport from "./pages/ExchangeReport";
import IntuneReport from "./pages/IntuneReport";
import SecurityReport from "./pages/SecurityReport";
import ComplianceReport from "./pages/ComplianceReport";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            <AuthenticatedTemplate>
              <Navigate to="/dashboard" />
            </AuthenticatedTemplate>
            <UnauthenticatedTemplate>
              <Login />
            </UnauthenticatedTemplate>
          </>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/exchange" element={
          <ProtectedRoute>
            <ExchangeReport />
          </ProtectedRoute>
        } />
        <Route path="/intune" element={
          <ProtectedRoute>
            <IntuneReport />
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute>
            <SecurityReport />
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute>
            <ComplianceReport />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
