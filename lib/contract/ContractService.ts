/**
 * ContractService - Polkadot smart contract interaction layer
 *
 * Handles connection to Westend testnet and provides methods for
 * interacting with the FutureProof time-lock contract.
 *
 * Requirements: 6.2, 13.5
 */

"use client";

import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { EventRecord } from "@polkadot/types/interfaces";
import { withTimeout, TIMEOUTS } from "@/utils/timeout";
import contractAbi from "@/contract/abi.json";

// Pre-load web3FromAddress to avoid dynamic imports during transactions
let web3FromAddressCache:
  | typeof import("@polkadot/extension-dapp").web3FromAddress
  | null = null;

if (typeof window !== "undefined") {
  import("@polkadot/extension-dapp")
    .then((module) => {
      web3FromAddressCache = module.web3FromAddress;
    })
    .catch((err) => {
      console.warn("Failed to preload web3FromAddress:", err);
    });
}

/**
 * Configuration for contract connection
 */
export interface ContractConfig {
  contractAddress: string;
  rpcEndpoint: string;
  network: "westend" | "rococo";
}

/**
 * Message metadata stored on-chain
 */
export interface MessageMetadata {
  id: string;
  encryptedKeyCID: string;
  encryptedMessageCID: string;
  messageHash: string;
  unlockTimestamp: number;
  sender: string;
  recipient: string;
  createdAt: number;
}

/**
 * Result of a contract transaction
 */
export interface TransactionResult {
  success: boolean;
  messageId?: string;
  blockHash?: string;
  error?: string;
}

/**
 * ContractService provides methods for interacting with the Polkadot smart contract
 * that stores time-locked message metadata.
 */
export class ContractService {
  private static api: ApiPromise | null = null;
  private static contract: ContractPromise | null = null;
  private static isConnecting = false;
  private static connectionPromise: Promise<ApiPromise> | null = null;
  private static connectionListeners: Set<(connected: boolean) => void> =
    new Set();
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;

  /**
   * Get the contract configuration from environment variables
   *
   * Requirements: 13.5 - Configure contract address through environment variables
   */
  private static getConfig(): ContractConfig {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const rpcEndpoint =
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "wss://westend-rpc.polkadot.io";
    const network = (process.env.NEXT_PUBLIC_NETWORK || "westend") as
      | "westend"
      | "rococo";

    if (!contractAddress) {
      throw new Error(
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your environment variables."
      );
    }

    return {
      contractAddress,
      rpcEndpoint,
      network,
    };
  }

  /**
   * Get fallback RPC endpoints for the current network
   * These are used if the primary endpoint fails
   */
  private static getFallbackEndpoints(network: string): string[] {
    const fallbacks: Record<string, string[]> = {
      westend: [
        "wss://westend-rpc.polkadot.io",
        "wss://rpc.polkadot.io/westend",
        "wss://westend.api.onfinality.io/public-ws",
      ],
      rococo: ["wss://rococo-rpc.polkadot.io", "wss://rpc.polkadot.io/rococo"],
    };

    return fallbacks[network] || [];
  }

