import { MemberPage } from "@/components/member-page";

export default async function PublicMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberPage memberId={id} />;
}
