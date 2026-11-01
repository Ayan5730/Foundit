export default function Home() {
  return (
    <main className="min-h-screen bg-[#F3F6FA] px-6 py-20 text-[#172238]">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-12">
        <p className="mb-4 text-sm font-medium text-[#2457D6]">FoundIt · Shared foundation</p>
        <h1 className="text-4xl font-semibold tracking-tight">Ready to build together.</h1>
        <p className="mt-5 text-lg leading-relaxed">
          The React and Sites starter is running. Frontend and backend feature development starts from this shared project.
        </p>
        <p className="mt-6 leading-relaxed text-slate-600">
          Start with <code>docs/SETUP.md</code>, then read <code>AGENTS.md</code> for file ownership and <code>docs/PLAN.md</code> for the agreed build plan.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          Reports, matching, provider integrations, and recovery workflows are not implemented yet.
        </p>
      </section>
    </main>
  );
}
