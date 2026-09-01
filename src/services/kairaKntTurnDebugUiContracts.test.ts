import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const panel = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/KntTurnDebugPanel.tsx'), 'utf8');
const studio = fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/KdmMetricsStudioPanel.tsx'), 'utf8');

describe('compact per-turn KNT debug UX contracts', () => {
  it('loads at most the latest 20 KNT runtime turns and presents them chronologically', () => {
    expect(panel).toContain('loadRecentKntTraces(20, userId)');
    expect(panel).toContain('const chronological = [...recent].reverse()');
    expect(panel).toContain('Tur {selected + 1} / {traces.length}');
  });

  it('keeps one-turn and all-turn copy actions separate', () => {
    expect(panel).toContain("handleCopy('turn')");
    expect(panel).toContain("handleCopy('all')");
    expect(panel).toContain('Son turu kopyala');
    expect(panel).toContain('20 turun tamamı');
  });

  it('keeps heavy technical metadata collapsed by default', () => {
    expect(panel).toContain('useState(false)');
    expect(panel).toContain('Teknik detay');
    expect(panel).toContain('worldReasoningPolicy');
    expect(panel).toContain('responsePlan');
  });

  it('surfaces the KNT navigator before compact aggregate metrics in Studio', () => {
    expect(studio.indexOf('<KntTurnDebugPanel')).toBeLessThan(studio.indexOf('<KdmMetricsPanel'));
    expect(studio).toContain('<KdmMetricsPanel userId={userId} compact />');
  });
});
