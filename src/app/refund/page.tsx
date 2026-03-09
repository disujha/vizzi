import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-primary">← Back to home</Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Return and Refund Policy</h1>
        <p className="mt-3 text-slate-600">Effective date: February 9, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Subscription Refunds</h2>
            <p className="mt-2">Subscription fees are charged in advance. If you believe you were billed in error, contact us within 7 days of the charge and we will review your request.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Hardware Returns</h2>
            <p className="mt-2">You may request a return within 7 days of delivery if the device is unused, in original packaging, and in resalable condition. Return approvals are at our discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Damaged or Defective Devices</h2>
            <p className="mt-2">If a Vizzi AI Device arrives damaged or defective, contact us within 7 days of delivery for replacement or repair options.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Refund Processing</h2>
            <p className="mt-2">Approved refunds are processed to the original payment method within 7 to 10 business days after inspection or confirmation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="mt-2">Email: enquiry@rethela.com. Phone: +91 9082205249.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
