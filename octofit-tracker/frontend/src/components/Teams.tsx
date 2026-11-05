import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = { name: string; members: unknown[] };

async function loadTeams() {
  const response = await getJson<{ teams: Team[] }>('/api/teams');
  return response.teams;
}

export default function Teams() {
  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      emptyMessage="No teams found."
      loadItems={loadTeams}
      renderItem={(team) => <>{team.name} · {team.members.length} members</>}
    />
  );
}
