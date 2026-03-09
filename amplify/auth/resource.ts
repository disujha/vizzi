import { defineAuth } from '@aws-amplify/backend';

// Auth resource configured for phone number authentication
export const auth = defineAuth({
  loginWith: {
    phone: true,
  },
});
