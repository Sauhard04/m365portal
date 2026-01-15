# M365 Portal Code Overview

This document provides a high-level overview of the M365 Portal codebase, explaining the architecture, key directories, and data flow.

## 🏗️ Architecture
The project is a **Single Page Application (SPA)** built with:
- **Framework**: React.js (Vite)
- **Authentication**: MSAL (Microsoft Authentication Library) for Azure AD / Entra ID.
- **Data Source**: Microsoft Graph API.
- **Styling**: CSS Modules (`DetailPage.module.css`) + Global CSS (`index.css`) with Tailwind-like utility classes.
- **Routing**: React Router (`react-router-dom`).

## 📂 Directory Structure

### `src/` (Core Application Code)
- **`App.jsx`**: The main entry point. Handles **Routing** and **Route Protection**.
  - Maps URLs (e.g., `/service/intune`) to Components (e.g., `IntuneMonitoring.jsx`).
  - Wraps routes with `ProtectedRoute` to ensure user is logged in.
- **`authConfig.js`**: Configuration for MSAL (Client ID, Tenant ID, Scopes).
- **`main.jsx`**: Bootstraps the React application.

### `src/components/` (UI & Views)
Contains all the page views and reusable UI components.
- **Services Pages**: `ServicePage.jsx`, `IntuneMonitoring.jsx`, `EntraDashboard.jsx`.
- **Detail Pages**: `IntuneAuditLogs.jsx`, `IntuneUserDevices.jsx`.
- **Shared UI**: `Layout.jsx` (Sidebar, Header), `LandingPage.jsx`.

### `src/services/` (Data Layer)
Handles all communication with Microsoft Graph API.
- **`graphService.js`**: The core wrapper around the Graph Client. Handles initialization and common calls.
- **`intune/intune.service.js`**: Specialized service for Intune-related API calls (Devices, Policies, Apps).
- **`entra/`**: Specialized services for Entra ID (Users, Groups).
- **`dataPersistence.js`**: A caching layer to save API responses to `localStorage` to reduce API calls and improve performance.

## 🔄 Data Flow

1.  **Authentication**:
    - User lands on `/`.
    - `LandingPage.jsx` triggers MSAL login via `instance.loginPopup()` or `loginRedirect()`.
    - Token is acquired and stored.

2.  **Navigation**:
    - `App.jsx` directs authenticated users to `/service/overview`.
    - `Layout.jsx` renders the Sidebar and the current page content from `Outlet`.

3.  **Data Fetching**:
    - **Step 1**: Component (e.g., `IntuneUserDevices.jsx`) mounts.
    - **Step 2**: Calls `useEffect` to fetch data.
    - **Step 3**: Uses `IntuneService` (or `GraphService`).
    - **Step 4**: Service uses `client.api('/endpoint').get()` to call Microsoft Graph.
    - **Step 5**: Data is returned to Component state (`useState`) and rendered.

4.  **Caching**:
    - `ServicePage.jsx` checks `DataPersistenceService`.
    - If data exists in `localStorage` and isn't expired, it loads from cache.
    - Otherwise, it fetches fresh data from Graph API and saves it.

## 🛠️ Key Files to Know

| File | Purpose |
| :--- | :--- |
| `src/App.jsx` | Defines all routes (Admin, Intune, Entra). Add new pages here. |
| `src/components/Layout.jsx` | The main shell (Sidebar + Header). |
| `src/services/graphService.js` | Main place for general Graph API calls. |
| `src/components/DetailPage.module.css` | Shared styles for all detail pages (Tables, Cards, Headers). |

## 🚀 How to Add a New Feature

1.  **Create Component**: Create `NewFeature.jsx` in `src/components/`.
2.  **Add Service Method**: Add a data fetching method in `src/services/service.js`.
3.  **Add Route**: Register the path in `src/App.jsx`.
4.  **Link in UI**: Add a link in the Sidebar (`Layout.jsx`) or a Dashboard tile.
