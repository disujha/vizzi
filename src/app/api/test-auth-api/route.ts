/**
 * Test Auth API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { cognitoAuth } from '@/lib/cognitoAuthSdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mobile, otp, session } = body;

    console.log('Test Auth API Request:', { action, mobile, otp, session: session ? 'present' : 'missing' });

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const username = mobile; // Use exactly what the frontend sends

    switch (action) {
      case 'initiateAuth':
        if (!mobile) {
          return NextResponse.json(
            { error: 'Mobile number is required' },
            { status: 400 }
          );
        }

        console.log('Calling cognitoAuth.initiateAuth with username:', username);
        const initiateResponse = await cognitoAuth.initiateAuth(username);
        
        console.log('InitiateAuth Response:', {
          ChallengeName: initiateResponse.ChallengeName,
          Session: initiateResponse.Session ? 'present' : 'missing',
          ChallengeParameters: initiateResponse.ChallengeParameters
        });
        
        return NextResponse.json({
          type: 'success',
          message: 'OTP sent to your mobile number',
          session: initiateResponse.Session,
          challengeName: initiateResponse.ChallengeName,
          username: username,
          challengeParameters: initiateResponse.ChallengeParameters
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Test Auth API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        type: 'error',
        details: error
      },
      { status: 500 }
    );
  }
}
