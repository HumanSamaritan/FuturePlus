'use client';

import { useRef, useState, type ReactNode } from 'react';
import SubmitButton from '@/components/SubmitButton';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  programLevel: 'undergraduate' | 'postgraduate';
  stepLabels: string[];
  submitLabel: string;
  children: ReactNode;
};

export default function StudentIntakeWizard({
  action,
  programLevel,
  stepLabels,
  submitLabel,
  children
}: Props) {
  const [step, setStep] = useState(0);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const sections = Array.isArray(children) ? children : [children];

  function goForward() {
    const fields = sectionRefs.current[step]?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );
    const invalid = Array.from(fields ?? []).find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    setStep((current) => Math.min(current + 1, sections.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <form action={action} className="intake-wizard">
      <input type="hidden" name="programLevel" value={programLevel} />
      <nav className="wizard-progress" aria-label="Intake form progress">
        {stepLabels.map((label, index) => (
          <button
            aria-current={index === step ? 'step' : undefined}
            className={index === step ? 'wizard-step active' : index < step ? 'wizard-step complete' : 'wizard-step'}
            key={label}
            onClick={() => index < step && setStep(index)}
            type="button"
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      {sections.map((section, index) => (
        <div
          className="wizard-page"
          hidden={index !== step}
          key={index}
          ref={(element) => {
            sectionRefs.current[index] = element;
          }}
        >
          {section}
        </div>
      ))}

      <div className="wizard-actions">
        {step > 0 ? <button className="secondary-button" onClick={goBack} type="button">Back</button> : <span />}
        {step < sections.length - 1
          ? <button className="primary-button" onClick={goForward} type="button">Save and continue</button>
          : <SubmitButton>{submitLabel}</SubmitButton>}
      </div>
    </form>
  );
}
