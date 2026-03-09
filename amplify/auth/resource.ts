import { defineAuth } from '@aws-amplify/backend';

// Basic auth resource. Adjust login methods as needed.
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
