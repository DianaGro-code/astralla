export default function Privacy() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-10">

        <div>
          <h1 className="font-serif text-4xl text-text-p mb-2">Privacy Policy</h1>
          <p className="text-text-m text-sm font-sans">Last updated: April 2, 2026</p>
        </div>

        <p className="text-text-s font-sans text-sm leading-relaxed">
          Astralla ("we", "us", or "our") operates the Astralla mobile app and website. This
          policy explains what information we collect, how we use it, and your rights around it.
        </p>

        <Section title="Information We Collect">
          <p>When you create an account we collect:</p>
          <ul>
            <li><strong>Account data</strong> — your name and email address.</li>
            <li><strong>Birth data</strong> — birth date, birth time (optional), and birth place for each chart you add. This is the core data used to generate your readings.</li>
          </ul>
          <p>When you use the app we also collect:</p>
          <ul>
            <li><strong>Reading history</strong> — the cities you read and the results we generated, so you can revisit them.</li>
            <li><strong>Usage data</strong> — how many readings you've generated, to enforce free-tier limits.</li>
          </ul>
          <p>
            We do <strong>not</strong> collect precise device location, contacts, photos, or any
            other data beyond what is listed above.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <ul>
            <li>To create and maintain your account.</li>
            <li>To generate personalised astrological readings for the cities and charts you request.</li>
            <li>To remember your reading history so results are instant on repeat visits.</li>
            <li>To enforce the free-tier reading limit and process subscription upgrades.</li>
            <li>To send transactional emails you request (e.g. password reset).</li>
          </ul>
          <p>We do not sell your data. We do not use your data for advertising.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>We share data with the following services to operate the app:</p>
          <ul>
            <li>
              <strong>Anthropic (Claude AI)</strong> — your birth chart data and city information
              are sent to Anthropic's API to generate reading text. Anthropic's privacy policy
              applies to that processing:{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-2"
              >
                anthropic.com/privacy
              </a>.
            </li>
            <li>
              <strong>Railway</strong> — our backend and database are hosted on Railway. Your
              data is stored in their infrastructure.
            </li>
            <li>
              <strong>RevenueCat</strong> — if you subscribe to Astralla Premium, subscription
              status is managed through RevenueCat. Your Apple ID purchase information is
              handled by Apple; RevenueCat receives a subscription token and your anonymous
              app user ID.
            </li>
            <li>
              <strong>Resend</strong> — we use Resend to send transactional emails (password
              resets). Only your email address is shared.
            </li>
          </ul>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your account and chart data for as long as your account exists. Reading
            history is stored indefinitely so you can return to previous results.
          </p>
          <p>
            If you delete your account, all personal data (account, charts, readings) is
            permanently deleted within 30 days.
          </p>
        </Section>

        <Section title="Your Rights">
          <ul>
            <li><strong>Access</strong> — you can view all your data within the app.</li>
            <li><strong>Correction</strong> — you can edit your charts and account details at any time.</li>
            <li><strong>Deletion</strong> — you can delete individual charts and request full account deletion by contacting us.</li>
            <li><strong>Portability</strong> — contact us to request an export of your data.</li>
          </ul>
          <p>
            If you are in the EU or UK, you also have the right to lodge a complaint with your
            local data protection authority.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Astralla is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with
            personal information, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy from time to time. We'll notify you of significant changes
            via email or an in-app notice. The "last updated" date at the top of this page
            always reflects the current version.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or requests regarding your data:{' '}
            <a href="mailto:privacy@astralla.app" className="text-gold underline underline-offset-2">
              privacy@astralla.app
            </a>
          </p>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl text-text-p border-b border-border/40 pb-2">{title}</h2>
      <div className="text-text-s font-sans text-sm leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-text-p">
        {children}
      </div>
    </section>
  );
}
