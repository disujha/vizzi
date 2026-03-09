"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLocalSession } from "@/lib/authSession";

export default function DebugPage() {
    const { user } = useAuth();
    const [localSession, setLocalSession] = useState<any>(null);
    const [debugApiResult, setDebugApiResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const session = getLocalSession();
        setLocalSession(session);
    }, []);

    const testDebugApi = async () => {
        if (!user?.userId) return;
        
        setLoading(true);
        try {
            // Extract mobile from userId (format: clinic-XXXXXXXXXX)
            const mobile = user.userId.startsWith("clinic-") 
                ? user.userId.replace("clinic-", "") 
                : user.userId;
            
            const response = await fetch(`/api/debug-clinic?mobile=${mobile}`);
            const data = await response.json();
            setDebugApiResult(data);
        } catch (error) {
            setDebugApiResult({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Dashboard Debug Info</h1>

            {/* User from AuthContext */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                <h2 className="text-lg font-bold mb-3">User from AuthContext</h2>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(user, null, 2)}
                </pre>
            </div>

            {/* localStorage Session */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                <h2 className="text-lg font-bold mb-3">localStorage Session</h2>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(localSession, null, 2)}
                </pre>
            </div>

            {/* All localStorage Keys */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                <h2 className="text-lg font-bold mb-3">All localStorage Keys</h2>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto">
                    {typeof window !== 'undefined' 
                        ? JSON.stringify(
                            Object.keys(localStorage).filter(k => k.startsWith('vizzi_')),
                            null,
                            2
                          )
                        : 'Loading...'}
                </pre>
            </div>

            {/* Debug API Test */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Debug API Test</h2>
                    <button
                        onClick={testDebugApi}
                        disabled={loading || !user}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Testing...' : 'Test Debug API'}
                    </button>
                </div>
                {debugApiResult && (
                    <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(debugApiResult, null, 2)}
                    </pre>
                )}
            </div>

            {/* Expected Clinic ID */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h2 className="text-lg font-bold mb-3 text-amber-900">Expected Values</h2>
                <div className="space-y-2 text-sm">
                    <p><strong>Clinic ID Format:</strong> clinic-XXXXXXXXXX (10 digits)</p>
                    <p><strong>Phone Format:</strong> +91XXXXXXXXXX</p>
                    <p><strong>Your userId:</strong> {user?.userId || 'Not loaded'}</p>
                    <p><strong>Extracted mobile:</strong> {
                        user?.userId?.startsWith("clinic-") 
                            ? user.userId.replace("clinic-", "")
                            : user?.userId || 'N/A'
                    }</p>
                    <p><strong>Expected phone:</strong> {
                        user?.userId?.startsWith("clinic-")
                            ? `+91${user.userId.replace("clinic-", "")}`
                            : 'N/A'
                    }</p>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
                <h2 className="text-lg font-bold mb-3 text-blue-900">What to Check</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Verify <code className="bg-white px-2 py-1 rounded">userId</code> format is correct (clinic-XXXXXXXXXX)</li>
                    <li>Click "Test Debug API" to check if clinic exists in backend</li>
                    <li>Look for <code className="bg-white px-2 py-1 rounded">success: true</code> in any attempt</li>
                    <li>If all attempts fail, clinic doesn't exist in AppSync</li>
                    <li>If clinic exists but dashboard fails, there's a lookup bug</li>
                </ol>
            </div>
        </div>
    );
}
