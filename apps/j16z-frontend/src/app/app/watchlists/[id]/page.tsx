import { WatchlistDetail } from "@/components/watchlist-detail";

export default async function WatchlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WatchlistDetail watchlistId={id} />;
}
