import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-3 text-slate-600">Effective date: February 9, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Information We Collect</h2>
            <p className="mt-2">We collect account details (name, email, phone), clinic details (clinic name, location, staff), and patient check-in data you enter into the platform. We also collect device identifiers and usage analytics to keep Vizzi working reliably.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">How We Use Information</h2>
            <p className="mt-2">We use your data to deliver the Vizzi service, manage queues, trigger patient notifications, provide reports, improve the product, and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Data Sharing</h2>
            <p className="mt-2">We share data only with trusted service providers for payments, messaging, hosting, and analytics. We do not sell personal data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
            <p className="mt-2">We use industry-standard security measures to protect data in transit and at rest. Access to sensitive data is restricted to authorized personnel.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Data Retention</h2>
            <p className="mt-2">We retain data for as long as your account is active or as needed to provide services. You can request deletion of your account data by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Your Rights</h2>
            <p className="mt-2">You can request access, correction, or deletion of your data. To exercise these rights, contact us at enquiry@rethela.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="mt-2">Rethela Technology, WeWork NESCO IT Park, Building 4, North Wing, Western Express Hwy, Goregaon, Mumbai 400063. Email: enquiry@rethela.com. Phone: +91 9082205249.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
