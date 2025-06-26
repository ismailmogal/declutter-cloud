import React from 'react';

interface CleanupFile {
  id: number;
  name: string;
  last_accessed?: string;
}

interface CleanupRecommendationsProps {
  files: CleanupFile[];
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onIgnore: (id: number) => void;
}

const CleanupRecommendations: React.FC<CleanupRecommendationsProps> = ({ files, onDelete, onArchive, onIgnore }) => {
  return (
    <div>
      <h3>Recommended for Cleanup</h3>
      <ul>
        {files.map(file => (
          <li key={file.id}>
            <span>{file.name}</span>
            {file.last_accessed && <span> (Last accessed: {file.last_accessed})</span>}
            <button onClick={() => onDelete(file.id)}>Delete</button>
            <button onClick={() => onArchive(file.id)}>Archive</button>
            <button onClick={() => onIgnore(file.id)}>Ignore</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CleanupRecommendations; 