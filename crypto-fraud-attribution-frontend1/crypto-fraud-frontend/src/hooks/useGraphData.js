
import { useEffect, useState } from 'react';
import apiClient from '../services/api';

export default function useGraphData({
  walletAddress,
  chain,
  maxHops,
  token,
}) {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchGraph() {
      setLoading(true);
      setError('');
      setGraphData(null);

      try {
        const isEthereum = chain === 'ETHEREUM';

        const endpoint = isEthereum
          ? '/trace/ethereum/live'
          : '/trace/graph';

        const tokens = isEthereum
          ? token === 'ALL'
            ? ['ETH', 'USDT']
            : [token]
          : token === 'ALL'
            ? ['USDT', 'ETH', 'BTC', 'TRX']
            : [token];

        const response = await apiClient.post(
          endpoint,
          {
            wallet_address: walletAddress.trim(),
            chain,
            max_hops: maxHops,
            tokens,
          },
          {
            signal: controller.signal,
          }
        );

        if (!controller.signal.aborted) {
          setGraphData(response.data);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        const detail = err.response?.data?.detail;

        setError(
          typeof detail === 'string'
            ? detail
            : detail
              ? JSON.stringify(detail)
              : err.message || 'Failed to retrieve graph'
        );

        setGraphData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (walletAddress?.trim()) {
      fetchGraph();
    } else {
      setGraphData(null);
      setLoading(false);
      setError('');
    }

    return () => {
      controller.abort();
    };
  }, [walletAddress, chain, maxHops, token]);

  return {
    graphData,
    loading,
    error,
  };
}
