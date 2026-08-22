import { redirect } from 'next/navigation';

const EDUCAREER_PARTNER_WORKSPACE = 'https://educareer.omnexagoc.com/partner-workspace';

export default function StaffLoginRedirectPage() {
  redirect(EDUCAREER_PARTNER_WORKSPACE);
}
