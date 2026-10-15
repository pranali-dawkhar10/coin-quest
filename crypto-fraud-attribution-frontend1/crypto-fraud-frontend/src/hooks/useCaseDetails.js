import { useState, useEffect } from 'react';
import { mockCases } from '../store/caseStore';

export const useCaseDetails = (caseId) => {
  const [caseDetails, setCaseDetails] = useState(null);

  useEffect(() => {
    const found = mockCases.find(x => x.id === caseId) || mockCases[0];
    setCaseDetails(found);
  }, [caseId]);

  return { caseDetails };
};