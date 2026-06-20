import { useEffect, useSyncExternalStore } from "react";

export type Role = "Developer" | "Designer" | "QA" | "Business Analyst" | "Team Leader";

export interface Student {
  id: string;
  name: string;
  skills: string[];
  availability: string;
  workload: number;
  role: Role | string;
}

export interface Team {
  id: string;
  name: string;
  members: Student[];
  avgWorkload: number;
  compatibility: number;
  scores: {
    skillDiversity: number;
    availability: number;
    roleCompat: number;
    workloadBalance: number;
  };
  status: "Pending Review" | "Approved" | "Published";
}

export type Severity = "High" | "Medium" | "Low";
export interface Conflict {
  teamId: string;
  teamName: string;
  type: string;
  severity: Severity;
  suggestion: string;
}

const TEAM_NAMES = [
  "Alpha","Beta","Gamma","Delta","Omega","Sigma","Theta","Kappa",
  "Lambda","Phoenix","Vanguard","Nimbus","Zenith","Orion","Apex","Polaris",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function generateTeams(students: Student[]): Team[] {
  const TEAM_SIZE = 4;
  const buckets: Record<string, Student[]> = {
    Developer: [], Designer: [], QA: [], "Business Analyst": [], "Team Leader": [],
  };
  for (const s of students) {
    (buckets[s.role] ?? (buckets[s.role] = [])).push(s);
  }
  Object.keys(buckets).forEach(k => (buckets[k] = shuffle(buckets[k])));

  const teamCount = Math.floor(students.length / TEAM_SIZE);
  const teams: Team[] = [];

  const desiredOrder: string[] = ["Developer", "Designer", "QA", "Business Analyst"];
  // Pre-assign one of each desired role per team if available
  for (let i = 0; i < teamCount; i++) {
    const members: Student[] = [];
    for (const r of desiredOrder) {
      const pick = buckets[r]?.shift();
      if (pick) members.push(pick);
    }
    // 4th: prefer Team Leader, else any remaining
    const leader = buckets["Team Leader"]?.shift();
    if (leader && members.length < TEAM_SIZE) members.push(leader);
    teams.push(makeTeam(i, members));
  }

  // Fill remaining slots from leftover pool (balance workload)
  const leftover: Student[] = Object.values(buckets).flat();
  // Sort leftovers descending workload, distribute to lightest teams
  leftover.sort((a, b) => b.workload - a.workload);
  for (const s of leftover) {
    const target = teams
      .filter(t => t.members.length < TEAM_SIZE)
      .sort((a, b) => avg(a.members.map(m => m.workload)) - avg(b.members.map(m => m.workload)))[0];
    if (!target) break;
    target.members.push(s);
  }

  // Recompute scores
  return teams.map((t, i) => recomputeTeam(t, i));
}

function makeTeam(i: number, members: Student[]): Team {
  return {
    id: `team-${i}`,
    name: `Team ${TEAM_NAMES[i] ?? `Unit-${i + 1}`}`,
    members,
    avgWorkload: 0,
    compatibility: 0,
    scores: { skillDiversity: 0, availability: 0, roleCompat: 0, workloadBalance: 0 },
    status: "Pending Review",
  };
}

function recomputeTeam(t: Team, i: number): Team {
  const members = t.members;
  const allSkills = new Set(members.flatMap(m => m.skills));
  const skillDiversity = Math.min(100, (allSkills.size / Math.max(1, members.length * 2)) * 100);

  const availCounts: Record<string, number> = {};
  members.forEach(m => (availCounts[m.availability] = (availCounts[m.availability] ?? 0) + 1));
  const topAvail = Math.max(0, ...Object.values(availCounts));
  const availability = members.length ? (topAvail / members.length) * 100 : 0;

  const roles = new Set(members.map(m => m.role));
  const desired = ["Developer", "Designer", "QA"];
  const hit = desired.filter(r => roles.has(r)).length;
  const hasLeadOrBA = roles.has("Team Leader") || roles.has("Business Analyst") ? 1 : 0;
  const roleCompat = ((hit / desired.length) * 0.75 + hasLeadOrBA * 0.25) * 100;

  const loads = members.map(m => m.workload);
  const meanLoad = avg(loads);
  const variance = avg(loads.map(l => (l - meanLoad) ** 2));
  const stdev = Math.sqrt(variance);
  const workloadBalance = Math.max(0, 100 - stdev * 2);

  const compatibility = Math.round(
    skillDiversity * 0.4 + availability * 0.3 + roleCompat * 0.2 + workloadBalance * 0.1,
  );

  return {
    ...t,
    name: `Team ${TEAM_NAMES[i] ?? `Unit-${i + 1}`}`,
    avgWorkload: Math.round(meanLoad),
    compatibility,
    scores: {
      skillDiversity: Math.round(skillDiversity),
      availability: Math.round(availability),
      roleCompat: Math.round(roleCompat),
      workloadBalance: Math.round(workloadBalance),
    },
  };
}

export function detectConflicts(teams: Team[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const t of teams) {
    const roles = t.members.map(m => m.role);
    const roleSet = new Set(roles);
    const has = (r: string) => roleSet.has(r);

    if (!has("Designer")) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "Missing Designer", severity: "High",
        suggestion: suggestMove("Designer", t, teams),
      });
    }
    if (!has("QA")) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "Missing QA", severity: "High",
        suggestion: suggestMove("QA", t, teams),
      });
    }
    if (!has("Developer")) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "Missing Developer", severity: "High",
        suggestion: suggestMove("Developer", t, teams),
      });
    }
    const leaders = roles.filter(r => r === "Team Leader").length;
    if (leaders > 1) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "Duplicate Team Leaders", severity: "Medium",
        suggestion: `Reassign one Team Leader from ${t.name} to a team without one.`,
      });
    }
    // Availability clash
    const avails = new Set(t.members.map(m => m.availability));
    if (avails.size === t.members.length && t.members.length > 1) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "Availability Clash", severity: "Medium",
        suggestion: "Align at least two members to a common availability window.",
      });
    }
    // Workload imbalance
    const loads = t.members.map(m => m.workload);
    if (loads.length && Math.max(...loads) - Math.min(...loads) > 40) {
      conflicts.push({
        teamId: t.id, teamName: t.name, type: "High Workload Imbalance", severity: "Low",
        suggestion: "Swap a high-load member with a lighter member from another team.",
      });
    }
  }
  return conflicts;
}

