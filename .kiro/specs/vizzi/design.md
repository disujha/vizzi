# Vizzi - Technical Design Document
## AI-Powered Reception Infrastructure System

---

## Document Information

**Version**: 2.0 (AWS Serverless Architecture)  
**Last Updated**: February 12, 2026  
**Status**: Final Design  
**Target Audience**: Hackathon Judges, Investors, Development Team

---

## 1. Executive Summary

Vizzi is an AI-powered reception infrastructure system that replaces manual patient intake workflows in small clinics across Tier 2 and Tier 3 cities in India.

**Core Components**:
1. **AI Reception Terminal**: Android tablet with voice-first interface
2. **AWS Serverless Backend**: Cloud intelligence layer for AI processing and data management
3. **Web Dashboard**: Real-time queue management and clinic operations
4. **Optional Add-ons**: Bluetooth thermal printer, SMS/WhatsApp notifications

**Architecture Philosophy**:
- **Serverless-First**: AWS Lambda for compute, eliminating server management
- **Cost-Optimized**: Pay-per-use model suitable for small clinic economics
- **Offline-First**: Terminal operates independently during connectivity issues
- **Voice-First**: Natural language interaction in Hindi and English
- **Infrastructure Positioning**: Physical AI terminal + SaaS, not just software

### 1.1 MVP Core Focus

**The Breakthrough**: AI-powered physical reception terminal + real-time queue intelligence

**What This Design Delivers**:
1. ✅ Voice-first patient check-in with Amazon Transcribe/Polly
2. ✅ Real-time queue state with DynamoDB + WebSocket
3. ✅ Predictive wait time using heuristic algorithm
4. ✅ Offline-first terminal with SQLite sync
5. ✅ Simple web dashboard for queue control
6. ✅ Optional Bluetooth thermal printer (ESC/POS)

**Design Simplifications for MVP**:
- Basic Lambda functions (not over-architected microservices)
- Simple RDS schema (no complex indexing strategies)
- Heuristic wait-time prediction (ML optional for future)
- Essential monitoring only (CloudWatch basics)
- Streamlined security (JWT + TLS, no complex audit trails)

**Why This Architecture?**
- Demonstrates AI + infrastructure positioning clearly
- Serverless = low operational overhead for startup
- Scalable to 1000+ clinics without redesign
- Cost-effective: ~$4-5/month per clinic

---

## 2. High-Level Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLINIC PREMISES                          │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │   AI Reception Terminal (Android Tablet)     │          │
│  │                                              │          │
│  │  - Voice capture (microphone)                │          │
│  │  - Real-time transcript display              │          │
│  │  - Touch input fallback                      │          │
│  │  - Queue status display                      │          │
│  │  - Local SQLite (offline mode)               │          │
│  │  - Bluetooth printer trigger (optional)      │          │
│  └──────────────────────────────────────────────┘          │
│                        │                                    │
│                        │ HTTPS / WebSocket                  │
│                        │                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │   Bluetooth Thermal Printer (Optional)       │          │
│  │   ESC/POS compatible                         │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Internet (3G/4G/WiFi)
                         │
┌─────────────────────────────────────────────────────────────┐
│                    AWS CLOUD (Mumbai Region)                │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │         Amazon API Gateway                   │          │
│  │  - REST API endpoints                        │          │
│  │  - WebSocket API (real-time queue)           │          │
│  │  - JWT authentication                        │          │
│  │  - Rate limiting                             │          │
│  └──────────────────────────────────────────────┘          │
│                        │                                    │
│  ┌─────────────────────┴────────────────────────┐          │
│  │                                               │          │
│  ▼                                               ▼          │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  AWS Lambda      │              │  AWS Lambda      │    │
│  │  Functions       │              │  Functions       │    │
│  │                  │              │                  │    │
│  │ - Patient API    │              │ - Queue API      │    │
│  │ - AI Processing  │              │ - Notification   │    │
│  │ - Auth           │              │ - Analytics      │    │
│  └──────────────────┘              └──────────────────┘    │
│           │                                  │              │
│           │                                  │              │
│  ┌────────┴──────────────────────────────────┴────────┐    │
│  │                                                     │    │
│  ▼                                                     ▼    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Amazon     │  │   Amazon     │  │   Amazon     │    │
│  │     RDS      │  │  DynamoDB    │  │      S3      │    │
│  │ (PostgreSQL) │  │ (Queue State)│  │ (Audio/Docs) │    │
│  │              │  │              │  │              │    │
│  │ - Patients   │  │ - Real-time  │  │ - Audio      │    │
│  │ - Clinics    │  │   queue      │  │   recordings │    │
│  │ - Users      │  │ - Tokens     │  │ - Reports    │    │
│  │ - Visits     │  │ - Wait times │  │ - Exports    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │           AI Services Layer                  │          │
│  │                                              │          │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐│          │
│  │  │  Amazon    │  │  Amazon    │  │ Amazon ││          │
│  │  │ Transcribe │  │   Polly    │  │Bedrock ││          │
│  │  │  (STT)     │  │   (TTS)    │  │ (NLU)  ││          │
│  │  └────────────┘  └────────────┘  └────────┘│          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │        Communication Services                │          │
│  │                                              │          │
│  │  ┌────────────┐  ┌────────────┐             │          │
│  │  │  Amazon    │  │  Amazon    │             │          │
│  │  │    SNS     │  │    SQS     │             │          │
│  │  │   (SMS)    │  │  (Jobs)    │             │          │
│  │  └────────────┘  └────────────┘             │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │      Monitoring & Security                   │          │
│  │                                              │          │
│  │  ┌────────────┐  ┌────────────┐             │          │
│  │  │  Amazon    │  │    AWS     │             │          │
│  │  │ CloudWatch │  │    IAM     │             │          │
│  │  │            │  │            │             │          │
│  │  └────────────┘  └────────────┘             │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         │
┌─────────────────────────────────────────────────────────────┐
│                  WEB DASHBOARD                              │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │   React Web App (Hosted on S3 + CloudFront) │          │
│  │                                              │          │
│  │  - Real-time queue management                │          │
│  │  - Patient records                           │          │
│  │  - Analytics dashboard                       │          │
│  │  - Settings & configuration                  │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Architecture Principles

**Serverless-First**:
- No server management or provisioning
- Auto-scaling based on demand
- Pay only for actual usage
- Reduced operational complexity

**Offline-First Terminal**:
- Local SQLite database for patient data
- Queue token generation works offline
- Background sync when connectivity restored
- Graceful degradation of AI features

**Real-Time Queue State**:
- DynamoDB for sub-second queue updates
- WebSocket for live dashboard updates
- Event-driven architecture

**Cost-Optimized**:
- Lambda execution only when needed
- DynamoDB on-demand pricing
- S3 lifecycle policies for audio cleanup
- RDS right-sized for small clinic workloads

---

## 3. Component Design

### 3.1 AI Reception Terminal (Android Application)


**Technology Stack**:
- React Native (cross-platform, future iOS support)
- TypeScript for type safety
- SQLite for local data persistence
- React Native Voice for audio capture
- WebSocket client for real-time updates
- Axios for HTTP API calls

**Architecture Pattern**: Offline-First with Background Sync

**Key Modules**:

#### 3.1.1 Voice Interaction Module

**Responsibilities**:
- Capture patient voice input via microphone
- Stream audio to AWS backend for transcription
- Display real-time transcript on screen
- Play TTS audio responses from AWS Polly
- Handle voice interaction state machine

**Implementation**:
```typescript
// Voice interaction flow
1. User taps "Start" button or voice activation
2. Record audio chunks (16kHz, mono, PCM)
3. Stream to Lambda via API Gateway
4. Lambda forwards to Amazon Transcribe (streaming)
5. Receive transcript chunks in real-time
6. Display on screen with confidence indicator
7. On completion, send to intent detection
8. Receive TTS audio URL from Polly
9. Play audio response
10. Continue conversation or complete check-in
```

**Offline Behavior**:
- Voice features disabled when offline
- Fallback to text input automatically
- Display "Voice unavailable - please type" message


#### 3.1.2 Patient Registration Module

**Responsibilities**:
- Collect patient information (name, age, gender, mobile, reason)
- Validate input fields
- Check for duplicate patients (phone number lookup)
- Store patient data locally and sync to cloud
- Generate queue token

**Data Model (Local SQLite)**:
```typescript
interface Patient {
  id: string;              // UUID
  clinicId: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mobile: string;          // 10-digit Indian format
  address?: string;
  reasonForVisit: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
}

interface Visit {
  id: string;
  patientId: string;
  clinicId: string;
  tokenNumber: number;
  checkInTime: Date;
  status: 'waiting' | 'called' | 'in-consultation' | 'completed' | 'cancelled';
  estimatedWaitTime: number; // minutes
  syncStatus: 'pending' | 'synced' | 'failed';
}
```

**Validation Rules**:
- Name: 2-100 characters, Unicode support
- Age: 1-120 years
- Mobile: Exactly 10 digits, starts with 6-9
- Reason: 5-500 characters


#### 3.1.3 Queue Display Module

**Responsibilities**:
- Display current queue status
- Show current token being served (large, prominent)
- Show next 3-5 tokens in queue
- Display estimated wait time
- Update in real-time via WebSocket
- Provide audio announcements

