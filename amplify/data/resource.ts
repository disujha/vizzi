import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  ClinicStatus: a.enum(['OPEN', 'EMERGENCY_ONLY', 'CLOSED']),
  DoctorStatus: a.enum(['AVAILABLE', 'ON_BREAK', 'BUSY', 'OFFLINE']),

  Clinic: a
    .model({
      name: a.string(),
      clinicName: a.string(),
      doctorName: a.string(),
      clinicType: a.string(),
      email: a.string(),
      phone: a.string(),
      status: a.ref('ClinicStatus'),
      clinicLogoUri: a.string(),
      logoUrl: a.string(),
      doctorPhotoUri: a.string(),
      voiceVolume: a.integer(),
      smsClinicName: a.string(),
      smsEnabled: a.boolean(),
      smsUsed: a.integer(),
      smsLimit: a.integer(),
      whatsappUsed: a.integer(),
      whatsappLimit: a.integer(),
      patientsUsed: a.integer(),
      patientsLimit: a.integer(),
      currentPlan: a.string(),
      planExpiryDate: a.datetime(),
      signupDate: a.datetime(),
      demoStartedAt: a.datetime(),
      tokenPrefix: a.string(),
      tokenDigits: a.integer(),
      startTime: a.string(),
      endTime: a.string(),
      breakStartTime: a.string(),
      breakEndTime: a.string(),
      voiceEnabled: a.boolean(),
      voiceLanguage: a.string(),
      voiceRate: a.float(),
      voicePitch: a.float(),
      voiceGender: a.string(),
      voiceName: a.string(),
      announcementTemplate: a.string(),
      checkInAnnouncementTemplate: a.string(),
      checkInEnabled: a.boolean(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['create', 'read', 'update']),
      allow.authenticated().to(['create', 'read', 'update']),
    ]),

  Doctor: a
    .model({
      clinicId: a.string().required(),
      name: a.string().required(),
      prefix: a.string().required(),
      active: a.boolean(),
      status: a.ref('DoctorStatus'),
      photoUrl: a.string(),
      activePatientId: a.string(),
      queuePosition: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),

  QueuePatient: a
    .model({
      clinicId: a.string().required(),
      name: a.string(),
      mobileNumber: a.string(),
      tokenNumber: a.string(),
      status: a.string(),
      timestamp: a.integer(),
      doctorId: a.string(),
      doctorName: a.string(),
      doctorPrefix: a.string(),
      isAppointment: a.boolean(),
      isEmergency: a.boolean(),
      appointmentDate: a.string(),
      appointmentTime: a.string(),
      lastCalledAt: a.integer(),
      cancelledAt: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['create', 'read', 'update', 'delete']),
      allow.authenticated().to(['create', 'read', 'update', 'delete']),
    ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
