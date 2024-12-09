'use client'

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

// Function to fetch wallet data
const fetchWalletData = async () => {
	if (typeof window.unisat === 'undefined') {
		alert('UniSat Wallet is not installed. Please install it to use this feature.');
    window.open('https://unisat.io', '_blank');
		return { address: '', isWalletConnected: false, balance: 0 }
	}

	try {
		const accounts = await window.unisat.getAccounts()
		if (accounts && accounts.length > 0) {
			const balance = (await window.unisat.getBalance())?.confirmed || 0; // Default to 0 if undefined
			return { address: accounts[0], isWalletConnected: true, balance };
		}
	} catch (error) {
		console.error('Error fetching wallet data:', error)
	}

	return { address: '', isWalletConnected: false, balance: 0 };
}

export const useWallet = () => {
	const { data, mutate } = useSWR('wallet', fetchWalletData, {
		refreshInterval: 5000, // Refresh every 5 seconds
		revalidateOnFocus: false
	})

	const setAddress = (newAddress: string) => {
		// @ts-ignore
		mutate({ ...data, address: newAddress }, false)
	}

	const setIsWalletConnected = (isConnected: boolean) => {
		// @ts-ignore
		mutate({ ...data, isWalletConnected: isConnected }, false)
	}

	// Set up event listener for account changes
	useEffect(() => {
		const handleAccountsChanged = async (accounts: string[]) => {
			if (accounts.length > 0) {
				// Fetch balance when an account is available
				let balance = 0;
				if (typeof window.unisat !== 'undefined') {
					try {
						const fetchedBalance = await window.unisat.getBalance();
						balance = fetchedBalance?.confirmed || 0;
					} catch (error) {
						console.error('Error fetching balance:', error);
					}
				}
	
				mutate(
					{ address: accounts[0], isWalletConnected: true, balance },
					false
				);
			} else {
				mutate(
					{ address: '', isWalletConnected: false, balance: 0 },
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
	
	return {
		address: data?.address || '',
		isWalletConnected: data?.isWalletConnected || false,
		setAddress,
		setIsWalletConnected
	};	
}