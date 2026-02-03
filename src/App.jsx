import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import ServicePage from './components/ServicePage';
import ExchangeReport from './components/ExchangeReport';
import BuildCommandsPage from './components/BuildCommandsPage';
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
import EntraEnterpriseApps from './components/EntraEnterpriseApps';
import EntraSignInLogs from './components/EntraSignInLogs';
import SecureScorePage from './components/SecureScorePage';
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
import UsageReports from './components/UsageReports';
import OverviewDashboard from './components/OverviewDashboard';
import AlertsPage from './components/AlertsPage';
import UserDetailsPage from './components/UserDetailsPage';
import ServiceLayout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentationPage from './components/DocumentationPage';
import PDFViewerPage from './components/PDFViewerPage';
import PurviewDashboard from './components/PurviewDashboard';
import DataCatalogPage from './components/DataCatalogPage';
import LineagePage from './components/LineagePage';
import GlossaryPage from './components/GlossaryPage';
import ScanningPage from './components/ScanningPage';
import CollectionsPage from './components/CollectionsPage';
import PoliciesPage from './components/PoliciesPage';

// Security Module
import SecurityDashboard from './components/SecurityDashboard';
import SecurityAlertsPage from './components/SecurityAlertsPage';
import SecurityIncidentsPage from './components/SecurityIncidentsPage';
import RiskyUsersPage from './components/RiskyUsersPage';
import SecurityExplorer from './components/SecurityExplorer';

// Governance Module
import GovernanceDashboard from './components/GovernanceDashboard';
import ConditionalAccessPage from './components/ConditionalAccessPage';
import PIMRolesPage from './components/PIMRolesPage';

// SharePoint & OneDrive Module
import SharePointDashboard from './components/SharePointDashboard';
import SharePointSitesPage from './components/SharePointSitesPage';
import SiteDetailsPage from './components/SiteDetailsPage';
import OneDrivePage from './components/OneDrivePage';
import MessageCenterPage from './components/MessageCenterPage';
import UserActivityReport from './components/UserActivityReport';

// Teams & Collaboration Module
import TeamsDashboard from './components/TeamsDashboard';
import TeamsListPage from './components/TeamsListPage';
import TeamDetailsPage from './components/TeamDetailsPage';
import TeamsChatPage from './components/TeamsChatPage';

import { ThemeProvider } from './contexts/ThemeContext';

import { SubscriptionProvider } from './contexts/SubscriptionContext';
import SubscriptionGate from './components/SubscriptionGate';
import PowerShellRunner from './components/PowerShellRunner';
import BirdsEyeView from './components/BirdsEyeView';

function App() {
  console.log('[App] Rendering Root Component');
  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/powershell" element={<PowerShellRunner />} />

              {/* Protected Routes Wrapper */}
              <Route element={<ProtectedRoute />}>
                <Route element={<SubscriptionGate />}>
                  {/* Service Layout Wrapper */}
                  <Route path="/service" element={<ServiceLayout />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<OverviewDashboard />} />
                    <Route path="usage" element={<UsageReports />} />
                    <Route path="birdseye" element={<BirdsEyeView />} />

                    {/* Admin Center Routes */}
                    <Route path="admin" element={<ServicePage serviceId="admin" />} />
                    <Route path="admin/report" element={<ExchangeReport />} />
                    <Route path="admin/build-commands" element={<BuildCommandsPage />} />
                    <Route path="admin/domains" element={<DomainsPage />} />
                    <Route path="admin/licenses" element={<LicensesPage />} />
                    <Route path="admin/groups" element={<GroupsPage />} />
                    <Route path="admin/deleted-users" element={<DeletedUsersPage />} />
                    <Route path="admin/secure-score" element={<SecureScorePage />} />
                    <Route path="admin/sign-ins" element={<SignInsPage />} />
                    <Route path="admin/emails" element={<EmailActivityPage />} />
                    <Route path="admin/alerts" element={<AlertsPage />} />
                    <Route path="admin/profile" element={<UserDetailsPage />} />
                    <Route path="admin/messages" element={<MessageCenterPage />} />
                    <Route path="admin/user-activity" element={<UserActivityReport />} />

                    {/* Entra ID Routes */}
                    <Route path="entra" element={<EntraDashboard />} />
                    <Route path="entra/users" element={<EntraUsers />} />
                    <Route path="entra/groups" element={<EntraGroups />} />
                    <Route path="entra/devices" element={<EntraDevices />} />
                    <Route path="entra/subscriptions" element={<EntraSubscriptions />} />
                    <Route path="entra/admins" element={<EntraAdmins />} />
                    <Route path="entra/apps" element={<EntraApps />} />
                    <Route path="entra/enterprise-apps" element={<EntraEnterpriseApps />} />
                    <Route path="entra/sign-in-logs" element={<EntraSignInLogs />} />

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

                    {/* Purview Routes */}
                    <Route path="purview" element={<PurviewDashboard />} />
                    <Route path="purview/catalog" element={<DataCatalogPage />} />
                    <Route path="purview/lineage" element={<LineagePage />} />
                    <Route path="purview/glossary" element={<GlossaryPage />} />
                    <Route path="purview/scanning" element={<ScanningPage />} />
                    <Route path="purview/collections" element={<CollectionsPage />} />
                    <Route path="purview/policies" element={<PoliciesPage />} />

                    {/* Security Routes */}
                    <Route path="security" element={<SecurityDashboard />} />
                    <Route path="security/alerts" element={<SecurityAlertsPage />} />
                    <Route path="security/incidents" element={<SecurityIncidentsPage />} />
                    <Route path="security/risky-users" element={<RiskyUsersPage />} />
                    <Route path="security/explorer" element={<SecurityExplorer />} />

                    {/* Governance Routes */}
                    <Route path="governance" element={<GovernanceDashboard />} />
                    <Route path="governance/conditional-access" element={<ConditionalAccessPage />} />
                    <Route path="governance/pim-roles" element={<PIMRolesPage />} />

                    {/* SharePoint & OneDrive Routes */}
                    <Route path="sharepoint" element={<SharePointDashboard />} />
                    <Route path="sharepoint/sites" element={<SharePointSitesPage />} />
                    <Route path="sharepoint/site/:siteId" element={<SiteDetailsPage />} />
                    <Route path="sharepoint/onedrive" element={<OneDrivePage />} />

                    {/* Teams & Collaboration Routes */}
                    <Route path="teams" element={<TeamsDashboard />} />
                    <Route path="teams/list" element={<TeamsListPage />} />
                    <Route path="teams/chats" element={<TeamsChatPage />} />
                    <Route path="teams/:teamId" element={<TeamDetailsPage />} />

                    <Route path="documentation" element={<DocumentationPage />} />
                    <Route path="documentation/view/:id" element={<PDFViewerPage />} />

                    {/* Generic Service Match */}
                    <Route path=":serviceId" element={<ServicePage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;
