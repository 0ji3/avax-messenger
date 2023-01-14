import styles from "./RequireWallet.module.css";

type Props = {
  children: React.ReactNode;
  currentAccount: string | undefined;
  connectWallet: () => void;
};

export default function RequireWallet({
  children,
  currentAccount,
  connectWallet,
}: Props) {
  return (
    <div>
      {currentAccount ? (
        <div>
          <div className={styles.wallet}>
            <p className={styles.title}>wallet: </p>
            <p>{currentAccount}</p>
          </div>
          {children}
        </div>
      ) : (
        <button className={styles.button} onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}