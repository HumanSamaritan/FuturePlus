'use client';

import { useEffect } from 'react';
import {
  BOARD_OPTIONS,
  PHONE_COUNTRIES,
  emailValidationMessage,
  formatInternationalPhone,
  normalisePhoneNumber,
  phoneValidationMessage,
  schoolYearValidationMessage,
  splitInternationalPhone
} from '@/lib/form-validation';

function ensurePhoneCountrySelector(phone: HTMLInputElement) {
  const form = phone.form;
  if (!form || form.elements.namedItem('phoneCountry')) return;

  const field = phone.closest('.field');
  if (!field) return;

  const existing = splitInternationalPhone(phone.value);
  if (existing.national && phone.value.startsWith('+')) phone.value = existing.national;

  const label = document.createElement('label');
  label.textContent = 'Country code *';
  label.className = 'phone-country-label';

  const select = document.createElement('select');
  select.name = 'phoneCountry';
  select.className = 'phone-country-select';
  select.required = true;
  PHONE_COUNTRIES.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.code;
    option.textContent = item.label;
    if (item.code === existing.country) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    phone.setCustomValidity(phone.value ? phoneValidationMessage(phone.value, select.value) : '');
  });

  field.insertBefore(select, phone);
  field.insertBefore(label, select);
}

function ensureBoardDropdown() {
  document.querySelectorAll<HTMLInputElement>('input[name="board"]').forEach((input) => {
    const select = document.createElement('select');
    select.id = input.id;
    select.name = input.name;
    select.required = input.required;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select board / curriculum';
    select.appendChild(placeholder);
    BOARD_OPTIONS.forEach((board) => {
      const option = document.createElement('option');
      option.value = board;
      option.textContent = board;
      if (board === input.value) option.selected = true;
      select.appendChild(option);
    });
    input.replaceWith(select);
  });
}

export default function FormValidationEnhancer() {
  useEffect(() => {
    document.querySelectorAll<HTMLInputElement>('input[name="phone"]').forEach(ensurePhoneCountrySelector);
    ensureBoardDropdown();

    function handleInput(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.type === 'email') {
        target.setCustomValidity(emailValidationMessage(target.value));
      }

      if (target.name === 'phone') {
        const cleaned = normalisePhoneNumber(target.value);
        if (target.value !== cleaned) target.value = cleaned;
        const country = (target.form?.elements.namedItem('phoneCountry') as HTMLSelectElement | null)?.value || 'IN';
        target.setCustomValidity(cleaned ? phoneValidationMessage(cleaned, country) : '');
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
        const country = (form.elements.namedItem('phoneCountry') as HTMLSelectElement | null)?.value || 'IN';
        phone.value = normalisePhoneNumber(phone.value);
        phone.setCustomValidity(phoneValidationMessage(phone.value, country));
        if (!phone.checkValidity()) {
          event.preventDefault();
          phone.reportValidity();
          phone.focus();
          return;
        }
        const international = formatInternationalPhone(phone.value, country);
        if (!international) {
          event.preventDefault();
          phone.setCustomValidity(phoneValidationMessage(phone.value, country));
          phone.reportValidity();
          phone.focus();
          return;
        }
        phone.value = international;
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
