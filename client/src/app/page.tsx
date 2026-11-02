import { redirect } from 'next/navigation';

// The proxy already sends signed-out visitors to /login. Signed-in users land on the dashboard.
export default function Home() {
  redirect('/dashboard');
}
