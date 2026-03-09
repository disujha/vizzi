# Vizzi - AI-Powered Reception Infrastructure System
## Product Requirements Document

---

## 1. Product Overview

**Vizzi** is an AI-powered reception infrastructure system designed to automate patient intake workflows for small and mid-sized clinics in Tier 2 and Tier 3 cities across India.

Unlike traditional clinic management software, Vizzi is a **physical AI reception terminal** — a voice-first, multilingual patient check-in system that combines:

1. **AI Reception Terminal**: An Android-based tablet device with voice interaction capabilities
2. **Cloud Intelligence Layer**: AWS serverless backend for AI processing and data management
3. **Web Dashboard**: Real-time queue management and clinic operations interface
4. **Optional Add-ons**: Thermal printer for token printing, WhatsApp/SMS notifications

Vizzi replaces manual reception workflows with an intelligent, voice-driven system that operates in regional languages, reduces wait times, and eliminates dependency on full-time reception staff.

### Implementation Status (Hackathon Build)

Built:
- Voice check-in (Hindi + English)
- Token generation
- Real-time queue dashboard
- Offline mode basic sync
- AWS Lambda backend

Designed (Next Phase):
- ML wait time prediction
- Advanced analytics
- Multi-doctor queue split

### 1.1 Core MVP Focus (Hackathon Scope)

**The breakthrough**: AI-powered physical reception terminal + real-time queue intelligence

**What we're building**:
1. ✅ Voice-first patient check-in (Hindi + English)
2. ✅ Real-time queue management with predictive wait times
3. ✅ Offline-first terminal with cloud sync
4. ✅ Simple web dashboard for queue control
5. ✅ Optional Bluetooth thermal printer integration

**What we're NOT building** (moved to Future Scope):
- ❌ Full appointment calendar system
- ❌ Advanced analytics and reporting
- ❌ Complex multi-doctor scheduling
- ❌ Detailed audit logging
- ❌ Enterprise-grade features

**Why this focus?**
- Demonstrates AI impact clearly
- Solves the #1 pain point: manual reception + long queues
- Feasible for hackathon timeline
- Scalable foundation for future features

## 1.2 Competitive Differentiation

Vizzi differs from traditional clinic management software in the following ways:

1. Physical AI Reception Terminal (Infrastructure Model)
   - Not just SaaS software
   - Installed AI device at clinic front desk
   - Creates visible transformation of workflow

2. Voice-First Multilingual Interaction
   - Designed for Tier 2 & Tier 3 India
   - Hindi-first interaction
   - Reduces digital literacy barrier

3. Real-Time Queue Intelligence
   - Live wait time prediction
   - Sub-second queue updates
   - Infrastructure-grade reliability

4. Offline-First Architecture
   - Works during internet outages
   - Syncs automatically when online

5. Cost Model Suitable for Small Clinics
   - Hardware under ₹15,000
   - SaaS under ₹2,000/month

---

## 2. Problem Statement

Small and mid-sized clinics in Tier 2 and Tier 3 cities face significant operational challenges:

### 2.1 Manual Workflow Burden
- Time-consuming manual patient registration and data entry
- Paper-based or basic digital record-keeping
- Staff overwhelmed during peak hours
- Inefficient queue management leading to confusion and delays

### 2.2 Language Barriers
- Patients speak regional languages (Hindi, Marathi, Tamil, Telugu, etc.)
- Reception staff may not be fluent in all local dialects
- Communication gaps lead to errors in patient information capture
- Elderly and less-educated patients struggle with English-only systems

### 2.3 Long Queues and Poor Patient Experience
- No visibility into queue status or wait times
- Patients uncertain about when their turn will come
- Lack of systematic queue management
- Frequent disputes over queue order

### 2.4 Receptionist Dependency and Cost
- Hiring and training reception staff is expensive (₹10,000-15,000/month)
- Staff turnover creates operational disruptions
- Small clinics cannot afford dedicated reception personnel
- Single-doctor practices operate without any reception support

