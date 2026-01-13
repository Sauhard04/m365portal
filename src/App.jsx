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
import IntuneMonitoring from './components/IntuneMonitoring';
import IntuneManagedDevices from './components/IntuneManagedDevices';
import IntuneNonCompliant from './components/IntuneNonCompliant';
import IntuneInactiveDevices from './components/IntuneInactiveDevices';
import IntuneCompliancePolicies from './components/IntuneCompliancePolicies';
import IntuneConfigProfiles from './components/IntuneConfigProfiles';
import IntuneApplications from './components/IntuneApplications';
import IntuneSecurityBaselines from './components/IntuneSecurityBaselines';
import IntuneUserDevices from './components/IntuneUserDevices';
import IntuneRBAC from './components/IntuneRBAC';
import IntuneAuditLogs from './components/IntuneAuditLogs';
import IntuneReports from './components/IntuneReports';
import EmailActivityPage from './components/EmailActivityPage';
import OverviewDashboard from './components/OverviewDashboard';
import AlertsPage from './components/AlertsPage';
import UserDetailsPage from './components/UserDetailsPage';
import ServiceLayout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentationPage from './components/DocumentationPage';
import PDFViewerPage from './components/PDFViewerPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Protected Service Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/service" element={<ServiceLayout />}>
              {/* Overview Dashboard */}
              <Route path="overview" element={<OverviewDashboard />} />

              {/* Admin Center Routes */}
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
              <Route path="admin/alerts" element={<AlertsPage />} />
              <Route path="admin/profile" element={<UserDetailsPage />} />

              {/* Entra ID Routes */}
              <Route path="entra" element={<EntraDashboard />} />
              <Route path="entra/users" element={<EntraUsers />} />
              <Route path="entra/groups" element={<EntraGroups />} />
              <Route path="entra/devices" element={<EntraDevices />} />
              <Route path="entra/subscriptions" element={<EntraSubscriptions />} />
              <Route path="entra/admins" element={<EntraAdmins />} />
              <Route path="entra/apps" element={<EntraApps />} />

              {/* Intune Routes */}
              <Route path="intune" element={<IntuneMonitoring />} />
              <Route path="intune/devices" element={<IntuneManagedDevices />} />
              <Route path="intune/non-compliant" element={<IntuneNonCompliant />} />
              <Route path="intune/inactive" element={<IntuneInactiveDevices />} />
              <Route path="intune/compliance-policies" element={<IntuneCompliancePolicies />} />
              <Route path="intune/config-profiles" element={<IntuneConfigProfiles />} />
              <Route path="intune/applications" element={<IntuneApplications />} />
              <Route path="intune/security-baselines" element={<IntuneSecurityBaselines />} />
              <Route path="intune/user-devices" element={<IntuneUserDevices />} />
              <Route path="intune/rbac" element={<IntuneRBAC />} />
              <Route path="intune/audit-logs" element={<IntuneAuditLogs />} />
              <Route path="intune/reports" element={<IntuneReports />} />


              <Route path="documentation" element={<DocumentationPage />} />
              <Route path="documentation/view/:id" element={<PDFViewerPage />} />
              <Route path=":serviceId" element={<ServicePage />} /> {/* generic service handler */}
              <Route index element={<Navigate to="overview" replace />} /> {/* /service -> /service/overview */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
