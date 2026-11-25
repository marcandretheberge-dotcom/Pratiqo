import { FoundationHome, foundationMetadata, type FoundationQuery } from "@/components/yo/foundations/FoundationRoutes";
type Props = { searchParams: Promise<FoundationQuery> };
export function generateMetadata({ searchParams }: Props) { return foundationMetadata("en", searchParams); }
export default function Page({ searchParams }: Props) { return <FoundationHome language="en" searchParams={searchParams}/>; }
