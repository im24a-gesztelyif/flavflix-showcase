export function EmptyState({ title, description, action }) {
  return (
    <div className="surface flex min-h-[220px] flex-col items-center justify-center gap-4 px-5 py-10 text-center sm:min-h-[260px] sm:px-8 sm:py-12">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
      <p className="max-w-xl text-sm leading-6 text-white/55 sm:leading-7">{description}</p>
      {action ? <div className="w-full pt-2 sm:w-auto">{action}</div> : null}
    </div>
  );
}
