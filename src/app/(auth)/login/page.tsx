import Link from "next/link";
import { LoginForm } from "./login-form";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <Eyebrow className="mb-4">Welcome back</Eyebrow>
      <h1 className="font-display text-3xl text-text tracking-tight leading-[1.1]">
        Sign in to continue your care.
      </h1>
      <p className="text-sm text-text-muted mt-2.5">
        Pick up exactly where you left off.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="text-sm text-text-muted mt-8 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
