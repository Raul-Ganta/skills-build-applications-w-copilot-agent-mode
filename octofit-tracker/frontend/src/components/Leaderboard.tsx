import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

async function loadLeaderboard() {
  const response = await getJson<{ leaderboard: Entry[] }>('/api/leaderboard');
  return response.leaderboard;
}

export default function Leaderboard() {
  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      emptyMessage="No leaderboard rankings yet."
      loadItems={loadLeaderboard}
      renderItem={(entry) => <>#{entry.rank} {entry.teamName} · {entry.totalPoints} points</>}
    />
  );
}
