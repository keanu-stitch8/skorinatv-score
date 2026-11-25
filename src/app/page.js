import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isOperator, operatorPassword, sessionCookie } from '../modules/auth/operator-auth';
import Scoreboard from '../modules/scoreboard';

export default async function Page() {
  const host = (await headers()).get('host');
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!isOperator({ host, token })) {
    redirect(operatorPassword() ? '/login' : '/scoreboard');
  }

  return <Scoreboard logout={Boolean(operatorPassword())} />;
}
