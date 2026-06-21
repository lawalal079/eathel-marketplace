const { createPublicClient, http, parseAbi } = require('viem');

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

const abi = parseAbi([
  'event AgentListed(string agentId, uint256 price, string metadataUri, address indexed developer)',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

async function main() {
  try {
    const latestBlock = await client.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Query logs in chunks starting from block 47,300,000 to latest
    // to find the exact block and topics of the 'Trading Bot' event.
    const CHUNK_SIZE = 9500n;
    const startBlock = 47300000n;

    for (let chunkStart = startBlock; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
      const end = chunkStart + CHUNK_SIZE - 1n < latestBlock ? chunkStart + CHUNK_SIZE - 1n : latestBlock;
      try {
        const chunkLogs = await client.getLogs({
          address: PROXY_ADDR,
          event: abi[0],
          fromBlock: chunkStart,
          toBlock: end
        });
        if (chunkLogs.length > 0) {
          console.log(`\n--- Found ${chunkLogs.length} events in range ${chunkStart} - ${end} ---`);
          for (const log of chunkLogs) {
            console.log('Log object keys:', Object.keys(log));
            console.log('Log args:', log.args);
            console.log('Log topics:', log.topics);
          }
        }
      } catch (err) {
        console.error(`Error on chunk ${chunkStart} - ${end}:`, err.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
