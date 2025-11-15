const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("FutureProof", function () {
  let futureProof, owner, recipient, otherAccount;
  const VALID_KEY_CID = "QmTest123KeyCID";
  const VALID_MESSAGE_CID = "QmTest456MessageCID";
  const VALID_HASH = "a".repeat(64);

  beforeEach(async function () {
    [owner, recipient, otherAccount] = await ethers.getSigners();
    const FutureProof = await ethers.getContractFactory("FutureProof");
    futureProof = await FutureProof.deploy();
    await futureProof.waitForDeployment();
  });

  it("Should initialize with zero message count", async function () {
    expect(await futureProof.getMessageCount()).to.equal(0);
  });

  it("Should store a message successfully", async function () {
    const futureTimestamp = (await time.latest()) + 3600;
    await futureProof.storeMessage(VALID_KEY_CID, VALID_MESSAGE_CID, VALID_HASH, futureTimestamp, recipient.address);
    expect(await futureProof.getMessageCount()).to.equal(1);
  });

  it("Should revert if key CID is empty", async function () {
    const futureTimestamp = (await time.latest()) + 3600;
    await expect(
      futureProof.storeMessage("", VALID_MESSAGE_CID, VALID_HASH, futureTimestamp, recipient.address)
    ).to.be.revertedWithCustomError(futureProof, "InvalidKeyCID");
  });

  it("Should retrieve a stored message", async function () {
    const futureTimestamp = (await time.latest()) + 3600;
    await futureProof.storeMessage(VALID_KEY_CID, VALID_MESSAGE_CID, VALID_HASH, futureTimestamp, recipient.address);
    const message = await futureProof.getMessage(0);
    expect(message.encryptedKeyCid).to.equal(VALID_KEY_CID);
  });

  it("Should return sent messages", async function () {
    const futureTimestamp = (await time.latest()) + 3600;
    await futureProof.storeMessage(VALID_KEY_CID, VALID_MESSAGE_CID, VALID_HASH, futureTimestamp, recipient.address);
    const sentMessages = await futureProof.getSentMessages(owner.address);
    expect(sentMessages.length).to.equal(1);
  });
});
