"use client";

// Client-only Clerk sign-up widget. Isolated into its own module so the
// `@clerk/nextjs` import only loads when AUTH_PROVIDER=clerk AND the
// user actually navigates here — never during boot of the (auth) group.

import { SignUp } from "@clerk/nextjs";

export default function ClerkSignUpBox() {
  return (
    <SignUp
      signInUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "hsl(var(--accent))",
          colorBackground: "transparent",
          colorInputBackground: "transparent",
        },
        elements: {
          rootBox: "w-full",
          cardBox: "shadow-none border-0 bg-transparent p-0 m-0",
          card: "bg-transparent shadow-none border-0 p-0 m-0",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          formButtonPrimary:
            "bg-accent hover:bg-accent/90 text-white font-medium rounded-md shadow-sm",
          socialButtonsBlockButton:
            "border border-border hover:bg-surface-muted rounded-md",
          formFieldInput:
            "rounded-md border border-border-strong bg-surface focus:border-accent focus:ring-2 focus:ring-accent/20",
          footerActionLink: "text-accent hover:text-accent/80",
        },
        layout: {
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
        },
      }}
    />
  );
}
