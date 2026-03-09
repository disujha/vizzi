import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

// Amplify Gen 2 backend entrypoint
export default defineBackend({
  auth,
  data,
});
