export default function Home() {
  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm font-bold uppercase tracking-wider text-teal-800">
        A place for SASL stories
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Welcome to SignStories
      </h1>
      <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
        A home for Deaf storytellers and people learning South African Sign
        Language (SASL). Stories, learning, and human feedback, with clear credit
        and ownership.
      </p>
      <div className="rounded-lg border border-teal-800 bg-teal-50 p-5 sm:p-6">
        <h2 className="text-xl font-bold">We are getting started</h2>
        <p className="mt-2 leading-relaxed text-slate-700">
          SignStories is being built. Stories and learning tools will be added
          later.
        </p>
      </div>
    </div>
  );
}
