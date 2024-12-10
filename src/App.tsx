import { useState } from "react";
import "./App.css";
import { unScaleByDecimals } from "./utils";

import { useForm } from "react-hook-form";
import Decimal from "decimal.js";
import { useWallet } from "./unisat";
import useSWR from "swr";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  Input,
  InputLabel,
} from "@mui/material";
import Divider from "@mui/material/Divider";
import {
  singleSend,
  SupportedNetwork,
  Cat20TokenInfo,
  OpenMinterCat20Meta,
  MempolChainProvider,
  MempoolUtxoProvider,
  toTokenAddress,
  UnisatSigner,
} from "@cat-protocol/cat-sdk";
import { getBalance, getTokenInfo, getTokens } from "./apis-tracker";

function App() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [txid, setTxId] = useState<string | undefined>(undefined);
  const { address, setAddress, isWalletConnected, setIsWalletConnected, tokens, setTokens, } =
    useWallet();

  function useFetchTokenInfo() {
    return useSWR<Cat20TokenInfo<OpenMinterCat20Meta>, Error>(
      "/fetchmetadata",
      async () => {
        const tokenInfo = await getTokenInfo(
          process.env.REACT_APP_TRACKER_URL || "",
          process.env.REACT_APP_TOKEN_ID || "",
          process.env.REACT_APP_NETWORK as SupportedNetwork
        );

        if (tokenInfo === null) {
          throw new Error("getTokenMetadata failed");
        }
        return tokenInfo;
      }
    );
  }

  const { data: tokenInfo, isLoading, error } = useFetchTokenInfo();

  function useFetchBalance(
    tokenInfo: Cat20TokenInfo<OpenMinterCat20Meta> | undefined,
    address: any
  ) {
    return useSWR<
      {
        tokenId: string;
        symbol: string;
        confirmed: bigint;
      },
      Error
    >("/fetchbalance", async () => {
      console.log("getBalance", tokenInfo);
      if (tokenInfo && address) {
        const balance = await getBalance(
          process.env.REACT_APP_TRACKER_URL || "",
          tokenInfo,
          address
        );

        if (balance === null) {
          throw new Error("getBalance failed");
        }
        return balance;
      }
      throw new Error("getBalance no metadata");
    });
  }

  const { data: balance } = useFetchBalance(tokenInfo, address);

  const onSubmit = async (data: any) => {
    console.log("onSubmit:", data);
    // async request which may result error
    try {
      if (!tokenInfo) {
        console.warn("onSubmit but no tokenInfo");
        return;
      }

      const d = new Decimal(data.amount).mul(
        Math.pow(10, tokenInfo.metadata!.decimals)
      );
      const amount = BigInt(d.toString());

      const cat20Utxos = await getTokens(
        process.env.REACT_APP_TRACKER_URL || "",
        tokenInfo.tokenId,
        address
      );

      if (cat20Utxos.length === 0) {
        console.error("getTokens null");
        return;
      }
      const network: SupportedNetwork =
        (process.env.REACT_APP_NETWORK as SupportedNetwork) ||
        "fractal-testnet";
      const chainProvider = new MempolChainProvider(network);
      const utxoProvider = new MempoolUtxoProvider(network);

      const feeRate = 1;
      const signer = new UnisatSigner(window.unisat);
      const sendRes = await singleSend(
        signer,
        utxoProvider,
        chainProvider,
        tokenInfo.minterAddr,
        cat20Utxos,
        [
          {
            address: toTokenAddress(data.address),
            amount,
          },
        ],
        toTokenAddress(address),
        feeRate
      );

      if (sendRes === null) {
        console.error("sendToken null");
        return;
      }

      console.log(
        `Sending ${unScaleByDecimals(amount, tokenInfo.metadata!.decimals)} ${
          tokenInfo.metadata!.symbol
        } tokens to ${data.address} \nin txid: ${sendRes.sendTxId}`
      );

      setTxId(sendRes.sendTxId);
    } catch (e) {
      // handle your error
      console.error("submit error:", e);
    }
  };

  const onConnect = async () => {
    console.log("onConnect ...");
    // async request which may result error
    try {
      const res = await window.unisat.requestAccounts();

      if (Array.isArray(res)) {
        console.log("onConnect success", res);
        setAddress(res[0]);
        setIsWalletConnected(true);
      }
    } catch (e) {
      // handle your error
      console.error("onConnect error:", e);
    }
  };

  return (
    <Container className="App">
      {!isWalletConnected ? (
        <Box sx={{ marginTop: 16 }}>
          <Button variant="contained" onClick={onConnect}>
            Connect Wallet
          </Button>
        </Box>
      ) : (
        <></>
      )}

      <Divider sx={{ marginTop: 8 }} />

      <Box className="App-header">
        <Box>
          Address:{" "}
          <Chip label={address || ""} variant="outlined" color="info" />{" "}
        </Box>
        <Box>
          TokenId:{" "}
          <Chip
            label={process.env.REACT_APP_TOKEN_ID || ""}
            variant="outlined"
            color="info"
          />{" "}
        </Box>

        {tokens && tokens.length > 0 ? (
  tokens.map((token, index) => (
    <Box key={index}> 
      <p>Symbol: {token.symbol || "Unknown" }</p> 
      <p>
      Balance:{" "}
        {token.balance && token.decimals !== undefined
          ? unScaleByDecimals(BigInt(token.balance), token.decimals)
          : "Data unavailable"}
      </p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl sx={{ width: "25ch" }}>
          <InputLabel htmlFor="receiver_address">Send to:</InputLabel>
          <Input
            id="receiver_address"
            type="text"
            {...register("address", { required: true })}
            placeholder="receiver address"
          />
        </FormControl>
        <br />
        <FormControl sx={{ width: "25ch", marginTop: 8 }}>
          <InputLabel htmlFor="amount">Amount:</InputLabel>
          <Input
            id="amount"
            type="text"
            {...register("amount", { required: true })}
            placeholder="amount in satoshis"
          />
        </FormControl>
        <br />
        <Button type="submit">Send</Button>
      </form>
    </Box>
  ))
) : (

  <CircularProgress />
)}

      </Box>

      {txid && tokenInfo ? (
        <Alert
          variant="filled"
          severity="success"
          onClose={() => {
            setTxId(undefined);
          }}
        >
          {`Sending ${tokenInfo.metadata!.symbol} tokens in txid: ${txid}`}
        </Alert>
      ) : (
        <></>
      )}
    </Container>
  );
}

export default App;
