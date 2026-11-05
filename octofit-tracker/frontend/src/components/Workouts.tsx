import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Workout = { title: string; reason?: string };

async function loadSuggestions() {
  const email = 'mona@example.com';
  const response = await getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(email)}`);
  return response.suggestions;
}

export default function Workouts() {
  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      emptyMessage="No workout suggestions found."
      loadItems={loadSuggestions}
      renderItem={(workout) => <>{workout.title}{workout.reason && <> · {workout.reason}</>}</>}
    />
  );
}
