"use client";

import { AppLink } from "@/components/app-link";
import { EmptyState } from "@/components/empty-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { useTmdbConfiguration } from "@/hooks/use-tmdb-query";

export function LibraryScreen({
  eyebrow,
  title,
  description,
  items = [],
  emptyTitle,
  emptyDescription,
  actionLabel,
  actionHref = "/search",
  secondaryLabelForItem,
  renderOverlayAction,
}) {
  const { data: configuration } = useTmdbConfiguration();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      {items.length ? (
        <MediaGrid
          items={items}
          configuration={configuration}
          secondaryLabelForItem={secondaryLabelForItem}
          renderOverlayAction={renderOverlayAction}
        />
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <AppLink
              href={actionHref}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black sm:w-auto"
            >
              {actionLabel}
            </AppLink>
          }
        />
      )}
    </div>
  );
}
