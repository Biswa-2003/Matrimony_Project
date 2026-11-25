import LegalPage from '@/app/components/LegalPage';

export const metadata = { title: 'Privacy Policy — MatriMoney' };

const sections = [
  {
    title: 'Information we collect',
    body: [
      'Account details you provide (name, email, mobile number, date of birth, gender), profile details (religion, community, education, profession, family details, partner preferences), photos you upload, and messages you exchange on the platform.',
      'Technical information such as device, browser, IP address and pages visited, used to keep the service secure and working well.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'To create and display your matrimonial profile, recommend compatible matches, enable interests, shortlists and conversations, process payments for premium plans, verify profiles, prevent fraud and abuse, and respond to your support requests.',
      'We do not sell your personal data.',
    ],
  },
  {
    title: 'Who can see your profile',
    body: [
      'Your profile is visible to registered members according to your Privacy and Profile Visibility settings. You can lock your photos, hide contact details and block any member at any time. Contact details are shared only as described in your plan and settings.',
    ],
  },
  {
    title: 'Sharing with service providers',
    body: [
      'We share the minimum necessary data with trusted processors who help us run the service — hosting, email delivery and payment processing (e.g. Razorpay). They may use it only to provide those services to us. We may disclose information when required by law.',
    ],
  },
  {
    title: 'Data retention & your rights',
    body: [
      'We keep your data while your account is active. You can edit your profile, deactivate it temporarily, or delete it permanently from Settings. On deletion, your profile is removed from the platform; limited records may be retained where required by law (for example payment records).',
      'Under the Digital Personal Data Protection Act, 2023 you may request access to, correction of, or erasure of your personal data, and withdraw consent, by writing to our Grievance Officer below.',
    ],
  },
  {
    title: 'Security',
    body: [
      'Passwords are stored as one-way hashes, sessions use signed tokens, and connections are encrypted. No system is perfectly secure, so please never share your password or OTP with anyone.',
    ],
  },
  {
    title: 'Grievance Officer',
    body: [
      <p key="g">
        For any privacy concern or complaint, contact our Grievance Officer: <b>[Name]</b>, MatriMoney, Bhubaneswar, Odisha, India ·
        Email: <a className="text-danger" href="mailto:support@matrimony.com">support@matrimony.com</a> · Phone: +91 6370103299.
        We acknowledge complaints within 24 hours and resolve them within 15 days.
      </p>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your Trust Matters"
      title="Privacy Policy"
      subtitle="How MatriMoney collects, uses and protects your personal information."
      updated="23 November 2026"
      note="Template policy — please have it reviewed by your legal advisor and fill in the Grievance Officer's name before launch."
      sections={sections}
    />
  );
}
