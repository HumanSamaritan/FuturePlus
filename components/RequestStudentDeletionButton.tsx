'use client';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  studentId: string;
  studentName: string;
};

export default function RequestStudentDeletionButton({ action, studentId, studentName }: Props) {
  return (
    <form action={action} onSubmit={(event) => {
      if (!window.confirm(`Send a request to the Super User to delete ${studentName}?`)) event.preventDefault();
    }}>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="targetName" value={studentName} />
      <button className="danger-button" type="submit">Request deletion</button>
    </form>
  );
}