**UI Layout**:
```
┌─────────────────────────────────────┐
│  NOW SERVING                        │
│                                     │
│       TOKEN #42                     │
│       (Large, animated)             │
│                                     │
├─────────────────────────────────────┤
│  NEXT IN QUEUE                      │
│                                     │
│  #43  #44  #45  #46  #47           │
│                                     │
├─────────────────────────────────────┤
│  Total Waiting: 12                  │
│  Estimated Wait: 25 minutes         │
└─────────────────────────────────────┘
```

**WebSocket Integration**:
- Connect to API Gateway WebSocket endpoint
- Subscribe to clinic-specific queue channel
- Receive real-time queue updates
- Reconnect automatically on disconnect
- Fallback to polling if WebSocket fails


#### 3.1.4 Offline Sync Module

**Responsibilities**:
- Detect online/offline status
- Queue operations for background sync
- Sync data when connectivity restored
- Handle sync conflicts
- Retry failed syncs with exponential backoff

**Sync Strategy**:
```typescript
// Sync queue implementation
interface SyncOperation {
  id: string;
  type: 'create_patient' | 'create_visit' | 'update_patient';
  payload: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

// Sync algorithm
1. Monitor network connectivity
2. When online, process sync queue in order
3. For each operation:
   - Send to backend API
   - On success: mark completed, remove from queue
   - On failure: increment retry count, exponential backoff
   - Max 5 retries before marking permanently failed
4. Notify user of sync status
```

**Conflict Resolution**:
- Server timestamp wins for conflicts
- Local changes merged if no conflict
- User notified of conflicts requiring manual resolution


#### 3.1.5 Bluetooth Printer Module (Optional)

**Responsibilities**:
- Discover and pair with ESC/POS thermal printers
- Generate token slip content
- Send print commands via Bluetooth
- Handle printer errors gracefully

**Token Slip Format**:
```
================================
    [CLINIC LOGO/NAME]
================================

Token Number: #42

Patient: Rajesh Kumar
Date: 12 Feb 2026, 10:30 AM

Estimated Wait: 25 minutes

Please wait for your number
to be called.

================================
```

**Printer Integration**:
- Use React Native Bluetooth library
- Support standard ESC/POS commands
- Fallback: display token on screen if printer unavailable
- Configuration: printer MAC address stored in settings

---

### 3.2 AWS Backend Architecture

#### 3.2.1 API Gateway Configuration

**REST API Endpoints**:
```
POST   /auth/login              - User authentication
POST   /auth/refresh            - Refresh JWT token

POST   /patients                - Create patient
GET    /patients/:id            - Get patient details
PUT    /patients/:id            - Update patient
GET    /patients/search         - Search patients

POST   /visits                  - Create visit (check-in)
GET    /visits/:id              - Get visit details
PUT    /visits/:id/status       - Update visit status
GET    /visits/clinic/:id       - Get clinic visits

POST   /queue/call-next         - Call next patient
PUT    /queue/:tokenId/status   - Update token status
GET    /queue/clinic/:id        - Get current queue

POST   /ai/transcribe           - Stream audio for transcription
POST   /ai/intent               - Detect intent from text
GET    /ai/tts                  - Generate TTS audio

GET    /analytics/daily         - Daily metrics
GET    /analytics/reports       - Generate reports
```


**WebSocket API**:
```
wss://api.vizzi.health/queue

// Connection
CONNECT with JWT token in query string

// Subscribe to clinic queue
SEND: { action: "subscribe", clinicId: "clinic-123" }

// Receive queue updates
RECEIVE: {
  type: "queue_update",
  data: {
    currentToken: 42,
    nextTokens: [43, 44, 45],
    totalWaiting: 12,
    estimatedWait: 25
  }
}

// Heartbeat
SEND: { action: "ping" }
RECEIVE: { type: "pong" }
```

**Security**:
- JWT authentication for all endpoints
- API keys for terminal devices
- Rate limiting: 100 requests/minute per IP
- CORS enabled for web dashboard domain
- TLS 1.3 encryption

**Throttling**:
- Burst: 200 requests
- Steady state: 100 requests/second
- Per-user quotas for fair usage


#### 3.2.2 Lambda Functions

**Function Organization**: One function per domain

**1. Auth Lambda** (`auth-handler`)
- Runtime: Node.js 20.x
- Memory: 256 MB
- Timeout: 10 seconds
- Responsibilities:
  - User login with email/password
  - JWT token generation and validation
  - Password hashing (bcrypt)
  - Token refresh
- Environment Variables:
  - JWT_SECRET
  - JWT_EXPIRY (30 minutes)
  - REFRESH_TOKEN_EXPIRY (7 days)

**2. Patient Lambda** (`patient-handler`)
- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 15 seconds
- Responsibilities:
  - CRUD operations for patients
  - Duplicate detection (phone number)
  - Patient search (fuzzy matching)
  - Data validation
- Database: RDS PostgreSQL connection via VPC

**3. Queue Lambda** (`queue-handler`)
- Runtime: Node.js 20.x
- Memory: 512 MB
- Timeout: 10 seconds
- Responsibilities:
  - Queue state management
  - Token generation
  - Call next patient
  - Update token status
  - Wait time calculation
- Database: DynamoDB for real-time state


**4. AI Processing Lambda** (`ai-handler`)
- Runtime: Python 3.11
- Memory: 1024 MB
- Timeout: 30 seconds
- Responsibilities:
  - Orchestrate Amazon Transcribe for STT
  - Orchestrate Amazon Polly for TTS
  - Intent detection via Bedrock/Comprehend
  - Entity extraction
  - Audio file management (S3)
- IAM Permissions:
  - transcribe:StartStreamTranscription
  - polly:SynthesizeSpeech
  - bedrock:InvokeModel
  - s3:PutObject, s3:GetObject

**5. Notification Lambda** (`notification-handler`)
- Runtime: Node.js 20.x
- Memory: 256 MB
- Timeout: 15 seconds
- Responsibilities:
  - Send SMS via Amazon SNS
  - Send WhatsApp messages (via Business API)
  - Queue notifications via SQS
  - Handle delivery failures
- Triggered by: SQS queue (async processing)

**6. Analytics Lambda** (`analytics-handler`)
- Runtime: Python 3.11
- Memory: 512 MB
- Timeout: 30 seconds
- Responsibilities:
  - Calculate daily metrics
  - Generate reports
  - Aggregate statistics
  - Export data to S3
- Scheduled: CloudWatch Events (daily at midnight)


**7. WebSocket Lambda** (`websocket-handler`)
- Runtime: Node.js 20.x
- Memory: 256 MB
- Timeout: 10 seconds
- Responsibilities:
  - Handle WebSocket connections
  - Manage subscriptions
  - Broadcast queue updates
  - Connection lifecycle management
- Routes:
  - $connect: Authenticate and store connection
  - $disconnect: Clean up connection
  - subscribe: Subscribe to clinic queue
  - ping: Heartbeat

**Lambda Best Practices**:
- Use Lambda Layers for shared dependencies
- Enable X-Ray tracing for debugging
- Set reserved concurrency for critical functions
- Use environment variables for configuration
- Implement proper error handling and logging
- Use VPC only when necessary (RDS access)

---

#### 3.2.3 Database Design

**Amazon RDS (PostgreSQL 15)**

**Configuration**:
- Instance: db.t4g.micro (2 vCPU, 1 GB RAM) - for MVP
- Storage: 20 GB SSD (auto-scaling enabled)
- Multi-AZ: No (for cost optimization in MVP)
- Backup: Automated daily backups, 7-day retention
- Encryption: At-rest encryption enabled


**Schema Design**:

```sql
-- Clinics table
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(15),
  email VARCHAR(100),
  logo_url TEXT,
  working_hours JSONB, -- { "monday": { "start": "09:00", "end": "18:00" }, ... }
  settings JSONB, -- Terminal config, languages, etc.
  subscription_status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (doctors, staff, admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'admin', 'doctor', 'staff', 'viewer'
  phone VARCHAR(15),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_clinic ON users(clinic_id);
```


```sql
-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  age INTEGER CHECK (age > 0 AND age <= 120),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  mobile VARCHAR(10) NOT NULL,
  address TEXT,
  medical_history TEXT,
  allergies TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, mobile) -- Prevent duplicates per clinic
);

CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_mobile ON patients(clinic_id, mobile);
CREATE INDEX idx_patients_name ON patients(clinic_id, name);

-- Visits table
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  token_number INTEGER NOT NULL,
  check_in_time TIMESTAMP DEFAULT NOW(),
  called_time TIMESTAMP,
  consultation_start_time TIMESTAMP,
  consultation_end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'called', 'in-consultation', 'completed', 'cancelled'
  reason_for_visit TEXT NOT NULL,
  notes TEXT,
  estimated_wait_time INTEGER, -- minutes
  actual_wait_time INTEGER, -- calculated
  created_by VARCHAR(50) DEFAULT 'terminal', -- 'terminal', 'staff', 'api'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visits_clinic_date ON visits(clinic_id, check_in_time);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_status ON visits(clinic_id, status);
```


```sql
-- Appointments table (optional feature)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  appointment_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appointments_clinic_time ON appointments(clinic_id, appointment_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'patient', 'visit', 'user', etc.
  entity_id UUID,
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_clinic_time ON audit_logs(clinic_id, created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```


**Amazon DynamoDB (Queue State)**

**Purpose**: Real-time queue state management with sub-second latency

**Table: `queue_tokens`**