function suggestMove(role: string, target: Team, teams: Team[]): string {
  for (const t of teams) {
    if (t.id === target.id) continue;
    const candidates = t.members.filter(m => m.role === role);
    if (candidates.length > 1) {
      return `Move ${candidates[0].name} from ${t.name} to ${target.name}.`;
    }
  }
  return `Recruit an additional ${role} into ${target.name}.`;
}

export function buildRecommendations(teams: Team[], conflicts: Conflict[]): string[] {
  const recs: string[] = [];
  for (const c of conflicts.slice(0, 6)) {
    recs.push(`${c.teamName}: ${c.suggestion}`);
  }
  const overloaded = teams.filter(t => t.avgWorkload > 60);
  for (const t of overloaded.slice(0, 3)) {
    recs.push(`Reduce average workload in ${t.name} (currently ${t.avgWorkload}%) by swapping a heavy member with a lighter peer.`);
  }
  const lowCompat = teams.filter(t => t.compatibility < 70);
  for (const t of lowCompat.slice(0, 3)) {
    recs.push(`Improve ${t.name} skill diversity to lift compatibility above 70%.`);
  }
  return recs;
}

/* ---------- Tiny global store ---------- */
type State = {
  teams: Team[];
  conflicts: Conflict[];
  recommendations: string[];
  sourceRosterKey?: string;
};
let state: State = { teams: [], conflicts: [], recommendations: [] };
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnapshot = () => state;
function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

