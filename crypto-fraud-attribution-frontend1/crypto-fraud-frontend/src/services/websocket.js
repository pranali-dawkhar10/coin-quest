export const connectTransactionSocket = (caseId, onMessage) => {
  console.log(`Connected real-time stream for ${caseId}`);
  return () => console.log('Socket disconnected');
};