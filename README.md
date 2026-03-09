# 🏥 Vizzi AI Clinic Receptionist

An intelligent AI-powered clinic receptionist system that leverages AWS cloud services for seamless patient management, queue management, and clinic operations automation.

## 🚀 Key Features

### 🧠 **AI-Powered Intelligence**
- **AWS Bedrock Integration**: Advanced AI for patient interaction and intelligent clinic management
- **Smart Triage**: AI-powered patient symptom assessment and prioritization
- **Natural Language Processing**: Conversational patient data extraction
- **Predictive Analytics**: Queue wait time predictions and resource optimization

### 📊 **Real-Time Dashboard**
- **Live Clinic Status**: Toggle between OPEN/CLOSED states
- **Queue Management**: Real-time patient queue monitoring
- **Doctor Availability**: Multi-doctor status management
- **Analytics Dashboard**: Comprehensive clinic performance metrics

### 🔐 **Secure Authentication**
- **AWS Cognito**: Secure multi-factor authentication
- **Role-Based Access**: Different access levels for clinic staff
- **HIPAA Compliant**: Medical data protection and privacy

### 📱 **Multi-Platform Support**
- **Web Dashboard**: Comprehensive clinic management interface
- **Kiosk Mode**: Patient self-service terminal
- **Mobile Responsive**: Works on all devices

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling framework
- **Space Grotesk & Fraunces** - Typography

### **AWS Cloud Services**
- **AWS Bedrock** - AI/ML engine (Claude 3, Titan models)
- **AWS AppSync** - GraphQL API with real-time subscriptions
- **AWS Lambda** - Serverless business logic
- **Amazon DynamoDB** - NoSQL database
- **AWS Cognito** - Authentication & user management
- **Amazon SNS** - Notification services
- **Amazon S3** - Storage & media management
- **AWS Amplify** - Frontend development framework

## 🏗️ Architecture

```
Patient Interface (Web/Kiosk) 
    ↓
AWS CloudFront (CDN)
    ↓
AWS Amplify (Frontend)
    ↓
AWS AppSync (GraphQL API)
    ↓
AWS Lambda (Business Logic)
    ↓
AWS Bedrock (AI Processing)
    ↓
Amazon DynamoDB (Data Storage)
    ↓
Amazon SNS (Notifications)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- AWS account with configured services

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/disujha/vizzi.git
cd vizzi
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure AWS services**
- Copy `amplifyconfiguration.json.example` to `amplifyconfiguration.json`
- Update with your AWS service configurations
- Set up environment variables for API keys and endpoints

4. **Run development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables
Create `.env.local` with:
```env
NEXT_PUBLIC_AWS_APPSYNC_ENDPOINT=your_appsync_endpoint
NEXT_PUBLIC_AWS_APPSYNC_API_KEY=your_api_key
NEXT_PUBLIC_AWS_USER_POOL_ID=your_user_pool_id
NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID=your_client_id
```

### AWS Services Setup
See [AWS_TECHNOLOGY_STACK.md](./AWS_TECHNOLOGY_STACK.md) for detailed AWS service configuration.

## 📊 Features Overview

### Dashboard Features
- ✅ Real-time clinic status management
- ✅ Patient queue monitoring
- ✅ Doctor availability controls
- ✅ Analytics and reporting
- ✅ Multi-doctor support

### AI Features
- ✅ Intelligent patient triage
- ✅ Natural language processing
- ✅ Predictive wait times
- ✅ Smart appointment scheduling
- ✅ Multi-language support

### Security Features
- ✅ HIPAA compliant data handling
- ✅ End-to-end encryption
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Secure API authentication

## 📱 Pages & Routes

- `/` - Landing page
- `/dashboard` - Main clinic dashboard
- `/kiosk` - Patient self-service kiosk
- `/login` - Authentication page
- `/dashboard/analytics` - Analytics and reports
- `/dashboard/patients` - Patient management
- `/dashboard/settings` - Clinic settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the [AWS_TECHNOLOGY_STACK.md](./AWS_TECHNOLOGY_STACK.md) for technical details
- Review the documentation in the `/docs` folder

---

*Built with ❤️ using Next.js and AWS Cloud Services*