  /**
   * Connect to the Polkadot RPC endpoint
   *
   * Requirements: 6.2 - Connect to Westend testnet RPC endpoint
   *
   * @returns Promise resolving to ApiPromise instance
   * @throws Error if connection fails
   */
  private static async connect(): Promise<ApiPromise> {
    // Return existing connection if available
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    // Return existing connection attempt if in progress
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this.establishConnection();

    try {
      this.api = await this.connectionPromise;
      return this.api;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Establish a new connection to the RPC endpoint
   *
   * Retry Strategy:
   * - Tries primary endpoint first
   * - Falls back to alternative endpoints if primary fails
   * - Exponential backoff: 1s, 2s, 4s
   * - Maximum 3 attempts per endpoint
   * - Provides helpful error messages on failure
   */
  private static async establishConnection(): Promise<ApiPromise> {
    const config = this.getConfig();
    const fallbackEndpoints = this.getFallbackEndpoints(config.network);

    // Build list of endpoints to try: primary first, then fallbacks
    const endpointsToTry = [config.rpcEndpoint];
    fallbackEndpoints.forEach((endpoint) => {
      if (endpoint !== config.rpcEndpoint) {
        endpointsToTry.push(endpoint);
      }
    });

    let lastError: Error | null = null;

    // Try each endpoint
    for (const endpoint of endpointsToTry) {
      const MAX_ATTEMPTS = 3;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          // Add delay for retries (exponential backoff with jitter)
          if (attempt > 1) {
            const baseDelay = 1000 * Math.pow(2, attempt - 2); // 1s, 2s, 4s
            const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
            const delay = baseDelay + jitter;
            console.log(
              `Retrying RPC connection to ${endpoint} (attempt ${attempt}/${MAX_ATTEMPTS}) after ${Math.round(delay)}ms...`
            );
            await this.delay(delay);
          } else if (endpoint !== config.rpcEndpoint) {
            console.log(`Trying fallback RPC endpoint: ${endpoint}`);
          }

          const provider = new WsProvider(endpoint);
          const api = await withTimeout(
            ApiPromise.create({ provider }),
            TIMEOUTS.BLOCKCHAIN_CONNECT,
            `Polkadot RPC connection to ${endpoint}`
          );

          // Wait for the API to be ready with timeout
          await withTimeout(
            api.isReady,
            TIMEOUTS.BLOCKCHAIN_CONNECT,
            "Polkadot API ready check"
          );

          console.log(`Connected to ${config.network} at ${endpoint}`);

          if (endpoint !== config.rpcEndpoint) {
            console.warn(`Using fallback RPC endpoint: ${endpoint}`);
          }

          // Set up disconnection handler
          this.setupDisconnectionHandler(api, config);

          // Reset reconnect attempts on successful connection
          this.reconnectAttempts = 0;

          // Notify listeners of successful connection
          this.notifyConnectionListeners(true);

          return api;
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error("Unknown error");

          if (attempt < MAX_ATTEMPTS) {
            console.warn(
              `RPC connection attempt ${attempt} to ${endpoint} failed:`,
              lastError.message
            );
          } else {
            console.error(
              `All ${MAX_ATTEMPTS} attempts to ${endpoint} failed. ${endpointsToTry.indexOf(endpoint) < endpointsToTry.length - 1 ? "Trying next endpoint..." : ""}`
            );
          }
        }
      }
    }

    // All endpoints and attempts failed
    const errorMessage = lastError?.message || "Unknown error";
    throw new Error(
      `Failed to connect to any Polkadot RPC endpoint after trying ${endpointsToTry.length} endpoint(s): ${errorMessage}. ` +
        `Please check your network connection and ensure at least one RPC endpoint is accessible.`
    );
  }

  /**
   * Get the current API instance, connecting if necessary
   *
   * @returns Promise resolving to ApiPromise instance
   */
  static async getApi(): Promise<ApiPromise> {
    return this.connect();
  }

  /**
   * Get the contract instance, initializing if necessary
   *
   * @returns Promise resolving to ContractPromise instance
   */
  private static async getContract(): Promise<ContractPromise> {
    if (this.contract) {
      return this.contract;
    }

    const api = await this.getApi();
    const config = this.getConfig();

    this.contract = new ContractPromise(
      api,
      contractAbi,
      config.contractAddress
    );
    return this.contract;
  }

