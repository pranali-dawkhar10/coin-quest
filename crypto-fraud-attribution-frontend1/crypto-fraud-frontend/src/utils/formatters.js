export const truncateAddress = (addr) => {
  if (!addr) return '';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

export const formatAmount = (val, symbol = 'ETH') => {
  return `${parseFloat(val).toFixed(4)} ${symbol}`;
};