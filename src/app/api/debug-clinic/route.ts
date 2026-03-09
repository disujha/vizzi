/**
 * Debug API to check clinic data in AppSync
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/api';
import { configureAmplify } from '@/lib/amplify';

configureAmplify();
const client = generateClient();

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
      clinicLogoUri
      doctorPhotoUri
    }
  }
`;

const LIST_CLINICS = /* GraphQL */ `
  query ListClinics($filter: ModelClinicFilterInput) {
    listClinics(filter: $filter) {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get('mobile');
    
    if (!mobile) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const clinicId = `clinic-${normalizedMobile}`;
    const phoneE164 = `+91${normalizedMobile}`;

    const results: any = {
      searchedFor: {
        mobile: normalizedMobile,
        clinicId,
        phoneE164
      },
      attempts: []
    };

    // Attempt 1: Direct ID lookup
    try {
      const res1 = await client.graphql({
        query: GET_CLINIC,
        variables: { id: clinicId }
      }) as any;
      
      results.attempts.push({
        method: 'Direct ID lookup',
        id: clinicId,
        success: !!res1?.data?.getClinic,
        data: res1?.data?.getClinic || null
      });
    } catch (err: any) {
      results.attempts.push({
        method: 'Direct ID lookup',
        id: clinicId,
        success: false,
        error: err?.message || err?.toString() || 'Unknown error',
        errorDetails: {
          name: err?.name,
          errors: err?.errors,
          stack: err?.stack?.split('\n').slice(0, 3)
        }
      });
    }

    // Attempt 2: List by phone filter
    try {
      const res2 = await client.graphql({
        query: LIST_CLINICS,
        variables: { filter: { phone: { eq: phoneE164 } } }
      }) as any;
      
      const items = res2?.data?.listClinics?.items || [];
      results.attempts.push({
        method: 'List by phone filter',
        filter: { phone: phoneE164 },
        success: items.length > 0,
        count: items.length,
        data: items
      });
    } catch (err: any) {
      results.attempts.push({
        method: 'List by phone filter',
        filter: { phone: phoneE164 },
        success: false,
        error: err?.message || err?.toString() || 'Unknown error',
        errorDetails: {
          name: err?.name,
          errors: err?.errors
        }
      });
    }

    // Attempt 3: List all clinics (limited)
    try {
      const res3 = await client.graphql({
        query: LIST_CLINICS
      }) as any;
      
      const items = res3?.data?.listClinics?.items || [];
      results.attempts.push({
        method: 'List all clinics',
        success: true,
        count: items.length,
        data: items.slice(0, 5) // Only show first 5
      });
    } catch (err: any) {
      results.attempts.push({
        method: 'List all clinics',
        success: false,
        error: err?.message || err?.toString() || 'Unknown error',
        errorDetails: {
          name: err?.name,
          errors: err?.errors
        }
      });
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Debug clinic API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
