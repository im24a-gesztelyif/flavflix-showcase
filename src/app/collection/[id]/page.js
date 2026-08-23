import { CollectionScreen } from "@/components/screens/collection-screen";

export default async function CollectionPage({ params }) {
  const { id } = await params;

  return <CollectionScreen id={id} />;
}