```typescript
// Partition key: clinicId
// Sort key: tokenNumber

interface QueueToken {
  clinicId: string;           // Partition key
  tokenNumber: number;        // Sort key
  visitId: string;            // Reference to visits table
  patientName: string;
  status: 'waiting' | 'called' | 'in-consultation' | 'completed' | 'cancelled';
  checkInTime: number;        // Unix timestamp
  estimatedWaitTime: number;  // minutes
  priority: number;           // 0 = normal, 1 = high (emergency)
  ttl: number;                // Auto-delete after 24 hours
}

// Global Secondary Index: status-checkInTime-index
// Partition key: clinicId#status (composite)
// Sort key: checkInTime
// Purpose: Query all waiting/called tokens efficiently
```

**DynamoDB Configuration**:
- Billing mode: On-demand (pay per request)
- Point-in-time recovery: Enabled
- Encryption: AWS managed keys
- TTL: Enabled on `ttl` attribute (auto-cleanup)
- Streams: Enabled (trigger WebSocket broadcasts)

**Why DynamoDB for Queue?**
- Sub-second read/write latency
- Automatic scaling
- No connection pooling issues
- DynamoDB Streams for real-time events
- Cost-effective for small workloads


**Amazon S3 (Storage)**

**Buckets**:

1. **`vizzi-audio-{env}`** (Audio recordings)
   - Purpose: Store patient voice recordings (optional, for debugging)
   - Lifecycle: Delete after 7 days
   - Encryption: SSE-S3
   - Access: Private, pre-signed URLs for Lambda

2. **`vizzi-reports-{env}`** (Reports and exports)
   - Purpose: Store generated PDF reports
   - Lifecycle: Delete after 90 days
   - Encryption: SSE-S3
   - Access: Private, pre-signed URLs for download

3. **`vizzi-assets-{env}`** (Clinic assets)
   - Purpose: Store clinic logos, images
   - Lifecycle: No expiration
   - Encryption: SSE-S3
   - Access: Public read via CloudFront

**S3 Best Practices**:
- Use S3 Intelligent-Tiering for cost optimization
- Enable versioning for critical data
- Use S3 Transfer Acceleration for faster uploads
- Implement bucket policies for least-privilege access

---

#### 3.2.4 AI Services Integration

**Amazon Transcribe (Speech-to-Text)**

**Configuration**:
- API: StartStreamTranscription (real-time streaming)
- Language: hi-IN (Hindi), en-IN (Indian English)
- Sample rate: 16 kHz
- Audio format: PCM
- Vocabulary filtering: Enabled (medical terms)


**Implementation Flow**:
```python
# Lambda function handling transcription
import boto3
import asyncio

transcribe = boto3.client('transcribe-streaming')

async def transcribe_audio_stream(audio_stream, language_code):
    """
    Stream audio to Amazon Transcribe and return transcript
    """
    response = await transcribe.start_stream_transcription(
        LanguageCode=language_code,  # 'hi-IN' or 'en-IN'
        MediaSampleRateHertz=16000,
        MediaEncoding='pcm',
        AudioStream=audio_stream
    )
    
    # Process transcript events
    async for event in response['TranscriptResultStream']:
        if 'TranscriptEvent' in event:
            results = event['TranscriptEvent']['Transcript']['Results']
            for result in results:
                if not result['IsPartial']:
                    # Final transcript
                    transcript = result['Alternatives'][0]['Transcript']
                    confidence = result['Alternatives'][0]['Confidence']
                    return {
                        'transcript': transcript,
                        'confidence': confidence
                    }
```

**Cost Optimization**:
- Use streaming API (pay per second of audio)
- Implement silence detection to stop streaming
- Cache common phrases/responses
- Estimated cost: $0.024 per minute of audio


**Amazon Polly (Text-to-Speech)**

**Configuration**:
- Voice: Aditi (Hindi, female), Raveena (Indian English, female)
- Engine: Neural (higher quality)
- Output format: MP3 (compressed for bandwidth)
- Speech rate: Medium (adjustable in settings)

**Implementation**:
```python
import boto3

polly = boto3.client('polly')

def generate_speech(text, language_code):
    """
    Generate speech audio from text using Amazon Polly
    """
    voice_id = 'Aditi' if language_code == 'hi-IN' else 'Raveena'
    
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat='mp3',
        VoiceId=voice_id,
        Engine='neural',
        LanguageCode=language_code
    )
    
    # Upload audio to S3
    audio_stream = response['AudioStream'].read()
    s3_key = f"tts/{uuid.uuid4()}.mp3"
    s3.put_object(
        Bucket='vizzi-audio-prod',
        Key=s3_key,
        Body=audio_stream,
        ContentType='audio/mpeg'
    )
    
    # Generate pre-signed URL (expires in 5 minutes)
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'vizzi-audio-prod', 'Key': s3_key},
        ExpiresIn=300
    )
    
    return url
```

**Cost Optimization**:
- Cache common responses (welcome message, instructions)
- Use standard engine for non-critical audio
- Estimated cost: $16 per 1 million characters


**Amazon Bedrock / Comprehend (Intent Detection)**

**Option 1: Amazon Bedrock (Claude 3 Haiku)**

**Use Case**: Advanced intent detection and entity extraction

```python
import boto3
import json

bedrock = boto3.client('bedrock-runtime')

def detect_intent(transcript, language):
    """
    Detect patient intent using Claude 3 Haiku via Bedrock
    """
    prompt = f"""
You are an AI assistant for a clinic reception system. Analyze the patient's statement and extract:
1. Intent (new_visit, follow_up, appointment, emergency, query)
2. Reason for visit
3. Any mentioned symptoms
4. Urgency level (low, medium, high)

Patient statement: "{transcript}"
Language: {language}

Respond in JSON format only.
"""
    
    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 200,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )
    
    result = json.loads(response['body'].read())
    return json.loads(result['content'][0]['text'])
```

**Option 2: Amazon Comprehend (Simpler, cheaper)**

```python
comprehend = boto3.client('comprehend')

def detect_intent_simple(transcript):
    """
    Simple intent detection using Comprehend
    """
    # Detect entities
    entities = comprehend.detect_entities(
        Text=transcript,
        LanguageCode='hi'  # or 'en'
    )
    
    # Rule-based intent classification
    intent = classify_intent(transcript, entities)
    return intent
```

**Recommendation**: Start with Comprehend for MVP, upgrade to Bedrock if needed


---

### 3.3 Voice Processing Pipeline

**End-to-End Flow**:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Audio Capture (Terminal)                           │
│                                                             │
│ - User speaks into microphone                              │
│ - Record audio chunks (16kHz, mono, PCM)                   │
│ - Buffer 500ms chunks                                      │
│ - Detect silence (stop recording after 2s silence)         │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Audio Streaming (Terminal → Lambda)                │
│                                                             │
│ - Stream audio chunks via WebSocket or HTTP POST           │
│ - Base64 encode audio data                                 │
│ - Include metadata (language, clinic ID)                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Speech-to-Text (Lambda → Transcribe)               │
│                                                             │
│ - Lambda receives audio stream                             │
│ - Forward to Amazon Transcribe streaming API               │
│ - Receive real-time transcript chunks                      │
│ - Send partial transcripts back to terminal (live display) │
│ - Wait for final transcript with confidence score          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Confidence Check (Lambda)                          │
│                                                             │
│ - If confidence >= 70%: Proceed to intent detection        │
│ - If confidence < 70%: Request repeat                      │
│   - Generate TTS: "I didn't catch that. Please repeat."    │
│   - Return to Step 1 (max 2 retries)                       │
│ - If 2 retries failed: Offer text input fallback           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Intent Detection (Lambda → Bedrock/Comprehend)     │
│                                                             │
│ - Send transcript to intent detection service              │
│ - Extract: intent, entities, urgency                       │
│ - Determine next question or action                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Response Generation (Lambda → Polly)               │
│                                                             │
│ - Generate appropriate response text                       │
│ - Convert to speech using Amazon Polly                     │
│ - Upload audio to S3                                       │
│ - Return pre-signed URL to terminal                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Audio Playback (Terminal)                          │
│                                                             │
│ - Download audio from S3 URL                               │
│ - Play audio response                                      │
│ - Display transcript on screen                             │
│ - Wait for next user input                                 │
└─────────────────────────────────────────────────────────────┘
```


**Conversation State Machine**:

```typescript
enum ConversationState {
  WELCOME = 'welcome',
  ASK_NAME = 'ask_name',
  ASK_PATIENT_TYPE = 'ask_patient_type',
  ASK_MOBILE = 'ask_mobile',
  ASK_AGE = 'ask_age',
  ASK_GENDER = 'ask_gender',
  ASK_REASON = 'ask_reason',
  CONFIRM = 'confirm',
  COMPLETE = 'complete'
}

interface ConversationContext {
  state: ConversationState;
  clinicId: string;
  language: 'hi-IN' | 'en-IN';
  collectedData: {
    name?: string;
    patientType?: 'new' | 'returning';
    mobile?: string;
    age?: number;
    gender?: string;
    reason?: string;
  };
  retryCount: number;
}

