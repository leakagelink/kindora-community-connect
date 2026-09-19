export const LEGAL_PLACEHOLDERS = {
  entity: "[Legal entity name to be confirmed]",
  address: "[Registered address to be confirmed]",
  email: "[support email to be confirmed]",
  jurisdiction: "[Jurisdiction to be confirmed]",
};

export type LegalDoc = {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string[] }[];
};

const P = LEGAL_PLACEHOLDERS;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What we collect, why we collect it, and the choices you have.",
    sections: [
      {
        heading: "Who we are",
        body: [
          `Kindora is operated by ${P.entity}, powered by Socilet. Contact: ${P.email}. Registered address: ${P.address}.`,
          "These details are placeholders until the operating entity is formally confirmed. We do not claim any registration, licence or certification that has not been verified.",
        ],
      },
      {
        heading: "Information we collect",
        body: [
          "Account information: email address and password (stored only as a secure hash by our authentication provider), plus anything you add to your profile such as display name, photo, bio, skills, languages and general location.",
          "Content you create: help requests, helper profiles, product listings, applications, messages, reviews and reports, including attachments you upload.",
          "Usage information: basic technical logs, AI tool usage counts for fair-usage limits, and moderation records.",
        ],
      },
      {
        heading: "How we use information",
        body: [
          "To operate the platform: publishing your content where you chose to publish it, matching requests with volunteers, and delivering messages and notifications.",
          "To keep people safe: reviewing reported content, enforcing our Community Guidelines, and applying rate limits and abuse prevention.",
          "To keep free AI tools sustainable: counting your usage against per-user quotas.",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "We do not publish your email address, phone number or precise home address by default.",
          "We do not sell your personal information.",
          "We do not require payment to receive help, and donations (when available) are never linked to your visibility or priority.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can edit or delete your content, control privacy settings on your profile, adjust non-essential notification preferences, and block other users.",
          "You can request account deletion at any time from your profile settings. See the Account Deletion page for what is removed and what is retained for safety and legal reasons.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Content you delete is removed from public view immediately. Limited records — such as moderation actions, reports and audit logs — are retained for a reasonable period so we can investigate abuse and comply with legal obligations.",
        ],
      },
      { heading: "Contact", body: [`Questions about privacy: ${P.email}.`] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The rules for using Kindora.",
    sections: [
      {
        heading: "Using Kindora",
        body: [
          "You must be able to form a binding agreement in your jurisdiction to create an account. You are responsible for the accuracy of what you post and for your conduct on the platform.",
          "Kindora connects people who want help with people willing to give it. We are not a party to any arrangement between users and we do not guarantee that any request will be accepted or completed.",
        ],
      },
      {
        heading: "Help is free",
        body: [
          "No payment may be required to receive help offered through Kindora. Asking a requester for mandatory payment, fees or deposits is a violation and may result in restriction or removal of your account.",
          "Volunteers decide freely what they take on. Scope, availability and capacity are entirely up to them. Nothing on Kindora promises unlimited free development or delivery of any project.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You keep ownership of what you post and grant us the licence needed to host and display it on the platform. You must have the right to post it.",
          "We may review, hide or remove content that breaks our Community Guidelines, Prohibited Products and Services Policy, or User-Generated Content Rules.",
        ],
      },
      {
        heading: "AI tools",
        body: [
          "Free AI tools are provided as-is with fair-usage limits. Output may be inaccurate or require review, and we make no claim that output is original, legally cleared or suitable for commercial use. You are responsible for checking anything you use.",
        ],
      },
      {
        heading: "Suspension and termination",
        body: [
          "We may warn, restrict, suspend or remove accounts that violate these terms or endanger others. You may stop using Kindora and delete your account at any time.",
        ],
      },
      {
        heading: "Disclaimers and governing law",
        body: [
          "The platform is provided without warranties to the extent permitted by law. These terms are governed by the laws of " +
            `${P.jurisdiction}. This section is a placeholder pending legal review.`,
        ],
      },
    ],
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    summary: "How we expect people to treat each other here.",
    sections: [
      {
        heading: "Be genuine",
        body: [
          "Describe what you need or offer honestly. Do not exaggerate your experience, invent credentials, or post requests you do not intend to follow through on.",
        ],
      },
      {
        heading: "Never require payment",
        body: [
          "Help on Kindora is free. Do not ask for fees, deposits, commissions or paid upgrades in exchange for help. Report anyone who does.",
        ],
      },
      {
        heading: "Be respectful",
        body: [
          "No harassment, hate speech, threats, sexual content, or targeting people based on who they are. Disagreement is fine; abuse is not.",
        ],
      },
      {
        heading: "Protect privacy",
        body: [
          "Do not share other people's personal information, and be careful about sharing your own. Keep conversations in Kindora messaging until you are comfortable.",
        ],
      },
      {
        heading: "Stay safe offline",
        body: [
          "For product pickups, choose public places where possible, tell someone where you are going, and do not feel pressured to continue if something feels wrong.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "Every request, listing, profile, message and review can be reported. Our moderators review reports and may issue warnings, temporary suspensions or permanent restrictions.",
        ],
      },
    ],
  },
  {
    slug: "prohibited-items",
    title: "Prohibited Products and Services Policy",
    summary: "What may never be requested, offered or given away on Kindora.",
    sections: [
      {
        heading: "Never allowed",
        body: [
          "Weapons, ammunition, explosives and regulated weapon parts.",
          "Prescription medication, controlled substances, drugs and drug paraphernalia.",
          "Alcohol, tobacco, vaping products and other age-restricted goods.",
          "Stolen, counterfeit or illegally obtained goods.",
          "Live animals.",
          "Hazardous materials, recalled products and unsafe electrical or gas equipment.",
          "Adult or sexual products and services.",
          "Personal data, account credentials, or access to accounts and services that are not yours to give.",
          "Financial services, lending, investment advice presented as guaranteed, or anything requiring a licence you do not hold.",
        ],
      },
      {
        heading: "Services that require care",
        body: [
          "Medical, legal, financial and safety-critical advice must not be presented as professional advice unless you are qualified and say so accurately. General guidance is welcome; guarantees are not.",
        ],
      },
      {
        heading: "Enforcement",
        body: [
          "Listings and requests are reviewed before publication and can be removed at any time. Serious or repeated violations lead to permanent restriction. The prohibited items list is maintained by administrators and may be updated.",
        ],
      },
    ],
  },
  {
    slug: "content-rules",
    title: "User-Generated Content Rules",
    summary: "Standards for everything you post, upload or send.",
    sections: [
      {
        heading: "Content standards",
        body: [
          "Post only content you have the right to share. No illegal content, hate, harassment, sexual content, graphic violence, self-harm promotion, or content endangering minors.",
          "No spam, repeated posting, misleading titles, scams, phishing or off-platform payment solicitation.",
        ],
      },
      {
        heading: "Attachments and images",
        body: [
          "Uploads must match the content you describe and are limited by type and size. Do not upload images of other people without their consent.",
        ],
      },
      {
        heading: "Moderation",
        body: [
          "Content may be reviewed before publication and after reports. We can hide or remove content and notify you of the action taken. Moderation actions are logged.",
        ],
      },
      {
        heading: "Reviews",
        body: [
          "Reviews are only possible after a completed engagement, one per engagement, never about yourself. Fabricated ratings and testimonials are removed.",
        ],
      },
    ],
  },
  {
    slug: "support-policy",
    title: "Donation and Support Policy",
    summary: "How voluntary support works — and what it never buys.",
    sections: [
      {
        heading: "Support is optional",
        body: [
          "You can receive help on Kindora without ever donating. Donations are voluntary contributions to platform operations.",
        ],
      },
      {
        heading: "What donations never do",
        body: [
          "They do not unlock services, increase your ranking or visibility, guarantee that a request is accepted, or create any obligation for volunteers.",
          "They are not fees, subscriptions or payment for services.",
        ],
      },
      {
        heading: "Where funds go",
        body: [
          "Contributions support running costs such as hosting, AI tool usage, moderation and safety work. We publish summary records of what is received and how it is used.",
        ],
      },
      {
        heading: "Status",
        body: [
          "Donation payments are disabled until payment integration and the applicable Indian payment, tax and app-store billing requirements have been verified. We make no tax-deductibility claims. There are no user-to-user transfers and no stored-value wallet.",
        ],
      },
    ],
  },
  {
    slug: "account-deletion",
    title: "Account Deletion",
    summary: "How to delete your Kindora account and what happens to your data.",
    sections: [
      {
        heading: "How to delete",
        body: [
          "Open Profile, then Settings, then Delete account. You will be asked to confirm. You can also email a deletion request to " +
            `${P.email} from your registered address.`,
        ],
      },
      {
        heading: "What is deleted",
        body: [
          "Your profile is removed from public view, along with your help requests, helper profile, product listings and applications. Your messages are removed from your side of conversations.",
        ],
      },
      {
        heading: "What is retained",
        body: [
          "Limited records are retained for safety, fraud prevention and legal compliance: moderation actions, reports involving your account, and audit logs of privileged actions. These are kept for a reasonable period and are not publicly visible.",
        ],
      },
      { heading: "Questions", body: [`Contact ${P.email} if you need help with deletion.`] },
    ],
  },
];

export function getLegalDoc(slug: string) {
  return LEGAL_DOCS.find((doc) => doc.slug === slug);
}
