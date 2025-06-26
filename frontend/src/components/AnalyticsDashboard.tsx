import React from 'react';

interface AnalyticsDashboardProps {
  data: any;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  // TODO: Replace with real charts (e.g., Chart.js, Recharts)
  return (
    <div>
      <h3>File Analytics</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default AnalyticsDashboard; 