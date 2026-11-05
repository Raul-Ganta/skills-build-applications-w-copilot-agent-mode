import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { getLeaderboard } from '../src/services/octofitService.js';
import { Activity, Team } from '../src/models/index.js';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({})]);
});

describe('leaderboard service', () => {
  it('includes teams with no activities at zero points', async () => {
    const activeTeam = await Team.create({ name: 'Active team', mascot: 'Runner' });
    const newTeam = await Team.create({ name: 'New team', mascot: 'Fresh' });
    await Activity.create({
      user: new mongoose.Types.ObjectId(),
      team: activeTeam._id,
      type: 'run',
      minutes: 25,
      points: 25,
      occurredAt: new Date(),
    });

    await expect(getLeaderboard()).resolves.toEqual([
      { teamName: 'Active team', totalPoints: 25, rank: 1 },
      { teamName: 'New team', totalPoints: 0, rank: 2 },
    ]);
  });
});
