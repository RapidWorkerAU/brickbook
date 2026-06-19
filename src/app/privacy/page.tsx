import Link from "next/link";
import Nav from "@/components/Nav";

const LAST_UPDATED = "1 June 2025";

const SECTIONS = [
  {
    title: "Information we collect",
    content: "When you create an account, we collect your email address, chosen username, and display name. When you create a build profile, we collect the information you voluntarily provide, including build details, photos, milestones, and updates. We also collect standard usage data such as pages visited, features used, and device and browser information to help us improve the platform.",
  },
  {
    title: "How we use your information",
    content: "We use your information to operate and improve Brickbook, to personalise your experience, and to send you notifications about activity on your builds and accounts you follow. We do not sell your personal information to third parties. We do not share your information with advertisers. We may use anonymised, aggregated data to generate statistics about building trends, builder performance, and suburb data. This data does not identify individual users.",
  },
  {
    title: "Build profiles and public content",
    content: "When you create a build profile and choose to list it publicly, the information on that profile is visible to anyone who visits Brickbook. This includes your build details, updates, photos, and milestones, subject to the visibility settings you choose. You control the visibility of your content through your build settings. Private builds and private content are only visible to you when logged in. Follower-only content is visible to users who follow your build.",
  },
  {
    title: "Photos and images",
    content: "Photos you upload to Brickbook are stored securely and displayed according to your visibility settings. We do not use your photos to train AI models. We do not share your photos with third parties except as required to operate the platform, such as through secure cloud storage providers. You may delete your photos at any time from your build editor.",
  },
  {
    title: "Builder data",
    content: "When you tag a builder to your build, this information is used to generate builder profiles and statistics on Brickbook. This data is based on your submission and is not independently verified. Builders may contact us to claim and manage their profile. Claimed builder profiles are clearly identified.",
  },
  {
    title: "Cookies and tracking",
    content: "Brickbook uses essential cookies to maintain your session and keep you signed in. We use analytics cookies to understand how the platform is used and to improve the experience. We do not use advertising cookies or third-party tracking for advertising purposes. You may disable cookies in your browser settings, but this may affect your ability to use certain features.",
  },
  {
    title: "Data storage and security",
    content: "Your data is stored on secure servers provided by Supabase. We take reasonable technical and organisational measures to protect your information against unauthorised access, loss, or misuse. No method of transmission over the internet is completely secure, and we cannot guarantee absolute security.",
  },
  {
    title: "Data retention",
    content: "We retain your account and build data for as long as your account is active. If you delete your account, your personal information is removed within 30 days. Build content that has been publicly visible may be retained in anonymised form for statistical purposes. You may request deletion of your data at any time by contacting us.",
  },
  {
    title: "Your rights",
    content: "You have the right to access the personal information we hold about you, to correct inaccurate information, and to request deletion of your account and data. You can manage most of this from your account settings. For other requests, please contact us at privacy@brickbook.com.au.",
  },
  {
    title: "Children",
    content: "Brickbook is not directed at children under the age of 18. We do not knowingly collect personal information from users under 18. If we become aware that a user under 18 has provided personal information, we will take steps to remove that information.",
  },
  {
    title: "Changes to this policy",
    content: "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the platform and updating the date below. Your continued use of Brickbook after changes are posted constitutes acceptance of the revised policy.",
  },
  {
    title: "Contact",
    content: "If you have any questions about this Privacy Policy or how we handle your data, please contact us at privacy@brickbook.com.au.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <Nav />
      <header className="legal-header">
        <div className="legal-container">
          <p className="landing-kicker">Legal</p>
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-subtitle">Last updated {LAST_UPDATED}</p>
        </div>
      </header>
      <main className="legal-container legal-body">
        <p className="legal-intro">This Privacy Policy explains how Brickbook collects, uses, and protects your personal information. We are committed to handling your data responsibly and transparently.</p>
        {SECTIONS.map((section, index) => (
          <section className="legal-section" key={section.title}>
            <h2 className="legal-section-title">{index + 1}. {section.title}</h2>
            <p className="legal-section-copy">{section.content}</p>
          </section>
        ))}
        <div className="legal-links">
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </div>
      </main>
    </div>
  );
}
