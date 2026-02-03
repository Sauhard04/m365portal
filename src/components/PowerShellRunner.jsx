import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Play, RotateCcw, AlertTriangle, ExternalLink, Loader2, Info, CheckCircle2, XCircle } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

const PowerShellRunner = () => {
    const [command, setCommand] = useState('Get-Date');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Idle');
    const [workflowUrl, setWorkflowUrl] = useState('');
    const { tenantId, setIsExpired } = useSubscription();

    const runScript = async () => {
        setLoading(true);
        setOutput('');
        setError('');
        setWorkflowUrl('');
        setStatusMessage('Triggering GitHub Action...');

        // Start polling for live status
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/script/peek', {
                    headers: { 'X-Tenant-Id': tenantId }
                });
                const data = await res.json();
                if (data.stdout) setStatusMessage(data.stdout);
            } catch (e) { /* ignore */ }
        }, 3000);

        try {
            const response = await fetch('/api/script/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-Id': tenantId
                },
                body: JSON.stringify({ command, tenantId }),
            });

            if (response.status === 402) {
                setIsExpired(true);
                clearInterval(pollInterval);
                return;
            }

            const data = await response.json();
            clearInterval(pollInterval);

            if (data.success) {
                setOutput(data.stdout || 'Command finished successfully.');
                if (data.workflowUrl) setWorkflowUrl(data.workflowUrl);
                setStatusMessage('Completed');
            } else {
                setError(data.error || data.stderr || 'Execution failed.');
                if (data.workflowUrl) setWorkflowUrl(data.workflowUrl);
                setStatusMessage('Failed');
            }
        } catch (err) {
            clearInterval(pollInterval);
            setError(err.message);
            setStatusMessage('Error');
        } finally {
            setLoading(false);
        }
    };

    const resetSession = async () => {
        try {
            await fetch('/api/script/reset', {
                method: 'POST',
                headers: { 'X-Tenant-Id': tenantId }
            });
            setOutput('');
            setError('');
            setStatusMessage('Idle');
            setWorkflowUrl('');
        } catch (e) {
            setError('Failed to reset: ' + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-200 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                        <Terminal className="text-blue-400 w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Remote PowerShell Runner</h1>
                        <p className="text-slate-400 flex items-center gap-2 mt-1">
                            <Info className="w-4 h-4" />
                            Executing via GitHub Actions Runner (windows-latest)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#141417] rounded-2xl border border-white/5 p-6 shadow-xl">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Quick Templates</h2>
                            <div className="flex flex-col gap-2">
                                {[
                                    { label: 'System Time', cmd: 'Get-Date' },
                                    { label: 'OS Version', cmd: '[System.Environment]::OSVersion' },
                                    { label: 'Disk Usage', cmd: 'Get-PSDrive C | Select-Object Used, Free' },
                                    { label: 'Module Check', cmd: 'Get-Module -ListAvailable' }
                                ].map((tmp) => (
                                    <button
                                        key={tmp.label}
                                        onClick={() => setCommand(tmp.cmd)}
                                        className="text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm transition-colors"
                                    >
                                        {tmp.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-200/70 leading-relaxed">
                                        Remote runners are <strong>non-interactive</strong>. Commands like <code className="text-amber-400">Connect-ExchangeOnline</code> with popups will fail. Use automation-friendly commands only.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={resetSession}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all font-medium"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Environment
                        </button>
                    </div>

                    {/* Right Column: Editor & Output */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Editor */}
                        <div className="bg-[#141417] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/5">
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Input Script</span>
                                <div className="flex items-center gap-2">
                                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                                    <span className={`text-xs font-medium ${loading ? 'text-blue-400' : 'text-slate-500'}`}>
                                        {statusMessage}
                                    </span>
                                </div>
                            </div>
                            <textarea
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                className="w-full min-h-[160px] p-6 bg-transparent font-mono text-sm resize-none focus:outline-none text-blue-100 placeholder:text-slate-700"
                                placeholder="# Enter PowerShell code here..."
                            />
                            <div className="p-4 bg-white/5 flex justify-end">
                                <button
                                    onClick={runScript}
                                    disabled={loading}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${loading
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                >
                                    {loading ? 'Executing...' : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" />
                                            Execute Command
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Results */}
                        <AnimatePresence>
                            {(output || error || workflowUrl) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#141417] rounded-2xl border border-white/5 overflow-hidden shadow-2xl"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                        <h3 className="text-sm font-semibold text-slate-300">Execution Results</h3>
                                        {workflowUrl && (
                                            <a
                                                href={workflowUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                View on GitHub
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="p-0 max-h-[400px] overflow-y-auto">
                                        {output && (
                                            <div className="p-6 font-mono text-sm leading-relaxed text-emerald-400/90 whitespace-pre-wrap">
                                                <div className="flex items-center gap-2 mb-2 text-emerald-500 text-xs uppercase font-bold tracking-widest">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Stdout
                                                </div>
                                                {output}
                                            </div>
                                        )}
                                        {error && (
                                            <div className="p-6 font-mono text-sm leading-relaxed text-rose-400/90 whitespace-pre-wrap border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-2 text-rose-500 text-xs uppercase font-bold tracking-widest">
                                                    <XCircle className="w-4 h-4" />
                                                    Stderr
                                                </div>
                                                {error}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PowerShellRunner;
