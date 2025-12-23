import { WatchlistDetail } from "@/components/watchlist-detail";

export default function WatchlistPage({ params }: { params: { id: string } }) {
  return <WatchlistDetail watchlistId={params.id} />;
}
