import React from 'react';

interface CrossCloudActionsProps {
  fileId: number;
  availableClouds: string[];
  onMove: (targetCloud: string) => void;
  onCopy: (targetCloud: string) => void;
}

const CrossCloudActions: React.FC<CrossCloudActionsProps> = ({ fileId, availableClouds, onMove, onCopy }) => {
  return (
    <div>
      <span>Move/Copy to:</span>
      {availableClouds.map(cloud => (
        <button key={cloud} onClick={() => onMove(cloud)} title={`Move to ${cloud}`}>
          <img src={`/icons/${cloud}.svg`} alt={cloud} style={{ width: 20, height: 20 }} />
        </button>
      ))}
      {availableClouds.map(cloud => (
        <button key={cloud + '-copy'} onClick={() => onCopy(cloud)} title={`Copy to ${cloud}`}>
          <img src={`/icons/${cloud}.svg`} alt={cloud} style={{ width: 20, height: 20, opacity: 0.5 }} />
        </button>
      ))}
    </div>
  );
};

export default CrossCloudActions; 