// State transitions
const stateTransitions = {
  [ConversationState.WELCOME]: ConversationState.ASK_NAME,
  [ConversationState.ASK_NAME]: ConversationState.ASK_PATIENT_TYPE,
  [ConversationState.ASK_PATIENT_TYPE]: ConversationState.ASK_MOBILE,
  [ConversationState.ASK_MOBILE]: ConversationState.ASK_AGE,
  [ConversationState.ASK_AGE]: ConversationState.ASK_GENDER,
  [ConversationState.ASK_GENDER]: ConversationState.ASK_REASON,
  [ConversationState.ASK_REASON]: ConversationState.CONFIRM,
  [ConversationState.CONFIRM]: ConversationState.COMPLETE
};
```

**Error Handling**:
- Network timeout: Retry with exponential backoff (3 attempts)
- Transcribe API error: Fallback to text input
- Polly API error: Display text response only
- Low confidence: Request repeat (max 2 times)
- Unrecognized intent: Ask clarifying question


---

### 3.4 Queue Management System

**Queue State Management with DynamoDB**

**Design Goals**:
- Sub-second latency for queue updates
- Real-time synchronization across terminal and dashboard
- Support for multiple concurrent operations
- Automatic cleanup of old tokens

**Queue Operations**:

**1. Add Patient to Queue** (Check-in)
```typescript
async function addToQueue(clinicId: string, visitId: string, patientName: string) {
  // Get next token number
  const tokenNumber = await getNextTokenNumber(clinicId);
  
  // Calculate estimated wait time
  const waitingCount = await getWaitingCount(clinicId);
  const avgConsultationTime = await getAvgConsultationTime(clinicId);
  const estimatedWait = waitingCount * avgConsultationTime;
  
  // Create queue token in DynamoDB
  await dynamodb.putItem({
    TableName: 'queue_tokens',
    Item: {
      clinicId: clinicId,
      tokenNumber: tokenNumber,
      visitId: visitId,
      patientName: patientName,
      status: 'waiting',
      checkInTime: Date.now(),
      estimatedWaitTime: estimatedWait,
      priority: 0,
      ttl: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    }
  });
  
  // Broadcast update via WebSocket
  await broadcastQueueUpdate(clinicId);
  
  return tokenNumber;
}
```


**2. Call Next Patient**
```typescript
async function callNextPatient(clinicId: string) {
  // Query waiting tokens, sorted by priority (desc) then checkInTime (asc)
  const waitingTokens = await dynamodb.query({
    TableName: 'queue_tokens',
    IndexName: 'status-checkInTime-index',
    KeyConditionExpression: 'clinicId#status = :key',
    ExpressionAttributeValues: {
      ':key': `${clinicId}#waiting`
    },
    ScanIndexForward: true, // Ascending order
    Limit: 1
  });
  
  if (waitingTokens.Items.length === 0) {
    return null; // No patients waiting
  }
  
  const nextToken = waitingTokens.Items[0];
  
  // Update status to 'called'
  await dynamodb.updateItem({
    TableName: 'queue_tokens',
    Key: {
      clinicId: nextToken.clinicId,
      tokenNumber: nextToken.tokenNumber
    },
    UpdateExpression: 'SET #status = :called, calledTime = :now',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':called': 'called',
      ':now': Date.now()
    }
  });
  
  // Update visit record in RDS
  await updateVisitStatus(nextToken.visitId, 'called');
  
  // Broadcast update
  await broadcastQueueUpdate(clinicId);
  
  // Send notification (if enabled)
  await sendNotification(nextToken.visitId, 'your_turn');
  
  return nextToken;
}
```


**3. Update Token Status**
```typescript
async function updateTokenStatus(
  clinicId: string,
  tokenNumber: number,
  newStatus: 'waiting' | 'called' | 'in-consultation' | 'completed' | 'cancelled'
) {
  await dynamodb.updateItem({
    TableName: 'queue_tokens',
    Key: { clinicId, tokenNumber },
    UpdateExpression: 'SET #status = :status, updatedAt = :now',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':now': Date.now()
    }
  });
  
  // Update RDS visit record
  const token = await getToken(clinicId, tokenNumber);
  await updateVisitStatus(token.visitId, newStatus);
  
  // Broadcast update
  await broadcastQueueUpdate(clinicId);
}
```

**4. Get Current Queue State**
```typescript
async function getCurrentQueue(clinicId: string) {
  // Get all active tokens (not completed/cancelled)
  const tokens = await dynamodb.query({
    TableName: 'queue_tokens',
    KeyConditionExpression: 'clinicId = :clinicId',
    FilterExpression: '#status IN (:waiting, :called, :inConsultation)',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':clinicId': clinicId,
      ':waiting': 'waiting',
      ':called': 'called',
      ':inConsultation': 'in-consultation'
    }
  });
  
  // Sort by priority and check-in time
  const sortedTokens = tokens.Items.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.checkInTime - b.checkInTime;
  });
  
  return {
    currentToken: sortedTokens.find(t => t.status === 'called'),
    waitingTokens: sortedTokens.filter(t => t.status === 'waiting'),
    inConsultation: sortedTokens.filter(t => t.status === 'in-consultation'),
    totalWaiting: sortedTokens.filter(t => t.status === 'waiting').length
  };
}
```


**Wait Time Prediction Algorithm**:

```typescript
async function calculateWaitTime(clinicId: string, tokenNumber: number) {
  // Get tokens ahead in queue
  const tokensAhead = await getTokensAhead(clinicId, tokenNumber);
  
  // Get historical average consultation time
  const avgTime = await getAvgConsultationTime(clinicId);
  
  // Simple heuristic: tokens ahead × average time
  const estimatedWait = tokensAhead.length * avgTime;
  
  return Math.max(5, estimatedWait); // Minimum 5 minutes
}

async function getAvgConsultationTime(clinicId: string) {
  // Query last 50 completed visits from RDS
  const recentVisits = await db.query(`
    SELECT 
      EXTRACT(EPOCH FROM (consultation_end_time - consultation_start_time)) / 60 as duration
    FROM visits
    WHERE clinic_id = $1
      AND status = 'completed'
      AND consultation_start_time IS NOT NULL
      AND consultation_end_time IS NOT NULL
    ORDER BY consultation_end_time DESC
    LIMIT 50
  `, [clinicId]);
  
  if (recentVisits.length === 0) {
    return 15; // Default 15 minutes
  }
  
  const avgDuration = recentVisits.reduce((sum, v) => sum + v.duration, 0) / recentVisits.length;
  return Math.round(avgDuration);
}
```

**Future Enhancement**: ML-based prediction using Amazon SageMaker
- Features: time of day, day of week, reason for visit, patient history
- Model: XGBoost or Linear Regression
- Training: Historical visit data
- Deployment: SageMaker endpoint invoked from Lambda


**Real-Time Broadcasting with WebSocket**:

```typescript
// DynamoDB Stream trigger Lambda
async function handleQueueUpdate(event: DynamoDBStreamEvent) {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const clinicId = record.dynamodb.NewImage.clinicId.S;
      
      // Get current queue state
      const queueState = await getCurrentQueue(clinicId);
      
      // Get all WebSocket connections for this clinic
      const connections = await getClinicConnections(clinicId);
      
      // Broadcast to all connected clients
      const apiGateway = new AWS.ApiGatewayManagementApi({
        endpoint: process.env.WEBSOCKET_ENDPOINT
      });
      
      const message = JSON.stringify({
        type: 'queue_update',
        data: queueState
      });
      
      await Promise.all(
        connections.map(async (connectionId) => {
          try {
            await apiGateway.postToConnection({
              ConnectionId: connectionId,
              Data: message
            }).promise();
          } catch (error) {
            if (error.statusCode === 410) {
              // Connection is stale, remove it
              await removeConnection(connectionId);
            }
          }
        })
      );
    }
  }
}
```

---

### 3.5 Web Dashboard

**Technology Stack**:
- React 18 with TypeScript
- Vite for build tooling
- TanStack Query (React Query) for data fetching
- Zustand for state management
- TailwindCSS for styling
- Recharts for analytics visualization
- Socket.io-client for WebSocket


**Hosting**:
- Static files: Amazon S3
- CDN: Amazon CloudFront
- SSL: AWS Certificate Manager
- Domain: Route 53

**Key Features**:

#### 3.5.1 Real-Time Queue Dashboard

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Clinic Name | User Menu | Notifications            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NOW SERVING                                        │   │
│  │                                                     │   │
│  │  Token #42 - Rajesh Kumar                          │   │
│  │  [Mark In Consultation] [Mark Completed]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WAITING QUEUE (12 patients)                       │   │
│  │                                                     │   │
│  │  #43  Priya Sharma      10:15 AM   Est: 10 min    │   │
│  │  #44  Amit Patel        10:18 AM   Est: 20 min    │   │
│  │  #45  Sunita Devi       10:22 AM   Est: 30 min    │   │
│  │  ...                                               │   │
│  │                                                     │   │
│  │  [Call Next Patient]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TODAY'S STATS                                      │   │
│  │  Total: 45  |  Completed: 33  |  Waiting: 12       │   │
│  │  Avg Wait: 18 min  |  Avg Consultation: 12 min     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```


**Real-Time Updates**:
```typescript
// WebSocket connection
import { io } from 'socket.io-client';

const socket = io(WEBSOCKET_URL, {
  auth: { token: jwtToken }
});

// Subscribe to clinic queue
socket.emit('subscribe', { clinicId });

// Listen for updates
socket.on('queue_update', (data) => {
  // Update React state
  setQueueState(data);
});

// Handle disconnection
socket.on('disconnect', () => {
  // Show offline indicator
  // Attempt reconnection
});
```

#### 3.5.2 Patient Management

