import React from 'react';
import { KdmMetricsPanel } from '../common/KdmMetricsPanel';

export default function KdmMetricsPanelSlot({ userId }: { userId?: string }) {
  return <KdmMetricsPanel userId={userId} />;
}
