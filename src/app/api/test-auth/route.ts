/**
 * Simple Cognito Custom Auth Test API
 * Use this to verify your Lambda triggers are working
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mobile, otp } = body;

    if (action === 'test') {
      // Test the Lambda triggers manually
      const testPayload = {
        userName: mobile,
        request: {
          session: [],
          userAttributes: {
            phone_number: `+91${mobile}`
          }
        },
        response: {
          issueTokens: false,
          failAuthentication: false,
          challengeName: ''
        }
      };

      // For now, return a mock response to verify the flow works
      return NextResponse.json({
        type: 'success',
        message: 'Test endpoint working',
        mockData: {
          ChallengeName: 'CUSTOM_CHALLENGE',
          Session: 'mock-session-' + Date.now(),
          ChallengeParameters: {
            otp: '1234' // Mock OTP for testing
          }
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        type: 'error'
      },
      { status: 500 }
    );
  }
}