**Features**:
- Search patients by name, mobile, ID
- View patient details and visit history
- Edit patient information
- Add manual check-ins (for walk-ins)

**Search Implementation**:
```typescript
// Fuzzy search using Fuse.js
import Fuse from 'fuse.js';

const searchPatients = async (query: string) => {
  const response = await api.get('/patients/search', {
    params: { q: query, limit: 20 }
  });
  
  return response.data;
};

// Backend: PostgreSQL full-text search
SELECT * FROM patients
WHERE clinic_id = $1
  AND (
    name ILIKE $2
    OR mobile LIKE $3
  )
ORDER BY created_at DESC
LIMIT 20;
```


#### 3.5.3 Analytics Dashboard

**Metrics Displayed**:
- Daily patient count (line chart)
- Average wait time trend (line chart)
- Peak hours heatmap
- Patient distribution by reason (pie chart)
- Consultation duration distribution (histogram)

**Data Fetching**:
```typescript
// React Query for data fetching
import { useQuery } from '@tanstack/react-query';

const useDailyMetrics = (clinicId: string, dateRange: DateRange) => {
  return useQuery({
    queryKey: ['analytics', 'daily', clinicId, dateRange],
    queryFn: () => api.get('/analytics/daily', {
      params: { clinicId, startDate: dateRange.start, endDate: dateRange.end }
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000 // Refresh every minute
  });
};
```

**Backend Analytics Lambda**:
```sql
-- Daily metrics query
SELECT 
  DATE(check_in_time) as date,
  COUNT(*) as total_patients,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  AVG(actual_wait_time) as avg_wait_time,
  AVG(EXTRACT(EPOCH FROM (consultation_end_time - consultation_start_time)) / 60) as avg_consultation_time
FROM visits
WHERE clinic_id = $1
  AND check_in_time >= $2
  AND check_in_time < $3
GROUP BY DATE(check_in_time)
ORDER BY date;
```


---

## 4. Security Architecture

### 4.1 Authentication and Authorization

**JWT-Based Authentication**:

```typescript
// Token structure
interface JWTPayload {
  userId: string;
  clinicId: string;
  role: 'admin' | 'doctor' | 'staff' | 'viewer';
  email: string;
  iat: number;  // Issued at
  exp: number;  // Expiration (30 minutes)
}

// Token generation (Auth Lambda)
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function login(email: string, password: string) {
  // Verify credentials
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }
  
  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      clinicId: user.clinic_id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
  
  // Generate refresh token
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken, user };
}
```


**API Gateway Authorizer**:

```typescript
// Lambda authorizer for API Gateway
export async function authorize(event: APIGatewayAuthorizerEvent) {
  const token = event.authorizationToken?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Unauthorized');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Generate IAM policy
    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }]
      },
      context: {
        userId: decoded.userId,
        clinicId: decoded.clinicId,
        role: decoded.role
      }
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
}
```

**Role-Based Access Control (RBAC)**:

```typescript
// Permission matrix
const permissions = {
  admin: ['*'], // All permissions
  doctor: [
    'queue:read',
    'queue:update',
    'patients:read',
    'patients:update',
    'analytics:read'
  ],
  staff: [
    'queue:read',
    'queue:update',
    'patients:read',
    'patients:create',
    'patients:update'
  ],
  viewer: [
    'queue:read',
    'patients:read',
    'analytics:read'
  ]
};

// Middleware to check permissions
function requirePermission(permission: string) {
  return (req, res, next) => {
    const userRole = req.context.role;
    const userPermissions = permissions[userRole];
    
    if (userPermissions.includes('*') || userPermissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
}
```


### 4.2 Data Security

**Encryption**:
- **In Transit**: TLS 1.3 for all API communication
- **At Rest**: 
  - RDS: AES-256 encryption enabled
  - DynamoDB: AWS managed encryption
  - S3: SSE-S3 encryption
  - Secrets: AWS Secrets Manager

**Data Sanitization**:
```typescript
// Input validation and sanitization
import validator from 'validator';
import xss from 'xss';

function sanitizePatientInput(input: any) {
  return {
    name: xss(validator.trim(input.name)),
    age: validator.toInt(input.age),
    gender: validator.isIn(input.gender, ['male', 'female', 'other']) ? input.gender : null,
    mobile: validator.isMobilePhone(input.mobile, 'en-IN') ? input.mobile : null,
    address: xss(validator.trim(input.address || '')),
    reasonForVisit: xss(validator.trim(input.reasonForVisit))
  };
}
```

**SQL Injection Prevention**:
- Use parameterized queries exclusively
- Never concatenate user input into SQL
- Use ORM (Prisma or TypeORM) for type safety

```typescript
// Safe query with parameters
const patient = await db.query(
  'SELECT * FROM patients WHERE clinic_id = $1 AND mobile = $2',
  [clinicId, mobile]
);

// NEVER do this:
// const patient = await db.query(`SELECT * FROM patients WHERE mobile = '${mobile}'`);
```


### 4.3 API Security

**Rate Limiting**:
```typescript
// API Gateway usage plan
{
  "throttle": {
    "burstLimit": 200,
    "rateLimit": 100  // requests per second
  },
  "quota": {
    "limit": 100000,  // requests per month
    "period": "MONTH"
  }
}

// Per-user rate limiting (Lambda)
import { RateLimiter } from 'limiter';

const limiters = new Map<string, RateLimiter>();

function getRateLimiter(userId: string) {
  if (!limiters.has(userId)) {
    limiters.set(userId, new RateLimiter({
      tokensPerInterval: 100,
      interval: 'minute'
    }));
  }
  return limiters.get(userId);
}
```

**CORS Configuration**:
```typescript
// API Gateway CORS
{
  "allowOrigins": [
    "https://dashboard.vizzi.health",
    "https://app.vizzi.health"
  ],
  "allowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowHeaders": [
    "Content-Type",
    "Authorization",
    "X-Requested-With"
  ],
  "maxAge": 3600
}
```

**Request Validation**:
```typescript
// API Gateway request validator
{
  "validateRequestBody": true,
  "validateRequestParameters": true
}

// JSON Schema for request validation
const createPatientSchema = {
  type: 'object',
  required: ['name', 'age', 'gender', 'mobile', 'reasonForVisit'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    age: { type: 'integer', minimum: 1, maximum: 120 },
    gender: { type: 'string', enum: ['male', 'female', 'other'] },
    mobile: { type: 'string', pattern: '^[6-9][0-9]{9}$' },
    reasonForVisit: { type: 'string', minLength: 5, maxLength: 500 }
  }
};
```


### 4.4 Compliance and Privacy

**Data Localization**:
- All AWS resources in `ap-south-1` (Mumbai) region
- Patient data never leaves India
- Compliant with Digital Personal Data Protection Act 2023

**Audit Logging**:
```typescript
// Log all sensitive operations
async function logAudit(
  clinicId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: any,
  ipAddress: string,
  userAgent: string
) {
  await db.query(`
    INSERT INTO audit_logs (
      clinic_id, user_id, action, entity_type, entity_id,
      changes, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [clinicId, userId, action, entityType, entityId, JSON.stringify(changes), ipAddress, userAgent]);
}

// Example usage
await logAudit(
  clinicId,
  userId,
  'update',
  'patient',
  patientId,
  { before: oldData, after: newData },
  req.ip,
  req.headers['user-agent']
);
```

**Data Retention**:
- Patient records: 7 years (medical record retention requirement)
- Audit logs: 3 years
- Audio recordings: 7 days (auto-delete via S3 lifecycle)
- Queue tokens: 24 hours (auto-delete via DynamoDB TTL)

**Right to Deletion**:
```typescript
// Anonymize patient data (GDPR-style)
async function anonymizePatient(patientId: string) {
  await db.query(`
    UPDATE patients
    SET 
      name = 'DELETED',
      mobile = '0000000000',
      address = NULL,
      medical_history = NULL,
      allergies = NULL
    WHERE id = $1
  `, [patientId]);
  
  // Keep visit records for analytics (anonymized)
  await db.query(`
    UPDATE visits
    SET notes = NULL
    WHERE patient_id = $1
  `, [patientId]);
}
```


---

## 5. Offline-First Kiosk Sync Strategy

### 5.1 Offline Capabilities

**What Works Offline**:
- Patient check-in (text input only)
- Queue token generation
- Queue display (last known state)
- Patient search (local database)
- Basic patient registration

**What Doesn't Work Offline**:
- Voice interaction (requires cloud AI)
- Real-time queue updates from dashboard
- SMS/WhatsApp notifications
- Analytics and reporting

### 5.2 Local Data Storage

**SQLite Schema** (Terminal):
```sql
-- Patients cache
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  mobile TEXT NOT NULL,
  address TEXT,
  reason_for_visit TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  sync_status TEXT DEFAULT 'pending' -- 'pending', 'synced', 'failed'
);

-- Visits cache
CREATE TABLE visits (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  clinic_id TEXT,
  token_number INTEGER,
  check_in_time INTEGER,
  status TEXT DEFAULT 'waiting',
  estimated_wait_time INTEGER,
  sync_status TEXT DEFAULT 'pending'
);

-- Sync queue
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  operation_type TEXT, -- 'create_patient', 'create_visit', 'update_patient'
  payload TEXT, -- JSON
  timestamp INTEGER,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);
