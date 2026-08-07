'use client';

import { useEffect } from 'react';
import { emailValidationMessage, normalisePhoneNumber, phoneValidationMessage, schoolYearValidationMessage } from '@/lib/form-validation';

export default function FormValidationEnhancer() {
  useEffect(() => {
    function handleInput(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.type === 'email') {
        target.setCustomValidity(emailValidationMessage(target.value));
      }

      if (target.name === 'phone') {
        const cleaned = normalisePhoneNumber(target.value);
        if (target.value !== cleaned) target.value = cleaned;
        target.setCustomValidity(phoneValidationMessage(cleaned));
      }

      if (target.name === 'yearX' || target.name === 'yearXii') {
        const form = target.form;
        if (!form) return;
        const yearX = form.elements.namedItem('yearX') as HTMLInputElement | null;
        const yearXii = form.elements.namedItem('yearXii') as HTMLInputElement | null;
        const message = schoolYearValidationMessage(yearX?.value || '', yearXii?.value || '');
        yearX?.setCustomValidity('');
        yearXii?.setCustomValidity(message);
      }
    }

    function handleSubmit(event: Event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const emailInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="email"]'));
      for (const email of emailInputs) {
        email.setCustomValidity(emailValidationMessage(email.value));
        if (!email.checkValidity()) {
          event.preventDefault();
          email.reportValidity();
          email.focus();
          return;
        }
      }

      const phone = form.querySelector<HTMLInputElement>('input[name="phone"]');
      if (phone) {
        phone.value = normalisePhoneNumber(phone.value);
        phone.setCustomValidity(phoneValidationMessage(phone.value));
        if (!phone.checkValidity()) {
          event.preventDefault();
          phone.reportValidity();
          phone.focus();
          return;
        }
      }

      const yearX = form.querySelector<HTMLInputElement>('input[name="yearX"]');
      const yearXii = form.querySelector<HTMLInputElement>('input[name="yearXii"]');
      if (yearX || yearXii) {
        const message = schoolYearValidationMessage(yearX?.value || '', yearXii?.value || '');
        yearX?.setCustomValidity('');
        yearXii?.setCustomValidity(message);
        if (message) {
          event.preventDefault();
          yearXii?.reportValidity();
          (yearXii || yearX)?.focus();
        }
      }
    }

    document.addEventListener('input', handleInput, true);
    document.addEventListener('blur', handleInput, true);
    document.addEventListener('submit', handleSubmit, true);
    return () => {
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('blur', handleInput, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  return null;
}
