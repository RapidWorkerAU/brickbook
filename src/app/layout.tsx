import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brickbook",
  description: "Brickbook is being rebuilt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
