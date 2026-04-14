import Link from "next/link";
import { DemoRequestForm } from "./demo-request-form";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Request a Demo" };

export default function SignupPage() {
  return (
    <div>
      <Eyebrow className="mb-4">Get started</Eyebrow>
      <h1 className="font-display text-3xl text-text tracking-tight leading-[1.1]">
        Request a demo.
      </h1>
      <p className="text-sm text-text-muted mt-2.5">
        Tell us a little about yourself and we will get you set up with a
        personalized demo of Leafjourney.
      </p>
      <div className="mt-8">
        <DemoRequestForm />
      </div>
      <p className="text-sm text-text-muted mt-8 text-center">
        Already have access?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
