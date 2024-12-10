'use client'
import { Token } from './types';


import { useEffect } from 'react'
import useSWR from 'swr'

declare global {
	interface Window {
		unisat: UnisatAPI
	}
}

export interface UnisatAPI {
	getAccounts: () => Promise<string[]>
	requestAccounts: () => Promise<string[]>
	getNetwork: () => Promise<string>
	getPublicKey: () => Promise<string>
	getTokens: () => Promise<
    {
      decimals: number, tokenName: string; balance: number; tokenAddress: string 
}[]
  >; // structure for tokens
	getBalance: () => Promise<{ confirmed: number; unconfirmed: number; total: number }>
	signMessage: (message: string, type: 'ecdsa' | 'bip322-simple') => Promise<string>
	signPsbt: (psbtHex: string, options?: {
		autoFinalized: boolean,
		toSignInputs: Array<{
			index: number,
			address?: string,
			publicKey?: string,
			sighashTypes?: number[],
			disableTweakSigner?: boolean,
		}>
	}) => Promise<string>

	signPsbts: (psbtHex: string[], options?: Array<{
		autoFinalized: boolean,
		toSignInputs: Array<{
			index: number,
			address?: string,
			publicKey?: string,
			sighashTypes?: number[],
			disableTweakSigner?: boolean,
		}>
	}>) => Promise<string[]>
	getBitcoinUtxos: () => Promise<
		{ txid: string; vout: number; satoshis: number; scriptPk: string }[]
	>

	switchChain: (chain: string) => Promise<any>
	on: (event: string, callback: (...args: any[]) => void) => void
	removeListener: (event: string, callback: (...args: any[]) => void) => void // Added removeListener method
}

// Fetch wallet tokens
const fetchWalletTokens = async (): Promise<Token[]> => {
	const API_URL = "https://open-api-fractal.unisat.io/v1/cat20-dex/getTokenPrice";
	const API_KEY = "038d71176ef925866e7acbc1a00500168cee57d59157105d0afb1b0f9dcaeff6"; // Replace with your actual API key
  
	try {
	  const response = await fetch(API_URL, {
		method: "GET",
		headers: {
		  accept: "application/json",
		  Authorization: `Bearer ${API_KEY}`,
		},
	  });
  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
  
	  const data = await response.json();
	  return data.tokens || []; // Assuming `tokens` is the correct key in the response
	} catch (error) {
	  console.error("Error fetching tokens:", error);
	  return [];
	}
  };
	
// Function to fetch wallet data
const fetchWalletData = async () => {
	if (typeof window.unisat === 'undefined') {
		alert('UniSat Wallet is not installed. Please install it to use this feature.');
    window.open('https://unisat.io', '_blank');
		return { address: '', isWalletConnected: false, balance: 0, tokens: [] };
	}

	try {
		const accounts = await window.unisat.getAccounts()
		if (accounts && accounts.length > 0) {
			const balance = (await window.unisat.getBalance())?.confirmed || 0; // Default to 0 if undefined
			const tokens = await fetchWalletTokens(); // Fetch tokens here
			return { address: accounts[0], isWalletConnected: true, balance, tokens };
		}
	} catch (error) {
		console.error('Error fetching wallet data:', error)
	}

	return { address: '', isWalletConnected: false, balance: 0, tokens: [] };
}

export const useWallet = () => {
	const { data, mutate } = useSWR('wallet', fetchWalletData, {
		refreshInterval: 5000, // Refresh every 5 seconds
		revalidateOnFocus: false
	})

	const setAddress = (newAddress: string) => {
		// @ts-ignore
		mutate({ ...data, address: newAddress }, false);
	}

	const setIsWalletConnected = (isConnected: boolean) => {
		// @ts-ignore
		mutate({ ...data, isWalletConnected: isConnected }, false);
	}
	const setTokens = (tokens: any[]) => {
		// @ts-ignore
		mutate({ ...data, tokens }, false);
	}

	// Set up event listener for account changes
	useEffect(() => {
		const handleAccountsChanged = async (accounts: string[]) => {
			if (accounts.length > 0) {
				// Fetch balance when an account is available
				let balance = 0;
				let tokens: any[] = [];
				if (typeof window.unisat !== 'undefined') {
					try {
						const fetchedBalance = await window.unisat.getBalance();
						balance = fetchedBalance?.confirmed || 0;
						tokens = await fetchWalletTokens(); // Fetch tokens when accounts change
					} catch (error) {
						console.error('Error fetching balance:', error);
					}
				}
	
				mutate(
					{ address: accounts[0], isWalletConnected: true, balance, tokens },
					false
				);
			} else {
				mutate(
					{ address: '', isWalletConnected: false, balance: 0, tokens: [] },
					false
				);
			}
		};
	
		if (typeof window.unisat !== 'undefined') {
			window.unisat.on('accountsChanged', handleAccountsChanged);
		}
	
		return () => {
			if (typeof window.unisat !== 'undefined') {
				window.unisat.removeListener('accountsChanged', handleAccountsChanged);
			}
		};
	}, [mutate]);

	// Fetch tokens when wallet is connected
	useEffect(() => {
		const fetchTokensOnConnect = async () => {
		  if (data?.isWalletConnected && typeof window.unisat !== 'undefined') {
			const tokens = await fetchWalletTokens();
			setTokens([tokens]);
		  }
		};
	
		fetchTokensOnConnect();
	  }, [data?.isWalletConnected]);
	
	return {
		address: data?.address || '',
		isWalletConnected: data?.isWalletConnected || false,
		balance: data?.balance || 0,
        tokens: data?.tokens || [],
		setAddress,
		setIsWalletConnected,
		setTokens,
	};	
}