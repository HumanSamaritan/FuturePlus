'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button" type="submit" disabled={pending}>
      {pending ? 'Saving...' : children}
    </button>
  );
}
