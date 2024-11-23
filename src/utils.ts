import {
  BurnGuard,
  TransferGuard,
  CAT20,
  btc,
} from '@cat-protocol/cat-sdk';

import { SmartContract, toByteString } from 'scrypt-ts';

import { Tap } from '@cmdcode/tapscript';
import Decimal from 'decimal.js';

const ISSUE_PUBKEY =
  '0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';

export function contract2P2TR(contract: SmartContract): {
  p2tr: string;
  tapScript: string;
  cblock: string;
  contract: SmartContract;
} {
  const p2tr = script2P2TR(contract.lockingScript.toBuffer());
  return {
    ...p2tr,
    contract,
  };
}

export function script2P2TR(script: Buffer): {
  p2tr: string;
  tapScript: string;
  cblock: string;
} {
  const tapScript = Tap.encodeScript(script);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [p2tr, cblock] = Tap.getPubKey(ISSUE_PUBKEY, {
    target: tapScript,
  });
  return {
    p2tr: new btc.Script(`OP_1 32 0x${p2tr}`).toHex(),
    tapScript: tapScript,
    cblock,
  };
}

export enum GuardType {
  Transfer,
  Burn,
}

/** @deprecated */
export function getGuardsP2TR(guardType: GuardType = GuardType.Transfer): {
  p2tr: string;
  tapScript: string;
  cblock: string;
  contract: SmartContract;
} {
  const burnGuard = new BurnGuard();
  const transferGuard = new TransferGuard();
  const tapleafKeyBurnGuard = Tap.encodeScript(
    burnGuard.lockingScript.toBuffer(),
  );
  const tapleafKeyTransferGuard = Tap.encodeScript(
    transferGuard.lockingScript.toBuffer(),
  );

  const tapTree = [tapleafKeyBurnGuard, tapleafKeyTransferGuard];
  const [tpubkeyGuards] = Tap.getPubKey(ISSUE_PUBKEY, {
    tree: tapTree,
  });

  const [, cblockKeyBurnGuard] = Tap.getPubKey(ISSUE_PUBKEY, {
    target: tapleafKeyBurnGuard,
    tree: tapTree,
  });
  const [, cblockKeyTransferGuard] = Tap.getPubKey(ISSUE_PUBKEY, {
    target: tapleafKeyTransferGuard,
    tree: tapTree,
  });

  const p2tr = new btc.Script(`OP_1 32 0x${tpubkeyGuards}`).toHex();

  if (guardType === GuardType.Transfer) {
    return {
      p2tr,
      tapScript: tapleafKeyTransferGuard,
      cblock: cblockKeyTransferGuard,
      contract: transferGuard,
    };
  } else if (guardType === GuardType.Burn) {
    return {
      p2tr,
      tapScript: tapleafKeyBurnGuard,
      cblock: cblockKeyBurnGuard,
      contract: burnGuard,
    };
  } else {
    throw new Error('invalid guardType');
  }
}

export function getTokenContract(minterP2TR: string, guardsP2TR: string) {
  return new CAT20(minterP2TR, toByteString(guardsP2TR));
}

export function getTokenContractP2TR(minterP2TR: string) {
  const { p2tr: guardsP2TR } = getGuardsP2TR();
  return contract2P2TR(getTokenContract(minterP2TR, guardsP2TR));
}


export function scaleByDecimals(amount: bigint, decimals: number) {
  return amount * BigInt(Math.pow(10, decimals));
}

export function unScaleByDecimals(amount: bigint, decimals: number): string {
  return new Decimal(amount.toString().replace('n', ''))
    .div(Math.pow(10, decimals))
    .toFixed(decimals);
}
