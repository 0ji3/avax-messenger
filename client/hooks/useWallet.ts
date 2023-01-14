import { useEffect, useState } from "react";
import { getEthereum } from "../utils/ethereum";

// useWalletの返すオブジェクトの型定義です。
type ReturnUseWallet = {
  currentAccount: string | undefined;
  connectWallet: () => void;
};

export const useWallet = (): ReturnUseWallet => {
  // ユーザアカウントのアドレスを格納するための状態変数を定義します。
  const [currentAccount, setCurrentAccount] = useState<string>();

  const ethereum = getEthereum();

  // ユーザのウォレットをwebアプリと接続します。
  const connectWallet = async () => {
    try {
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }
      // ユーザーに対してウォレットへのアクセス許可を求めます。
      // eth_requestAccounts 関数を使用することで, MetaMask からユーザーにウォレットへのアクセスを許可するよう呼びかけることができます。
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!Array.isArray(accounts)) return;
      // 許可されれば,ユーザーの最初のウォレットアドレスを currentAccount に格納します。
      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  // ユーザのウォレットとwebアプリが接続しているかを確認します。
  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      // ユーザーのウォレットへアクセスが許可されているかどうかを確認します。
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (!Array.isArray(accounts)) return;
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    currentAccount,
    connectWallet,
  };
};