import Link from "next/link";
import Nav from "@/components/Nav";

const LAST_UPDATED = "1 June 2025";

const SECTIONS = [
  {
    title: "Acceptance of terms",
    content: "By accessing or using Brickbook, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our platform. These terms apply to all visitors, users, and others who access or use Brickbook.",
  },
  {
    title: "Description of service",
    content: "Brickbook is a community platform that allows users to document and share their home building journeys. Users can create build profiles, post updates, share images, follow other builds, and engage with the community. Brickbook is not a building advisory service and does not provide construction, legal, or financial advice.",
  },
  {
    title: "User accounts",
    content: "You must create an account to access certain features of Brickbook. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating your account. You must be at least 18 years of age to create an account.",
  },
  {
    title: "User-generated content",
    content: "Users retain ownership of the content they post to Brickbook, including photos, updates, and comments. By posting content, you grant Brickbook a non-exclusive, royalty-free, worldwide licence to use, display, and distribute your content in connection with operating the platform. You are solely responsible for the content you post and must ensure it does not infringe any third-party rights or violate any applicable laws.",
  },
  {
    title: "Prohibited conduct",
    content: "You agree not to post content that is defamatory, harassing, abusive, or otherwise harmful. You must not impersonate other users or misrepresent your identity. You must not use Brickbook to spam, solicit, or advertise without authorisation. You must not attempt to gain unauthorised access to other user accounts or Brickbook systems. Brickbook reserves the right to remove content and suspend accounts that violate these terms.",
  },
  {
    title: "Builder profiles and data",
    content: "Brickbook aggregates data about builders based on user-generated content. Builder profiles are created from public information and user submissions. Builders may claim their profile to manage their presence on the platform. Brickbook does not independently verify information about builders and makes no representations about the accuracy of builder data or performance metrics.",
  },
  {
    title: "Intellectual property",
    content: "The Brickbook platform, including its design, logo, and software, is owned by Brickbook and protected by applicable intellectual property laws. You may not copy, modify, or distribute any part of the platform without our prior written consent.",
  },
  {
    title: "Privacy",
    content: "Your use of Brickbook is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices.",
  },
  {
    title: "Limitation of liability",
    content: "Brickbook is provided on an as-is basis without warranties of any kind. To the fullest extent permitted by law, Brickbook disclaims all liability for any direct, indirect, incidental, or consequential damages arising from your use of the platform. This includes but is not limited to any reliance on information posted by other users.",
  },
  {
    title: "Changes to terms",
    content: "Brickbook reserves the right to modify these Terms at any time. We will notify users of material changes by posting the updated terms on the platform and updating the date below. Continued use of Brickbook after changes are posted constitutes acceptance of the revised terms.",
  },
  {
    title: "Governing law",
    content: "These Terms are governed by the laws of Western Australia, Australia. Any disputes arising from these Terms will be subject to the exclusive jurisdiction of the courts of Western Australia.",
  },
  {
    title: "Contact",
    content: "If you have any questions about these Terms, please contact us at hello@brickbook.com.au.",
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms and Conditions" intro="Please read these Terms and Conditions carefully before using Brickbook. These terms constitute a legal agreement between you and Brickbook." sections={SECTIONS} />;
}

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { title: string; content: string }[] }) {
  return (
    <div className="page-shell">
      <Nav />
      <header className="legal-header">
        <div className="legal-container">
          <p className="landing-kicker">Legal</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Last updated {LAST_UPDATED}</p>
        </div>
      </header>
      <main className="legal-container legal-body">
        <p className="legal-intro">{intro}</p>
        {sections.map((section, index) => (
          <section className="legal-section" key={section.title}>
            <h2 className="legal-section-title">{index + 1}. {section.title}</h2>
            <p className="legal-section-copy">{section.content}</p>
          </section>
        ))}
        <div className="legal-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </main>
    </div>
  );
}
