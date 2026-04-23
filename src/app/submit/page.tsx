import { auth } from "@/lib/auth";
import { SubmitForm } from "@/components/SubmitForm";
import { SignInButton } from "@/components/SignInButton";

export const metadata = {
  title: "Submit — HTML Heaven",
  description: "Submit your HTML5 app.",
};

export default async function SubmitPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Sign in to submit</h1>
        <p className="mt-2 text-[14px] text-muted">
          We use GitHub sign-in to track contributions.
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Submit an app</h1>
        <p className="mt-1 text-[14px] text-muted">
          Upload a single HTML file. We review it, you get credit.
        </p>
      </div>
      <SubmitForm />
    </div>
  );
}
