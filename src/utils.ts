import {
  CAT20Covenant,
} from '@cat-protocol/cat-sdk';

import Decimal from 'decimal.js';

export function getTokenContractP2TR(minterP2TR: string) {
  return new CAT20Covenant(minterP2TR).lockingScriptHex;
}

export function scaleByDecimals(amount: bigint, decimals: number) {
  return amount * BigInt(Math.pow(10, decimals));
}

export function unScaleByDecimals(amount: bigint, decimals: number): string {
  return new Decimal(amount.toString().replace('n', ''))
    .div(Math.pow(10, decimals))
    .toFixed(decimals);
}
