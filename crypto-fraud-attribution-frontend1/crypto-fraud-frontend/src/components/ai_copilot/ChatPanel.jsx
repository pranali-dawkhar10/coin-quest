
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  analyzeTransactions,
  formatAmount,
  formatTokenTotals,
  formatDate,
  shortAddress,
} from '../../utils/transactionAnalysis';

const INITIAL_MESSAGE = {
  sender: 'Assistant',
  text:
    'Ask about the loaded Ethereum transaction graph. ' +
    'I can summarize transfers, wallets, token amounts, ' +
    'transaction hashes, and investigation limitations.',
};

export default function ChatPanel({
  graphData,
  walletAddress,
  loading = false,
}) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
  ]);

  const analysis = useMemo(
    () => analyzeTransactions(graphData, walletAddress),
    [graphData, walletAddress]
  );

  useEffect(() => {
    setMessages([INITIAL_MESSAGE]);
    setQuery('');
  }, [graphData, walletAddress]);

  const answerQuestion = (question) => {
    const q = question.toLowerCase();

    if (!analysis.sampled) {
      return 'Load real Ethereum transactions first. ' +
        'The assistant cannot analyze an unloaded or demo graph.';
    }

    const {
      totalTransfers,
      walletCount,
      incomingCount,
      outgoingCount,
      incomingTotals,
      outgoingTotals,
      counterpartyCount,
      largestByToken,
      firstTransaction,
      lastTransaction,
      transfers,
    } = analysis;

    if (
      /binance|exchange|vasp|owner|ownership/.test(q)
    ) {
      return (
        'The currently loaded transaction records do not ' +
        'provide verified exchange attribution or wallet ' +
        'ownership information. A transaction sent to an ' +
        'address does not, by itself, identify its owner.'
      );
    }

    if (
      /fraud|scam|launder|criminal|suspicious|risk|flag/.test(q)
    ) {
      return (
        'No verified fraud or money-laundering conclusion ' +
        'can be made from this sampled graph alone. ' +
        `The sample contains ${totalTransfers} transfers ` +
        `and ${walletCount} wallet addresses. ` +
        'Investigators must corroborate transaction activity ' +
        'with external evidence and verified attribution.'
      );
    }

    if (/largest|biggest|highest|max amount/.test(q)) {
      const entries = Object.entries(largestByToken);

      if (!entries.length) {
        return 'No qualifying transfers were found in the sample.';
      }

      return entries.map(([token, tx]) => (
        `Largest displayed ${token} transfer: ` +
        `${formatAmount(tx.amount)} ${token}, ` +
        `from ${shortAddress(tx.from_address)} ` +
        `to ${shortAddress(tx.to_address)}. ` +
        `Hash: ${tx.tx_hash || 'Unavailable'}. ` +
        `https://etherscan.io/tx/${tx.tx_hash}`
      )).join('\n\n');
    }

    if (/hash|transaction id|explorer|etherscan/.test(q)) {
      if (!transfers.length) {
        return 'No transaction hashes are available in the graph.';
      }

      return (
        `The sample contains ${totalTransfers} displayed transfers. ` +
        'Here are up to five transaction references:\n\n' +
        transfers.slice(0, 5).map((tx, i) =>
          `${i + 1}. ${formatAmount(tx.amount)} ${tx.token}\n` +
          `Hash: ${tx.tx_hash}\n` +
          `https://etherscan.io/tx/${tx.tx_hash}`
        ).join('\n\n')
      );
    }

    if (/incoming|received|inflow|deposit/.test(q)) {
      return (
        `Reported wallet incoming transfers: ${incomingCount}.\n` +
        `Total observed incoming quantities: ` +
        `${formatTokenTotals(incomingTotals)}.\n` +
        'Only displayed direct transfers are counted.'
      );
    }

    if (/outgoing|sent|outflow|withdraw/.test(q)) {
      return (
        `Reported wallet outgoing transfers: ${outgoingCount}.\n` +
        `Total observed outgoing quantities: ` +
        `${formatTokenTotals(outgoingTotals)}.\n` +
        'Only displayed direct transfers are counted.'
      );
    }

    if (/usdt|eth|token|amount|volume|total/.test(q)) {
      return (
        `Displayed transfer totals: ` +
        `${formatTokenTotals(analysis.totals)}.\n` +
        `These are summed transaction quantities, not ` +
        `wallet balances or financial losses.`
      );
    }

    if (/time|date|when|period|first|last/.test(q)) {
      if (!firstTransaction || !lastTransaction) {
        return 'No usable timestamps were found.';
      }

      return (
        `First displayed transfer: ` +
        `${formatDate(firstTransaction.timestamp)}.\n` +
        `Last displayed transfer: ` +
        `${formatDate(lastTransaction.timestamp)}.`
      );
    }

    if (/wallet|address|node|hop|counterpart/.test(q)) {
      return (
        `The sampled graph contains ${walletCount} unique ` +
        `addresses and ${counterpartyCount} direct ` +
        `counterparties to the reported wallet.\n` +
        `Reported wallet: ${walletAddress}.\n` +
        'Multi-hop graph connections do not prove ' +
        'that the same funds moved through each address.'
      );
    }

    if (/summary|overview|explain|analy/.test(q)) {
      return (
        `Ethereum transaction summary:\n` +
        `Wallets: ${walletCount}\n` +
        `Displayed transfers: ${totalTransfers}\n` +
        `Reported-wallet incoming: ${incomingCount}\n` +
        `Reported-wallet outgoing: ${outgoingCount}\n` +
        `Direct counterparties: ${counterpartyCount}\n` +
        `Token totals: ${formatTokenTotals(analysis.totals)}\n\n` +
        'This is a limited sample of observed transfers.'
      );
    }

    return (
      'I can answer questions about the loaded graph, ' +
      'including: transaction summary, incoming transfers, ' +
      'outgoing transfers, largest transaction, token totals, ' +
      'wallet connections, timestamps, transaction hashes, ' +
      'and whether exchange ownership or fraud is verified.'
    );
  };

  const send = (text = query) => {
    const question = text.trim();

    if (!question || loading) return;

    const answer = answerQuestion(question);

    setMessages((previous) => [
      ...previous,
      { sender: 'Officer', text: question },
      { sender: 'Assistant', text: answer },
    ]);

    setQuery('');
  };

  const suggestions = [
    'Summarize this graph',
    'How much ETH and USDT moved?',
    'Show the largest transaction',
    'How many outgoing transfers?',
  ];

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: '#94a3b8',
          marginBottom: 10,
        }}
      >
        Rule-based investigator assistant • Uses the loaded
        transaction sample • No external AI service
      </div>

      <div
        style={{
          height: 250,
          overflowY: 'auto',
          background: '#0b0f19',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              background:
                message.sender === 'Officer'
                  ? '#1e293b'
                  : '#111827',
              color: '#e2e8f0',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            <strong
              style={{
                color:
                  message.sender === 'Officer'
                    ? '#a7f3d0'
                    : '#38bdf8',
              }}
            >
              {message.sender}:
            </strong>
            {' '}{message.text}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => send(suggestion)}
            disabled={loading}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '5px 8px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        style={{
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          className="input"
          style={{ margin: 0, minWidth: 0, flex: 1 }}
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Ask about this transaction graph..."
          disabled={loading}
        />

        <button
          className="btn btn-primary"
          type="submit"
          disabled={!query.trim() || loading}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
