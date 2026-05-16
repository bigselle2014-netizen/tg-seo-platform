import { redirect } from "next/navigation"

export default async function ChannelIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/channels/${id}/posts`)
}
