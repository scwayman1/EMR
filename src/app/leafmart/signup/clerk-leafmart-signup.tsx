"use client";

import { SignUp } from "@clerk/nextjs";

export default function ClerkLeafmartSignUp() {
  return (
    <SignUp
      signInUrl="/leafmart/login"
      fallbackRedirectUrl="/leafmart/account"
      appearance={{
        variables: {
          colorPrimary: "#1F4D37",
          colorText: "#152119",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFCF7",
          colorInputText: "#152119",
          fontFamily: "Inter, system-ui, sans-serif",
          borderRadius: "16px",
        },
        elements: {
          rootBox: "w-full",
          card: "bg-transparent shadow-none border-0 p-0",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          formButtonPrimary:
            "bg-[#152119] hover:bg-[#1F4D37] text-[#FFF8E8] rounded-full font-medium tracking-wide normal-case",
          socialButtonsBlockButton:
            "border-[1.5px] border-[#EAE3D2] hover:bg-[#F6F0E4] rounded-full font-medium",
          formFieldInput:
            "rounded-2xl border border-[#EAE3D2] bg-white focus:border-[#1F4D37] focus:ring-2 focus:ring-[#E2ECE5]",
          formFieldLabel: "text-[12px] font-medium tracking-wide uppercase text-[#4A5651]",
          footerActionLink: "text-[#1F4D37] hover:underline font-medium",
          dividerLine: "bg-[#EAE3D2]",
          dividerText: "text-[#8A8578] uppercase tracking-wider text-[11px]",
        },
        layout: {
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
        },
      }}
    />
  );
}
