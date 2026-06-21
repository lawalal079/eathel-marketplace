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
  'function marketRegistry(string) view returns (string agentId, address creator, uint256 price, bool isListed, string metadataUri)'
]);

async function main() {
  try {
    const entry = await client.readContract({
      address: PROXY_ADDR,
      abi: abi,
      functionName: 'marketRegistry',
      args: ['Trading Bot']
    });
    console.log('Result for "Trading Bot":', entry);
  } catch (err) {
    console.error(err);
  }
}

main();
