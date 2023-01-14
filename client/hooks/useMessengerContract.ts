import { useState, useEffect } from "react";
import { BigNumber, ethers } from "ethers";
import abi from "../utils/Messenger.json";
import { getEthereum } from "../utils/ethereum";
import { Messenger as MessengerType } from "../typechain-types";

const contractAddress = "0x62fDD8eCB329909ba89FfdaA1E8255634DC55363";
const contractABI = abi.abi;

export type Message = {
  sender: string;
  receiver: string;
  depositInWei: BigNumber;
  timestamp: Date;
  text: string;
  isPending: boolean;
};

// sendMessageの引数のオブジェクトの型定義です。
type PropsSendMessage = {
  text: string;
  receiver: string;
  tokenInEther: string;
};

// useMessengerContractの返すオブジェクトの型定義です。
type ReturnUseMessengerContract = {
    processing: boolean;
    ownMessages: Message[];
    owner: string | undefined;
    numOfPendingLimits: BigNumber | undefined;
    sendMessage: (props: PropsSendMessage) => void;
    acceptMessage: (index: BigNumber) => void;
    denyMessage: (index: BigNumber) => void;
    changeNumOfPendingLimits: (limits: BigNumber) => void;
};

// useMessengerContractの引数のオブジェクトの型定義です。
type PropsUseMessengerContract = {
  currentAccount: string | undefined;
};

