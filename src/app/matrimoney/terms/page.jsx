import LegalPage from '@/app/components/LegalPage';

export const metadata = { title: 'Terms of Use — MatriMoney' };

const sections = [
  {
    title: 'Eligibility',
    body: [
      'MatriMoney is strictly for matrimonial purposes. To register you must be legally eligible to marry in India — at least 21 years old for men and 18 years old for women — and not otherwise prohibited by law from marrying.',
      'Profiles may be created by the individual or by a parent, sibling, relative or friend on their behalf with their consent.',
    ],
  },
  {
    title: 'Your account',
    body: [
      'You are responsible for the accuracy of the information you provide and for keeping your password confidential. Each person may have only one active profile.',
      'You must not impersonate anyone, post misleading details about your marital status, age, education, income or family, or upload photos that are not of you.',
    ],
  },
  {
    title: 'Acceptable use',
    body: [
      'Do not harass, threaten or abuse other members; request money or financial details; share obscene, defamatory or unlawful content; use the platform for dating, commercial promotion or solicitation; or scrape or misuse other members’ information.',
      'Members can report any profile. We may review, suspend or remove profiles that violate these terms, without refund for the remaining plan period.',
    ],
  },
  {
    title: 'Premium plans & payments',
    body: [
      'Paid plans provide the features, validity and contact allowance described on the Membership page. Prices are exclusive of GST, which is added at checkout. Payments are processed securely by our payment partner.',
      'Because plan benefits are available immediately, payments are generally non-refundable except where required by law or where the service could not be provided due to our error.',
    ],
  },
  {
    title: 'Verification & limitation of liability',
    body: [
      'We screen profiles and verify certain details, but we cannot guarantee the identity, intentions or background of any member. Please exercise due diligence before sharing personal information, meeting or finalising an alliance — see our Safety Centre.',
      'MatriMoney is not responsible for the conduct of members on or off the platform, to the maximum extent permitted by law.',
    ],
  },
  {
    title: 'Grievances & governing law',
    body: [
      'Complaints can be sent to our Grievance Officer (see the Privacy Policy). These terms are governed by the laws of India, with courts at Bhubaneswar, Odisha having jurisdiction.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Fair & Respectful"
      title="Terms of Use"
      subtitle="The rules that keep MatriMoney safe, genuine and respectful for every family."
      updated="23 November 2026"
      note="Template terms — please have them reviewed by your legal advisor before launch."
      sections={sections}
    />
  );
}
