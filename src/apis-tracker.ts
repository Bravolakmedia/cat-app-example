import {
  Cat20TokenInfo,
  Cat20Utxo,
  OpenMinterCat20Meta,
  SupportedNetwork,
  addrToP2trLockingScript,
  p2trLockingScriptToAddr,
} from '@cat-protocol/cat-sdk';
import fetch from 'cross-fetch';
import { getTokenContractP2TR } from './utils';

export const getTokens = async function (
  baseApi: string,
  tokenId: string,
  ownerAddress: string,
): Promise<Array<Cat20Utxo>> {
  const url = `${baseApi}/api/tokens/${tokenId}/addresses/${ownerAddress}/utxos?limit=4`;
  return fetch(url, {})
    .then((res) => res.json())
    .then((res: any) => {
      if (res.code === 0) {
        return res.data;
      } else {
        throw new Error(res.msg);
      }
    })
    .then(({ utxos, trackerBlockHeight }) => {
      let cat20Utxos: Array<Cat20Utxo> = utxos.map((utxoData: any) => {
        if (typeof utxoData.utxo.satoshis === 'string') {
          utxoData.utxo.satoshis = parseInt(utxoData.utxo.satoshis);
        }

        const cat20Utxo: Cat20Utxo = {
          utxo: utxoData.utxo,
          txoStateHashes: utxoData.txoStateHashes,
          state: {
            ownerAddr: utxoData.state.address,
            amount: BigInt(utxoData.state.amount),
          },
        };

        return cat20Utxo;
      });

      return cat20Utxos;
    })
    .catch((e) => {
      return [];
    });
};


export const getTokenInfo = async function (
  baseApi: string,
  id: string,
  network: SupportedNetwork
): Promise<Cat20TokenInfo<OpenMinterCat20Meta> | null> {
  const url = `${baseApi}/api/tokens/${id}`;
  return fetch(url, {})
    .then((res) => res.json())
    .then((res: any) => {
      if (res.code === 0) {
        if (res.data === null) {
          return null;
        }
        const token = res.data;

        const { info, metadata, tokenAddr, ...rest } = token;

        let metadataTmp: any = {};
        if (info) {
          Object.assign(metadataTmp, info);
        } else {
          metadataTmp = metadata;
        }

        if (typeof metadataTmp.max === 'string') {
          // convert string to  bigint
          metadataTmp.max = BigInt(metadataTmp.max);
          metadataTmp.premine = BigInt(metadataTmp.premine);
          metadataTmp.limit = BigInt(metadataTmp.limit);
        }
        let tokenAddrTmp: string = tokenAddr;
        if (!tokenAddrTmp) {
          const minterP2TR = addrToP2trLockingScript(token.minterAddr);
          tokenAddrTmp = p2trLockingScriptToAddr(
            getTokenContractP2TR(minterP2TR),
            network,
          );
        }
        return {
          tokenAddr: tokenAddrTmp,
          metadata: metadataTmp,
          ...rest,
        };
      } else {
        throw new Error(res.msg);
      }
    })
    .catch((e) => {
      return null;
    });
};



export const getBalance = async function (
  baseApi: string,
  info: Cat20TokenInfo<OpenMinterCat20Meta>,
  ownerAddress: string,
): Promise<{
  tokenId: string;
  symbol: string;
  confirmed: bigint;
}> {
  const url = `${baseApi}/api/tokens/${info.tokenId}/addresses/${ownerAddress}/balance`;
  return fetch(url, {})
    .then((res) => res.json())
    .then((res: any) => {
      if (res.code === 0) {
        return res.data;
      } else {
        throw new Error(res.msg);
      }
    })
    .then(({ confirmed, tokenId }) => {
      return {
        tokenId: tokenId,
        symbol: info.metadata!.symbol,
        confirmed: BigInt(confirmed),
      };
    })
    .catch((e) => {
      return {
        tokenId: info.tokenId,
        symbol: info.metadata!.symbol,
        confirmed: 0n,
      };
    });
};
