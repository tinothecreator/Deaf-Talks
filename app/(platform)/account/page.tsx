import { requireAccount } from "@/lib/auth/session";
import { roleLabels } from "@/lib/auth/validation";

export default async function Account() {
  const { profile } = await requireAccount();
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-bold">Your account</h1>
      <dl className="space-y-4 rounded-lg border border-slate-400 bg-white p-5">
        <div><dt className="font-bold">Display name</dt><dd>{profile.display_name}</dd></div>
        <div><dt className="font-bold">Role</dt><dd>{roleLabels[profile.role]}</dd></div>
      </dl>
      <p className="rounded-lg border border-teal-800 bg-teal-50 p-5 text-lg font-bold">
        {profile.role === "storyteller" ? "Upload coming soon" : profile.role === "learner" ? "Browse coming soon" : "Reviews coming soon"}
      </p>
    </div>
  );
}