```


### 5.3 Sync Algorithm

```typescript
// Background sync service
class SyncService {
  private isOnline: boolean = false;
  private syncInterval: NodeJS.Timer | null = null;
  
  constructor() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      if (this.isOnline) {
        this.startSync();
      } else {
        this.stopSync();
      }
    });
  }
  
  startSync() {
    if (this.syncInterval) return;
    
    // Sync immediately
    this.performSync();
    
    // Then sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000);
  }
  
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async performSync() {
    if (!this.isOnline) return;
    
    // Get pending operations
    const operations = await db.query(
      'SELECT * FROM sync_queue WHERE status = ? ORDER BY timestamp ASC',
      ['pending']
    );
    
    for (const op of operations) {
      try {
        await this.syncOperation(op);
        
        // Mark as synced
        await db.query(
          'UPDATE sync_queue SET status = ? WHERE id = ?',
          ['synced', op.id]
        );
        
        // Update entity sync status
        await this.updateEntitySyncStatus(op);
        
      } catch (error) {
        // Increment retry count
        const newRetryCount = op.retry_count + 1;
        
        if (newRetryCount >= 5) {
          // Max retries reached, mark as failed
          await db.query(
            'UPDATE sync_queue SET status = ?, error_message = ? WHERE id = ?',
            ['failed', error.message, op.id]
          );
        } else {
          // Retry with exponential backoff
          await db.query(
            'UPDATE sync_queue SET retry_count = ? WHERE id = ?',
            [newRetryCount, op.id]
          );
          
          // Wait before next retry
          await this.sleep(Math.pow(2, newRetryCount) * 1000);
        }
      }
    }
  }
  
  async syncOperation(op: SyncOperation) {
    const payload = JSON.parse(op.payload);
    
    switch (op.operation_type) {
      case 'create_patient':
        await api.post('/patients', payload);
        break;
      case 'create_visit':
        await api.post('/visits', payload);
        break;
      case 'update_patient':
        await api.put(`/patients/${payload.id}`, payload);
        break;
    }
  }
  
  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```


### 5.4 Conflict Resolution

**Conflict Scenarios**:
1. Patient created offline, then created online with same mobile
2. Visit status updated offline and online simultaneously
3. Token number collision (offline token conflicts with online token)

**Resolution Strategy**:

```typescript
// Server-side conflict detection
async function createPatient(data: PatientData, source: 'terminal' | 'dashboard') {
  // Check for existing patient with same mobile
  const existing = await db.query(
    'SELECT * FROM patients WHERE clinic_id = $1 AND mobile = $2',
    [data.clinicId, data.mobile]
  );
  
  if (existing) {
    if (source === 'terminal') {
      // Terminal sync: merge data, prefer newer
      if (data.updatedAt > existing.updated_at) {
        await db.query(
          'UPDATE patients SET name = $1, age = $2, updated_at = $3 WHERE id = $4',
          [data.name, data.age, data.updatedAt, existing.id]
        );
      }
      return existing.id; // Return existing ID
    } else {
      // Dashboard: reject duplicate
      throw new Error('Patient with this mobile already exists');
    }
  }
  
  // Create new patient
  return await db.query('INSERT INTO patients ...', [...]);
}

// Token number conflict resolution
async function generateTokenNumber(clinicId: string, isOffline: boolean) {
  if (isOffline) {
    // Offline: use negative numbers
    const lastOfflineToken = await getLastOfflineToken(clinicId);
    return lastOfflineToken - 1; // -1, -2, -3, ...
  } else {
    // Online: use positive numbers
    const lastOnlineToken = await getLastOnlineToken(clinicId);
    return lastOnlineToken + 1; // 1, 2, 3, ...
  }
}

// On sync, reassign offline tokens
async function reassignOfflineToken(visitId: string, oldToken: number) {
  const newToken = await generateTokenNumber(clinicId, false);
  
  await db.query(
    'UPDATE visits SET token_number = $1 WHERE id = $2',
    [newToken, visitId]
  );
  
  return newToken;
}
```


---

## 6. Scalability Design

### 6.1 Horizontal Scaling

**Serverless Auto-Scaling**:
- Lambda: Automatic scaling up to 1000 concurrent executions (default)
- API Gateway: Handles 10,000 requests/second per region
- DynamoDB: On-demand scaling, no capacity planning needed
- RDS: Read replicas for read-heavy workloads

**Scaling Targets**:
- **MVP**: 100 clinics, 5,000 patients/day
- **Year 1**: 1,000 clinics, 50,000 patients/day
- **Year 3**: 10,000 clinics, 500,000 patients/day

### 6.2 Database Scaling

**RDS Scaling Strategy**:

```typescript
// Phase 1 (0-500 clinics): Single RDS instance
// - db.t4g.micro (2 vCPU, 1 GB RAM)
// - 20 GB storage

// Phase 2 (500-2000 clinics): Vertical scaling
// - db.t4g.small (2 vCPU, 2 GB RAM)
// - 50 GB storage
// - Add read replica for analytics queries

// Phase 3 (2000+ clinics): Horizontal scaling
// - db.t4g.medium (2 vCPU, 4 GB RAM)
// - 100 GB storage
// - Multiple read replicas
// - Connection pooling via RDS Proxy
// - Consider Aurora PostgreSQL for better scaling
```

**Connection Pooling**:
```typescript
// Use RDS Proxy for connection pooling
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_PROXY_ENDPOINT,
  database: 'vizzi',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections per Lambda
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Reuse connections across Lambda invocations
let cachedPool: Pool | null = null;

export function getPool() {
  if (!cachedPool) {
    cachedPool = pool;
  }
  return cachedPool;
}
```


### 6.3 Caching Strategy

**Multi-Layer Caching**:

```typescript
// Layer 1: Lambda memory cache (in-process)
const memoryCache = new Map<string, any>();

// Layer 2: ElastiCache Redis (optional, for high scale)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_ENDPOINT);

// Caching wrapper
async function getCached<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  
  // Check Redis (if available)
  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      memoryCache.set(key, value);
      return value;
    }
  }
  
  // Fetch from source
  const value = await fetchFn();
  
  // Store in caches
  memoryCache.set(key, value);
  if (redis) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  return value;
}

// Usage
const clinicSettings = await getCached(
  `clinic:${clinicId}:settings`,
  3600, // 1 hour TTL
  () => db.query('SELECT * FROM clinics WHERE id = $1', [clinicId])
);
```

**Cache Invalidation**:
```typescript
// Invalidate on updates
async function updateClinicSettings(clinicId: string, settings: any) {
  await db.query('UPDATE clinics SET settings = $1 WHERE id = $2', [settings, clinicId]);
  
  // Invalidate cache
  memoryCache.delete(`clinic:${clinicId}:settings`);
  if (redis) {
    await redis.del(`clinic:${clinicId}:settings`);
  }
}
```


### 6.4 Performance Optimization

**Lambda Optimization**:
- Use Lambda Layers for shared dependencies (reduce package size)
- Enable Lambda SnapStart for Java/Node.js (faster cold starts)
- Set appropriate memory allocation (more memory = more CPU)
- Use ARM64 (Graviton2) for 20% better price-performance

**API Gateway Optimization**:
- Enable caching for GET endpoints (TTL: 5 minutes)
- Use HTTP API instead of REST API where possible (cheaper, faster)
- Implement request/response compression

**Database Optimization**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_visits_clinic_status_time ON visits(clinic_id, status, check_in_time);
CREATE INDEX idx_patients_clinic_mobile ON patients(clinic_id, mobile);
CREATE INDEX idx_queue_tokens_clinic_status ON queue_tokens(clinic_id, status);

-- Optimize queries
-- Bad: SELECT * FROM visits WHERE clinic_id = $1
-- Good: SELECT id, patient_id, token_number, status FROM visits WHERE clinic_id = $1 AND status = 'waiting'

-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN ANALYZE
SELECT * FROM visits
WHERE clinic_id = 'clinic-123'
  AND check_in_time >= NOW() - INTERVAL '1 day'
ORDER BY check_in_time DESC;
```

---

## 7. Cost Optimization Strategy

### 7.1 Cost Breakdown (Estimated Monthly)

**For 100 Clinics** (5,000 patients/day total):

```
AWS Lambda:
- Requests: 150,000/day × 30 = 4.5M requests/month
- Duration: Avg 500ms, 512MB memory
- Cost: ~$20/month

API Gateway:
- Requests: 4.5M/month
- WebSocket connections: 100 concurrent × 24h × 30d = 72,000 connection-minutes
- Cost: ~$15/month (HTTP API) or ~$30/month (REST API)

Amazon RDS (PostgreSQL):
- Instance: db.t4g.micro
- Storage: 20 GB
- Cost: ~$15/month

Amazon DynamoDB:
- On-demand pricing
- Reads: 1M/month, Writes: 500K/month
- Storage: 1 GB
- Cost: ~$5/month
```


```
Amazon S3:
- Storage: 10 GB (audio, reports)
- Requests: 100K/month
- Cost: ~$2/month

Amazon Transcribe:
- Audio: 5,000 patients × 2 min avg = 10,000 min/month
- Cost: 10,000 × $0.024 = $240/month

Amazon Polly:
- Characters: 5,000 patients × 500 chars avg = 2.5M chars/month
- Cost: 2.5M × $0.000016 = $40/month

Amazon SNS (SMS, optional):
- Messages: 5,000 × 2 = 10,000 SMS/month
- Cost: 10,000 × $0.00645 = $65/month

CloudWatch Logs:
- Ingestion: 5 GB/month
- Storage: 10 GB
- Cost: ~$5/month

Total Monthly Cost: ~$407/month (without SMS)
Total Monthly Cost: ~$472/month (with SMS)

Cost per clinic: ~$4-5/month
Revenue per clinic: ₹1,500-2,000/month (~$18-24)
Gross margin: ~75-80%
```

