/**
 * API Route for Cognito Custom Authentication
 * Handles OTP initiation and verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { cognitoAuth, CognitoAuthError } from '@/lib/cognitoAuthSdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mobile, otp, session } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // CRITICAL: Use phone number format for Cognito (+91XXXXXXXXXX)
    // The login page sends normalizedMobile (10 digits), so we format it
    const username = `+91${mobile}`; // Format as +91XXXXXXXXXX for Cognito

    switch (action) {
      case 'initiateAuth':
        if (!mobile) {
          return NextResponse.json(
            { error: 'Mobile number is required' },
            { status: 400 }
          );
        }

        const initiateResponse = await cognitoAuth.initiateAuth(username);
        
        // Extract userExists from Lambda response if available
        const userExists = initiateResponse.ChallengeParameters?.userExists || false;
        
        return NextResponse.json({
          type: 'success',
          message: 'OTP sent to your mobile number',
          session: initiateResponse.Session,
          challengeName: initiateResponse.ChallengeName,
          username: username, // Return username for consistency in next step
          userExists: userExists // Pass through user existence flag
        });

      case 'verifyOtp':
        if (!mobile || !otp || !session) {
          return NextResponse.json(
            { error: 'Mobile, OTP, and session are required' },
            { status: 400 }
          );
        }

        const verifyResponse = await cognitoAuth.respondToCustomChallenge(
          username, // Use exact same username format
          otp,
          session
        );

        if (verifyResponse.AuthenticationResult) {
          return NextResponse.json({
            type: 'success',
            message: 'Authentication successful',
            tokens: verifyResponse.AuthenticationResult,
          });
        } else {
          return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 400 }
          );
        }

      case 'fullAuth':
        if (!mobile) {
          return NextResponse.json(
            { error: 'Mobile number is required' },
            { status: 400 }
          );
        }

        const authResponse = await cognitoAuth.authenticateWithOtp(username, otp);
        return NextResponse.json(authResponse);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth API error:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'CognitoAuthError') {
      const cognitoError = error as CognitoAuthError;
      return NextResponse.json(
        { 
          error: cognitoError.message,
          code: cognitoError.code,
          type: 'error'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        type: 'error'
      },
      { status: 500 }
    );
  }
}
