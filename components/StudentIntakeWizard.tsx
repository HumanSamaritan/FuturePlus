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

function validateEmail(field: HTMLInputElement) {
  const value = field.value.trim();
  field.setCustomValidity('');
  if (!value) return true;
  const domain = value.split('@')[1]?.toLowerCase() || '';
  if (!field.validity.valid || /\.cim$/i.test(domain)) {
    field.setCustomValidity('Enter a valid email address. Please check the domain (for example, .com rather than .cim).');
    field.reportValidity();
    field.focus();
    return false;
  }
  return true;
}

function validatePhone(field: HTMLInputElement) {
  const value = field.value.trim();
  field.setCustomValidity('');
  const digits = value.replace(/\D/g, '');
  if (!/^\+?[0-9\s()-]+$/.test(value) || digits.length < 10 || digits.length > 13) {
    field.setCustomValidity('Enter a valid phone number containing 10 to 13 digits.');
    field.reportValidity();
    field.focus();
    return false;
  }
  return true;
}

function validateSchoolYears(container: HTMLDivElement | null) {
  if (!container) return true;
  const yearX = container.querySelector<HTMLInputElement>('input[name="yearX"]');
  const yearXii = container.querySelector<HTMLInputElement>('input[name="yearXii"]');
  if (!yearX || !yearXii || !yearX.value || !yearXii.value) return true;
  yearXii.setCustomValidity('');
  if (Number(yearX.value) >= Number(yearXii.value)) {
    yearXii.setCustomValidity('Year of passing XII must be later than the year of passing X.');
    yearXii.reportValidity();
    yearXii.focus();
    return false;
  }
  return true;
}

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

  function validateCurrentStep() {
    const container = sectionRefs.current[step];
    const fields = container?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');

    const email = container?.querySelector<HTMLInputElement>('input[name="email"]');
    if (email && !validateEmail(email)) return false;

    const phone = container?.querySelector<HTMLInputElement>('input[name="phone"]');
    if (phone && !validatePhone(phone)) return false;

    if (!validateSchoolYears(container ?? null)) return false;

    const invalid = Array.from(fields ?? []).find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return false;
    }
    return true;
  }

  function goForward() {
    if (!validateCurrentStep()) return;
    window.alert('Details validated successfully. Click OK to continue to the next section.');
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
