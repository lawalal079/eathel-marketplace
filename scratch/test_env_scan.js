const { createPublicClient, http, parseAbi, decodeFunctionData } = require('viem');
require('dotenv').config({ path: './.env.local' });

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5042002', 10);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network';
const PROXY_ADDR = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_MARKETPLACE_DEPLOY_BLOCK || '0');

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
  'event AgentListed(string indexed agentId, uint256 price, string metadataUri, address indexed developer)',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

async function main() {
  console.log(`Configured Proxy: ${PROXY_ADDR}`);
  console.log(`Configured Deploy Block: ${DEPLOY_BLOCK}`);
  console.log(`Using RPC: ${RPC_URL}`);

  try {
    const latestBlock = await client.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    const CHUNK_SIZE = 9500n;
    const logs = [];

    for (let chunkStart = DEPLOY_BLOCK; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
      const end = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
      try {
        const chunkLogs = await client.getLogs({
          address: PROXY_ADDR,
          event: abi[0],
          fromBlock: chunkStart,
          toBlock: end
        });
        if (chunkLogs.length > 0) {
          console.log(`Found ${chunkLogs.length} logs in block range ${chunkStart} to ${end}`);
          logs.push(...chunkLogs);
        }
      } catch (err) {
        console.error(`Error on range ${chunkStart} to ${end}:`, err.message);
      }
    }

    console.log(`\n--- Total AgentListed Logs: ${logs.length} ---`);
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const txHash = log.transactionHash;
      const topicIdHash = log.topics[1];

      console.log(`Log #${i + 1}:`);
      console.log(`  TxHash: ${txHash}`);
      console.log(`  TopicIdHash (keccak256): ${topicIdHash}`);

      let plainTextId = 'Unknown';
      try {
        const tx = await client.getTransaction({ hash: txHash });
        const coderAbi = parseAbi(['function listAgent(string agentId, uint256 price, string metadataUri)']);
        const decoded = decodeFunctionData({
          abi: coderAbi,
          data: tx.input
        });
        if (decoded.args && decoded.args[0]) {
          plainTextId = decoded.args[0];
          console.log(`  Decoded plain-text agentId: "${plainTextId}"`);
        }
      } catch (err) {
        console.log(`  ⚠️ Failed to decode transaction input: ${err.message}`);
      }

      // Query contract for resolved ID
      try {
        const entry = await client.readContract({
          address: PROXY_ADDR,
          abi,
          functionName: 'marketRegistry',
          args: [plainTextId === 'Unknown' ? topicIdHash : plainTextId]
        });
        console.log(`  marketRegistry result:`, entry);
      } catch (err) {
        console.error(`  ❌ Failed to query registry:`, err.message);
      }
      console.log('-------------------------------------------');
    }
  } catch (err) {
    console.error('Fatal error:', err);
  }
}

main();
