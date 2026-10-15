export const mockGraphData = {
  nodes: [
    { id: '0xSuspect', label: 'Suspect (Victim Reported)', isVasp: false },
    { id: '0xLayer1', label: 'Intermediary Hop 1', isVasp: false },
    { id: '0xVASP_Binance', label: 'Binance Hot Wallet (VASP)', isVasp: true }
  ],
  edges: [
    { from: '0xSuspect', to: '0xLayer1', amount: 12.5 },
    { from: '0xLayer1', to: '0xVASP_Binance', amount: 12.45 }
  ]
};