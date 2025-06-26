import React from 'react';

interface TagFilterBarProps {
  tags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const TagFilterBar: React.FC<TagFilterBarProps> = ({ tags, selectedTags, onChange }) => {
  // TODO: Replace with a multi-select UI (e.g., MUI Autocomplete or custom chips)
  return (
    <div>
      <label>Filter by tags:</label>
      <input
        type="text"
        placeholder="Enter tags..."
        value={selectedTags.join(', ')}
        onChange={e => onChange(e.target.value.split(',').map(t => t.trim()))}
      />
    </div>
  );
};

export default TagFilterBar; 