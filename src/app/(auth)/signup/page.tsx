import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-text-muted mt-1.5">
          Your care starts with a simple, private account.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-text-muted mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
