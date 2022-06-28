import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { chain, configureChains, createClient, WagmiConfig, Chain } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import type { AppProps } from "next/app";

const bscChain: Chain = {
  id: 56,
  name: "BNB Chain",
  network: "bsc",
  nativeCurrency: {
    decimals: 18,
    name: "Binance",
    symbol: "BNB",
  },
  rpcUrls: {
    default: "https://rpc.ankr.com/bsc",
  },
  blockExplorers: {
    default: { name: "BSC Scan", url: "https://bscscan.com/" },
  },
  testnet: false,
};

const { chains, provider } = configureChains(
  [chain.mainnet, chain.polygon, bscChain],
  [jsonRpcProvider({ rpc: () => ({ http: "https://rpc.ankr.com/eth" }) }), jsonRpcProvider({ rpc: () => ({ http: "https://rpc.ankr.com/polygon" }) }), jsonRpcProvider({ rpc: () => ({ http: "https://rpc.ankr.com/bsc" }) }), publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: "Tokenfolio",
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default MyApp;
