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
  };

  return NextResponse.json({
    message: 'Environment check',
    environment: env
  });
}
