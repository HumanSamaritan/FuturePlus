import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSLE Science MCQ Mission | Future Plus",
  description: "A child-friendly PSLE Science MCQ self-learning coach with adaptive practice, concept explanations, mistake review and an 18-day revision sprint.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
