import type { Metadata } from 'next';
import FormDraftAutoSave from '@/components/FormDraftAutoSave';
import FormValidationEnhancer from '@/components/FormValidationEnhancer';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Future Plus Counselling MVP',
  description: 'Student admissions counselling and college recommendation MVP for Future Plus.',
  icons: {
    icon: '/future-plus-logo.jpg',
    shortcut: '/future-plus-logo.jpg',
    apple: '/future-plus-logo.jpg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <FormDraftAutoSave />
        <FormValidationEnhancer />
      </body>
    </html>
  );
}
