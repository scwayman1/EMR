import Link from "next/link";
import { SignupForm } from "./signup-form";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div>
      <Eyebrow className="mb-4">Get started</Eyebrow>
      <h1 className="font-display text-3xl text-text tracking-tight leading-[1.1]">
        Create your account.
      </h1>
      <p className="text-sm text-text-muted mt-2.5">
        Your care starts with a simple, private account. Takes under a minute.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="text-sm text-text-muted mt-8 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
