import React from 'react';

interface RuleBuilderProps {
  onSave: (rule: any) => void;
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ onSave }) => {
  // TODO: Replace with a real rule builder UI
  return (
    <div>
      <h4>Create a Rule</h4>
      <button onClick={() => onSave({ example: 'rule' })}>Save Example Rule</button>
    </div>
  );
};

export default RuleBuilder; 