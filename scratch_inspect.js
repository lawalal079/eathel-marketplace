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
  'event AgentListed(string indexed agentId, uint256 price, string metadataUri, address indexed developer)',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

async function main() {
  try {
    const latestBlock = await client.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Let's do a paginated search for ALL AgentListed logs
    const CHUNK_SIZE = 9500n;
    const logs = [];
    
    // We walk backwards to find recent events faster
    for (let chunkStart = latestBlock - 50000n; chunkStart <= latestBlock; chunkStart += CHUNK_SIZE) {
      const start = chunkStart < 0n ? 0n : chunkStart;
      const end = start + CHUNK_SIZE - 1n < latestBlock ? start + CHUNK_SIZE - 1n : latestBlock;
      
      try {
        const chunkLogs = await client.getLogs({
          address: PROXY_ADDR,
          event: abi[0],
          fromBlock: start,
          toBlock: end
        });
        if (chunkLogs.length > 0) {
          console.log(`Found ${chunkLogs.length} events in block range ${start} to ${end}`);
          logs.push(...chunkLogs);
        }
      } catch (err) {
        console.error(`Error on range ${start} to ${end}:`, err.message);
      }
    }

    console.log(`\n--- Total AgentListed Events Found: ${logs.length} ---`);
    const uniqueAgents = new Map();

    for (const log of logs) {
      const { agentId, price, metadataUri, developer } = log.args;
      console.log(`Log - ID: "${agentId}", Dev: ${developer}, Price: ${price}, Metadata: ${metadataUri}`);
      uniqueAgents.set(agentId, { price, metadataUri, developer });
    }

    console.log(`\n--- Querying marketRegistry for each unique agent ID ---`);
    for (const [agentId, info] of uniqueAgents.entries()) {
      try {
        const entry = await client.readContract({
          address: PROXY_ADDR,
          abi: abi,
          functionName: 'marketRegistry',
          args: [agentId]
        });
        console.log(`Registry for "${agentId}": id="${entry[0]}", creator=${entry[1]}, price=${entry[2]}, isListed=${entry[3]}, metadata="${entry[4]}"`);
      } catch (err) {
        console.error(`Failed reading registry for "${agentId}":`, err.message);
      }
    }

  } catch (err) {
    console.error('Fatal:', err);
  }
}

main();
