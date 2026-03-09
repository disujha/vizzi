/**
 * Check Environment Variables
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const env = {
    COGNITO_REGION: process.env.COGNITO_REGION || process.env.AWS_REGION || 'not set',
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || process.env.AWS_USER_POOL_ID || 'not set',
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || process.env.AWS_USER_POOL_CLIENT_ID || 'not set',
    COGNITO_CLIENT_SECRET: (process.env.COGNITO_CLIENT_SECRET || process.env.AWS_USER_POOL_CLIENT_SECRET) ? 'set' : 'not set',
    BEDROCK_ACCESS_KEY_ID: (process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) ? 'set' : 'not set',
    BEDROCK_SECRET_ACCESS_KEY: (process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) ? 'set' : 'not set',
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY ? 'set' : 'not set',
    MSG91_TEMPLATE_OTP: process.env.MSG91_TEMPLATE_OTP ? 'set' : 'not set',
  };

  // Check which variables are properly set
  const requiredVars = [
    'COGNITO_REGION',
    'COGNITO_USER_POOL_ID', 
    'COGNITO_CLIENT_ID',
    'BEDROCK_ACCESS_KEY_ID',
    'BEDROCK_SECRET_ACCESS_KEY',
    'MSG91_AUTH_KEY',
    'MSG91_TEMPLATE_OTP'
  ];

  const missingVars = requiredVars.filter(key => env[key as keyof typeof env] === 'not set');
  const allConfigured = missingVars.length === 0;

  return NextResponse.json({
    message: 'Environment check',
    status: allConfigured ? '✅ All variables configured' : '❌ Missing variables',
    environment: env,
    missing: missingVars,
    ready: allConfigured
  });
}