### 2.5 No Digital Infrastructure
- Absence of integrated digital systems for patient management
- No automated appointment reminders leading to no-shows
- Difficulty in tracking patient history and visit patterns
- Limited data for operational insights and improvements

**Impact**: These challenges result in poor patient experience, operational inefficiency, increased costs, and lost revenue for clinic owners.

---

## 3. Target Users

### 3.1 Primary Users

#### 3.1.1 Patients
- **Demographics**: Age 18-70+, diverse educational backgrounds
- **Language Preference**: Hindi, English, and regional languages
- **Technical Literacy**: Low to moderate; comfortable with voice interaction
- **Use Case**: Self-service check-in at clinic reception using voice or touch interface

#### 3.1.2 Clinic Doctors
- **Profile**: Single-doctor practices or small clinics with 1-3 doctors
- **Location**: Tier 2 and Tier 3 cities across India
- **Technical Expertise**: Basic smartphone/computer literacy
- **Use Case**: Monitor queue, manage appointments, access patient information
- **Decision Maker**: Cost-conscious, seeking affordable digital solutions

#### 3.1.3 Clinic Staff
- **Profile**: Nurses, assistants, administrative personnel
- **Technical Literacy**: Basic to moderate
- **Use Case**: Manage daily operations, control queue flow, handle exceptions
- **Requirement**: Simple, intuitive interface with minimal training

### 3.2 Secondary Users

#### 3.2.4 Clinic Administrators
- **Profile**: Manage multiple clinic locations or larger practices
- **Use Case**: System configuration, reporting, analytics, user management

---

## 4. Product Components

### 4.1 AI Reception Terminal (Hardware + Software)

**Hardware Specification**:
- Android tablet (10-15 inch display)
- Minimum Android 9.0
- Built-in microphone and speakers
- Touch-enabled display
- Wi-Fi and 4G connectivity
- Battery backup (2-4 hours)
- Durable enclosure suitable for clinic environment

**Software**:
- React Native application
- Voice-first interface with touch fallback
- Offline-first architecture with local SQLite database
- Real-time sync with cloud backend
- Multilingual support (Hindi, English initially)

**Deployment**:
- Placed at clinic reception desk
- Powered by standard electrical outlet with battery backup
- Connects to clinic Wi-Fi or mobile hotspot

### 4.2 Cloud Intelligence Layer (AWS Serverless Backend)

**Architecture**:
- Amazon API Gateway for secure REST endpoints
- AWS Lambda for business logic and AI orchestration
- Amazon RDS (PostgreSQL) for patient and appointment data
- Amazon DynamoDB for real-time queue state management
- Amazon S3 for audio files and reports

**AI Services**:
- Amazon Transcribe for speech-to-text (multilingual)
- Amazon Polly for text-to-speech responses
- Amazon Comprehend / Bedrock for intent detection
- Custom ML models for wait time prediction (Amazon SageMaker)

**Communication Services**:
- Amazon SNS for SMS notifications (optional)
- WhatsApp Business API integration (optional)

### 4.3 Web Dashboard

**Technology**:
- React + TypeScript web application
- Hosted on AWS Amplify or S3 + CloudFront
- Responsive design (desktop, tablet, mobile)
- Real-time updates via WebSocket

**Access**:
- Browser-based (Chrome, Firefox, Safari, Edge)
- Secure login with role-based access control
- Accessible from any device with internet connection

### 4.4 Optional Add-ons

#### 4.4.1 Thermal Printer Integration
- Bluetooth-enabled ESC/POS compatible thermal printer
- Prints queue token with patient name and token number
- Automatic print trigger after successful check-in

#### 4.4.2 Notification System
- SMS notifications via Amazon SNS
- WhatsApp notifications via WhatsApp Business API
- Appointment reminders and queue status updates

---

## 5. Functional Requirements

### 5.1 AI Reception Terminal - Patient Check-in

