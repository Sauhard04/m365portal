# 🌐 M365 Portal - Advanced Data Visualization Dashboard

![M365 Portal Banner](https://img.shields.io/badge/M365%20Portal-Enterprise%20Ready-blue?style=for-the-badge&logo=microsoft)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![MSAL](https://img.shields.io/badge/MSAL-Auth-orange?style=for-the-badge&logo=microsoft)

A state-of-the-art **Microsoft 365 Analytics Dashboard** that provides deep insights into your tenant's Security, Governance, SharePoint, Teams, and Intune usage. Built with a focus on aesthetics, performance, and granular security controls.

---

## ✨ Key Features

*   **🦅 BirdsEye View**: A holistic tenant overview aggregating data from 20+ Microsoft Graph endpoints in simpler terms.
*   **📊 Interactive Charts**: Beautiful, responsive visualizations powered by Recharts (with robust error handling).
*   **🔐 Granular Security**: Uses MSAL.js for secure authentication with specific scopes for each dashboard.
*   **⚡ High Performance**: Implements smart caching (localStorage) and optimized API calls to minimize latency.
*   **📱 Responsive Data**: Fully responsive design with glassmorphism UI for a premium look and feel.
*   **🤖 AI Integration**: Built-in context for AI-driven insights (Gemini/Grok integration ready).
*   **🆘 Get Support**: Integrated support form powered by Web3Forms for quick assistance requests(requests can be seen at https://app.web3forms.com/).

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js**: v18.0.0 or higher
*   **Microsoft 365 Tenant**: Admin access required for most reports.
*   **Azure AD App Registration**: You need a registered app in your tenant.

### 🛠️ Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Sauhard04/m365portal.git
    cd m365portal
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_CLIENT_ID=your_azure_ad_client_id
    VITE_TENANT_ID=your_tenant_id
    ```

4.  **Run the Application**
    To run both the frontend (Vite) and backend server (for PDF/AI features):
    ```bash
    npm run dev:all
    ```
    *   Frontend: `http://localhost:5173`
    *   Server: `http://localhost:3000`

---

## 🔑 Required Permissions (Microsoft Graph)

To unlock the full potential of the dashboard, the following **Delegated Permissions** must be granted to your Azure AD App. 

Admin Consent is recommended for a seamless experience.

| Category | Permission Scope | Purpose |
| :--- | :--- | :--- |
| **Identity** | `User.Read` | Sign-in and read user profile |
| | `User.Read.All` | Read full user list |
| | `Directory.Read.All` | Read organizational directory data |
| **Reports** | `Reports.Read.All` | Access M365 usage reports (SharePoint, OneDrive, etc.) |
| **Security** | `SecurityAlert.Read.All` | View active security alerts |
| | `SecurityIncident.Read.All` | View security incidents |
| | `IdentityRiskyUser.Read.All` | Identify risky users |
| | `IdentityRiskEvent.Read.All` | Analyze risk events |
| **Devices** | `DeviceManagementManagedDevices.Read.All` | List Intune managed devices |
| | `DeviceManagementApps.Read.All` | List Intune apps |
| **SharePoint** | `Sites.Read.All` | Access SharePoint site details |
| | `Files.Read.All` | Read file activity stats |
| **Teams** | `Team.ReadBasic.All` | List Teams and members |
| | `Chat.Read` | Read chat activity stats |
| **Purview** | `InformationProtectionPolicy.Read` | Read MIP policies |
| | `SensitivityLabel.Read` | Read sensitivity labels |
| | `eDiscovery.Read.All` | Access eDiscovery case stats |

> **Note:** If you see a "Session expired or additional permissions required" banner, click the **Connect/Reconnect** button to grant the specific scopes needed for that page.

---

## 🛠️ Tech Stack

*   **Frontend Framework**: React 18 + Vite
*   **Styling**: Custom CSS (Glassmorphism), Framer Motion (Animations)
*   **Authentication**: Azure MSAL Browser & React (`@azure/msal-react`)
*   **Data Visualization**: Recharts
*   **Backend (Optional)**: Node.js + Express (for AI/PDF processing)
*   **State Management**: React Hooks + LocalStorage Caching

---

## 💡 Troubleshooting

*   **CORS Errors on Localhost**: If you see CORS errors for SharePoint/OneDrive reports, this is normal. The app detects `localhost` and safely skips these specific report downloads to prevent crashes. They will work in production.
*   **Charts Not Rendering**: We use a custom `SafeResponsiveContainer` to ensure charts only render when dimensions are valid. If a chart is missing, try resizing the window slightly.

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

