import { redirect } from 'next/navigation';

// Legacy /admin/* pages were removed (replaced by /backoffice).
// Redirect everything under /admin so old bookmarks keep working.
export default async function LegacyAdminRedirect() {
  redirect('/backoffice');
}
