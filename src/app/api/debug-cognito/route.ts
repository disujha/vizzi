/**
 * Comprehensive Cognito Debug Endpoint
 * Tests SECRET_HASH calculation and authentication flow step by step
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, clientId, clientSecret, testMode } = body;

    if (!username || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'username, clientId, and clientSecret are required' },
        { status: 400 }
      );
    }

    // Step 1: Test SECRET_HASH calculation
    const message = username + clientId;
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(message);
    const secretHash = hmac.digest('base64');

    const debugInfo: any = {
      step1: {
        username,
        clientId,
        message,
        secretHash,
        hashLength: secretHash.length,
        clientSecretLength: clientSecret.length
      }
    };

    if (testMode === 'hashOnly') {
      return NextResponse.json({
        type: 'success',
        debugInfo
      });
    }

    // Step 2: Test actual Cognito call
    try {
      const client = new CognitoIdentityProviderClient({
        region: 'us-east-1'
      });

      const params = {
        AuthFlow: 'CUSTOM_AUTH' as const,
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          SECRET_HASH: secretHash
        }
      };

      debugInfo.step2 = {
        params,
        region: 'us-east-1'
      };

      const command = new InitiateAuthCommand(params);
      const response = await client.send(command);

      debugInfo.step2 = {
        ...debugInfo.step2,
        response: {
          ChallengeName: response.ChallengeName,
          Session: response.Session,
          ChallengeParameters: response.ChallengeParameters,
          hasAuthenticationResult: !!response.AuthenticationResult
        }
      };

      return NextResponse.json({
        type: 'success',
        message: 'Cognito call successful',
        debugInfo,
        cognitoResponse: response
      });

    } catch (cognitoError: any) {
      debugInfo.step2 = {
        ...debugInfo.step2,
        error: {
          name: cognitoError.name,
          message: cognitoError.message,
          code: cognitoError.__type
        }
      };

      return NextResponse.json({
        type: 'error',
        message: 'Cognito call failed',
        debugInfo,
        cognitoError: {
          name: cognitoError.name,
          message: cognitoError.message,
          code: cognitoError.__type
        }
      });
    }

  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        type: 'error'
      },
      { status: 500 }
    );
  }
}
