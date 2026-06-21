const { createPublicClient, http, parseAbi } = require('viem');
require('dotenv').config({ path: './.env.local' });

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5042002', 10);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network';
const PROXY_ADDR = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

const arcChain = {
  id: CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
};

const client = createPublicClient({
  chain: arcChain,
  transport: http(RPC_URL)
});

const abi = parseAbi([
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

const agentIds = [
  'agent_python_coding',
  'agent_solidity_dev',
  'agent_arbitrage_bot',
  'agent_sentiment_ai',
  'agent_mev_protection',
  'agent_portfolio_mgmt'
];

async function main() {
  console.log(`Checking proxy: ${PROXY_ADDR}`);
  for (const agentId of agentIds) {
    try {
      const entry = await client.readContract({
        address: PROXY_ADDR,
        abi,
        functionName: 'marketRegistry',
        args: [agentId]
      });
      console.log(`ID: "${agentId}" -> registered: ${entry[1] !== '0x0000000000000000000000000000000000000000'}, creator: ${entry[1]}, isListed: ${entry[3]}`);
    } catch (err) {
      console.error(`Error checking "${agentId}":`, err.message);
    }
  }
}

main();
