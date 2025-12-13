import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password - SpriteLab",
  description: "Reset your SpriteLab account password. Enter your email to receive a password reset link.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
