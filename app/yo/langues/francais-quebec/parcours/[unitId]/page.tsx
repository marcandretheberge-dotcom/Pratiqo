import { FoundationUnit, foundationMetadata, type FoundationQuery } from "@/components/yo/foundations/FoundationRoutes";
type Props = { searchParams: Promise<FoundationQuery>; params: Promise<{ unitId: string }> };
export function generateMetadata({ searchParams, params }: Props) { return foundationMetadata("fr-CA", searchParams, params); }
export default function Page(props: Props) { return <FoundationUnit language="fr-CA" {...props}/>; }
