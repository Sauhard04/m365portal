import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, X, Send, Bot, User,
    ChevronDown, Maximize2, Minimize2, Sparkles,
    RefreshCw, Terminal, Navigation
} from 'lucide-react';
import { GeminiService } from '../../services/gemini.service';
import { GraphService } from '../../services/graphService';
import { UsageService } from '../../services/usage.service';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: 'Hello! I am AdminSphere AI. How can I assist you with the portal today?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isTyping]);

    const getAccessToken = async () => {
        if (!accounts || accounts.length === 0) throw new Error("Please sign in to access reports.");
        const response = await instance.acquireTokenSilent({
            scopes: ['https://graph.microsoft.com/.default'],
            account: accounts[0]
        });
        return response.accessToken;
    };

    const handleMailboxStats = async (userQuery) => {
        try {
            const token = await getAccessToken();
            const graph = new GraphService(token);
            const { reports } = await graph.getExchangeMailboxReport();

            if (!reports || reports.length === 0) return "I couldn't find any mailbox usage data.";

            // Use prompt refining for a more intelligent mailbox report
            const refinedPrompt = `
                The user is asking: "${userQuery}"
                
                Here is the LIVE MAILBOX DATA:
                Total Mailboxes: ${reports.length}
                Total Storage Used: ${reports.reduce((acc, r) => acc + (parseFloat(r.mailboxSize) || 0), 0).toFixed(2)} GB
                User Details: ${reports.slice(0, 5).map(r => `${r.displayName}: ${r.mailboxSize}`).join(', ')}
                
                Refine the output:
                - Focus on summary stats (Count, Total Size, Avg).
                - Highlight top consumers.
                - Use professional Markdown.
            `;

            return await GeminiService.chat(refinedPrompt, chatHistory);
        } catch (error) {
            return `Failed to fetch mailbox stats: ${error.message}`;
        }
    };

    const handleLicenseStats = async (userQuery) => {
        try {
            const token = await getAccessToken();
            const graph = new GraphService(token);
            const { skus } = await graph.getLicensingData();

            if (!skus || skus.length === 0) return "I couldn't find any license usage data.";

            // Use prompt refining: Pass data to AI for a precise, formatted response
            const refinedPrompt = `
                The user is asking: "${userQuery}"
                
                Here is the LIVE LICENSE DATA from Microsoft Graph:
                ${skus.map(s => `- ${s.skuPartNumber}: Consumed=${s.consumedUnits}, Total=${s.prepaidUnits.enabled}`).join('\n')}
                
                Refine the output for the user:
                1. List each license with its usage (Consumed / Total) and Available count.
                2. Calculate the PERCENTAGE usage for each.
                3. CRITICAL: Show a step-by-step summation of all "Available" licenses.
                4. Provide the final "Total Available Licenses" sum clearly.
                5. Maintain your persona as AdminSphere AI and use professional Markdown.
            `;

            return await GeminiService.chat(refinedPrompt, chatHistory);
        } catch (error) {
            return `Failed to fetch license stats: ${error.message}`;
        }
    };

    const handleTeamsStats = async () => {
        try {
            const token = await getAccessToken();
            const usage = new UsageService(token);
            const { detail } = await usage.getTeamsUsage('D30');

            if (!detail || detail.length === 0) return "I couldn't find any Teams usage data.";

            const totalUsers = detail.length;
            const totalMessages = detail.reduce((acc, u) => acc + (u.teamChatMessages + u.privateChatMessages), 0);
            const totalMeetings = detail.reduce((acc, u) => acc + u.meetings, 0);

            let report = `### 👥 Teams Activity Report (Last 30 Days)\n\n`;
            report += `* **Active Users:** ${totalUsers}\n`;
            report += `* **Total Messages:** ${totalMessages}\n`;
            report += `* **Total Meetings:** ${totalMeetings}\n\n`;
            report += `**Most Active Participant:** ${detail.sort((a, b) => (b.teamChatMessages + b.privateChatMessages) - (a.teamChatMessages + a.privateChatMessages))[0]?.displayName}\n`;

            return report;
        } catch (error) {
            return `Failed to fetch Teams stats: ${error.message}`;
        }
    };

    const handleSharePointStats = async () => {
        try {
            const token = await getAccessToken();
            const usage = new UsageService(token);
            const { detail } = await usage.getSharePointUsage('D30');

            if (!detail || detail.length === 0) return "I couldn't find any SharePoint usage data.";

            const totalSites = detail.length;
            const totalFiles = detail.reduce((acc, s) => acc + s.viewedOrEditedFileCount, 0);
            const totalStorage = detail.reduce((acc, s) => acc + s.storageUsedInBytes, 0) / (1024 * 1024 * 1024);

            let report = `### 📁 SharePoint Usage Report\n\n`;
            report += `* **Total Sites:** ${totalSites}\n`;
            report += `* **Files Viewed/Edited:** ${totalFiles}\n`;
            report += `* **Total Storage Used:** ${totalStorage.toFixed(2)} GB\n\n`;
            report += `**Most Active Site:** ${detail.sort((a, b) => b.viewedOrEditedFileCount - a.viewedOrEditedFileCount)[0]?.displayName}\n`;

            return report;
        } catch (error) {
            return `Failed to fetch SharePoint stats: ${error.message}`;
        }
    };

    const handleActiveUsers = async () => {
        try {
            const token = await getAccessToken();
            const usage = new UsageService(token);
            const data = await usage.getOffice365ActiveUserDetail('D30');

            if (!data || data.length === 0) return "I couldn't find any active user data. It might still be processing or requires permission.";

            const totalActive = data.length;
            const exchangeActive = data.filter(u => u.hasExchangeLicense === "Yes" && u.exchangeLastActivityDate !== "None").length;
            const teamsActive = data.filter(u => u.hasTeamsLicense === "Yes" && u.teamsLastActivityDate !== "None").length;

            let report = `### 👥 Active Users Summary (Last 30 Days)\n\n`;
            report += `* **Total Active Users:** ${totalActive}\n`;
            report += `* **Active in Exchange:** ${exchangeActive}\n`;
            report += `* **Active in Teams:** ${teamsActive}\n\n`;
            report += `*Note: Active users are those who performed at least one activity (email, chat, file access) in the selected period.*`;

            return report;
        } catch (error) {
            return `Failed to fetch active users: ${error.message}`;
        }
    };

    const handleTotalUsers = async () => {
        try {
            const token = await getAccessToken();
            const graph = new GraphService(token);
            const users = await graph.client.api('/users').select('id').top(999).get();
            const count = users.value?.length || 0;

            return `There are currently **${count}** total users registered in your directory (Entra ID).`;
        } catch (error) {
            return `Failed to fetch total users: ${error.message}`;
        }
    };

    const handleNavigation = (message) => {
        const lower = message.toLowerCase();

        const routes = {
            'teams tab': '/service/usage?tab=teams',
            'exchange online tab': '/service/usage?tab=exchange',
            'exchange tab': '/service/usage?tab=exchange',
            'sharepoint tab': '/service/usage?tab=sharepoint',
            'onedrive tab': '/service/usage?tab=onedrive',
            'mailbox report': '/service/admin/report',
            'usage': '/service/usage',
            'overview': '/service/overview',
            'dashboard': '/service/overview',
            'mailbox': '/service/admin/report',
            'exchange': '/service/admin/report',
            'license': '/service/admin/licenses',
            'entra': '/service/entra',
            'users': '/service/entra/users',
            'groups': '/service/entra/groups',
            'intune': '/service/intune',
            'devices': '/service/intune/devices',
            'health': '/service/admin/service-health',
            'secure score': '/service/admin/secure-score',
            'sign-ins': '/service/admin/sign-ins',
            'alerts': '/service/admin/alerts',
            'documentation': '/service/documentation'
        };

        for (const [key, path] of Object.entries(routes)) {
            if (lower.includes(key)) {
                navigate(path);
                const displayKey = key.includes('tab') ? key.replace(' tab', '').toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
                return `Navigating you to the **${displayKey}** section...`;
            }
        }

        return "I'm sorry, I couldn't find that specific page. Try asking to open 'usage', 'mailbox report', or 'entra users'.";
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!message.trim() || isTyping) return;

        const currentMessage = message;
        const userMessage = { role: 'user', content: currentMessage };
        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setIsTyping(true);

        try {
            const lowerMessage = currentMessage.toLowerCase();
            const isReportRequest = lowerMessage.includes("report") || lowerMessage.includes("stats") || lowerMessage.includes("summary") || lowerMessage.includes("analytics") || lowerMessage.includes("usage");
            const isNavigationRequest = lowerMessage.includes("open") || lowerMessage.includes("go to") || lowerMessage.includes("show me") || lowerMessage.includes("navigate") || lowerMessage.includes("page");

            // Priority 1: Navigation (if explicitly asked to open/go to a page or tab)
            if (isNavigationRequest && (lowerMessage.includes("page") || lowerMessage.includes("section") || lowerMessage.includes("portal") || lowerMessage.includes("tab"))) {
                const response = handleNavigation(currentMessage);
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            }
            // Priority 2: Specific Stats/Reports
            else if (lowerMessage.includes("mailbox")) {
                const response = await handleMailboxStats(currentMessage);
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            } else if (lowerMessage.includes("license")) {
                const response = await handleLicenseStats(currentMessage);
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            } else if (lowerMessage.includes("sharepoint")) {
                const response = await handleSharePointStats();
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            } else if (lowerMessage.includes("active user")) {
                const response = await handleActiveUsers();
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            } else if (lowerMessage.includes("total user") || lowerMessage.includes("how many users")) {
                const response = await handleTotalUsers();
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            }
            // Priority 3: General Navigation (fallback for "open ...")
            else if (isNavigationRequest) {
                const response = handleNavigation(currentMessage);
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            }
            // Priority 4: AI Chat
            else {
                const response = await GeminiService.chat(currentMessage, chatHistory);
                setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: error.message }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setChatHistory([
            { role: 'assistant', content: 'Chat cleared. How can I help you now?' }
        ]);
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'active' : ''}`}>
            {/* Floating Action Button */}
            <motion.button
                className="chatbot-fab"
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <X size={24} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="open"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            style={{ position: 'relative' }}
                        >
                            <MessageSquare size={24} />
                            <div className="fab-glow" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`chatbot-window glass-panel ${isMinimized ? 'minimized' : ''}`}
                        initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    >
                        {/* Header */}
                        <div className="chatbot-header">
                            <div className="header-info">
                                <div className="bot-avatar">
                                    <Bot size={18} />
                                    <div className="active-dot" />
                                </div>
                                <div>
                                    <h3>AdminSphere AI</h3>
                                    <span className="status-text">Online & Knowledgeable</span>
                                </div>
                            </div>
                            <div className="header-actions">
                                <button onClick={clearChat} title="Clear Chat">
                                    <RefreshCw size={16} />
                                </button>
                                <button onClick={() => setIsOpen(false)} title="Close">
                                    <ChevronDown size={20} />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* Messages Body */}
                                <div className="chatbot-body">
                                    {chatHistory.map((msg, idx) => (
                                        <motion.div
                                            key={idx}
                                            className={`chat-message ${msg.role}`}
                                            initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <div className="message-icon">
                                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                            </div>
                                            <div className="message-content">
                                                {msg.content.split('\n').map((line, i) => (
                                                    <p key={i}>{line}</p>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {isTyping && (
                                        <div className="chat-message assistant">
                                            <div className="message-icon">
                                                <Bot size={14} />
                                            </div>
                                            <div className="message-content typing">
                                                <span className="dot" />
                                                <span className="dot" />
                                                <span className="dot" />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <form className="chatbot-input" onSubmit={handleSend}>
                                    <textarea
                                        placeholder="Ask Me"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        rows={1}
                                    />
                                    <button type="submit" disabled={!message.trim() || isTyping}>
                                        <Send size={18} />
                                    </button>
                                </form>

                                {/* Suggestions */}
                                {chatHistory.length < 3 && (
                                    <div className="chat-suggestions">
                                        <button onClick={() => { setMessage('Give usage stats of mailbox'); }}>
                                            <Navigation size={12} /> Mailbox Usage
                                        </button>
                                        <button onClick={() => { setMessage('Give me the license usage stats'); }}>
                                            <Terminal size={12} /> License Stats
                                        </button>
                                        <button onClick={() => { setMessage('Show teams usage stats'); }}>
                                            <Sparkles size={12} /> Teams Usage
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Chatbot;
