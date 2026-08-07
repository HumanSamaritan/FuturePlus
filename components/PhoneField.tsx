'use client';

import { useMemo, useState } from 'react';
import { PHONE_COUNTRIES, normalisePhoneNumber, phoneValidationMessage, splitInternationalPhone } from '@/lib/form-validation';

type Props = {
  defaultValue?: string | null;
  required?: boolean;
  idPrefix?: string;
};

export default function PhoneField({ defaultValue, required = true, idPrefix = 'student' }: Props) {
  const initial = useMemo(() => splitInternationalPhone(defaultValue), [defaultValue]);
  const [country, setCountry] = useState(initial.country || 'IN');
  const [phone, setPhone] = useState(initial.national || '');
  const message = phone ? phoneValidationMessage(phone, country) : '';

  return (
    <div className="phone-field-grid">
      <div className="field">
        <label htmlFor={`${idPrefix}-phone-country`}>Country code *</label>
        <select
          id={`${idPrefix}-phone-country`}
          name="phoneCountry"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          required={required}
        >
          {PHONE_COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-phone`}>Phone *</label>
        <input
          id={`${idPrefix}-phone`}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phone}
          onChange={(event) => setPhone(normalisePhoneNumber(event.target.value))}
          onBlur={(event) => event.currentTarget.setCustomValidity(phoneValidationMessage(event.currentTarget.value, country))}
          onInput={(event) => event.currentTarget.setCustomValidity('')}
          maxLength={15}
          required={required}
          aria-describedby={`${idPrefix}-phone-help`}
        />
        <span id={`${idPrefix}-phone-help`} className="help-text">
          Enter the national number only; the selected country code will be saved with it.
          {message ? ` ${message}` : ''}
        </span>
      </div>
    </div>
  );
}
