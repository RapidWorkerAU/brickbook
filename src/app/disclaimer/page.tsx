import Link from "next/link";
import Nav from "@/components/Nav";

const LAST_UPDATED = "1 June 2025";

const SECTIONS = [
  {
    title: "General information only",
    content: "The content published on Brickbook, including build profiles, updates, photos, comments, and all other user-generated content, is provided for general informational and community purposes only. Nothing on this platform constitutes professional advice of any kind, including construction, architectural, engineering, legal, financial, or health and safety advice.",
  },
  {
    title: "User-generated content",
    content: "Brickbook is a community platform. The vast majority of content on this site is created and published by individual users documenting their own building experiences. Brickbook does not verify, endorse, or take responsibility for the accuracy, completeness, or reliability of any content posted by users.",
  },
  {
    title: "Builder information",
    content: "Builder profiles, performance data, build timelines, and other statistics displayed on Brickbook are generated from user-submitted data. This information is not independently verified by Brickbook and may be incomplete, inaccurate, or out of date. Brickbook makes no representations about the quality, reliability, or suitability of any builder listed on the platform.",
  },
  {
    title: "No warranty",
    content: "Brickbook is provided on an as-is and as-available basis without any warranties, express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free of harmful components.",
  },
  {
    title: "Limitation of liability",
    content: "To the maximum extent permitted by applicable law, Brickbook and its operators, directors, employees, and agents shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of your use of or inability to use the platform, or from any content obtained from the platform.",
  },
  {
    title: "Third-party links",
    content: "Brickbook may contain links to third-party websites, including builder websites and social media profiles. These links are provided for convenience only. Brickbook has no control over the content or practices of third-party sites and accepts no responsibility for them.",
  },
  {
    title: "Professional advice",
    content: "Before making any decisions related to your home build, including engaging a builder, purchasing land, or committing to a contract, you should seek advice from qualified professionals including licensed builders, architects, engineers, lawyers, and financial advisors as appropriate to your circumstances.",
  },
  {
    title: "Applicable law",
    content: "This disclaimer is governed by the laws of Western Australia, Australia. Nothing in this disclaimer limits any rights you may have under applicable consumer protection laws, including the Australian Consumer Law.",
  },
];

export default function DisclaimerPage() {
  return (
    <div className="page-shell">
      <Nav />
      <header className="legal-header">
        <div className="legal-container">
          <p className="landing-kicker">Legal</p>
          <h1 className="page-title">Disclaimer</h1>
          <p className="page-subtitle">Last updated {LAST_UPDATED}</p>
        </div>
      </header>
      <main className="legal-container legal-body">
        <p className="legal-intro">Brickbook is a community platform for sharing home building journeys. Content on this site is user-generated and provided for informational purposes only. Please read this disclaimer carefully before relying on any information you find here.</p>
        {SECTIONS.map((section, index) => (
          <section className="legal-section" key={section.title}>
            <h2 className="legal-section-title">{index + 1}. {section.title}</h2>
            <p className="legal-section-copy">{section.content}</p>
          </section>
        ))}
        <div className="legal-links">
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
