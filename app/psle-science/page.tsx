import type { Metadata } from "next";
import PSLEScienceCoach from "./PSLEScienceCoach";

export const metadata: Metadata = {
  title: "PSLE Science MCQ Mission | Future Plus",
  description: "A child-friendly PSLE Science MCQ self-learning coach with adaptive practice, concept explanations, mistake review and an 18-day revision sprint.",
  robots: { index: false, follow: false }
};

export default function PSLESciencePage() {
  return <PSLEScienceCoach />;
}
