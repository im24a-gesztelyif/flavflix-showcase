export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs uppercase tracking-[0.32em] text-white/40">{eyebrow}</p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:mt-4 sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="w-full lg:w-auto">{action}</div> : null}
    </div>
  );
}
