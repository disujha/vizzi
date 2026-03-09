'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { configureAmplify } from '@/lib/amplify';

configureAmplify();

const GET_CLINIC = /* GraphQL */ `
  query GetClinic($id: ID!) {
    getClinic(id: $id) {
      id
      name
      clinicName
      doctorName
      email
      phone
      status
      smsClinicName
      currentPlan
      signupDate
    }
  }
`;

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput, $limit: Int) {
    listClinics(filter: $filter, limit: $limit) {
      items {
        id
        name
        clinicName
        phone
        email
        smsClinicName
      }
    }
  }
`;

export default function TestAppSyncPage() {
  const [mobile, setMobile] = useState('8585810708');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testQueries = async () => {
    setLoading(true);
    const client = generateClient();
    
    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const clinicId = `clinic-${normalizedMobile}`;
    const phoneE164 = `+91${normalizedMobile}`;

    const testResults: any = {
      searchedFor: {
        mobile: normalizedMobile,
        clinicId,
        phoneE164
      },
      attempts: []
    };

    // Test 1: Direct ID lookup
    try {
      const res1 = await client.graphql({
        query: GET_CLINIC,
        variables: { id: clinicId }
      }) as any;
      
      testResults.attempts.push({
        method: 'Direct ID lookup (Cognito auth)',
        id: clinicId,
        success: !!res1?.data?.getClinic,
        data: res1?.data?.getClinic || null
      });
    } catch (err: any) {
      testResults.attempts.push({
        method: 'Direct ID lookup (Cognito auth)',
        id: clinicId,
        success: false,
        error: err?.message || 'Unknown error',
        errorType: err?.errors?.[0]?.errorType,
        errorMessage: err?.errors?.[0]?.message
      });
    }

    // Test 2: List by phone filter
    try {
      const res2 = await client.graphql({
        query: LIST_CLINICS,
        variables: { 
          filter: { phone: { eq: phoneE164 } },
          limit: 10
        }
      }) as any;
      
      const items = res2?.data?.listClinics?.items || [];
      testResults.attempts.push({
        method: 'List by phone filter (Cognito auth)',
        filter: { phone: phoneE164 },
        success: items.length > 0,
        count: items.length,
        data: items
      });
    } catch (err: any) {
      testResults.attempts.push({
        method: 'List by phone filter (Cognito auth)',
        filter: { phone: phoneE164 },
        success: false,
        error: err?.message || 'Unknown error',
        errorType: err?.errors?.[0]?.errorType,
        errorMessage: err?.errors?.[0]?.message
      });
    }

    // Test 3: List all clinics
    try {
      const res3 = await client.graphql({
        query: LIST_CLINICS,
        variables: { limit: 5 }
      }) as any;
      
      const items = res3?.data?.listClinics?.items || [];
      testResults.attempts.push({
        method: 'List all clinics (Cognito auth)',
        success: true,
        count: items.length,
        data: items
      });
    } catch (err: any) {
      testResults.attempts.push({
        method: 'List all clinics (Cognito auth)',
        success: false,
        error: err?.message || 'Unknown error',
        errorType: err?.errors?.[0]?.errorType,
        errorMessage: err?.errors?.[0]?.message
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AppSync Connection Test (Cognito Auth)</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Mobile Number (10 digits)
            </label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="8585810708"
            />
          </div>
          
          <button
            onClick={testQueries}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test AppSync Queries'}
          </button>
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Test Results</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Searched For:</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(results.searchedFor, null, 2)}
              </pre>
            </div>

            {results.attempts.map((attempt: any, idx: number) => (
              <div
                key={idx}
                className={`mb-4 p-4 rounded ${
                  attempt.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{attempt.method}</h3>
                  <span className={`px-3 py-1 rounded text-sm ${
                    attempt.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {attempt.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </div>
                
                {attempt.error && (
                  <div className="mb-2">
                    <p className="text-sm text-red-600 font-medium">Error: {attempt.error}</p>
                    {attempt.errorType && (
                      <p className="text-sm text-red-500">Type: {attempt.errorType}</p>
                    )}
                    {attempt.errorMessage && (
                      <p className="text-sm text-red-500">Message: {attempt.errorMessage}</p>
                    )}
                  </div>
                )}
                
                {attempt.data && (
                  <pre className="text-sm overflow-x-auto bg-white p-2 rounded">
                    {JSON.stringify(attempt.data, null, 2)}
                  </pre>
                )}
                
                {attempt.count !== undefined && (
                  <p className="text-sm text-gray-600">Found {attempt.count} items</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