### 7.2 Cost Optimization Tactics

**1. Use HTTP API instead of REST API**
- 70% cheaper than REST API
- Sufficient for most use cases

**2. Optimize Lambda memory allocation**
- Right-size memory (512MB is sweet spot for most functions)
- More memory = faster execution = lower cost

**3. Use S3 Lifecycle Policies**
```typescript
// Auto-delete audio files after 7 days
{
  "Rules": [{
    "Id": "DeleteOldAudio",
    "Status": "Enabled",
    "Prefix": "audio/",
    "Expiration": {
      "Days": 7
    }
  }]
}
```


**4. Cache AI responses**
```typescript
// Cache common TTS responses
const commonResponses = {
  'hi-IN': {
    welcome: 's3://vizzi-audio/cache/hi-welcome.mp3',
    askName: 's3://vizzi-audio/cache/hi-ask-name.mp3',
    askAge: 's3://vizzi-audio/cache/hi-ask-age.mp3'
  },
  'en-IN': {
    welcome: 's3://vizzi-audio/cache/en-welcome.mp3',
    askName: 's3://vizzi-audio/cache/en-ask-name.mp3',
    askAge: 's3://vizzi-audio/cache/en-ask-age.mp3'
  }
};

// Avoid Polly calls for common phrases
function getTTSAudio(text: string, language: string) {
  const cacheKey = getCacheKey(text, language);
  if (commonResponses[language][cacheKey]) {
    return commonResponses[language][cacheKey];
  }
  return generatePollyAudio(text, language);
}
```

**5. Use DynamoDB TTL for auto-cleanup**
- No manual cleanup Lambda needed
- Automatic deletion of old queue tokens

**6. Optimize Transcribe usage**
- Implement silence detection to stop streaming early
- Use lower quality for non-critical audio (8kHz instead of 16kHz)

**7. Use Reserved Capacity for predictable workloads**
- RDS Reserved Instances: 40% savings
- Consider Savings Plans for Lambda at scale

**8. Implement request batching**
```typescript
// Batch DynamoDB writes
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

async function batchUpdateQueue(updates: QueueUpdate[]) {
  const batches = chunk(updates, 25); // DynamoDB limit
  
  await Promise.all(
    batches.map(batch =>
      dynamodb.send(new BatchWriteCommand({
        RequestItems: {
          'queue_tokens': batch.map(item => ({
            PutRequest: { Item: item }
          }))
        }
      }))
    )
  );
}
```


---

## 8. Monitoring and Observability

### 8.1 CloudWatch Metrics

**Custom Metrics**:
```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

async function recordMetric(metricName: string, value: number, unit: string) {
  await cloudwatch.putMetricData({
    Namespace: 'Vizzi/Production',
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: [
        { Name: 'Environment', Value: 'production' },
        { Name: 'Service', Value: 'queue-handler' }
      ]
    }]
  });
}

// Track key metrics
await recordMetric('CheckInDuration', duration, 'Milliseconds');
await recordMetric('QueueLength', queueLength, 'Count');
await recordMetric('TranscriptionConfidence', confidence, 'Percent');
await recordMetric('WaitTimeAccuracy', accuracy, 'Percent');
```

**Alarms**:
```typescript
// CloudWatch Alarms (via CDK/CloudFormation)
new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: lambda.metricErrors(),
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'Lambda error rate too high',
  actionsEnabled: true,
  alarmActions: [snsTopicArn]
});

new cloudwatch.Alarm(this, 'HighLatency', {
  metric: apiGateway.metricLatency(),
  threshold: 2000, // 2 seconds
  evaluationPeriods: 3,
  alarmDescription: 'API latency too high'
});
```


### 8.2 Distributed Tracing

**AWS X-Ray Integration**:
```typescript
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

// Instrument AWS SDK
const instrumentedAWS = AWSXRay.captureAWS(AWS);

// Instrument HTTP requests
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

// Custom subsegments
export async function processCheckIn(data: CheckInData) {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('ProcessCheckIn');
  
  try {
    subsegment.addAnnotation('clinicId', data.clinicId);
    subsegment.addMetadata('patientData', data);
    
    // Process check-in
    const result = await createVisit(data);
    
    subsegment.close();
    return result;
  } catch (error) {
    subsegment.addError(error);
    subsegment.close();
    throw error;
  }
}
```

### 8.3 Structured Logging

```typescript
// Structured logging with context
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'queue-handler',
    environment: process.env.ENVIRONMENT
  },
  transports: [
    new winston.transports.Console()
  ]
});

// Log with context
logger.info('Patient checked in', {
  clinicId: 'clinic-123',
  patientId: 'patient-456',
  tokenNumber: 42,
  duration: 1234,
  source: 'terminal'
});

// Log errors with stack traces
logger.error('Failed to create visit', {
  error: error.message,
  stack: error.stack,
  clinicId: 'clinic-123'
});
```


### 8.4 Health Checks and Status Page

**Health Check Endpoint**:
```typescript
// GET /health
export async function healthCheck() {
  const checks = {
    database: await checkDatabase(),
    dynamodb: await checkDynamoDB(),
    s3: await checkS3(),
    transcribe: await checkTranscribe(),
    polly: await checkPolly()
  };
  
  const allHealthy = Object.values(checks).every(c => c.healthy);
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  };
}

async function checkDatabase() {
  try {
    await db.query('SELECT 1');
    return { healthy: true, latency: 10 };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
```

**Status Page** (Optional):
- Use AWS Health Dashboard
- Or build custom status page with CloudWatch metrics
- Display: API uptime, database status, AI services status

---

## 9. Responsible AI

### 9.1 AI Safety Principles

**Clear Limitations**:
- System is NOT a medical AI
- Does NOT provide diagnoses or medical advice
- Does NOT replace doctor-patient consultation
- Is an administrative assistant only

**User Communication**:
```typescript
// Display disclaimer on terminal
const disclaimer = {
  'hi-IN': 'यह एक प्रशासनिक सहायक है, चिकित्सा सलाह नहीं देता।',
  'en-IN': 'This is an administrative assistant, not a medical advisor.'
};

// Voice announcement at start
const welcomeMessage = {
  'hi-IN': 'नमस्ते। मैं इस क्लिनिक की रिसेप्शन सहायक हूं। मैं आपकी जानकारी लेकर टोकन नंबर दूंगी।',
  'en-IN': 'Hello. I am the reception assistant. I will collect your information and provide a token number.'
};
```


### 9.2 Bias Mitigation

**Language Fairness**:
- Equal quality for Hindi and English
- No preference for English speakers
- Test with diverse accents and dialects

**Demographic Fairness**:
- No discrimination based on age, gender, or background
- Accessible to elderly and less-educated users
- Large fonts, clear audio, simple language

**Testing for Bias**:
```typescript
// Test transcription accuracy across demographics
const testCases = [
  { speaker: 'elderly-male-hindi', expectedAccuracy: 0.85 },
  { speaker: 'young-female-english', expectedAccuracy: 0.85 },
  { speaker: 'middle-aged-male-hinglish', expectedAccuracy: 0.80 }
];

for (const test of testCases) {
  const accuracy = await measureTranscriptionAccuracy(test.speaker);
  assert(accuracy >= test.expectedAccuracy, `Bias detected for ${test.speaker}`);
}
```

### 9.3 Privacy by Design

**Data Minimization**:
- Collect only necessary information
- No sensitive health data unless required
- Audio recordings deleted after 7 days

**Consent**:
```typescript
// Display consent message
const consentMessage = {
  'hi-IN': 'आपकी आवाज़ रिकॉर्ड की जाएगी। क्या आप सहमत हैं?',
  'en-IN': 'Your voice will be recorded. Do you consent?'
};

// Require explicit consent before recording
if (!userConsent) {
  // Fallback to text input
  showTextInputForm();
}
```

**Transparency**:
- Clear privacy policy
- Explain data usage
- Provide data access and deletion options


### 9.4 Human Oversight

**Escalation Paths**:
```typescript
// Detect emergency situations
function detectEmergency(transcript: string, intent: Intent) {
  const emergencyKeywords = [
    'emergency', 'urgent', 'chest pain', 'breathing problem',
    'आपातकाल', 'तुरंत', 'सीने में दर्द'
  ];
  
  const hasEmergencyKeyword = emergencyKeywords.some(kw =>
    transcript.toLowerCase().includes(kw)
  );
  
  if (hasEmergencyKeyword || intent.urgency === 'high') {
    // Alert staff immediately
    sendStaffAlert({
      type: 'emergency',
      patientName: patient.name,
      message: 'Emergency case detected at terminal'
    });
    
    // Display message to patient
    return {
      message: 'Please inform the staff immediately. This is an emergency.',
      priority: 'high'
    };
  }
}
```

**Staff Override**:
- Staff can always override AI decisions
- Manual queue management available
- Ability to correct AI errors

**Audit Trail**:
- Log all AI decisions
- Track confidence scores
- Monitor for systematic errors

---

## 10. Deployment Architecture