#### 5.1.1 Voice-First Interaction

**FR-5.1.1**: System shall provide voice-first patient check-in interface

**FR-5.1.2**: System shall support Hindi and English languages initially

**FR-5.1.3**: System shall display real-time transcript of patient speech on screen

**FR-5.1.4**: System shall use Amazon Transcribe for speech-to-text conversion

**FR-5.1.5**: System shall provide audio feedback using Amazon Polly text-to-speech

**FR-5.1.6**: System shall guide patients through check-in with clear voice prompts:
- "Welcome to [Clinic Name]. Please tell me your name."
- "Are you a new patient or returning patient?"
- "What is the reason for your visit today?"
- "Please provide your mobile number."

**FR-5.1.7**: System shall implement confidence-based repeat prompts:
- If transcription confidence < 70%, system shall ask patient to repeat
- Maximum 2 retry attempts before offering text input fallback

**FR-5.1.8**: System shall handle noisy clinic environments with noise filtering

#### 5.1.2 Text Fallback Input

**FR-5.1.9**: System shall provide on-screen keyboard for text input if voice fails

**FR-5.1.10**: System shall allow patients to switch between voice and text input at any time

**FR-5.1.11**: System shall support both English and Hindi text input

**FR-5.1.12**: System shall provide large touch targets (minimum 48px) for accessibility

#### 5.1.3 Patient Registration

**FR-5.1.13**: System shall capture the following mandatory fields:
- Patient name
- Age
- Gender
- Mobile number (10-digit Indian format)
- Reason for visit

**FR-5.1.14**: System shall capture optional fields:
- Address
- Medical history (brief)
- Allergies

**FR-5.1.15**: System shall validate mobile number format (10 digits, Indian)

**FR-5.1.16**: System shall detect duplicate patients using phone number matching

**FR-5.1.17**: For returning patients, system shall:
- Retrieve patient information from database
- Display previous visit history
- Allow patient to confirm or update information

**FR-5.1.18**: System shall display confirmation screen before finalizing check-in

#### 5.1.4 Token Generation

**FR-5.1.19**: System shall generate sequential queue token numbers

**FR-5.1.20**: System shall display token number prominently on screen (large font)

**FR-5.1.21**: System shall provide audio announcement of token number

**FR-5.1.22**: If thermal printer is connected, system shall automatically print token slip with:
- Clinic name
- Patient name
- Token number
- Date and time
- Estimated wait time

**FR-5.1.23**: System shall add patient to queue immediately after check-in

#### 5.1.5 Queue Display

**FR-5.1.24**: System shall display current queue status on terminal:
- Current token being served (large, prominent)
- Next 3-5 tokens in queue
- Total patients waiting
- Estimated wait time

**FR-5.1.25**: System shall update queue display in real-time (within 1 second)

**FR-5.1.26**: System shall provide audio announcement when patient's turn approaches

#### 5.1.6 Offline Mode

**FR-5.1.27**: System shall operate in offline mode during internet outages

**FR-5.1.28**: System shall store check-ins locally in SQLite database when offline

**FR-5.1.29**: System shall sync data to cloud when connectivity is restored

**FR-5.1.30**: System shall display offline indicator on screen

**FR-5.1.31**: System shall generate temporary token numbers offline (sync later)

### 5.2 AI Capabilities

#### 5.2.1 Speech Recognition

**FR-5.2.1**: System shall convert patient speech to text using Amazon Transcribe

**FR-5.2.2**: System shall support Hindi and English speech recognition

**FR-5.2.3**: System shall provide transcription confidence score (0-100%)

**FR-5.2.4**: System shall handle common Indian accents and dialects

**FR-5.2.5**: System shall process speech in real-time (< 2 seconds latency)

#### 5.2.2 Intent Detection

**FR-5.2.6**: System shall detect patient intent using Amazon Comprehend or Bedrock:
- New visit
- Follow-up visit
- Appointment booking
- Emergency
- General query

