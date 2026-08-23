import { DetailScreen } from "@/components/screens/detail-screen";

export default async function DetailPage({ params }) {
  const { mediaType, id } = await params;

  return <DetailScreen mediaType={mediaType} id={id} />;
}