### 10.1 Infrastructure as Code

**AWS CDK Stack**:
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class VizziStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // DynamoDB table for queue
    const queueTable = new dynamodb.Table(this, 'QueueTokens', {
      partitionKey: { name: 'clinicId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'tokenNumber', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });
```


    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'VizziDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true
    });
    
    // Lambda functions
    const queueHandler = new lambda.Function(this, 'QueueHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/queue-handler'),
      environment: {
        QUEUE_TABLE: queueTable.tableName,
        DB_HOST: database.dbInstanceEndpointAddress
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 512
    });
    
    // Grant permissions
    queueTable.grantReadWriteData(queueHandler);
    database.grantConnect(queueHandler);
    
    // API Gateway
    const api = new apigateway.RestApi(this, 'VizziAPI', {
      restApiName: 'Vizzi API',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO
      }
    });
    
    // Add routes
    const queue = api.root.addResource('queue');
    queue.addMethod('GET', new apigateway.LambdaIntegration(queueHandler));
  }
}
```


### 10.2 CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build Lambda functions
        run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      
      - name: Deploy CDK stack
        run: |
          npm install -g aws-cdk
          cdk deploy --require-approval never
      
      - name: Run database migrations
        run: npm run migrate
      
      - name: Deploy web dashboard
        run: |
          cd dashboard
          npm run build
          aws s3 sync dist/ s3://vizzi-dashboard-prod
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_ID }} --paths "/*"
```


### 10.3 Environment Strategy

**Environments**:
1. **Development** (`dev`)
   - Developers' local testing
   - Shared dev AWS account
   - Minimal resources

2. **Staging** (`staging`)
   - Pre-production testing
   - Mirror of production
   - Used for QA and demos

3. **Production** (`prod`)
   - Live customer environment
   - High availability
   - Full monitoring

**Environment Configuration**:
```typescript
// config/environments.ts
export const environments = {
  dev: {
    region: 'ap-south-1',
    rdsInstance: 'db.t4g.micro',
    lambdaMemory: 256,
    logLevel: 'debug'
  },
  staging: {
    region: 'ap-south-1',
    rdsInstance: 'db.t4g.micro',
    lambdaMemory: 512,
    logLevel: 'info'
  },
  prod: {
    region: 'ap-south-1',
    rdsInstance: 'db.t4g.small',
    lambdaMemory: 512,
    logLevel: 'warn'
  }
};
```

### 10.4 Database Migrations

**Migration Tool**: Flyway or Prisma Migrate

```sql
-- migrations/V001__initial_schema.sql
CREATE TABLE clinics (...);
CREATE TABLE users (...);
CREATE TABLE patients (...);
CREATE TABLE visits (...);

-- migrations/V002__add_appointments.sql
CREATE TABLE appointments (...);

-- migrations/V003__add_indexes.sql
CREATE INDEX idx_visits_clinic_status ON visits(clinic_id, status);
```

**Migration Execution**:
```bash
# Run migrations
npm run migrate

# Rollback (if needed)
npm run migrate:rollback
```


### 10.5 Disaster Recovery

**Backup Strategy**:
- **RDS**: Automated daily backups, 7-day retention
- **DynamoDB**: Point-in-time recovery enabled
- **S3**: Versioning enabled for critical buckets
- **Code**: Git repository (GitHub)

**Recovery Procedures**:

```typescript
// RDS restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier vizzi-db-restored \
  --db-snapshot-identifier vizzi-db-snapshot-2026-02-12

// DynamoDB restore to point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name queue_tokens \
  --target-table-name queue_tokens_restored \
  --restore-date-time 2026-02-12T10:00:00Z

// S3 restore from versioning
aws s3api get-object \
  --bucket vizzi-audio-prod \
  --key audio/recording-123.mp3 \
  --version-id <version-id> \
  recording-restored.mp3
```

**RTO and RPO**:
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour (for database)

---

## 11. Testing Strategy

### 11.1 Unit Testing

**Lambda Functions**:
```typescript
// __tests__/queue-handler.test.ts
import { handler } from '../src/queue-handler';

describe('Queue Handler', () => {
  it('should add patient to queue', async () => {
    const event = {
      body: JSON.stringify({
        clinicId: 'clinic-123',
        patientId: 'patient-456',
        patientName: 'Test Patient'
      })
    };
    
    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).tokenNumber).toBeGreaterThan(0);
  });
});
```


### 11.2 Integration Testing

**API Testing**:
```typescript
// __tests__/integration/api.test.ts
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Integration Tests', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Login
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    authToken = response.data.accessToken;
  });
  
  it('should create patient and add to queue', async () => {
    // Create patient
    const patientResponse = await axios.post(
      `${API_URL}/patients`,
      {
        name: 'Test Patient',
        age: 30,
        gender: 'male',
        mobile: '9876543210',
        reasonForVisit: 'Checkup'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    expect(patientResponse.status).toBe(201);
    
    // Create visit
    const visitResponse = await axios.post(
      `${API_URL}/visits`,
      {
        patientId: patientResponse.data.id,
        clinicId: 'clinic-123'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    expect(visitResponse.status).toBe(201);
    expect(visitResponse.data.tokenNumber).toBeGreaterThan(0);
  });
});
```

### 11.3 End-to-End Testing

**Terminal App Testing** (Detox for React Native):
```typescript
// e2e/checkin.test.ts
describe('Patient Check-in Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should complete check-in via text input', async () => {
    // Start check-in
    await element(by.id('start-checkin-btn')).tap();
    
    // Enter name
    await element(by.id('name-input')).typeText('Test Patient');
    await element(by.id('next-btn')).tap();
    
    // Enter mobile
    await element(by.id('mobile-input')).typeText('9876543210');
    await element(by.id('next-btn')).tap();
    
    // Enter age
    await element(by.id('age-input')).typeText('30');
    await element(by.id('next-btn')).tap();
    
    // Select gender
    await element(by.id('gender-male')).tap();
    await element(by.id('next-btn')).tap();
    
    // Enter reason
    await element(by.id('reason-input')).typeText('Regular checkup');
    await element(by.id('submit-btn')).tap();
    
    // Verify token displayed
    await expect(element(by.id('token-number'))).toBeVisible();
  });
});
```


### 11.4 Load Testing

**Artillery Configuration**:
```yaml
# load-test.yml
config:
  target: 'https://api.vizzi.health'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/second
    - duration: 120
      arrivalRate: 50  # Ramp up to 50 requests/second
    - duration: 60
      arrivalRate: 100 # Peak load
  processor: "./auth-processor.js"

scenarios:
  - name: "Patient Check-in"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "testpassword"
          capture:
            - json: "$.accessToken"
              as: "token"
      
      - post:
          url: "/patients"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            name: "Load Test Patient"
            age: 30
            gender: "male"
            mobile: "{{ $randomInt(6000000000, 9999999999) }}"
            reasonForVisit: "Checkup"
          capture:
            - json: "$.id"
              as: "patientId"
      
      - post:
          url: "/visits"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            patientId: "{{ patientId }}"
            clinicId: "clinic-123"
```

**Run Load Test**:
```bash
artillery run load-test.yml --output report.json
artillery report report.json
```


---

## 12. Future Enhancements

### 12.1 Phase 2 Features (Post-Hackathon)

**1. Multi-Language Support**
- Add Marathi, Tamil, Telugu, Kannada, Bengali, Gujarati
- Regional dialect support
- Language auto-detection

**2. Advanced AI Capabilities**
- Multi-turn conversational AI
- Context-aware responses
- Symptom-based triage (non-diagnostic)
- Appointment scheduling via voice

**3. Patient Mobile App**
- View queue status remotely
- Book appointments
- Receive notifications
- Access visit history

**4. Integration Ecosystem**
- Diagnostic lab integration
- Pharmacy integration
- Payment gateway integration
- WhatsApp Business API

**5. Analytics and Insights**
- Predictive wait time (ML-based)
- Patient flow optimization
- Revenue analytics
- Operational insights

### 12.2 Technical Improvements

**1. Performance**
- Implement ElastiCache Redis for caching
- Use Aurora PostgreSQL for better scaling
- Optimize Lambda cold starts with Provisioned Concurrency

**2. Reliability**
- Multi-region deployment
- Active-active failover
- Circuit breakers for external services

**3. Developer Experience**
- GraphQL API (in addition to REST)
- SDK for third-party integrations
- Comprehensive API documentation (OpenAPI/Swagger)

---

## 13. Conclusion

Vizzi is designed as a **serverless-first, cost-optimized, scalable AI reception infrastructure** for small clinics in India. The architecture leverages AWS managed services to minimize operational overhead while maintaining high performance and reliability.

**Key Design Decisions**:
1. **Serverless architecture** for cost efficiency and auto-scaling
2. **Offline-first terminal** for reliability in low-connectivity environments
3. **DynamoDB for queue state** for real-time updates with sub-second latency
4. **Voice-first interaction** with text fallback for accessibility
5. **Responsible AI** with clear limitations and human oversight

**Success Metrics**:
- Support 100 clinics within 6 months (hackathon target)
- 80% patient self-service rate
- 50% reduction in wait times
- 75%+ gross margin on SaaS revenue

This design is **implementable, scalable, and investor-ready** for the National AI Hackathon.

---

**Document Version**: 2.0  
**Last Updated**: February 12, 2026  
**Status**: Final Design  
**Next Steps**: Implementation planning and task breakdown

