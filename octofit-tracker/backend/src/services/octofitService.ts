import { isObjectIdOrHexString } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type InputRecord = Record<string, unknown>;

function isRecord(input: unknown): input is InputRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function objectId(input: unknown, field: string) {
  if (typeof input !== 'string' || !isObjectIdOrHexString(input)) {
    throw badRequest(`${field} must be a valid ID`);
  }
  return input;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw badRequest('Activity data is required');
  const userId = objectId(input.userId, 'userId');
  const teamId = objectId(input.teamId, 'teamId');
  if (typeof input.type !== 'string' || !input.type.trim()) throw badRequest('Activity type is required');
  if (typeof input.minutes !== 'number' || !Number.isFinite(input.minutes) || input.minutes < 1) {
    throw badRequest('Activity minutes must be a positive number');
  }
  const occurredAt = input.occurredAt === undefined ? new Date() : new Date(String(input.occurredAt));
  if (Number.isNaN(occurredAt.getTime())) throw badRequest('Activity date is invalid');

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });

  return Activity.create({
    user: userId,
    team: teamId,
    type: input.type.trim(),
    minutes: input.minutes,
    points: input.minutes,
    occurredAt,
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw badRequest('Team data is required');
  if (typeof input.name !== 'string' || !input.name.trim()) throw badRequest('Team name is required');
  if (typeof input.mascot !== 'string' || !input.mascot.trim()) throw badRequest('Team mascot is required');
  if (input.members !== undefined && !Array.isArray(input.members)) {
    throw badRequest('Team members must be an array of user IDs');
  }
  const memberIds = [...new Set((input.members ?? []).map((member) => objectId(member, 'member')))];
  const memberCount = await User.countDocuments({ _id: { $in: memberIds } });
  if (memberCount !== memberIds.length) throw Object.assign(new Error('One or more team members were not found'), { status: 404 });

  const team = await Team.create({
    name: input.name.trim(),
    mascot: input.mascot.trim(),
    members: memberIds,
  });
  if (memberIds.length > 0) {
    await Team.updateMany(
      { _id: { $ne: team._id }, members: { $in: memberIds } },
      { $pull: { members: { $in: memberIds } } },
    );
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        let: { teamId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$team', '$$teamId'] } } },
          { $group: { _id: null, totalPoints: { $sum: '$points' } } },
        ],
        as: 'activityTotals',
      },
    },
    { $set: { totalPoints: { $ifNull: [{ $arrayElemAt: ['$activityTotals.totalPoints', 0] }, 0] } } },
    { $sort: { totalPoints: -1, name: 1 } },
  ]);
  return teams.map(({ name, totalPoints }, index) => ({
    teamName: name,
    totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw Object.assign(new Error('User was not found'), { status: 404 });

  const activities = await Activity.find({ user: user._id }).select('type').lean();
  const activityFocus = (type: string) => {
    const normalized = type.trim().toLowerCase();
    if (['run', 'running', 'walk', 'walking', 'cycle', 'cycling', 'bike', 'biking', 'cardio'].includes(normalized)) {
      return 'endurance';
    }
    if (['strength', 'weights', 'resistance'].includes(normalized)) return 'strength';
    return normalized;
  };
  const focusCounts = new Map<string, number>();
  for (const activity of activities) {
    const focus = activityFocus(activity.type);
    focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1);
  }
  const goal = user.fitnessGoal.trim().toLowerCase();
  const preferredFocus = [...focusCounts.entries()]
    .sort(([firstFocus, firstCount], [secondFocus, secondCount]) =>
      secondCount - firstCount ||
      Number(secondFocus === goal) - Number(firstFocus === goal) ||
      firstFocus.localeCompare(secondFocus),
    )[0]?.[0] ?? goal;
  const focusOrder = [...new Set([preferredFocus, goal])];
  const workouts = await Workout.find().lean();
  const focusRank = (focus: string) => {
    const rank = focusOrder.indexOf(focus.trim().toLowerCase());
    return rank < 0 ? focusOrder.length : rank;
  };
  workouts.sort((first, second) => focusRank(first.focus) - focusRank(second.focus));
  const matchingActivity = activities.find((activity) => activityFocus(activity.type) === preferredFocus);
  const reason = matchingActivity
    ? `Recommended based on your ${matchingActivity.type} activity pattern`
    : `Recommended for your ${user.fitnessGoal} fitness goal`;
  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
