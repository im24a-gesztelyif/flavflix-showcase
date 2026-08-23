import { CompanyScreen } from "@/components/screens/company-screen";

export default async function CompanyPage({ params }) {
  const { id } = await params;

  return <CompanyScreen id={id} />;
}
