import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Terms and Conditions</h1>
        <p className="mt-3 text-slate-600">Effective date: February 9, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Use of Service</h2>
            <p className="mt-2">By accessing Vizzi Clinic Receptionist, you agree to use the service lawfully and in accordance with these terms. You are responsible for maintaining the confidentiality of your login credentials.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Accounts and Clinic Data</h2>
            <p className="mt-2">You are responsible for all activity under your account, including patient check-in data, clinic profile updates, and device management. Please ensure information you provide is accurate and up to date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Subscriptions and Payments</h2>
            <p className="mt-2">Subscription services are billed in advance and renew automatically unless cancelled. Hardware purchases are billed at the time of order. Taxes may apply. Payment processing is handled by third-party providers.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Hardware and Devices</h2>
            <p className="mt-2">Vizzi AI Devices are designed to work with the Vizzi software platform. You agree not to tamper with, reverse engineer, or misuse any device or software component.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Acceptable Use</h2>
            <p className="mt-2">You must not use the service to store or transmit unlawful, harmful, or unauthorized content. You must comply with all applicable healthcare and data protection regulations in your region.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Intellectual Property</h2>
            <p className="mt-2">All trademarks, logos, and service content are owned by Rethela Technology or its licensors. You may not copy, modify, or distribute any part of the service without prior written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Limitation of Liability</h2>
            <p className="mt-2">Vizzi is provided on an “as is” basis. To the maximum extent permitted by law, Rethela Technology is not liable for indirect or consequential damages resulting from service use or device operation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Termination</h2>
            <p className="mt-2">We may suspend or terminate access if these terms are violated. You may cancel your subscription at any time through the dashboard or by contacting support.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Governing Law</h2>
            <p className="mt-2">These terms are governed by the laws of India. Any disputes will be subject to the jurisdiction of courts in Mumbai, Maharashtra.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
