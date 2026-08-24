import React from 'react';
import { KdmMetricsPanel } from '../common/KdmMetricsPanel';

export const KdmMetricsStudioPanel: React.FC<{ userId?: string }> = ({ userId }) => (
  <div className="p-4 h-full overflow-auto">
    <KdmMetricsPanel userId={userId} />
  </div>
);
