'use client';

import { useRef, useState, type ReactNode } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { emailValidationMessage, normalisePhoneNumber, phoneValidationMessage, schoolYearValidationMessage } from '@/lib/form-validation';

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

  function validateCurrentStep() {
    const container = sectionRefs.current[step];
    const fields = container?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');

    const email = container?.querySelector<HTMLInputElement>('input[name="email"]');
    if (email) {
      email.setCustomValidity(emailValidationMessage(email.value));
      if (!email.checkValidity()) {
        email.reportValidity();
        email.focus();
        return false;
      }
    }

    const phone = container?.querySelector<HTMLInputElement>('input[name="phone"]');
    if (phone) {
      phone.value = normalisePhoneNumber(phone.value);
      phone.setCustomValidity(phoneValidationMessage(phone.value));
      if (!phone.checkValidity()) {
        phone.reportValidity();
        phone.focus();
        return false;
      }
    }

    const yearX = container?.querySelector<HTMLInputElement>('input[name="yearX"]');
    const yearXii = container?.querySelector<HTMLInputElement>('input[name="yearXii"]');
    if (yearX || yearXii) {
      const message = schoolYearValidationMessage(yearX?.value || '', yearXii?.value || '');
      yearX?.setCustomValidity('');
      yearXii?.setCustomValidity(message);
      if (message) {
        yearXii?.reportValidity();
        (yearXii || yearX)?.focus();
        return false;
      }
    }

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

  function sanitisePhone(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (target?.name !== 'phone') return;
    const cleaned = normalisePhoneNumber(target.value);
    if (target.value !== cleaned) target.value = cleaned;
    target.setCustomValidity(phoneValidationMessage(cleaned));
  }

  function validateOnBlur(event: React.FocusEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (target?.name === 'email') {
      target.setCustomValidity(emailValidationMessage(target.value));
    }
    if (target?.name === 'phone') {
      target.value = normalisePhoneNumber(target.value);
      target.setCustomValidity(phoneValidationMessage(target.value));
    }
    if (target?.name === 'yearX' || target?.name === 'yearXii') {
      const form = event.currentTarget;
      const x = form.elements.namedItem('yearX') as HTMLInputElement | null;
      const xii = form.elements.namedItem('yearXii') as HTMLInputElement | null;
      const message = schoolYearValidationMessage(x?.value || '', xii?.value || '');
      x?.setCustomValidity('');
      xii?.setCustomValidity(message);
    }
  }

  return (
    <form action={action} className="intake-wizard" onInput={sanitisePhone} onBlur={validateOnBlur}>
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
