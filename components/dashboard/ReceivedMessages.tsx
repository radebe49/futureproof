/**
 * ReceivedMessages - Display messages received by the user
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Message, MessageStatus } from "@/types/contract";
import { ContractService, MessageMetadata } from "@/lib/contract/ContractService";
import { MessageList } from "./MessageList";
import { MessageFilters } from "./MessageFilters";
import { Pagination } from "./Pagination";
import { calculateMessageStatus } from "@/utils/dateUtils";

interface ReceivedMessagesProps {
  address: string;
}

const ITEMS_PER_PAGE = 12;

export function ReceivedMessages({ address }: ReceivedMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "All">("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  /**
   * Convert MessageMetadata to Message with calculated status
   *
   * Requirements: 8.3 - Calculate status (Locked/Unlockable/Unlocked)
   * 
   * Note: Status is determined purely by comparing current time with unlock timestamp.
   * No localStorage tracking needed - the blockchain timestamp is the source of truth.
   */
  const convertToMessage = useCallback(
    (metadata: MessageMetadata): Message => {
      // Message is unlockable if current time >= unlock timestamp
      const isUnlockable = Date.now() >= metadata.unlockTimestamp;
      const status = calculateMessageStatus(metadata.unlockTimestamp, isUnlockable);

      return {
        id: metadata.id,
        encryptedKeyCID: metadata.encryptedKeyCID,
        encryptedMessageCID: metadata.encryptedMessageCID,
        messageHash: metadata.messageHash,
        unlockTimestamp: metadata.unlockTimestamp,
        sender: metadata.sender,
        recipient: metadata.recipient,
        status,
        createdAt: metadata.createdAt,
      };
    },
    []
  );

  /**
   * Load received messages from blockchain
   *
   * Requirements: 8.1 - Query blockchain for received messages
   */
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const metadata = await ContractService.getReceivedMessages(address);
      const messagesWithStatus = metadata.map(convertToMessage);

      setMessages(messagesWithStatus);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load messages";
      setError(errorMessage);
      console.error("Error loading received messages:", err);
    } finally {
      setLoading(false);
    }
  }, [address, convertToMessage]);

  /**
   * Update message statuses based on current time
   *
   * Requirements: 8.5 - Implement real-time status updates
   */
  const updateStatuses = useCallback(() => {
    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        const isUnlockable = Date.now() >= message.unlockTimestamp;
        return {
          ...message,
          status: calculateMessageStatus(message.unlockTimestamp, isUnlockable),
        };
      })
    );
  }, []);

  /**
   * Handle unlock button click
   *
   * Requirements: 9.1 - Navigate to unlock flow
   */
  const handleUnlock = useCallback(
    (message: Message) => {
      // Navigate to unlock page with message ID
      router.push(`/unlock/${message.id}`);
    },
    [router]
  );

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  /**
   * Set up interval for real-time status updates
   *
   * Requirements: 8.5 - Update Message_Status values in real-time
   */
  useEffect(() => {
    // Update statuses every 10 seconds
    const interval = setInterval(updateStatuses, 10000);

    return () => clearInterval(interval);
  }, [updateStatuses]);

  /**
   * Filter and sort messages
   *
   * Requirements: 7.2, 8.2 - Implement status filter and sorting
   */
  const filteredAndSortedMessages = useMemo(() => {
    let filtered = messages;

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((msg) => msg.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortOrder === "newest") {
        return b.createdAt - a.createdAt;
      } else {
        return a.createdAt - b.createdAt;
      }
    });

    return sorted;
  }, [messages, statusFilter, sortOrder]);

  /**
   * Paginate messages
   *
   * Requirements: 7.2 - Add pagination for large message lists
   */
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAndSortedMessages.slice(startIndex, endIndex);
  }, [filteredAndSortedMessages, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedMessages.length / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortOrder]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading received messages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg
            className="w-6 h-6 text-red-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Error loading messages
            </h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={loadMessages}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Received Messages
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredAndSortedMessages.length} message
            {filteredAndSortedMessages.length !== 1 ? "s" : ""}
            {statusFilter !== "All" && ` (${statusFilter})`}
          </p>
        </div>
        <button
          onClick={loadMessages}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      <MessageFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <MessageList messages={paginatedMessages} type="received" onUnlock={handleUnlock} />

      {filteredAndSortedMessages.length > 0 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filteredAndSortedMessages.length}
          />
        </div>
      )}
    </div>
  );
}
