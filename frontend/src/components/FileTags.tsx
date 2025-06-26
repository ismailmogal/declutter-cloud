import React from 'react';

interface FileTagsProps {
  tags: string[];
}

const FileTags: React.FC<FileTagsProps> = ({ tags }) => {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {tags.map(tag => (
        <span key={tag} style={{ background: '#eee', borderRadius: 8, padding: '2px 8px', fontSize: 12 }}>{tag}</span>
      ))}
    </div>
  );
};

export default FileTags; 