export const useMessengerContract = ({
  currentAccount,
}: PropsUseMessengerContract): ReturnUseMessengerContract => {
  // トランザクションの処理中のフラグを表す状態変数。
  const [processing, setProcessing] = useState<boolean>(false);
  // Messengerコントラクトのオブジェクトを格納する状態変数。
  const [messengerContract, setMessengerContract] = useState<MessengerType>();
  // ユーザ宛のメッセージを配列で保持する状態変数。
  const [ownMessages, setOwnMessages] = useState<Message[]>([]);
  // オーナー機能用
  const [owner, setOwner] = useState<string>();
  const [numOfPendingLimits, setNumOfPendingLimits] = useState<BigNumber>();

  // ethereumオブジェクトを取得します。
  const ethereum = getEthereum();

  function getMessengerContract() {
    try {
      if (ethereum) {
        // @ts-ignore: ethereum as ethers.providers.ExternalProvider
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const MessengerContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        ) as MessengerType;
        setMessengerContract(MessengerContract);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function getOwnMessages() {
    if (!messengerContract) return;
    try {
      const OwnMessages = await messengerContract.getOwnMessages();
      const messagesCleaned: Message[] = OwnMessages.map((message) => {
        return {
          sender: message.sender,
          receiver: message.receiver,
          depositInWei: message.depositInWei,
          timestamp: new Date(message.timestamp.toNumber() * 1000),
          text: message.text,
          isPending: message.isPending,
        };
      });
      setOwnMessages(messagesCleaned);
    } catch (error) {
      console.log(error);
    }
  }

  async function sendMessage({
    text,
    receiver,
    tokenInEther,
  }: PropsSendMessage) {
    if (!messengerContract) return;
    try {
      const tokenInWei = ethers.utils.parseEther(tokenInEther);
      console.log(
        "call post with receiver:[%s], token:[%s]",
        receiver,
        tokenInWei.toString()
      );
      const txn = await messengerContract.post(text, receiver, {
        gasLimit: 300000,
        value: tokenInWei,
      });
      console.log("Processing...", txn.hash);
      setProcessing(true);
      await txn.wait();
      console.log("Done -- ", txn.hash);
      setProcessing(false);
    } catch (error) {
      console.log(error);
    }
  }

  // accept関数の呼び出しを追加
  async function acceptMessage(index: BigNumber) {
    if (!messengerContract) return;
    try {
      console.log("call accept with index [%d]", index);
      const txn = await messengerContract.accept(index, {
        gasLimit: 300000,
      });
      console.log("Processing...", txn.hash);
      setProcessing(true);
      await txn.wait();
      console.log("Done -- ", txn.hash);
      setProcessing(false);
    } catch (error) {
      console.log(error);
    }
  }

  // deny関数の呼び出しを追加
  async function denyMessage(index: BigNumber) {
    if (!messengerContract) return;
    try {
      console.log("call deny with index [%d]", index);
      const txn = await messengerContract.deny(index, {
        gasLimit: 300000,
      });
      console.log("Processing...", txn.hash);
      setProcessing(true);
      await txn.wait();
      console.log("Done -- ", txn.hash);
      setProcessing(false);
    } catch (error) {
      console.log(error);
    }
  }

  async function getOwner() {
    if (!messengerContract) return;
    try {
      console.log("call getter of owner");
      const owner = await messengerContract.owner();
      setOwner(owner.toLocaleLowerCase());
    } catch (error) {
      console.log(error);
    }
  }

  async function getNumOfPendingLimits() {
    if (!messengerContract) return;
    try {
      console.log("call getter of numOfPendingLimits");
      const limits = await messengerContract.numOfPendingLimits();
      setNumOfPendingLimits(limits);
    } catch (error) {
      console.log(error);
    }
  }

  async function changeNumOfPendingLimits(limits: BigNumber) {
    if (!messengerContract) return;
    try {
      console.log("call changeNumOfPendingLimits with [%d]", limits.toNumber());
      const txn = await messengerContract.changeNumOfPendingLimits(limits, {
        gasLimit: 300000,
      });
      console.log("Processing...", txn.hash);
      setProcessing(true);
      await txn.wait();
      console.log("Done -- ", txn.hash);
      setProcessing(false);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getMessengerContract();
    getOwnMessages();
    getOwner();
    getNumOfPendingLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount, ethereum]);

  useEffect(() => {
    // NewMessageのイベントリスナ
    const onNewMessage = (
      sender: string,
      receiver: string,
      depositInWei: BigNumber,
      timestamp: BigNumber,
      text: string,
      isPending: boolean
    ) => {
      console.log("NewMessage from %s to %s", sender, receiver);
      // 自分宛のメッセージの場合ownMessagesを編集します。
      // 各APIの使用によりアドレス英字が大文字小文字の違いが出る場合がありますが, その違いはアドレス値において区別されません。
      if (receiver.toLocaleLowerCase() === currentAccount) {
        setOwnMessages((prevState) => [
          ...prevState,
          {
            sender: sender,
            receiver: receiver,
            depositInWei: depositInWei,
            timestamp: new Date(timestamp.toNumber() * 1000),
            text: text,
            isPending: isPending,
          },
        ]);
      }
    };

    // MessageConfirmedのイベントリスナの追加
    const onMessageConfirmed = (receiver: string, index: BigNumber) => {
      console.log(
        "MessageConfirmed index:[%d] receiver: [%s]",
        index.toNumber(),
        receiver
      );
      // 接続しているユーザ宛のメッセージの場合ownMessagesの該当メッセージを編集します。
      if (receiver.toLocaleLowerCase() === currentAccount) {
        setOwnMessages((prevState) => {
          prevState[index.toNumber()].isPending = false;
          return [...prevState];
        });
      }
    };

    // NumOfPendingLimitsChangedのイベントリスナ
    const onNumOfPendingLimitsChanged = (limitsChanged: BigNumber) => {
      console.log(
        "NumOfPendingLimitsChanged limits:[%d]",
        limitsChanged.toNumber()
      );
      setNumOfPendingLimits(limitsChanged);
    };
  

    /* イベントリスナの登録をします */
    if (messengerContract) {
      messengerContract.on("NewMessage", onNewMessage);
      messengerContract.on("MessageConfirmed", onMessageConfirmed);
      messengerContract.on(
        "NumOfPendingLimitsChanged",
        onNumOfPendingLimitsChanged
      );
    }

    /* イベントリスナの登録を解除します */
    return () => {
      if (messengerContract) {
        messengerContract.off("NewMessage", onNewMessage);
        messengerContract.off("MessageConfirmed", onMessageConfirmed);
        messengerContract.off(
          "NumOfPendingLimitsChanged",
          onNumOfPendingLimitsChanged
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messengerContract]);

  return {
    processing,
    ownMessages,
    owner,
    numOfPendingLimits,
    sendMessage,
    acceptMessage,
    denyMessage,
    changeNumOfPendingLimits,
  };
};