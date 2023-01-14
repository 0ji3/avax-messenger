// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./Ownable.sol";

contract Messenger is Ownable {
    // ユーザが保留できるメッセージ数の上限を設定します。
    uint256 public numOfPendingLimits;

    // メッセージ情報を定義します。
    struct Message {
        address payable sender;
        address payable receiver;
        uint256 depositInWei;
        uint256 timestamp;
        string text;
        bool isPending;
    }

    // メッセージの受取人アドレスをkeyにメッセージを保存します。
    mapping(address => Message[]) private messagesAtAddress;
    // ユーザが保留中のメッセージの数を保存します。
    mapping(address => uint256) private numOfPendingAtAddress;

    event NewMessage(
        address sender,
        address receiver,
        uint256 depositInWei,
        uint256 timestamp,
        string text,
        bool isPending
    );

    event MessageConfirmed(address receiver, uint256 index);
    event NumOfPendingLimitsChanged(uint256 limits);

    constructor(uint256 _numOfPendingLimits) payable {
        console.log("Here is my first smart contract!");
        ownable();
        numOfPendingLimits = _numOfPendingLimits;
    }

    // ownerのみこの関数を実行できるように修飾子を利用します。
    function changeNumOfPendingLimits(uint256 _limits) external onlyOwner {
        numOfPendingLimits = _limits;
        emit NumOfPendingLimitsChanged(numOfPendingLimits);
    }

    function post(string memory _text, address payable _receiver)
        public
        payable
    {
        // メッセージ受取人の保留できるメッセージが上限に達しているかを確認します。
        require(
            numOfPendingAtAddress[_receiver] < numOfPendingLimits,
            "The receiver has reached the number of pending limits"
        );

        // 保留中のメッセージの数をインクリメントします。
        numOfPendingAtAddress[_receiver] += 1;

        console.log(
            "%s posts text:[%s] token:[%d]",
            msg.sender,
            _text,
            msg.value
        );

        messagesAtAddress[_receiver].push(
            Message(
                payable(msg.sender), // 関数を呼び出したアドレス値をメッセージ送信者として記録します。
                _receiver,
                msg.value, // 関数呼び出し時に送信されたトークンの値をメッセージトークンとして記録します。
                block.timestamp, // 投稿時のタイムスタンプ
                _text,
                true // 全てのメッセージは投稿直後は保留状態となるので, isPendingをtrueとします。
            )
        );

        emit NewMessage(
            msg.sender,
            _receiver,
            msg.value,
            block.timestamp,
            _text,
            true
        );
    }

    // メッセージ受け取りを承諾して, AVAXを受け取ります。
    function accept(uint256 _index) public {
        //指定インデックスのメッセージを確認します。
        confirmMessage(_index);

        Message memory message = messagesAtAddress[msg.sender][_index];

        // メッセージの受取人にavaxを送信します。
        sendAvax(message.receiver, message.depositInWei);

        emit MessageConfirmed(message.receiver, _index);
    }

    function confirmMessage(uint256 _index) private {
        Message storage message = messagesAtAddress[msg.sender][_index];

        // 関数を呼び出したアドレスとメッセージの受取人アドレスが同じか確認します。
        require(
            msg.sender == message.receiver,
            "Only the receiver can confirmMessage the message"
        );

        // メッセージが保留中であることを確認します。
        require(
            message.isPending == true,
            "This message has already been confirmed"
        );

        // メッセージの保留状態を解除します。
        message.isPending = false;
    }

    function sendAvax(address payable _to, uint256 _amountInWei) private {
        (bool success, ) = (_to).call{value: _amountInWei}("");
        require(success, "Failed to withdraw AVAX from contract");
    }

    // メッセージ受け取りを却下して, AVAXをメッセージ送信者へ返却します。
    function deny(uint256 _index) public payable {
        confirmMessage(_index);

        Message memory message = messagesAtAddress[msg.sender][_index];

        // メッセージの送信者にavaxを返却します。
        sendAvax(message.sender, message.depositInWei);

        emit MessageConfirmed(message.receiver, _index);
    }

     // ユーザのアドレス宛のメッセージを全て取得します。
    function getOwnMessages() public view returns (Message[] memory) {
        return messagesAtAddress[msg.sender];
    }
}