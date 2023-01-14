import hre, { ethers } from "hardhat";
import { Overrides } from "ethers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Messenger", function () {
  async function deployContract() {
    // 初めのアドレスはコントラクトのデプロイに使用されます。
    const [owner, otherAccount] = await ethers.getSigners();
  
    const numOfPendingLimits = 10;
    const funds = 100;
  
    const Messenger = await hre.ethers.getContractFactory("Messenger");
    const messenger = await Messenger.deploy(numOfPendingLimits, {
      value: funds,
    } as Overrides);
  
    return { messenger, numOfPendingLimits, funds, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right number of pending message limits", async function () {
      const { messenger, numOfPendingLimits } = await loadFixture(
        deployContract
      );

      expect(await messenger.numOfPendingLimits()).to.equal(numOfPendingLimits);
    });

    it("Should set the right owner", async function () {
      const { messenger, owner } = await loadFixture(deployContract);
  
      expect(await messenger.owner()).to.equal(owner.address);
    });
  });

  describe("Change limits", function () {
    it("Should revert with the right error if called by other account", async function () {
      const { messenger, otherAccount } = await loadFixture(deployContract);

      await expect(
        messenger.connect(otherAccount).changeNumOfPendingLimits(5)
      ).to.be.revertedWith("You aren't the owner");
    });

    it("Should set the right number of pending limits after change", async function () {
      const { messenger, numOfPendingLimits } = await loadFixture(
        deployContract
      );

      const newLimits = numOfPendingLimits + 1;
      await messenger.changeNumOfPendingLimits(newLimits);
      expect(await messenger.numOfPendingLimits()).to.equal(newLimits);
    });

    it("Should emit an event on change limits", async function () {
      const { messenger } = await loadFixture(deployContract);

      await expect(messenger.changeNumOfPendingLimits(10)).to.emit(
        messenger,
        "NumOfPendingLimitsChanged"
      );
    });
  });

  describe("Post", function () {
    it("Should emit an event on post", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);

        await expect(
          messenger.post("text", otherAccount.address, { value: 1 })
        ).to.emit(messenger, "NewMessage");
    });

    it("Should send the correct amount of tokens", async function () {
      const { messenger, owner, otherAccount } = await loadFixture(
        deployContract
      );
      const test_deposit = 10;

      // メッセージをpostした場合は, 送り主(owner)からコントラクト(messenger)へ送金されます。
      await expect(
        messenger.post("text", otherAccount.address, {
          value: test_deposit,
        })
      ).to.changeEtherBalances(
        [owner, messenger],
        [-test_deposit, test_deposit]
      );
    });

    it("Should set the right Message", async function () {
      const { messenger, owner, otherAccount } = await loadFixture(
        deployContract
      );
      const test_deposit = 1;
      const test_text = "text";

      await messenger.post(test_text, otherAccount.address, {
        value: test_deposit,
      });
      const messages = await messenger.connect(otherAccount).getOwnMessages();
      const message = messages[0];
      expect(message.depositInWei).to.equal(test_deposit);
      expect(message.text).to.equal(test_text);
      expect(message.isPending).to.equal(true);
      expect(message.sender).to.equal(owner.address);
      expect(message.receiver).to.equal(otherAccount.address);
    });

    it("Should revert with the right error if exceed number of pending limits", async function () {
      const { messenger, otherAccount, numOfPendingLimits } = await loadFixture(
        deployContract
      );
  
      // メッセージ保留数の上限まで otherAccount へメッセージを送信します。
      for (let cnt = 1; cnt <= numOfPendingLimits; cnt++) {
        await messenger.post("dummy", otherAccount.address);
      }
      // 次に送信するメッセージはキャンセルされます。
      await expect(
        messenger.post("exceed", otherAccount.address)
      ).to.be.revertedWith(
        "The receiver has reached the number of pending limits"
      );
    });
  });

  describe("Accept", function () {
    it("Should emit an event on accept", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);
        const test_deposit = 1;

        await messenger.post("text", otherAccount.address, {
          value: test_deposit,
        });

        const first_index = 0;
        await expect(messenger.connect(otherAccount).accept(first_index)).to.emit(
          messenger,
          "MessageConfirmed"
        );
    });

    it("isPending must be changed", async function () {
      const { messenger, otherAccount } = await loadFixture(deployContract);
      const first_index = 0;
  
      // ownerがotherAccount.addressを受取人にしてメッセージをpost
      await messenger.post("text", otherAccount.address);
      let messages = await messenger.connect(otherAccount).getOwnMessages();
      // post直後のメッセージは保留中なのでisPendingはtrueです。
      expect(messages[0].isPending).to.equal(true);
  
      // otherAccountが先ほどのメッセージをaccept
      await messenger.connect(otherAccount).accept(first_index);
      messages = await messenger.connect(otherAccount).getOwnMessages();
      // accept後はメッセージが保留中ではないことを確認します。
      expect(messages[0].isPending).to.equal(false);
    });

    it("Should send the correct amount of tokens", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);
        const test_deposit = 10;
    
        await messenger.post("text", otherAccount.address, {
          value: test_deposit,
        });
    
        // メッセージをacceptした場合は, コントラクト(messenger)から受取人(otherAccount)へ送金されます。
        const first_index = 0;
        await expect(
          messenger.connect(otherAccount).accept(first_index)
        ).to.changeEtherBalances(
          [messenger, otherAccount],
          [-test_deposit, test_deposit]
        );
    });

    it("Should revert with the right error if called in duplicate", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);
    
        await messenger.post("text", otherAccount.address, { value: 1 });
        await messenger.connect(otherAccount).accept(0);
        await expect(messenger.connect(otherAccount).accept(0)).to.be.revertedWith(
          "This message has already been confirmed"
        );
    });
  });

  describe("Deny", function () {
    it("Should emit an event on deny", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);
        const test_deposit = 1;

        await messenger.post("text", otherAccount.address, {
          value: test_deposit,
        });

        const first_index = 0;
        await expect(messenger.connect(otherAccount).deny(first_index)).to.emit(
          messenger,
          "MessageConfirmed"
        );
    });

    it("isPending must be changed", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);
        const first_index = 0;

        await messenger.post("text", otherAccount.address);
        let messages = await messenger.connect(otherAccount).getOwnMessages();
        expect(messages[0].isPending).to.equal(true);

        await messenger.connect(otherAccount).deny(first_index);
        messages = await messenger.connect(otherAccount).getOwnMessages();
        expect(messages[0].isPending).to.equal(false);
    });

    it("Should send the correct amount of tokens", async function () {
        const { messenger, owner, otherAccount } = await loadFixture(
          deployContract
        );
        const test_deposit = 10;

        await messenger.post("text", otherAccount.address, {
          value: test_deposit,
        });

        // メッセージをdenyした場合は, コントラクト(messenger)から送信者(owner)へ送金されます。
        const first_index = 0;
        await expect(
          messenger.connect(otherAccount).deny(first_index)
        ).to.changeEtherBalances(
          [messenger, owner],
          [-test_deposit, test_deposit]
        );
    });

    it("Should revert with the right error if called in duplicate", async function () {
        const { messenger, otherAccount } = await loadFixture(deployContract);

        await messenger.post("text", otherAccount.address, { value: 1 });
        await messenger.connect(otherAccount).deny(0);
        await expect(messenger.connect(otherAccount).deny(0)).to.be.revertedWith(
          "This message has already been confirmed"
        );
    });
  });
});