**FR-5.2.7**: System shall extract key entities from patient speech:
- Reason for visit
- Symptoms (if mentioned)
- Appointment date preference (if mentioned)

**FR-5.2.8**: System shall route patients based on detected intent

**FR-5.2.9**: System shall flag emergency cases for priority handling

#### 5.2.3 Wait Time Prediction

**FR-5.2.10**: System shall estimate wait time based on:
- Number of patients in queue
- Average consultation duration (historical data)
- Time of day
- Day of week

**FR-5.2.11**: System shall use heuristic-based calculation initially:
- Wait Time = (Patients Ahead × Average Consultation Time)

**FR-5.2.12**: System shall optionally use ML model (Amazon SageMaker) for improved predictions

**FR-5.2.13**: System shall update wait time estimates dynamically as queue progresses

**FR-5.2.14**: System shall display wait time in minutes to patients

#### 5.2.4 AI Safety and Limitations

**FR-5.2.15**: System shall NOT generate medical diagnoses

**FR-5.2.16**: System shall NOT provide medical advice or treatment recommendations

**FR-5.2.17**: System shall NOT replace doctor-patient consultation

**FR-5.2.18**: System shall clearly indicate it is an administrative assistant, not a medical AI

### 5.3 Web Dashboard - Queue Management

#### 5.3.1 Real-Time Queue View

**FR-5.3.1**: Dashboard shall display real-time queue status:
- List of all patients in queue
- Patient name, token number, check-in time
- Current status (waiting, called, in-consultation, completed)
- Estimated wait time for each patient

**FR-5.3.2**: Dashboard shall update in real-time via WebSocket (< 1 second latency)

**FR-5.3.3**: Dashboard shall highlight current patient being served

**FR-5.3.4**: Dashboard shall show total patients waiting and completed today

#### 5.3.2 Queue Control

**FR-5.3.5**: Staff shall be able to call next patient from dashboard

**FR-5.3.6**: Staff shall be able to mark patient status:
- Called (patient called to consultation room)
- In Consultation (doctor started consultation)
- Completed (consultation finished)
- Cancelled (patient left without consultation)

**FR-5.3.7**: Staff shall be able to move patients up/down in queue (priority adjustment)

**FR-5.3.8**: Staff shall be able to remove patients from queue

**FR-5.3.9**: Staff shall be able to pause/resume queue

