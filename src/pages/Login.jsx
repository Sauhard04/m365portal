import React from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import Card3D from "../components/Card3D";
import { ShieldCheck } from 'lucide-react';

const Login = () => {
    const { instance } = useMsal();

    const handleLogin = () => {
        instance.loginRedirect(loginRequest).catch(e => {
            console.error(e);
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-300">
            <div className="w-full max-w-md p-4">
                <Card3D className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-blue-100 rounded-full">
                            <ShieldCheck size={48} className="text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2 text-primary">Admin Portal</h1>
                    <p className="text-gray-600 mb-8">
                        Secure access for Microsoft Workplace Implementation Engineers.
                    </p>
                    <button
                        onClick={handleLogin}
                        className="btn-primary w-full text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                        Sign in with Microsoft
                    </button>
                </Card3D>
            </div>
        </div>
    );
};

export default Login;
