'use client';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  collegeId: string;
  universityName: string;
  programLevel: 'undergraduate' | 'postgraduate';
};

export default function DeleteUniversityButton({ action, collegeId, universityName, programLevel }: Props) {
  const programmeLabel = programLevel === 'postgraduate' ? 'Post Graduate' : 'Under Graduate';
  return (
    <form
      action={action}
      className="delete-university-form"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Send a request to the Super User to delete the ${programmeLabel} row for ${universityName}?`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="collegeId" value={collegeId} />
      <input type="hidden" name="programLevel" value={programLevel} />
      <input type="hidden" name="targetName" value={`${universityName} (${programmeLabel})`} />
      <button className="danger-button university-delete-button" type="submit">
        Request deletion
      </button>
    </form>
  );
}
