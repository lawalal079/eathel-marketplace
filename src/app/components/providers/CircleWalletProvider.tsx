'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, formatUnits, http, parseAbi, type Address, type Chain } from 'viem';
import { setCookie, getCookie } from 'cookies-next';
import { SocialLoginProvider } from '@circle-fin/w3s-pw-web-sdk/dist/src/types';
import type { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

// ─── Environment config ────────────────────────────────────────────────────────

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '5042002', 10);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.testnet.arc.network';
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID as string;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string;

// ─── Viem & USDC config ───────────────────────────────────────────────────────

// USDC contract address is configured per-chain via env — no hardcoded fallbacks.
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '') as Address;

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

const targetChain: Chain = {
  id: CHAIN_ID,
  name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'ARC Testnet',
  nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
};

const publicClient = createPublicClient({ chain: targetChain, transport: http(RPC_URL) });

async function fetchUsdcBalance(address: Address): Promise<string> {
  if (!USDC_ADDRESS) return '0.00';
  try {
    const [raw, decimals] = await Promise.all([
      publicClient.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }),
      publicClient.readContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: 'decimals' }),
    ]);
    return parseFloat(formatUnits(raw as bigint, decimals as number)).toFixed(2);
  } catch {
    return '0.00';
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface CircleWalletContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  usdcBalance: string;
  authMethod: 'privy' | 'circle_google' | null;
  authStatusMessage: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEOA: () => Promise<void>;
  logout: () => void;
  authError: string | null;
  refreshBalance: () => Promise<void>;
  loginResult?: LoginResult | null;
  circleWallets?: Wallet[];
  executeChallenge?: (challengeId: string) => Promise<unknown>;
}

const DEFAULT_VALUE: CircleWalletContextValue = {
  isConnected: false,
  isConnecting: false,
  walletAddress: null,
  usdcBalance: '0.00',
  authMethod: null,
  authStatusMessage: null,
  loginWithGoogle: async () => {},
  loginWithEOA: async () => {},
  logout: () => {},
  authError: null,
  refreshBalance: async () => {},
  loginResult: null,
  circleWallets: [],
  executeChallenge: async () => { throw new Error("executeChallenge not implemented"); },
};

export const CircleWalletContext = createContext<CircleWalletContextValue>(DEFAULT_VALUE);

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginResult = {
  userToken: string;
  encryptionKey: string;
};

