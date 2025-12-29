import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ServicePage from './components/ServicePage';
import ExchangeReport from './components/ExchangeReport';
import DomainsPage from './components/DomainsPage';
import LicensesPage from './components/LicensesPage';
import GroupsPage from './components/GroupsPage';
import DeletedUsersPage from './components/DeletedUsersPage';
import EntraDashboard from './components/EntraDashboard';
import EntraUsers from './components/EntraUsers';
import EntraGroups from './components/EntraGroups';
import EntraDevices from './components/EntraDevices';
import EntraAdmins from './components/EntraAdmins';
import EntraSubscriptions from './components/EntraSubscriptions';
import EntraApps from './components/EntraApps';
import SecureScorePage from './components/SecureScorePage';
import ServiceHealthPage from './components/ServiceHealthPage';
import SignInsPage from './components/SignInsPage';
import EmailActivityPage from './components/EmailActivityPage';
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
              <Route path="admin/deleted-users" element={<DeletedUsersPage />} />
              <Route path="admin/secure-score" element={<SecureScorePage />} />
              <Route path="admin/service-health" element={<ServiceHealthPage />} />
              <Route path="admin/sign-ins" element={<SignInsPage />} />
              <Route path="admin/emails" element={<EmailActivityPage />} />

              {/* Entra ID Routes */}
              <Route path="entra" element={<EntraDashboard />} />
              <Route path="entra/users" element={<EntraUsers />} />
              <Route path="entra/groups" element={<EntraGroups />} />
              <Route path="entra/devices" element={<EntraDevices />} />
              <Route path="entra/subscriptions" element={<EntraSubscriptions />} />
              <Route path="entra/admins" element={<EntraAdmins />} />
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
