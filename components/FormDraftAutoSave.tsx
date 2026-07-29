'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const SAVE_INTERVAL_MS = 2000;
const STORAGE_PREFIX = 'future-plus-form-draft';

type DraftControl = {
  key: string;
  value?: string;
  checked?: boolean;
  selected?: string[];
};

type FormDraft = {
  controls: DraftControl[];
  savedAt: string;
};

type EditableControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function editableControls(form: HTMLFormElement): EditableControl[] {
  return Array.from(form.elements).filter((element): element is EditableControl => {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement) &&
      !(element instanceof HTMLSelectElement)
    ) {
      return false;
    }

    if (element.disabled || !element.name) {
      return false;
    }

    if (element instanceof HTMLInputElement) {
      return !['button', 'file', 'hidden', 'password', 'reset', 'submit'].includes(element.type);
    }

    return true;
  });
}

function eligibleForms(): HTMLFormElement[] {
  return Array.from(document.forms).filter((form) => {
    if (form.dataset.noAutosave === 'true' || form.method.toLowerCase() === 'get') {
      return false;
    }

    const isApprovalAction = form.querySelector(
      'input[name="decision"], input[name="requestId"]'
    );

    return !isApprovalAction && editableControls(form).length > 0;
  });
}

function controlKeys(controls: EditableControl[]) {
  const occurrences = new Map<string, number>();

  return controls.map((control) => {
    const type = control instanceof HTMLInputElement ? control.type : control.tagName.toLowerCase();
    const base = `${control.name}:${type}`;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return `${base}:${occurrence}`;
  });
}

function formStorageKey(pathname: string, form: HTMLFormElement, index: number) {
  const recordIdentity = form.querySelector<HTMLInputElement>(
    'input[name="studentId"], input[name="courseId"], input[name="collegeId"], input[name="universityId"]'
  )?.value;
  const identity = form.id || form.getAttribute('name') || recordIdentity || `form-${index}`;

  return `${STORAGE_PREFIX}:${pathname}:${identity}`;
}

function saveForm(pathname: string, form: HTMLFormElement, index: number) {
  const controls = editableControls(form);
  const keys = controlKeys(controls);
  const draft: FormDraft = {
    savedAt: new Date().toISOString(),
    controls: controls.map((control, controlIndex) => {
      const saved: DraftControl = { key: keys[controlIndex] };

      if (control instanceof HTMLSelectElement && control.multiple) {
        saved.selected = Array.from(control.selectedOptions).map((option) => option.value);
      } else if (
        control instanceof HTMLInputElement &&
        (control.type === 'checkbox' || control.type === 'radio')
      ) {
        saved.checked = control.checked;
      } else {
        saved.value = control.value;
      }

      return saved;
    })
  };

  localStorage.setItem(formStorageKey(pathname, form, index), JSON.stringify(draft));
}

function restoreForm(pathname: string, form: HTMLFormElement, index: number) {
  const rawDraft = localStorage.getItem(formStorageKey(pathname, form, index));
  if (!rawDraft) return;

  try {
    const draft = JSON.parse(rawDraft) as FormDraft;
    const savedControls = new Map(draft.controls.map((control) => [control.key, control]));
    const controls = editableControls(form);
    const keys = controlKeys(controls);

    controls.forEach((control, controlIndex) => {
      const saved = savedControls.get(keys[controlIndex]);
      if (!saved) return;

      if (control instanceof HTMLSelectElement && control.multiple) {
        const selected = new Set(saved.selected ?? []);
        Array.from(control.options).forEach((option) => {
          option.selected = selected.has(option.value);
        });
      } else if (
        control instanceof HTMLInputElement &&
        (control.type === 'checkbox' || control.type === 'radio')
      ) {
        control.checked = Boolean(saved.checked);
      } else if (saved.value !== undefined) {
        control.value = saved.value;
      }
    });
  } catch {
    localStorage.removeItem(formStorageKey(pathname, form, index));
  }
}

export default function FormDraftAutoSave() {
  const pathname = usePathname();
  const [status, setStatus] = useState<'hidden' | 'saving' | 'saved'>('hidden');

  useEffect(() => {
    const forms = eligibleForms();
    if (forms.length === 0) {
      setStatus('hidden');
      return;
    }

    forms.forEach((form, index) => restoreForm(pathname, form, index));

    const submitHandlers = forms.map((form, index) => {
      const clearDraft = () => {
        localStorage.removeItem(formStorageKey(pathname, form, index));
      };
      form.addEventListener('submit', clearDraft);
      return { form, clearDraft };
    });

    const interval = window.setInterval(() => {
      setStatus('saving');

      try {
        eligibleForms().forEach((form, index) => saveForm(pathname, form, index));
        setStatus('saved');
      } catch {
        setStatus('hidden');
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      submitHandlers.forEach(({ form, clearDraft }) => {
        form.removeEventListener('submit', clearDraft);
      });
    };
  }, [pathname]);

  if (status === 'hidden') return null;

  return (
    <div className="draft-autosave-status" role="status" aria-live="polite">
      <span className="draft-autosave-dot" aria-hidden="true" />
      {status === 'saving' ? 'Saving draft…' : 'Draft auto-saved'}
    </div>
  );
}
