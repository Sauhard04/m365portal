import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Shield, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const SecureScorePage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getSecureScore();
                    setScore(data);
                } catch (err) {
                    console.error(err);
                    setError("Failed to fetch Secure Score.");
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <button onClick={() => navigate('/service/admin')} className="mb-4 flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-400" />
                Microsoft Secure Score
            </h1>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
                    {error}
                </div>
            ) : score ? (
                <div className="max-w-2xl">
                    <div className="glass p-8 rounded-2xl flex items-center justify-between mb-8">
                        <div>
                            <p className="text-gray-400 mb-2">Current Score</p>
                            <div className="text-5xl font-bold text-white mb-2">
                                {score.currentScore} <span className="text-xl text-gray-500">/ {score.maxScore}</span>
                            </div>
                            <p className="text-blue-400 font-medium">
                                {Math.round((score.currentScore / score.maxScore) * 100)}% Achieved
                            </p>
                        </div>
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#333"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="4"
                                    strokeDasharray={`${(score.currentScore / score.maxScore) * 100}, 100`}
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl">
                        <h3 className="text-xl font-bold mb-4">Improvement Actions</h3>
                        <p className="text-gray-400 italic">
                            Full breakdown of improvement actions would be listed here via `controlScores`.
                        </p>
                        {/* Future enhancement: List controlScores */}
                    </div>
                </div>
            ) : (
                <div className="text-gray-500">No secure score data available.</div>
            )}
        </div>
    );
};

export default SecureScorePage;
