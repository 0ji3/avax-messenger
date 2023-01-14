import { ethers } from "hardhat";
import { Overrides } from "ethers";

async function deploy() {
  // コントラクトをデプロイするアカウントのアドレスを取得します。
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  const numOfPendingLimits = 10;
  const funds = 100;

  // コントラクトのインスタンスを作成します。
  const Messenger = await ethers.getContractFactory("Messenger");

  // The deployed instance of the contract
  const messenger = await Messenger.deploy(numOfPendingLimits, {
    value: funds,
  } as Overrides);

  await messenger.deployed();

  console.log("Contract deployed at:", messenger.address);
  console.log("Contract's owner is:", await messenger.owner());
  console.log(
    "Contract's number of pending message limits is:",
    await messenger.numOfPendingLimits()
  );
  console.log(
    "Contract's fund is:",
    await messenger.provider.getBalance(messenger.address)
  );
}

deploy()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
});