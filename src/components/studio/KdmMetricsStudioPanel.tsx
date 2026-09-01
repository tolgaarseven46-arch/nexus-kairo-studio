import React from 'react';
import { KdmMetricsPanel } from '../common/KdmMetricsPanel';
import { KntTurnDebugPanel } from '../common/KntTurnDebugPanel';

export const KdmMetricsStudioPanel: React.FC<{ userId?: string }> = ({ userId }) => (
  <div className="p-4 h-full overflow-auto space-y-4">
    <KntTurnDebugPanel userId={userId} />
    <KdmMetricsPanel userId={userId} compact />
  </div>
);
