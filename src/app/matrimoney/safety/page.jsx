import LegalPage from '@/app/components/LegalPage';

export const metadata = { title: 'Safety Centre — MatriMoney' };

const sections = [
  {
    title: 'Protect your personal information',
    body: [
      'Keep conversations on MatriMoney until you are comfortable. Never share your password, OTP, bank details, Aadhaar or PAN with another member.',
      'Use Privacy Options in Settings to lock your photos and control who sees your contact details.',
    ],
  },
  {
    title: 'Never send money',
    body: [
      'A genuine prospective partner will never ask you for money, gifts, “customs fees”, medical bills or investment opportunities. Treat any such request as a scam and report the profile immediately.',
    ],
  },
  {
    title: 'Verify before you trust',
    body: [
      'Look for the Verified badge, talk on video before meeting, and involve your family. Cross-check education, employment and family details independently before finalising an alliance.',
    ],
  },
  {
    title: 'Meeting in person',
    body: [
      'Meet first in a public place during the day, tell a family member or friend where you are going, arrange your own transport and stay in control of your phone and belongings.',
    ],
  },
  {
    title: 'Report & block',
    body: [
      'If someone makes you uncomfortable, open their profile, tap the ⋯ menu and choose Report or Block. Blocked members can no longer see you, send interests or message you. Our safety team reviews every report within 24 hours.',
      'If you are in immediate danger, call 112 (national emergency) or the Women Helpline 181.',
    ],
  },
];

export default function SafetyPage() {
  return (
    <LegalPage
      eyebrow="Safety Centre"
      title="Stay Safe While You Search"
      subtitle="Practical guidance to help you find your partner with confidence."
      sections={sections}
    />
  );
}
