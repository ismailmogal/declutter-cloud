import React from 'react';

interface SimilarFile {
  id: number;
  name: string;
  similarityScore?: number;
}

interface SimilarFilesGroupProps {
  files: SimilarFile[];
}

const SimilarFilesGroup: React.FC<SimilarFilesGroupProps> = ({ files }) => {
  return (
    <div style={{ border: '1px solid #ccc', margin: 8, padding: 8 }}>
      <h5>Similar Files</h5>
      <ul>
        {files.map(f => (
          <li key={f.id}>
            {f.name} {f.similarityScore !== undefined && <span>({f.similarityScore}%)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SimilarFilesGroup; 