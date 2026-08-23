import { MediaCard } from "@/components/media-card";

export function MediaGrid({ items = [], configuration, secondaryLabelForItem, renderOverlayAction }) {
  return (
    <div
      className="grid gap-5"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(148px, 100%), 1fr))",
      }}
    >
      {items.map((item) => (
        <MediaCard
          key={`${item.media_type || item.mediaType}-${item.id}`}
          item={item}
          configuration={configuration}
          className="w-full max-w-none min-w-0"
          secondaryLabel={secondaryLabelForItem ? secondaryLabelForItem(item) : undefined}
          overlayAction={renderOverlayAction ? renderOverlayAction(item) : undefined}
        />
      ))}
    </div>
  );
}