**FR-5.3.10**: Staff shall be able to add patients manually (walk-ins who didn't use terminal)

#### 5.3.3 Multi-Doctor Support

**FR-5.3.11**: System shall support multiple doctors/consultation rooms

**FR-5.3.12**: Staff shall be able to assign patients to specific doctors

**FR-5.3.13**: System shall maintain separate queues for each doctor (optional)

**FR-5.3.14**: Dashboard shall display queue status for each doctor

### 5.4 Web Dashboard - Patient Management

#### 5.4.1 Patient Search

**FR-5.4.1**: Dashboard shall provide patient search functionality

**FR-5.4.2**: Staff shall be able to search by:
- Patient name
- Mobile number
- Patient ID

**FR-5.4.3**: Search shall support fuzzy matching for names

**FR-5.4.4**: Search results shall display within 1 second

#### 5.4.2 Patient Records

**FR-5.4.5**: Dashboard shall display patient detail view with:
- Basic information
- Visit history
- Last visit date
- Total visits count

**FR-5.4.6**: Staff shall be able to add notes to patient records

**FR-5.4.7**: Staff shall be able to edit patient information

**FR-5.4.8**: System shall maintain audit log of all patient record changes

### 5.5 Web Dashboard - Basic Settings

#### 5.5.1 Clinic Configuration

**FR-5.5.1**: Dashboard shall allow basic clinic settings:
- Clinic name and contact
- Working hours (simple start/end time)
- Holiday marking

**FR-5.5.2**: Dashboard shall allow terminal language selection (Hindi/English)

### 5.6 Notification System (Optional Add-on)

#### 5.6.1 SMS Notifications

**FR-5.6.1**: System shall send SMS notifications via Amazon SNS

**FR-5.6.2**: System shall send check-in confirmation with token number

**FR-5.6.3**: System shall send notification when patient's turn is approaching (2-3 patients before)

**FR-5.6.4**: System shall send appointment reminders (24 hours and 2 hours before)

**FR-5.6.5**: System shall handle SMS delivery failures gracefully

#### 5.6.2 WhatsApp Notifications

**FR-5.6.6**: System shall send WhatsApp messages via WhatsApp Business API

**FR-5.6.7**: System shall use same notification triggers as SMS

**FR-5.6.8**: System shall support rich message formatting (bold, lists)

**FR-5.6.9**: System shall allow patients to confirm/cancel appointments via WhatsApp reply

### 5.7 Web Dashboard - Simple Analytics

#### 5.7.1 Daily Metrics

**FR-5.7.1**: Dashboard shall display basic daily metrics:
- Total patients today
- Average wait time
- Current queue size

**FR-5.7.2**: Dashboard shall show simple trend chart (last 7 days)

### 5.8 Web Dashboard - User Management

**FR-5.8.1**: Dashboard shall support basic user accounts (Admin, Staff roles)

**FR-5.8.2**: Admin shall be able to create and manage user accounts

**FR-5.8.3**: System shall implement simple role-based access:
- Admin: Full access
- Staff: Queue management and patient records only

### 5.9 Authentication and Security

**FR-5.9.1**: Dashboard shall require login with email and password

**FR-5.9.2**: System shall implement password strength requirements (min 8 characters)

**FR-5.9.3**: System shall provide password reset functionality

**FR-5.9.4**: System shall use JWT tokens for authentication

**FR-5.9.5**: System shall encrypt all data in transit (TLS 1.3) and at rest (AES-256)

**FR-5.9.6**: System shall sanitize all user inputs to prevent injection attacks

---

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-6.1.1**: Voice interaction shall have < 2 seconds response time

**NFR-6.1.2**: Speech-to-text transcription shall complete within 1.5 seconds

**NFR-6.1.3**: Dashboard pages shall load within 2 seconds on 3G connection

**NFR-6.1.4**: Queue updates shall reflect in real-time (< 1 second latency)

**NFR-6.1.5**: System shall support 100+ patient check-ins per day per clinic

**NFR-6.1.6**: System shall handle 10 concurrent terminal sessions per clinic

### 6.2 Scalability

**NFR-6.2.1**: System shall support 1000+ clinics on the platform

**NFR-6.2.2**: System architecture shall support horizontal scaling

**NFR-6.2.3**: System shall handle 10x growth without major redesign

**NFR-6.2.4**: AWS Lambda functions shall auto-scale based on demand

**NFR-6.2.5**: Database shall support read replicas for scaling

### 6.3 Reliability

**NFR-6.3.1**: System shall maintain 99.5% uptime for cloud services

**NFR-6.3.2**: Terminal shall operate in offline mode during internet outages

**NFR-6.3.3**: System shall implement automatic failover for critical services

**NFR-6.3.4**: System shall sync offline data within 5 minutes of connectivity restoration

**NFR-6.3.5**: System shall handle errors gracefully with user-friendly messages

### 6.4 Usability

**NFR-6.4.1**: Terminal interface shall be operable by users with minimal technical literacy

**NFR-6.4.2**: Touch targets shall be minimum 48px for accessibility

**NFR-6.4.3**: System shall use simple, clear language avoiding technical jargon

**NFR-6.4.4**: New patients shall complete check-in within 3 minutes without assistance

**NFR-6.4.5**: Staff shall be able to use dashboard effectively after 1 hour training

**NFR-6.4.6**: System shall provide contextual help and tooltips

### 6.5 Data Privacy and Compliance

**NFR-6.5.1**: System shall comply with Digital Personal Data Protection Act 2023 (India)

**NFR-6.5.2**: System shall comply with IT Act 2000 (India)

**NFR-6.5.3**: System shall store all data within India region (AWS Mumbai)

**NFR-6.5.4**: System shall allow patients to request data deletion

**NFR-6.5.5**: System shall anonymize data for analytics and ML training

**NFR-6.5.6**: System shall maintain audit logs for compliance verification

**NFR-6.5.7**: System shall implement data retention policies (7 years for patient records)

### 6.6 Maintainability

**NFR-6.6.1**: System shall use Infrastructure as Code (AWS CloudFormation/CDK)

**NFR-6.6.2**: System shall implement CI/CD pipeline for automated deployments

**NFR-6.6.3**: System shall support zero-downtime deployments

**NFR-6.6.4**: System shall provide comprehensive logging via Amazon CloudWatch

**NFR-6.6.5**: System shall implement monitoring and alerting for critical issues

**NFR-6.6.6**: Terminal software shall support over-the-air (OTA) updates

### 6.7 Portability

**NFR-6.7.1**: Terminal app shall run on Android 9.0 and above

**NFR-6.7.2**: Dashboard shall work on Chrome, Firefox, Safari, Edge (latest 2 versions)

**NFR-6.7.3**: Dashboard shall be responsive for desktop, tablet, and mobile

**NFR-6.7.4**: System shall support deployment on AWS (primary) with potential for multi-cloud

### 6.8 Localization

**NFR-6.8.1**: System shall support Hindi and English initially

**NFR-6.8.2**: System architecture shall allow easy addition of new languages

**NFR-6.8.3**: System shall support Unicode for all text storage and display

**NFR-6.8.4**: System shall use culturally appropriate icons and imagery

---

## 7. AI Capabilities and Limitations

### 7.1 AI Capabilities

**AI-7.1.1**: Speech-to-text conversion in Hindi and English

**AI-7.1.2**: Text-to-speech responses in Hindi and English

**AI-7.1.3**: Basic intent detection (new visit, follow-up, appointment, emergency, query)

**AI-7.1.4**: Entity extraction (reason for visit, symptoms, date preferences)

**AI-7.1.5**: Predictive wait time estimation using heuristics or ML models

**AI-7.1.6**: Noise filtering for clinic environment

**AI-7.1.7**: Confidence scoring for transcription quality

### 7.2 AI Limitations and Safety

**AI-7.2.1**: System does NOT generate medical diagnoses

**AI-7.2.2**: System does NOT provide medical advice or treatment recommendations

**AI-7.2.3**: System does NOT replace doctor-patient consultation

**AI-7.2.4**: System does NOT analyze medical images or reports

**AI-7.2.5**: System does NOT make clinical decisions

**AI-7.2.6**: System is an administrative assistant only, not a medical AI

**AI-7.2.7**: System clearly indicates its limitations to users

**AI-7.2.8**: System escalates medical emergencies to staff immediately

---

## 8. System Constraints

### 8.1 Technical Constraints

**TC-8.1.1**: Terminal must use commodity Android tablets (cost < ₹15,000)

**TC-8.1.2**: System must work on 3G/4G internet with occasional connectivity issues

**TC-8.1.3**: System must minimize data usage for cost-sensitive markets

**TC-8.1.4**: Voice recognition must work in noisy clinic environments (60-70 dB)

**TC-8.1.5**: Terminal must operate in temperature range of 15-45°C

**TC-8.1.6**: Terminal must have battery backup for 2-4 hours

### 8.2 Business Constraints

**BC-8.2.1**: Total deployment cost per clinic must be under ₹50,000:
- Android tablet: ₹10,000-15,000
- Enclosure/stand: ₹5,000-10,000
- Optional thermal printer: ₹3,000-5,000
- Installation and setup: ₹5,000-10,000
- Software license (first year): ₹10,000-15,000

**BC-8.2.2**: Monthly SaaS subscription must be under ₹2,000 per clinic

**BC-8.2.3**: System must be deployable within 1 day at clinic location

**BC-8.2.4**: System must require minimal ongoing technical support

**BC-8.2.5**: Solution must be profitable at scale of 1000+ clinics

**BC-8.2.6**: Hardware model must be asset-light (clinics purchase their own tablets)

### 8.3 Regulatory Constraints

**RC-8.3.1**: System must comply with IT Act 2000 (India)

**RC-8.3.2**: System must comply with Digital Personal Data Protection Act 2023 (India)

**RC-8.3.3**: System must maintain audit logs for regulatory compliance

**RC-8.3.4**: System must implement data localization (store data in India)

**RC-8.3.5**: System must not store or process sensitive health information without consent

### 8.4 User Constraints

**UC-8.4.1**: System must be usable by patients with low digital literacy

**UC-8.4.2**: System must work for users aged 18-80+ years

**UC-8.4.3**: System must accommodate users with limited English proficiency

**UC-8.4.4**: System must work in clinics with limited space for terminal placement

**UC-8.4.5**: System must be operable by clinic staff with basic computer skills

---

## 9. Assumptions

### 9.1 User Assumptions

**A-9.1.1**: Patients have access to mobile phones for receiving notifications (optional feature)

**A-9.1.2**: At least 70% of patients are comfortable using voice or touch interfaces

**A-9.1.3**: Clinic staff have basic smartphone/computer literacy

**A-9.1.4**: Doctors are willing to adopt digital workflow

**A-9.1.5**: Patients are willing to share personal information with the system

### 9.2 Technical Assumptions

**A-9.2.1**: Clinics have basic internet connectivity (3G or better)

**A-9.2.2**: Clinics have power supply with occasional outages (battery backup handles this)

**A-9.2.3**: AWS services (Transcribe, Polly, Comprehend) remain accessible and affordable

**A-9.2.4**: SMS/WhatsApp delivery remains reliable in target regions (for optional feature)

**A-9.2.5**: Android tablets remain available at current price points

### 9.3 Business Assumptions

**A-9.3.1**: Clinics are willing to pay for SaaS subscription (₹1,500-2,000/month)

**A-9.3.2**: Market size of 50,000+ small clinics in Tier 2/3 cities

**A-9.3.3**: Average clinic sees 30-50 patients per day

**A-9.3.4**: Clinics operate 6 days per week, 8-10 hours per day

**A-9.3.5**: Customer acquisition cost can be recovered within 12 months

### 9.4 Operational Assumptions

**A-9.4.1**: Remote support can resolve 80% of technical issues

**A-9.4.2**: On-site support can be provided within 48 hours if needed

**A-9.4.3**: Terminal hardware will last minimum 3 years

**A-9.4.4**: System updates can be deployed remotely without clinic visit

**A-9.4.5**: Training can be provided remotely via video calls

---

## 10. Success Metrics

### 10.1 User Adoption Metrics

**SM-10.1.1**: 80% of patients successfully complete self-check-in without assistance within 3 months

**SM-10.1.2**: 90% of clinics actively using the system daily within 1 month of deployment

**SM-10.1.3**: 85% patient satisfaction score for check-in experience

**SM-10.1.4**: Average check-in time under 2 minutes per patient

### 10.2 Operational Efficiency Metrics

**SM-10.2.1**: 50% reduction in average patient wait time

**SM-10.2.2**: 40% reduction in manual data entry time for staff

**SM-10.2.3**: 60% reduction in reception staff workload

**SM-10.2.4**: 95% accuracy in patient information capture

### 10.3 Business Metrics

**SM-10.3.1**: Achieve 100 clinic deployments within 6 months (hackathon target)

**SM-10.3.2**: Achieve 500 clinic deployments within 12 months

**SM-10.3.3**: Customer churn rate below 5% per month

**SM-10.3.4**: Net Promoter Score (NPS) above 50

**SM-10.3.5**: Customer acquisition cost recovered within 12 months

### 10.4 Technical Metrics

**SM-10.4.1**: System uptime of 99.5% or higher

**SM-10.4.2**: Voice recognition accuracy above 85% for Hindi and English

**SM-10.4.3**: Average API response time under 500ms

**SM-10.4.4**: Zero critical security incidents

**SM-10.4.5**: 95% notification delivery success rate (for optional feature)

---

## 11. Out of Scope (MVP Release)

### 11.1 Moved to Future Scope (Post-Hackathon)
**OOS-11.1**: Full appointment calendar system with time slot management  
**OOS-11.2**: Advanced analytics with custom date ranges and detailed reports  
**OOS-11.3**: PDF report generation and export functionality  
**OOS-11.4**: Detailed audit logging and compliance tracking  
**OOS-11.5**: Multi-doctor queue separation and complex scheduling  
**OOS-11.6**: Advanced user roles (Doctor, Viewer roles - keeping Admin/Staff only)

### 11.2 Permanently Out of Scope (Not a Hospital/EMR System)
**OOS-11.7**: Electronic Medical Records (EMR) system  
**OOS-11.8**: Prescription management and e-prescriptions  
**OOS-11.9**: Billing and payment processing  
**OOS-11.10**: Insurance claim processing  
**OOS-11.11**: Lab test ordering and result management  
**OOS-11.12**: Inventory management for medicines  
**OOS-11.13**: Telemedicine/video consultation  
**OOS-11.14**: Integration with hospital management systems  
**OOS-11.15**: Clinical decision support systems  
**OOS-11.16**: Medical imaging integration (X-ray, MRI, etc.)  
**OOS-11.17**: Medical diagnosis or treatment recommendations  
**OOS-11.18**: Health monitoring or vital signs tracking  
**OOS-11.19**: Drug interaction checking  
**OOS-11.20**: Clinical trial management

---

## 12. Future Scope (Post-Hackathon)

### 12.1 Appointment Management System
- Full calendar with time slot management
- Double-booking prevention
- Recurring appointments
- Automated reminders (24h, 2h before)
- Appointment confirmation via SMS/WhatsApp

### 12.2 Advanced Analytics & Reporting
- Detailed consultation duration tracking
- Peak hour analysis
- Patient flow optimization
- Weekly/monthly reports with PDF export
- Custom date range filtering

### 12.3 Language Expansion
- Add support for Marathi, Tamil, Telugu, Kannada, Bengali, Gujarati
- Regional dialect support within each language

### 12.3 Language Expansion
- Improved intent detection with context awareness
- Symptom-based triage (non-diagnostic)
- Appointment scheduling via voice
- Multi-turn conversational AI

### 12.4 Enhanced AI Capabilities
- Integration with diagnostic labs for test report delivery
- Integration with pharmacy systems for medicine ordering
- Integration with payment gateways for consultation fees
- API for third-party integrations

### 12.5 Integration Capabilities
- Patient mobile app for appointment booking and queue status
- Telemedicine consultation support
- Electronic prescription generation (if regulatory approval obtained)
- Patient health records and medical history tracking

### 12.6 Advanced Features
- Computer vision for document scanning (ID cards, prescriptions)
- Biometric authentication for patient identification
- IoT integration for vital signs monitoring at terminal
- Larger display options for better visibility

---

## 13. Document Control

**Version**: 2.0 (Revised for National AI Hackathon)

**Last Updated**: February 12, 2026

**Status**: Final

**Owner**: Vizzi Product Team

**Target Audience**: Hackathon Judges, Technical Reviewers, Development Team

---

## 14. Approval

This requirements document requires approval from:

- [ ] Product Manager
- [ ] Technical Lead
- [ ] AI/ML Lead
- [ ] Business Stakeholder
- [ ] Hackathon Team Lead

---

**End of Document**

*This document defines the scope and requirements for Vizzi - an AI-powered reception infrastructure system designed to transform patient intake workflows for small clinics across India.*