export function useSynergy() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getRosterKey(students: Student[]) {
  return students
    .map(s => `${s.id}:${s.name}:${s.role}:${s.availability}:${s.workload}:${s.skills.join("|")}`)
    .sort()
    .join(";");
}

export function useSynergyForStudents(students: Student[]) {
  const snapshot = useSynergy();
  const currentRosterKey = getRosterKey(students);
  const isStale = students.length > 0 && !!snapshot.sourceRosterKey && snapshot.sourceRosterKey !== currentRosterKey;

  useEffect(() => {
    if (isStale) resetSynergy();
  }, [isStale]);

  return isStale
    ? { teams: [], conflicts: [], recommendations: [], sourceRosterKey: undefined }
    : snapshot;
}

export function runGeneration(students: Student[]) {
  const teams = generateTeams(students);
  const conflicts = detectConflicts(teams);
  const recommendations = buildRecommendations(teams, conflicts);
  setState({ teams, conflicts, recommendations, sourceRosterKey: getRosterKey(students) });
  return { teams, conflicts, recommendations };
}

export function updateTeamStatus(teamId: string, status: Team["status"]) {
  setState({ teams: state.teams.map(t => (t.id === teamId ? { ...t, status } : t)) });
}

export function approveAll() {
  setState({ teams: state.teams.map(t => ({ ...t, status: "Approved" })) });
}

export function publishAll() {
  setState({ teams: state.teams.map(t => ({ ...t, status: "Published" })) });
}

export function resetSynergy() {
  setState({ teams: [], conflicts: [], recommendations: [], sourceRosterKey: undefined });
}

export function deleteTeam(teamId: string) {
  const teams = state.teams.filter(t => t.id !== teamId);
  const conflicts = detectConflicts(teams);
  const recommendations = buildRecommendations(teams, conflicts);
  setState({ teams, conflicts, recommendations });
}

export function renameTeam(teamId: string, name: string) {
  const teams = state.teams.map(t => (t.id === teamId ? { ...t, name } : t));
  const conflicts = state.conflicts.map(c => (c.teamId === teamId ? { ...c, teamName: name } : c));
  setState({ teams, conflicts });
}

/** Rebalance: swap the highest-workload member of this team with the lowest-workload member of another team. */
export function rebalanceTeam(teamId: string): { ok: boolean; message: string } {
  const teams = [...state.teams];
  const idx = teams.findIndex(t => t.id === teamId);
  if (idx < 0) return { ok: false, message: "Team not found" };
  const team = teams[idx];
  if (team.members.length === 0) return { ok: false, message: "Team has no members" };

  const heaviest = [...team.members].sort((a, b) => b.workload - a.workload)[0];
  let bestOther = -1;
  let bestLight: Student | null = null;
  let bestDelta = -Infinity;
  teams.forEach((other, oi) => {
    if (oi === idx || other.members.length === 0) return;
    const lightest = [...other.members].sort((a, b) => a.workload - b.workload)[0];
    const delta = heaviest.workload - lightest.workload;
    if (delta > bestDelta) { bestDelta = delta; bestOther = oi; bestLight = lightest; }
  });
  if (bestOther < 0 || !bestLight || bestDelta <= 5) {
    return { ok: false, message: "No beneficial swap available" };
  }
  const lightPick: Student = bestLight;
  const newTeam = { ...team, members: team.members.map(m => m.id === heaviest.id ? lightPick : m) };
  const otherTeam = teams[bestOther];
  const newOther = { ...otherTeam, members: otherTeam.members.map(m => m.id === lightPick.id ? heaviest : m) };
  teams[idx] = recomputeTeam(newTeam, idx);
  teams[bestOther] = recomputeTeam(newOther, bestOther);
  const conflicts = detectConflicts(teams);
  const recommendations = buildRecommendations(teams, conflicts);
  setState({ teams, conflicts, recommendations });
  return { ok: true, message: `Swapped ${heaviest.name} ↔ ${lightPick.name}` };
}