type Wallet = {
  id: string;
  address: string;
  blockchain: string;
  [key: string]: unknown;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CircleWalletProvider({ children }: { children: React.ReactNode }) {
  // ── Privy State ────────────────────────────────────────────────────────────
  const { ready: privyReady, authenticated: privyAuthenticated, user, login: privyLogin, logout: privyLogout } = usePrivy();
  const { wallets: privyWallets } = useWallets();

  // ── Circle State ───────────────────────────────────────────────────────────
  const sdkRef = useRef<W3SSdk | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceIdLoading, setDeviceIdLoading] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [deviceEncryptionKey, setDeviceEncryptionKey] = useState<string>('');
  const [loginResult, setLoginResult] = useState<LoginResult | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('circle_login_result');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return null;
  });
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [circleWallets, setCircleWallets] = useState<Wallet[]>([]);

  // ── Shared State ───────────────────────────────────────────────────────────
  const [usdcBalance, setUsdcBalance] = useState('0.00');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const balancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determine active connection
  const activePrivyWallet = user?.wallet?.address ?? privyWallets?.[0]?.address ?? null;
  const isPrivyConnected = privyReady && privyAuthenticated && !!activePrivyWallet;
  
  const activeCircleWallet = circleWallets[0]?.address ?? null;
  const isCircleConnected = !!activeCircleWallet;

  const isConnected = isPrivyConnected || isCircleConnected;
  const walletAddress = isCircleConnected ? activeCircleWallet : (isPrivyConnected ? activePrivyWallet : null);
  const authMethod = isCircleConnected ? 'circle_google' : (isPrivyConnected ? 'privy' : null);

  // ── Circle SDK Initialization ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const initSdk = async () => {
      try {
        const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk');

        const onLoginComplete = (error: unknown, result: any) => {
          if (cancelled) return;
          if (error) {
            console.error('Circle login failed:', error);
            setAuthError((error as any).message || 'Circle login failed');
            setLoginResult(null);
            setAuthStatusMessage('Login failed');
            return;
          }
          const newResult = {
            userToken: result.userToken,
            encryptionKey: result.encryptionKey,
          };
          if (typeof window !== 'undefined') window.localStorage.setItem('circle_login_result', JSON.stringify(newResult));
          setLoginResult(newResult);
          setAuthError(null);
          setAuthStatusMessage('Login successful. Credentials received from Google. Initializing user...');
        };

        const restoredAppId = (getCookie('appId') as string) || APP_ID || '';
        const restoredGoogleClientId = (getCookie('google.clientId') as string) || GOOGLE_CLIENT_ID || '';
        const restoredDeviceToken = (getCookie('deviceToken') as string) || '';
        const restoredDeviceEncryptionKey = (getCookie('deviceEncryptionKey') as string) || '';

        const initialConfig = {
          appSettings: { appId: restoredAppId },
          loginConfigs: {
            deviceToken: restoredDeviceToken,
            deviceEncryptionKey: restoredDeviceEncryptionKey,
            google: {
              clientId: restoredGoogleClientId,
              redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
              selectAccountPrompt: true,
            },
          },
        };

        const sdk = new W3SSdk(initialConfig, onLoginComplete);
        sdkRef.current = sdk;

        if (!cancelled) setSdkReady(true);
      } catch (err) {
        console.error('Failed to init Web SDK:', err);
      }
    };

    void initSdk();
    return () => { cancelled = true; };
  }, []);

  // ── Get / Cache Device ID ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchDeviceId = async () => {
      if (!sdkRef.current) return;
      try {
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem('deviceId') : null;
        if (cached) {
          setDeviceId(cached);
          return;
        }
        setDeviceIdLoading(true);
        const id = await sdkRef.current.getDeviceId();
        setDeviceId(id);
        if (typeof window !== 'undefined') window.localStorage.setItem('deviceId', id);
      } catch (error) {
        console.error('Failed to get deviceId:', error);
      } finally {
        setDeviceIdLoading(false);
      }
    };
    if (sdkReady) void fetchDeviceId();
  }, [sdkReady]);

  // ── Step 1: Create Device Token (triggered during loginWithGoogle) ────────
  const ensureDeviceToken = async (): Promise<boolean> => {
    if (deviceToken && deviceEncryptionKey) return true;
    if (!deviceId) {
      setAuthError('Missing device ID. Please try again.');
      return false;
    }
    
    setAuthStatusMessage('Creating secure device session...');
    try {
      const response = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createDeviceToken', deviceId }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        setAuthError(data.error || 'Failed to create device token');
        return false;
      }
      
      setDeviceToken(data.deviceToken);
      setDeviceEncryptionKey(data.deviceEncryptionKey);
      setCookie('deviceToken', data.deviceToken);
      setCookie('deviceEncryptionKey', data.deviceEncryptionKey);
      return true;
    } catch (err) {
      setAuthError('Failed to communicate with authentication server.');
      return false;
    }
  };

  // ── Step 2: Trigger Google Login ───────────────────────────────────────────
  const loginWithGoogle = async () => {
    if (isPrivyConnected) await privyLogout(); // Cannot be logged into both

    if (!sdkRef.current) {
      setAuthError('Circle SDK not initialized yet.');
      return;
    }
    
    const tokenReady = await ensureDeviceToken();
    if (!tokenReady) return;

    // Persist config for redirect return
    setCookie('appId', APP_ID);
    setCookie('google.clientId', GOOGLE_CLIENT_ID);
    
    sdkRef.current.updateConfigs({
      appSettings: { appId: APP_ID },
      loginConfigs: {
        deviceToken,
        deviceEncryptionKey,
        google: {
          clientId: GOOGLE_CLIENT_ID,
          redirectUri: window.location.origin,
          selectAccountPrompt: true,
        },
      },
    });

    setAuthStatusMessage('Redirecting to Google...');
    sdkRef.current.performLogin(SocialLoginProvider.GOOGLE);
  };

  // ── Step 3: Handle User Initialization (runs after redirect returns) ───────
  useEffect(() => {
    if (!loginResult?.userToken) return;

    const initializeUser = async () => {
      try {
        setAuthStatusMessage('Checking wallet status...');
        const response = await fetch('/api/endpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'initializeUser', userToken: loginResult.userToken }),
        });
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            console.warn("Circle userToken expired or unauthorized. Logging out...");
            unifiedLogout();
            return;
          }
          if (data.code === 155106) {
            // User already initialized, just load their wallets
            await loadCircleWallets(loginResult.userToken);
            return;
          }
          setAuthError(`[${data.code}] ${data.error || data.message}`);
          return;
        }

        // Needs to create a wallet -> challenge
        setChallengeId(data.challengeId);
        setAuthStatusMessage('Waiting for wallet creation authorization...');
      } catch (err) {
        setAuthError('Failed to initialize user session.');
      }
    };

    void initializeUser();
  }, [loginResult]);

  // ── Step 4: Execute Challenge (if needed) ──────────────────────────────────
  useEffect(() => {
    if (!challengeId || !sdkRef.current || !loginResult) return;

    const executeAuth = () => {
      sdkRef.current!.setAuthentication({
        userToken: loginResult.userToken,
        encryptionKey: loginResult.encryptionKey,
      });

      sdkRef.current!.execute(challengeId, (error) => {
        if (error) {
          setAuthError('Failed to authorize wallet creation: ' + (error as any).message);
          return;
        }
        
        setAuthStatusMessage('Wallet created! Loading details...');
        setTimeout(() => {
          setChallengeId(null);
          void loadCircleWallets(loginResult.userToken);
        }, 2000);
      });
    };

    executeAuth();
  }, [challengeId, loginResult]);

  // ── Helper: Load Circle Wallets ────────────────────────────────────────────
  const loadCircleWallets = async (userToken: string) => {
    try {
      setAuthStatusMessage('Loading wallets...');
      const response = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listWallets', userToken }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Circle userToken expired. Logging out...");
          unifiedLogout();
          return;
        }
        setAuthError('Failed to load wallet details.');
        return;
      }
      
      const fetchedWallets = (data.wallets as Wallet[]) || [];
      setCircleWallets(fetchedWallets);
      
      if (fetchedWallets.length > 0) {
        setAuthStatusMessage(null); // Success
      } else {
        setAuthError('No wallets found for this user.');
      }
    } catch (err) {
      setAuthError('Error fetching wallets.');
    }
  };

  // ── Logout Handler ─────────────────────────────────────────────────────────
  const unifiedLogout = () => {
    if (isPrivyConnected) privyLogout();
    if (typeof window !== 'undefined') window.localStorage.removeItem('circle_login_result');
    setLoginResult(null);
    setCircleWallets([]);
    setUsdcBalance('0.00');
    setAuthStatusMessage(null);
  };

  // ── Balance Polling ────────────────────────────────────────────────────────
  const refreshBalance = useCallback(async (addr: Address) => {
    // If it's a circle wallet, we could theoretically fetch from the Circle API
    // but fetching directly from ARC testnet via Viem is faster and unified.
    const bal = await fetchUsdcBalance(addr);
    setUsdcBalance(bal);
  }, []);

  useEffect(() => {
    if (isConnected && walletAddress) {
      void refreshBalance(walletAddress as Address);
      if (balancePollRef.current) clearInterval(balancePollRef.current);
      balancePollRef.current = setInterval(() => void refreshBalance(walletAddress as Address), 30_000);
    } else {
      if (balancePollRef.current) {
        clearInterval(balancePollRef.current);
        balancePollRef.current = null;
      }
      setUsdcBalance('0.00');
    }
    return () => {
      if (balancePollRef.current) clearInterval(balancePollRef.current);
    };
  }, [isConnected, walletAddress, refreshBalance]);

  const executeChallenge = useCallback((challengeId: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!sdkRef.current) {
        reject(new Error("Circle SDK not initialized"));
        return;
      }
      if (!loginResult) {
        reject(new Error("User not authenticated with Circle"));
        return;
      }

      sdkRef.current.setAuthentication({
        userToken: loginResult.userToken,
        encryptionKey: loginResult.encryptionKey,
      });

      sdkRef.current.execute(challengeId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }, [loginResult]);

  const value: CircleWalletContextValue = {
    isConnected,
    isConnecting: !privyReady || deviceIdLoading || !!authStatusMessage,
    walletAddress,
    usdcBalance,
    authMethod,
    authStatusMessage,
    loginWithGoogle,
    loginWithEOA: async () => privyLogin(),
    logout: unifiedLogout,
    authError,
    refreshBalance: async () => {
      if (walletAddress) {
        await refreshBalance(walletAddress as Address);
      }
    },
    loginResult,
    circleWallets,
    executeChallenge,
  };

  return (
    <CircleWalletContext.Provider value={value}>
      {children}
    </CircleWalletContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCircleWallet(): CircleWalletContextValue {
  return useContext(CircleWalletContext);
}

export function useWalletDisplay() {
  const { walletAddress, isConnected, usdcBalance, authMethod, authStatusMessage } = useCircleWallet();
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;
  return { shortAddress, isConnected, usdcBalance, authMethod, authStatusMessage };
}
