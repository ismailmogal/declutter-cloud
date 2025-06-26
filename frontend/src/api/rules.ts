import axios from 'axios';

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getRules = async () => {
  const res = await axios.get('/api/rules', { headers: authHeaders() });
  return res.data;
};

export const createRule = async (rule: any) => {
  const res = await axios.post('/api/rules', rule, { headers: authHeaders() });
  return res.data;
};

export const updateRule = async (ruleId: number, rule: any) => {
  const res = await axios.put(`/api/rules/${ruleId}`, rule, { headers: authHeaders() });
  return res.data;
};

export const deleteRule = async (ruleId: number) => {
  const res = await axios.delete(`/api/rules/${ruleId}`, { headers: authHeaders() });
  return res.data;
};

export const applyRules = async () => {
  const res = await axios.post('/api/rules/apply', {}, { headers: authHeaders() });
  return res.data;
}; 