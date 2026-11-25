import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';

export const metadata = { title: 'Login operator | Skorina TV' };

export default async function LoginPage({ searchParams }) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto grid min-h-screen w-[calc(100%-2rem)] max-w-sm place-items-center">
      <Card className="w-full border-border">
        <CardHeader>
          <CardTitle role="heading" aria-level={1}>Panel operator</CardTitle>
          <CardDescription>Masukkan password operator untuk mengubah skor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="post" action="/api/login" className="grid gap-3">
            <label className="grid gap-1.5 text-sm" htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                className="h-9 rounded-md border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            {error && <p className="m-0 text-sm text-destructive" role="alert">Password salah.</p>}
            <Button type="submit">Masuk</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