  /**
   * Disconnect from the Polkadot RPC endpoint
   *
   * Call this when the application is closing or when you need to reset the connection.
   */
  static async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      this.contract = null;
      console.log("Disconnected from Polkadot RPC");
    }
  }

  /**
   * Check if the API is currently connected
   *
   * @returns true if connected, false otherwise
   */
  static isConnected(): boolean {
    return this.api !== null && this.api.isConnected;
  }

  /**
   * Get the contract address from configuration
   *
   * @returns Contract address string
   */
  static getContractAddress(): string {
    return this.getConfig().contractAddress;
  }

  /**
   * Get the network name from configuration
   *
   * @returns Network name ('westend' or 'rococo')
   */
  static getNetwork(): string {
    return this.getConfig().network;
  }

  /**
   * Store a new time-locked message on the blockchain
   *
   * Requirements: 6.2, 6.3, 6.4, 6.5
   *
   * @param params Message parameters
   * @param account Injected account for signing
   * @returns Promise resolving to transaction result
   */
  static async storeMessage(
    params: {
      encryptedKeyCID: string;
      encryptedMessageCID: string;
      messageHash: string;
      unlockTimestamp: number;
      recipient: string;
    },
    account: InjectedAccountWithMeta
  ): Promise<TransactionResult> {
    try {
      const api = await this.getApi();
      const contract = await this.getContract();

      // Use cached module or dynamic import as fallback
      let web3FromAddress = web3FromAddressCache;

      if (!web3FromAddress) {
        const extensionDapp = await import("@polkadot/extension-dapp");
        web3FromAddress = extensionDapp.web3FromAddress;
        web3FromAddressCache = web3FromAddress;
      }

      const injector = await withTimeout(
        web3FromAddress(account.address),
        TIMEOUTS.WALLET_ENABLE,
        "Get wallet injector"
      );

      // Estimate gas for the contract call
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000000,
        proofSize: 1000000,
      }) as any;

      // Dry run to check for errors
      const queryResult = await contract.query.storeMessage(
        account.address,
        { gasLimit, storageDepositLimit: null },
        params.encryptedKeyCID,
        params.encryptedMessageCID,
        params.messageHash,
        params.unlockTimestamp,
        params.recipient
      );

      const result = queryResult.result as any;
      const output = queryResult.output;

      if (result.isErr) {
        throw new Error(`Contract query failed: ${result.asErr.toString()}`);
      }

      // Check if output indicates an error
      if (output) {
        const outputStr = output.toString();
        let errorMessage = "";

        if (outputStr.includes("InvalidTimestamp")) {
          errorMessage = "Unlock timestamp must be in the future";
        } else if (outputStr.includes("InvalidMessageHash")) {
          errorMessage = "Invalid message hash format";
        } else if (outputStr.includes("InvalidKeyCID")) {
          errorMessage = "Invalid encrypted key CID";
        } else if (outputStr.includes("InvalidMessageCID")) {
          errorMessage = "Invalid encrypted message CID";
        } else if (outputStr.includes("SenderIsRecipient")) {
          errorMessage = "Cannot send message to yourself";
        }

        if (errorMessage) {
          throw new Error(errorMessage);
        }
      }

      // Execute the actual transaction
      return withTimeout(
        new Promise<TransactionResult>((resolve, reject) => {
          contract.tx
            .storeMessage(
              { gasLimit, storageDepositLimit: null },
              params.encryptedKeyCID,
              params.encryptedMessageCID,
              params.messageHash,
              params.unlockTimestamp,
              params.recipient
            )
            .signAndSend(
              account.address,
              { signer: injector.signer },
              ({ status, dispatchError, events }) => {
                if (dispatchError) {
                  let errorMessage = "Transaction failed";

                  if (dispatchError.isModule) {
                    const decoded = api.registry.findMetaError(
                      dispatchError.asModule
                    );
                    errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
                  } else {
                    errorMessage = dispatchError.toString();
                  }

                  // Check for insufficient balance error
                  if (
                    errorMessage.includes("balance") ||
                    errorMessage.includes("funds")
                  ) {
                    errorMessage +=
                      "\n\nYou may need testnet tokens. Get free Westend tokens from the faucet:\n" +
                      "- https://faucet.polkadot.io/westend\n" +
                      "- https://matrix.to/#/#westend_faucet:matrix.org";
                  }

                  reject(new Error(errorMessage));
                } else if (status.isInBlock) {
                  console.log(
                    `Transaction included in block ${status.asInBlock.toString()}`
                  );
                } else if (status.isFinalized) {
                  console.log(
                    `Transaction finalized in block ${status.asFinalized.toString()}`
                  );

                  // Extract message ID from contract event
                  let messageId: string | undefined;

                  events.forEach(({ event }) => {
                    if (
                      event.section === "contracts" &&
                      event.method === "ContractEmitted"
                    ) {
                      // Parse the MessageStored event
                      const [, eventData] = event.data;
                      // The event data contains the message_id as the first field
                      if (eventData) {
                        try {
                          const decoded = contract.abi.decodeEvent(
                            eventData as any
                          );
                          if (decoded.event.identifier === "MessageStored") {
                            messageId = decoded.args[0].toString();
                          }
                        } catch (e) {
                          console.warn("Failed to decode event:", e);
                        }
                      }
                    }
                  });

                  if (!messageId) {
                    // Fallback to block hash if event parsing fails
                    messageId = `${status.asFinalized.toString()}-${Date.now()}`;
                  }

                  // Store message in cache for instant retrieval
                  const messageMetadata: MessageMetadata = {
                    id: messageId,
                    encryptedKeyCID: params.encryptedKeyCID,
                    encryptedMessageCID: params.encryptedMessageCID,
                    messageHash: params.messageHash,
                    unlockTimestamp: params.unlockTimestamp,
                    sender: account.address,
                    recipient: params.recipient,
                    createdAt: Date.now(),
                  };

                  console.log("Message stored on-chain:", messageId);

                  resolve({
                    success: true,
                    messageId,
                    blockHash: status.asFinalized.toString(),
                  });
                }
              }
            )
            .catch((error) => {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              // Provide helpful guidance for common errors
              let enhancedMessage = `Transaction submission failed: ${errorMessage}`;

              if (
                errorMessage.includes("balance") ||
                errorMessage.includes("funds")
              ) {
                enhancedMessage +=
                  "\n\nYou may need testnet tokens. Get free Westend tokens from the faucet:\n" +
                  "- https://faucet.polkadot.io/westend\n" +
                  "- https://matrix.to/#/#westend_faucet:matrix.org";
              } else if (errorMessage.includes("Cancelled")) {
                enhancedMessage = "Transaction was cancelled by the user";
              }

              reject(new Error(enhancedMessage));
            });
        }),
        TIMEOUTS.BLOCKCHAIN_TX_FINALIZE,
        "Transaction finalization"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to store message: ${errorMessage}`);
    }
  }

  /**
   * Get all messages sent by a specific address
   *
   * Uses direct contract storage query for O(1) lookup performance.
   * Falls back to cache if contract query fails.
   *
   * Requirements: 7.1
   *
   * @param senderAddress The address of the sender
   * @returns Promise resolving to array of message metadata
   */
  static async getSentMessages(
    senderAddress: string
  ): Promise<MessageMetadata[]> {
    try {
      const contract = await this.getContract();
      const api = await this.getApi();

      // Query contract directly - O(1) lookup via storage mapping
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000000,
        proofSize: 1000000,
      }) as any;

      const queryResult = await withTimeout(
        contract.query.getSentMessages(
          senderAddress,
          { gasLimit, storageDepositLimit: null },
          senderAddress
        ),
        TIMEOUTS.BLOCKCHAIN_QUERY,
        "Query sent messages from contract"
      );

      const result = queryResult.result as any;
      const output = queryResult.output;

      if (result.isErr) {
        throw new Error(`Contract query failed: ${result.asErr.toString()}`);
      }

      // Parse the returned message metadata
      const messages = this.parseContractMessages(output);

      console.log(`Loaded ${messages.length} sent messages from contract`);

      return messages;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error loading sent messages from contract:", errorMessage);
      
      throw new Error(
        "Unable to load sent messages from blockchain. Please check your connection and try again."
      );
    }
  }

  /**
   * Get all messages received by a specific address
   *
   * Uses direct contract storage query for O(1) lookup performance.
   * Falls back to cache if contract query fails.
   *
   * Requirements: 8.1
   *
   * @param recipientAddress The address of the recipient
   * @returns Promise resolving to array of message metadata
   */
  static async getReceivedMessages(
    recipientAddress: string
  ): Promise<MessageMetadata[]> {
    try {
      const contract = await this.getContract();
      const api = await this.getApi();

      // Query contract directly - O(1) lookup via storage mapping
      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000000,
        proofSize: 1000000,
      }) as any;

      const queryResult = await withTimeout(
        contract.query.getReceivedMessages(
          recipientAddress,
          { gasLimit, storageDepositLimit: null },
          recipientAddress
        ),
        TIMEOUTS.BLOCKCHAIN_QUERY,
        "Query received messages from contract"
      );

      const result = queryResult.result as any;
      const output = queryResult.output;

      if (result.isErr) {
        throw new Error(`Contract query failed: ${result.asErr.toString()}`);
      }

      // Parse the returned message metadata
      const messages = this.parseContractMessages(output);

      console.log(`Loaded ${messages.length} received messages from contract`);

      return messages;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        "Error loading received messages from contract:",
        errorMessage
      );
      
      throw new Error(
        "Unable to load received messages from blockchain. Please check your connection and try again."
      );
    }
  }

  /**
   * Parse contract query output into MessageMetadata array
   *
   * @param output Contract query output
   * @returns Array of message metadata
   */
  private static parseContractMessages(output: any): MessageMetadata[] {
    try {
      if (!output) {
        return [];
      }

      // Convert output to JSON for easier parsing
      const outputJson = output.toHuman ? output.toHuman() : output;

      // Handle both array and single message responses
      const messagesArray = Array.isArray(outputJson)
        ? outputJson
        : [outputJson];

      return messagesArray
        .filter((msg: any) => msg && typeof msg === "object")
        .map((msg: any) => ({
          id: msg.id?.toString() || "",
          encryptedKeyCID:
            msg.encrypted_key_cid?.toString() ||
            msg.encryptedKeyCid?.toString() ||
            "",
          encryptedMessageCID:
            msg.encrypted_message_cid?.toString() ||
            msg.encryptedMessageCid?.toString() ||
            "",
          messageHash:
            msg.message_hash?.toString() || msg.messageHash?.toString() || "",
          unlockTimestamp: parseInt(
            msg.unlock_timestamp?.toString() ||
              msg.unlockTimestamp?.toString() ||
              "0"
          ),
          sender: msg.sender?.toString() || "",
          recipient: msg.recipient?.toString() || "",
          createdAt: parseInt(
            msg.created_at?.toString() || msg.createdAt?.toString() || "0"
          ),
        }));
    } catch (error) {
      console.error("Error parsing contract messages:", error);
      return [];
    }
  }

  /**
   * Get a specific message by ID from the contract
   *
   * @param messageId The message ID to retrieve
   * @returns Promise resolving to message metadata or null if not found
   */
  static async getMessage(messageId: string): Promise<MessageMetadata | null> {
    try {
      const contract = await this.getContract();
      const api = await this.getApi();

      const gasLimit = api.registry.createType("WeightV2", {
        refTime: 3000000000000,
        proofSize: 1000000,
      }) as any;

      // Parse message ID as number
      const id = parseInt(messageId);
      if (isNaN(id)) {
        console.warn("Invalid message ID format:", messageId);
        return null;
      }

      const queryResult = await withTimeout(
        contract.query.getMessage(
          contract.address,
          { gasLimit, storageDepositLimit: null },
          id
        ),
        TIMEOUTS.BLOCKCHAIN_QUERY,
        "Query message by ID from contract"
      );

      const result = queryResult.result as any;
      const output = queryResult.output;

      if (result.isErr) {
        console.warn(`Contract query failed: ${result.asErr.toString()}`);
        return null;
      }

      if (!output) {
        console.warn("Message not found:", messageId);
        return null;
      }

      const messages = this.parseContractMessages(output);
      return messages.length > 0 ? messages[0] : null;
    } catch (error) {
      console.error("Error loading message from contract:", error);
      return null;
    }
  }

  /**
   * Determine if an error is retryable
   *
   * Retryable errors:
   * - Network errors (connection refused, timeout, DNS)
   * - RPC errors (503, 504, rate limiting)
   * - Temporary blockchain issues
   *
   * Non-retryable errors:
   * - Invalid addresses or parameters
   * - Contract not found
   * - Authentication errors
   *
   * @param errorMessage The error message to check
   * @returns true if error should be retried
   */
  private static isRetryableError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase();

    // Network-level errors (always retryable)
    if (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound") ||
      msg.includes("etimedout") ||
      msg.includes("connection") ||
      msg.includes("fetch failed") ||
      msg.includes("websocket")
    ) {
      return true;
    }

    // RPC/service errors (retryable)
    if (
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("service unavailable")
    ) {
      return true;
    }

    // Non-retryable errors
    if (
      msg.includes("invalid address") ||
      msg.includes("contract not found") ||
      msg.includes("not configured") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden")
    ) {
      return false;
    }

    // Default: retry unknown errors (conservative approach)
    return true;
  }

  /**
   * Helper method to delay execution
   *
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Set up handler for WebSocket disconnections
   * Automatically attempts to reconnect when connection is lost
   */
  private static setupDisconnectionHandler(
    api: ApiPromise,
    _config: ContractConfig
  ): void {
    api.on("disconnected", async () => {
      console.warn("WebSocket disconnected from RPC endpoint");
      this.notifyConnectionListeners(false);

      // Attempt automatic reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(
          1000 * Math.pow(2, this.reconnectAttempts - 1),
          30000
        ); // Max 30s
        console.log(
          `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`
        );

        await this.delay(delay);

        try {
          // Clear the old API instance
          this.api = null;

          // Attempt to reconnect
          await this.connect();
          console.log("Successfully reconnected to RPC endpoint");
        } catch (error) {
          console.error("Reconnection attempt failed:", error);

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(
              "Max reconnection attempts reached. Manual reconnection required."
            );
          }
        }
      }
    });

    api.on("connected", () => {
      console.log("WebSocket connected to RPC endpoint");
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    });

    api.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  }

  /**
   * Subscribe to connection state changes
   *
   * @param listener Callback function that receives connection status
   * @returns Unsubscribe function
   */
  static onConnectionChange(
    listener: (connected: boolean) => void
  ): () => void {
    this.connectionListeners.add(listener);

    // Immediately notify of current state
    listener(this.isConnected());

    // Return unsubscribe function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of connection state change
   */
  private static notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error("Error in connection listener:", error);
      }
    });
  }

  /**
   * Manually trigger reconnection attempt
   * Useful for UI "Retry" buttons
   *
   * @returns Promise resolving when reconnection completes
   */
  static async reconnect(): Promise<void> {
    console.log("Manual reconnection triggered");

    // Disconnect existing connection
    await this.disconnect();

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    // Attempt new connection
    await this.connect();
  }

  /**
   * Verify the current connection matches the configured network
   * Useful for detecting when user switches networks in their wallet
   *
   * @returns true if connected to correct network, false otherwise
   */
  static async verifyNetwork(): Promise<boolean> {
    try {
      if (!this.api || !this.api.isConnected) {
        return false;
      }

      const config = this.getConfig();
      const chainName = (await this.api.rpc.system.chain())
        .toString()
        .toLowerCase();

      // Check if chain name matches expected network
      const expectedNetwork = config.network.toLowerCase();
      const isCorrectNetwork = chainName.includes(expectedNetwork);

      if (!isCorrectNetwork) {
        console.warn(
          `Network mismatch detected. Expected: ${config.network}, Connected to: ${chainName}`
        );
      }

      return isCorrectNetwork;
    } catch (error) {
      console.error("Failed to verify network:", error);
      return false;
    }
  }

  /**
   * Get information about the currently connected chain
   *
   * @returns Chain information or null if not connected
   */
  static async getChainInfo(): Promise<{
    name: string;
    version: string;
    network: string;
  } | null> {
    try {
      if (!this.api || !this.api.isConnected) {
        return null;
      }

      const [chain, version] = await Promise.all([
        this.api.rpc.system.chain(),
        this.api.rpc.system.version(),
      ]);

      return {
        name: chain.toString(),
        version: version.toString(),
        network: this.getConfig().network,
      };
    } catch (error) {
      console.error("Failed to get chain info:", error);
      return null;
    }
  }

  /**
   * Subscribe to MessageStored events from the contract
   *
   * This enables real-time updates when new messages are stored.
   * Events are indexed by sender and recipient for efficient filtering.
   *
   * @param callback Function called when a new message is stored
   * @returns Unsubscribe function
   */
  static async subscribeToMessageEvents(
    callback: (event: {
      messageId: string;
      sender: string;
      recipient: string;
      unlockTimestamp: number;
    }) => void
  ): Promise<() => void> {
    try {
      const api = await this.getApi();
      const contract = await this.getContract();

      // Subscribe to contract events
      const unsubscribe = await api.query.system.events((events: any) => {
        const eventRecords = events as EventRecord[];
        eventRecords.forEach((record: EventRecord) => {
          const { event } = record;

          // Filter for contract emitted events
          if (
            event.section === "contracts" &&
            event.method === "ContractEmitted"
          ) {
            try {
              const [contractAddress, eventData] = event.data;

              // Check if event is from our contract
              if (contractAddress.toString() === contract.address.toString()) {
                // Decode the event
                const decoded = (contract.abi as any).decodeEvent(eventData);

                if (decoded.event.identifier === "MessageStored") {
                  // Extract event data
                  const messageId = decoded.args[0]?.toString() || "";
                  const sender = decoded.args[1]?.toString() || "";
                  const recipient = decoded.args[2]?.toString() || "";
                  const unlockTimestamp = parseInt(
                    decoded.args[3]?.toString() || "0"
                  );

                  console.log("MessageStored event:", {
                    messageId,
                    sender,
                    recipient,
                    unlockTimestamp,
                  });

                  // Call the callback
                  callback({
                    messageId,
                    sender,
                    recipient,
                    unlockTimestamp,
                  });
                }
              }
            } catch (error) {
              console.warn("Failed to decode contract event:", error);
            }
          }
        });
      });

      console.log("Subscribed to MessageStored events");

      return () => {
        try {
          (unsubscribe as any)();
        } catch (e) {
          console.warn("Error unsubscribing:", e);
        }
        console.log("Unsubscribed from MessageStored events");
      };
    } catch (error) {
      console.error("Failed to subscribe to message events:", error);
      // Return no-op unsubscribe function
      return () => {};
    }
  }

  /**
   * Query historical MessageStored events for a specific address
   *
   * This is useful for initial sync or catching up on missed events.
   * Events are indexed by sender and recipient topics for efficient filtering.
   *
   * @param address Address to filter events by (sender or recipient)
   * @param fromBlock Optional starting block number
   * @param toBlock Optional ending block number (defaults to latest)
   * @returns Array of message event data
   */
  static async queryMessageEvents(
    address: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<
    Array<{
      messageId: string;
      sender: string;
      recipient: string;
      unlockTimestamp: number;
      blockNumber: number;
    }>
  > {
    try {
      const api = await this.getApi();
      const contract = await this.getContract();

      // Get block range
      const latestBlock = await api.rpc.chain.getBlock();
      const latestBlockNumber = latestBlock.block.header.number.toNumber();

      const startBlock = fromBlock || Math.max(0, latestBlockNumber - 1000); // Last 1000 blocks by default
      const endBlock = toBlock || latestBlockNumber;

      console.log(
        `Querying MessageStored events from block ${startBlock} to ${endBlock}...`
      );

      const events: Array<{
        messageId: string;
        sender: string;
        recipient: string;
        unlockTimestamp: number;
        blockNumber: number;
      }> = [];

      // Query events in batches to avoid timeouts
      const BATCH_SIZE = 100;
      for (let i = startBlock; i <= endBlock; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE - 1, endBlock);

        try {
          const blockHash = await api.rpc.chain.getBlockHash(batchEnd);
          const apiAt = await api.at(blockHash);
          const blockEvents = await apiAt.query.system.events();
          const eventRecords = blockEvents as any as EventRecord[];

          eventRecords.forEach((record: EventRecord) => {
            const { event } = record;

            if (
              event.section === "contracts" &&
              event.method === "ContractEmitted"
            ) {
              try {
                const [contractAddress, eventData] = event.data;

                if (
                  contractAddress.toString() === contract.address.toString()
                ) {
                  const decoded = contract.abi.decodeEvent(eventData as any);

                  if (decoded.event.identifier === "MessageStored") {
                    const messageId = decoded.args[0]?.toString() || "";
                    const sender = decoded.args[1]?.toString() || "";
                    const recipient = decoded.args[2]?.toString() || "";
                    const unlockTimestamp = parseInt(
                      decoded.args[3]?.toString() || "0"
                    );

                    // Filter by address (either sender or recipient)
                    if (sender === address || recipient === address) {
                      events.push({
                        messageId,
                        sender,
                        recipient,
                        unlockTimestamp,
                        blockNumber: batchEnd,
                      });
                    }
                  }
                }
              } catch (error) {
                // Skip invalid events
              }
            }
          });
        } catch (error) {
          console.warn(`Failed to query events for block ${batchEnd}:`, error);
        }
      }

      console.log(
        `Found ${events.length} MessageStored events for address ${address}`
      );

      return events;
    } catch (error) {
      console.error("Failed to query message events:", error);
      return [];
    }
  }
}
