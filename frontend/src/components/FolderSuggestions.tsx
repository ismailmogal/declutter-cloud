import React from 'react';

interface FolderSuggestion {
  folderId: string;
  folderName: string;
}

interface FolderSuggestionsProps {
  suggestions: FolderSuggestion[];
  onAccept: (folderId: string) => void;
  onIgnore: (folderId: string) => void;
}

const FolderSuggestions: React.FC<FolderSuggestionsProps> = ({ suggestions, onAccept, onIgnore }) => {
  return (
    <div>
      <h4>Suggested Folders</h4>
      <ul>
        {suggestions.map(s => (
          <li key={s.folderId}>
            <span>{s.folderName}</span>
            <button onClick={() => onAccept(s.folderId)}>Accept</button>
            <button onClick={() => onIgnore(s.folderId)}>Ignore</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FolderSuggestions; 