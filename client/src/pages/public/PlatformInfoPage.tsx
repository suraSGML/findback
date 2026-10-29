import React from 'react';
import { Lock, ShieldCheck, FileText } from 'lucide-react';

type PlatformInfoType = 'privacy' | 'terms' | 'security';

const pageContent: Record<PlatformInfoType, {
  title: string;
  intro: string;
  icon: typeof Lock;
  sections: { heading: string; paragraphs: string[] }[];
}> = {
  privacy: {
    title: 'Privacy',
    intro: 'FindBack uses account and report information to help people identify and safely return lost property.',
    icon: Lock,
    sections: [
      {
        heading: 'Information and visibility',
        paragraphs: [
          'Public lost-and-found reports show information needed to identify an item and its general location. Keep private contact details and sensitive identifiers out of public descriptions.',
          'Secret identifying details submitted for found items are kept out of public searches and claimant-facing claim details so a finder can use them to verify a claim.',
        ],
      },
      {
        heading: 'Accounts, claims, and messages',
        paragraphs: [
          'Account information is used to provide sign-in, profiles, and platform features. Claim details omit claimant email and phone information; messages are available to conversation participants and authorized administrators.',
          'Uploaded images may be used with reports, claims, or other platform records. Old uploads are eligible for cleanup only when they are no longer referenced by those records.',
        ],
      },
      {
        heading: 'Questions',
        paragraphs: [
          'Do not share passwords, payment codes, or other highly sensitive information in reports or messages. Contact the platform operator for questions about personal information or data requests.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    intro: 'Use FindBack to report and recover property honestly, respectfully, and safely.',
    icon: FileText,
    sections: [
      {
        heading: 'Accurate reports and claims',
        paragraphs: [
          'Provide truthful information about lost or found items and submit an ownership claim only when you believe the item is yours. Do not impersonate another person, submit fraudulent claims, or misuse another person’s information.',
          'FindBack may use submitted details to suggest possible matches. A suggested match is not proof of ownership; claim verification and a safe handover still require care.',
        ],
      },
      {
        heading: 'Respectful and safe conduct',
        paragraphs: [
          'Use in-app messages for relevant handover coordination. Do not harass, threaten, scam, or request payment or sensitive credentials in exchange for an item.',
          'Arrange handovers in a public place and consider meeting during daylight. FindBack does not supervise in-person exchanges and cannot guarantee another user’s conduct.',
        ],
      },
      {
        heading: 'Moderation',
        paragraphs: [
          'Users may report suspicious content or behavior for review. The platform may restrict accounts or content to protect users and maintain the service.',
        ],
      },
    ],
  },
  security: {
    title: 'Security',
    intro: 'FindBack includes application safeguards, but secure operation also depends on deployment configuration and responsible use.',
    icon: ShieldCheck,
    sections: [
      {
        heading: 'Application safeguards',
        paragraphs: [
          'The application uses authenticated sessions and role checks, validates request data, limits selected API requests, and restricts access to private reports, conversations, and claim information.',
          'Password reset invalidates existing sessions. Reset email delivery is unavailable until a deployment has configured and tested its own SMTP provider.',
        ],
      },
      {
        heading: 'Safe use',
        paragraphs: [
          'Use a unique password and do not send passwords, banking details, or payment codes through the service. Share only information needed to verify ownership.',
          'For physical handovers, choose a busy public location and do not go alone if you feel unsafe.',
        ],
      },
      {
        heading: 'Deployment and reporting concerns',
        paragraphs: [
          'Operators should use HTTPS, protect secrets with a hosting-provider secret manager, restrict database access, maintain backups, and configure persistent upload storage and rate limiting for their deployment.',
          'Builds and automated tests are not a penetration test or a guarantee of security. Report suspected security issues to the platform operator without accessing or changing other users’ data.',
        ],
      },
    ],
  },
};

export const PlatformInfoPage: React.FC<{ type: PlatformInfoType }> = ({ type }) => {
  const content = pageContent[type];
  const Icon = content.icon;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <header className="border-b border-slate-200 pb-6 space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
          <Icon className="w-4 h-4" aria-hidden="true" />
          <span>FindBack information</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{content.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{content.intro}</p>
      </header>

      <div className="space-y-5">
        {content.sections.map((section) => (
          <section key={section.heading} className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-slate-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm text-slate-600 leading-relaxed">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
};
