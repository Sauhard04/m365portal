import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, X, Send, Bot, User,
    ChevronDown, Maximize2, Minimize2, Sparkles,
    RefreshCw, Terminal, Navigation, Check
} from 'lucide-react';
import { GeminiService } from '../../services/gemini.service';
import { GraphService } from '../../services/graphService';
import { UsageService } from '../../services/usage.service';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import SiteDataStore from '../../services/siteDataStore';
import { useToken } from '../../hooks/useToken';
import { useActiveTenant } from '../../hooks/useActiveTenant';
import './Chatbot.css';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', content: 'Hello! I am your M365 Intelligence Assistant. How can I help you today?' }
    ]);
    const [message, setMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isTyping]);

    useEffect(() => {
        setChatHistory([
            { role: 'assistant', content: 'Hello! I am your M365 Intelligence Assistant. How can I help you today?' }
        ]);
    }, [activeTenantId]);

    const getAccessToken = async () => {
        try {
            return await acquireToken({
                scopes: ['https://graph.microsoft.com/.default']
            });
        } catch (error) {
            throw new Error(`Auth Error: ${error.message}`);
        }
    };

    const handleMailboxStats = async (userQuery) => {
        try {
            const token = await getAccessToken();
            const graph = new GraphService(token);
            const { reports } = await graph.getExchangeMailboxReport();

            if (!reports || reports.length === 0) return "I couldn't find any mailbox usage data.";

            // Use prompt refining for a more intelligent mailbox report
            const refinedPrompt = `
                User Query: "${userQuery}"
                DATA:
                Mailboxes: ${reports.length}
                Storage: ${reports.reduce((acc, r) => acc + (parseFloat(r.mailboxSize) || 0), 0).toFixed(2)} GB
                Details: ${reports.slice(0, 5).map(r => `${r.displayName}: ${r.mailboxSize}`).join(', ')}
                
                Respond ONLY with the stats. Be brief.
            `;

            SiteDataStore.store('mailboxes', { reports }, { source: 'Chatbot' });

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
                User Query: "${userQuery}"
                DATA:
                ${skus.map(s => `- ${s.skuPartNumber}: ${s.consumedUnits}/${s.prepaidUnits.enabled}`).join('\n')}
                
                Respond ONLY with a concise summary of usage and total available units. No fluff.
            `;

            SiteDataStore.store('licenses', { skus }, { source: 'Chatbot' });

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

            SiteDataStore.store('teamsUsage', { detail, totalUsers, totalMessages, totalMeetings }, { source: 'Chatbot' });

            let report = `### Teams Study (30D)\n`;
            report += `- Users: ${totalUsers}\n`;
            report += `- Messages: ${totalMessages}\n`;
            report += `- Meetings: ${totalMeetings}\n`;
            report += `- Top: ${detail.sort((a, b) => (b.teamChatMessages + b.privateChatMessages) - (a.teamChatMessages + a.privateChatMessages))[0]?.displayName}`;

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

            SiteDataStore.store('sharepointUsage', { detail, totalSites, totalFiles, totalStorage }, { source: 'Chatbot' });

            let report = `### SharePoint Study\n`;
            report += `- Sites: ${totalSites}\n`;
            report += `- Files: ${totalFiles}\n`;
            report += `- Storage: ${totalStorage.toFixed(2)} GB\n`;
            report += `- Top Site: ${detail.sort((a, b) => b.viewedOrEditedFileCount - a.viewedOrEditedFileCount)[0]?.displayName}`;

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

            let report = `### Active Users (30D)\n`;
            report += `- Total: ${totalActive}\n`;
            report += `- Exchange: ${exchangeActive}\n`;
            report += `- Teams: ${teamsActive}`;

            SiteDataStore.store('activeUsers', { totalActive, exchangeActive, teamsActive, raw: data }, { source: 'Chatbot' });

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

            SiteDataStore.store('userCount', { count }, { source: 'Chatbot' });
            return `Total users: **${count}**`;
        } catch (error) {
            return `Failed to fetch total users: ${error.message}`;
        }
    };

    const handleConfirmNavigation = (path, index) => {
        navigate(path);
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[index] = {
                ...newHistory[index],
                content: `Navigating...`,
                type: 'text_disabled',
                actionsDisabled: true
            };
            return newHistory;
        });
    };

    const handleCancelNavigation = (index) => {
        setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[index] = {
                ...newHistory[index],
                content: "Navigation cancelled.",
                type: 'text_disabled',
                actionsDisabled: true
            };
            return newHistory;
        });
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
            let aiResponse = "";

            // Special data-enriched prompts for certain keywords
            if (lowerMessage.includes("mailbox")) {
                aiResponse = await handleMailboxStats(currentMessage);
            } else if (lowerMessage.includes("license")) {
                aiResponse = await handleLicenseStats(currentMessage);
            } else if (lowerMessage.includes("sharepoint")) {
                aiResponse = await handleSharePointStats();
            } else if (lowerMessage.includes("active user")) {
                aiResponse = await handleActiveUsers();
            } else if (lowerMessage.includes("total user") || lowerMessage.includes("how many users")) {
                aiResponse = await handleTotalUsers();
            } else {
                // Default AI Chat
                aiResponse = await GeminiService.chat(currentMessage, chatHistory);
            }

            // --- NAVIGATION LOGIC ---
            // Check if AI response contains a navigation command: [ACTION:NAVIGATE, PATH:/some/path]
            const navRegex = /\[ACTION:NAVIGATE,\s*PATH:([^\]]+)\]/i;
            const match = aiResponse.match(navRegex);

            if (match && match[1]) {
                const targetPath = match[1].trim();

                // Strip the command from the AI response
                const cleanResponse = aiResponse.replace(navRegex, '').trim();

                if (cleanResponse) {
                    setChatHistory(prev => [...prev, { role: 'assistant', content: cleanResponse }]);
                }

                // Add confirmation request
                setChatHistory(prev => [...prev, {
                    role: 'assistant',
                    content: `Go to ${targetPath}?`,
                    type: 'navigation_confirm',
                    targetPath: targetPath
                }]);

            } else {
                setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
            }

        } catch (error) {
            console.error("Chatbot Send Error:", error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "I encountered an error: " + error.message }]);
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
            { role: 'assistant', content: 'Cleared.' }
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

                                                {msg.type === 'navigation_confirm' && !msg.actionsDisabled && (
                                                    <div className="navigation-actions">
                                                        <button
                                                            className="nav-confirm-btn"
                                                            onClick={() => handleConfirmNavigation(msg.targetPath, idx)}
                                                        >
                                                            <Check size={14} /> Yes, Go
                                                        </button>
                                                        <button
                                                            className="nav-cancel-btn"
                                                            onClick={() => handleCancelNavigation(idx)}
                                                        >
                                                            <X size={14} /> No, Stay
                                                        </button>
                                                    </div>
                                                )}
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
