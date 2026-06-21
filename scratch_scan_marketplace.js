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

// ABI definitions matching Solidity exactly (event parameters indexed)
const abi = parseAbi([
  'event AgentListed(string indexed agentId, uint256 price, string metadataUri, address indexed developer)',
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

async function main() {
  try {
    const latestBlock = await client.getBlockNumber();
    console.log(`Scanning starting at block 47,000,000 to latest block ${latestBlock}...\n`);

    const CHUNK_SIZE = 9500n;
    const startBlock = 47000000n;
    const logs = [];

    // Paginated scan
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
          logs.push(...chunkLogs);
        }
      } catch (err) {
        console.error(`Error scanning range ${chunkStart} - ${end}:`, err.message);
      }
    }

    console.log(`\nFound ${logs.length} total AgentListed logs. Analyzing each registration:\n`);

    const seenIds = new Set();

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const txHash = log.transactionHash;
      
      // Since agentId is indexed in logs, it is a Keccak-256 topic hash.
      const topicIdHash = log.topics[1]; 

      console.log(`[Log #${i + 1}] Tx: ${txHash}`);
      console.log(`  Indexed AgentId Topic Hash: ${topicIdHash}`);
      
      // 1. Get raw transaction to decode the parameter
      let plainTextId = 'Unknown (failed to decode)';
      try {
        const tx = await client.getTransaction({ hash: txHash });
        const { args: decodedArgs } = require('viem').decodeFunctionData({
          abi: parseAbi(['function listAgent(string agentId, uint256 price, string metadataUri)']),
          data: tx.input
        });
        if (decodedArgs && decodedArgs[0]) {
          plainTextId = decodedArgs[0];
          console.log(`  Decoded Plain-Text AgentId: "${plainTextId}"`);
        }
      } catch (err) {
        console.log(`  ⚠️ Failed to decode transaction input: ${err.message}`);
      }

      if (plainTextId === 'Unknown (failed to decode)') {
        // Fallback checks
        if (topicIdHash === '0xe61300407dae3ed32a842d0b7f29d0a7a34bf5e8bea9b3a68f490a897db6a259') {
          plainTextId = 'Trading Bot';
          console.log(`  Decoded via known fallback mapping: "${plainTextId}"`);
        }
      }

      // 2. Query marketRegistry mapping using the plainTextId
      try {
        const entry = await client.readContract({
          address: PROXY_ADDR,
          abi: abi,
          functionName: 'marketRegistry',
          args: [plainTextId]
        });

        const [registryId, creator, price, isListed, metadataUri] = entry;

        console.log(`  Registry Entry status for "${plainTextId}":`);
        console.log(`    Id in Registry: "${registryId}"`);
        console.log(`    Creator Address: ${creator}`);
        console.log(`    USDC Price: ${Number(price) / 1000000} USDC`);
        console.log(`    isListed flag: ${isListed}`);
        console.log(`    metadataUri: "${metadataUri}"`);

        // Check listing constraints
        if (!isListed) {
          console.log(`  ❌ REJECTED BY UI: Agent is explicitly delisted (isListed = false).`);
        } else if (registryId === "") {
          console.log(`  ❌ REJECTED BY UI: ID is empty in registry (contract did not save under key "${plainTextId}").`);
        } else {
          // Validate metadata JSON
          try {
            const parsed = JSON.parse(metadataUri);
            console.log(`  ✅ APPROVED FOR UI: Will render under name "${parsed.title || registryId}"`);
          } catch (jsonErr) {
            console.log(`  ⚠️ Metadata is not JSON: "${metadataUri}". Will render under raw metadata/id title.`);
            console.log(`  ✅ APPROVED FOR UI (with raw metadata fallback).`);
          }
        }
      } catch (err) {
        console.log(`  ❌ readContract failed for "${plainTextId}": ${err.message}`);
      }
      console.log('--------------------------------------------------');
    }

  } catch (err) {
    console.error('Fatal execution error:', err);
  }
}

main();
