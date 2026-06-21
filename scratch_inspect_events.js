const { createPublicClient, http } = require('viem');

const RPC_URL = 'https://rpc.testnet.arc.network';
const PROXY_ADDR = '0x86552b0e39cf2b4861cd0d34254f0fd98d23e852';

const arcChain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
};

const client = createPublicClient({
  chain: arcChain,
  transport: http(RPC_URL)
});

async function main() {
  try {
    const latestBlock = await client.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Query logs from proxy address for *any* event topic
    // and scan the last 40,000 blocks.
    const CHUNK_SIZE = 9500n;
    const logs = [];

    for (let chunkStart = latestBlock - 40000n; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
      const start = chunkStart;
      const end = start + CHUNK_SIZE - 1n < latestBlock ? start + CHUNK_SIZE - 1n : latestBlock;
      try {
        const chunkLogs = await client.getLogs({
          address: PROXY_ADDR,
          fromBlock: start,
          toBlock: end
        });
        if (chunkLogs.length > 0) {
          logs.push(...chunkLogs);
        }
      } catch (err) {
        console.error(`Error on range ${start} to ${end}:`, err.message);
      }
    }

    console.log(`\n--- Total Logs Found: ${logs.length} ---`);
    const topics = new Map();
    for (const log of logs) {
      const mainTopic = log.topics[0];
      topics.set(mainTopic, (topics.get(mainTopic) || 0) + 1);
      console.log(`Tx: ${log.transactionHash}, Block: ${log.blockNumber}, Topic0: ${mainTopic}`);
    }
    console.log("\nTopic distribution:", Array.from(topics.entries()));

  } catch (err) {
    console.error('Fatal:', err);
  }
}

main();
