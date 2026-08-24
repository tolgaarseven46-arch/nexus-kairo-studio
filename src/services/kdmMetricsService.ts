import { collection, addDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface KdmMetricEvent {
  userId: string;
  score: number;
  accepted: boolean;
  repaired: boolean;
  repairAttempts: number;
  issues: string[];
  createdAt?: string;
}

const scope = (userId: string) => (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
const METRICS = 'kdmMetrics';

export async function recordKdmMetric(event: KdmMetricEvent): Promise<void> {
  await addDoc(collection(db, METRICS, scope(event.userId), 'events'), {
    ...event,
    score: Math.max(0, Math.min(100, Math.round(event.score))),
    issues: [...new Set(event.issues)].slice(0, 20),
    createdAt: event.createdAt || new Date().toISOString(),
  });
}

export async function loadKdmMetrics(userId: string, maxItems = 100): Promise<KdmMetricEvent[]> {
  const snapshot = await getDocs(query(
    collection(db, METRICS, scope(userId), 'events'),
    orderBy('createdAt', 'desc'),
    limit(Math.max(1, Math.min(maxItems, 500))),
  ));
  return snapshot.docs.map((doc) => doc.data() as KdmMetricEvent).reverse();
}

export function summarizeKdmMetrics(events: KdmMetricEvent[]) {
  if (!events.length) return { total: 0, acceptanceRate: 0, repairRate: 0, averageScore: 0, issueFrequency: {} as Record<string, number> };
  const issueFrequency: Record<string, number> = {};
  for (const event of events) for (const issue of event.issues || []) issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
  return {
    total: events.length,
    acceptanceRate: Math.round(events.filter((e) => e.accepted).length / events.length * 100),
    repairRate: Math.round(events.filter((e) => e.repaired).length / events.length * 100),
    averageScore: Math.round(events.reduce((sum, e) => sum + e.score, 0) / events.length),
    issueFrequency,
  };
}
