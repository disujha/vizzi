/**
 * API Route for User Signup
 * Creates user in Cognito before OTP flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.AWS_USER_POOL_ID || 'ap-south-1_0byWYlztF';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile } = body;

    if (!mobile) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    // Format phone number for Cognito: +91XXXXXXXXXX
    const phoneNumber = `+91${mobile}`;

    // Create user in Cognito with phone number as username
    // Use a temporary password that will be replaced by OTP flow
    const tempPassword = `Temp${Math.random().toString(36).slice(2)}!1A`;

    try {
      // Create user with phone number as username
      await cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: phoneNumber, // Use +91XXXXXXXXXX format
        MessageAction: 'SUPPRESS', // Don't send welcome email
        TemporaryPassword: tempPassword,
        UserAttributes: [
          {
            Name: 'phone_number',
            Value: phoneNumber
          },
          {
            Name: 'phone_number_verified',
            Value: 'true'
          }
        ]
      }));

      // Set permanent password to allow custom auth
      await cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: phoneNumber,
        Password: tempPassword,
        Permanent: true
      }));

      return NextResponse.json({
        type: 'success',
        message: 'User created successfully',
        username: phoneNumber
      });

    } catch (error: any) {
      // If user already exists, that's okay
      if (error.name === 'UsernameExistsException') {
        return NextResponse.json({
          type: 'success',
          message: 'User already exists',
          username: phoneNumber
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create user',
        type: 'error'
      },
      { status: 500 }
    );
  }
}
