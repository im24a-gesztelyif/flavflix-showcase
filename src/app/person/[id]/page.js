import { PersonScreen } from "@/components/screens/person-screen";

export default async function PersonPage({ params }) {
  const { id } = await params;

  return <PersonScreen id={id} />;
}
