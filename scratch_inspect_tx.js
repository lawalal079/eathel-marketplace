const { createPublicClient, http, parseAbi } = require('viem');

const RPC_URL = 'https://rpc.testnet.arc.network';

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
    const txHash = '0x23e791ef8c7cd176579906414201c03c7ebd75bf7ca6b127f5506c714882e2fe';
    const tx = await client.getTransaction({ hash: txHash });
    console.log('Transaction Input Data:', tx.input);
    console.log('To:', tx.to);
    
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    console.log('Status:', receipt.status);
    console.log('Logs count:', receipt.logs.length);
  } catch (err) {
    console.error(err);
  }
}

main();
