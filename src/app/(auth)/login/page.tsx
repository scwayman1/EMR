import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-text-muted mt-1.5">
          Sign in to continue your care.
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-text-muted mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
