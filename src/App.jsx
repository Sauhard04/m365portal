import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ServicePage from './components/ServicePage';
import ExchangeReport from './components/ExchangeReport';
import DomainsPage from './components/DomainsPage';
import LicensesPage from './components/LicensesPage';
import GroupsPage from './components/GroupsPage';
import EntraUsers from './components/EntraUsers';
import EntraGroups from './components/EntraGroups';
import EntraApps from './components/EntraApps';
import ServiceLayout from './components/Layout'; // Imported from Layout.jsx which we updated
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Protected Service Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/service" element={<ServiceLayout />}>
              <Route path="admin" element={<ServicePage serviceId="admin" />} /> {/* /service/admin */}
              <Route path="admin/report" element={<ExchangeReport />} />
              <Route path="admin/domains" element={<DomainsPage />} />
              <Route path="admin/licenses" element={<LicensesPage />} />
              <Route path="admin/groups" element={<GroupsPage />} />

              {/* Entra ID Routes */}
              <Route path="entra" element={<ServicePage serviceId="entra" />} />
              <Route path="entra/users" element={<EntraUsers />} />
              <Route path="entra/groups" element={<EntraGroups />} />
              <Route path="entra/apps" element={<EntraApps />} />

              <Route path=":serviceId" element={<ServicePage />} /> {/* generic service handler */}
              <Route index element={<Navigate to="admin" replace />} /> {/* /service -> /service/admin */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
