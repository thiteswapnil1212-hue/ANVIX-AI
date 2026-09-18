import { pool, withTransaction } from "./postgres";

export type ChatRole = "user" | "assistant";

export type ChatConversationRecord = {
  id: string;
  user_id: string;
  title: string;
  preview: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRecord = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export type ChatMessageInput = {
  conversationId: string;
  role: ChatRole;
  content: string;
};

function normalizeUserId(userId: string): string {
  const trimmed = userId.trim();

  if (!trimmed) {
    throw new Error("Authenticated user is required.");
  }

  return trimmed;
}

async function ensureUserExists(userId: string): Promise<void> {
  const normalizedUserId = normalizeUserId(userId);

  await pool.query(
    `
      INSERT INTO app_users (id)
      VALUES ($1)
      ON CONFLICT (id)
      DO NOTHING
    `,
    [normalizedUserId]
  );
}

async function ensureConversationOwnership(
  conversationId: string,
  userId: string
): Promise<void> {
  const normalizedUserId = normalizeUserId(userId);

  const result = await pool.query(
    `
      SELECT user_id
      FROM chat_conversations
      WHERE id = $1
    `,
    [conversationId]
  );

  if (result.rowCount === 0) {
    throw new Error("Conversation not found.");
  }

  const ownerId = result.rows[0].user_id as string;

  if (ownerId !== normalizedUserId) {
    throw new Error("Conversation does not belong to this user.");
  }
}

export async function listConversations(userId: string) {
  const normalizedUserId = normalizeUserId(userId);

  await ensureUserExists(normalizedUserId);

  const result = await pool.query(
    `
      SELECT id, user_id, title, preview, pinned, created_at, updated_at
      FROM chat_conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC, created_at DESC
    `,
    [normalizedUserId]
  );

  return result.rows as ChatConversationRecord[];
}

export async function createConversation(
  userId: string,
  input: {
    title?: string;
    preview?: string;
    pinned?: boolean;
  } = {}
): Promise<ChatConversationRecord> {
  const normalizedUserId = normalizeUserId(userId);
  const title = (input.title ?? "New chat").trim() || "New chat";
  const preview = input.preview ?? "";
  const pinned = Boolean(input.pinned);

  await ensureUserExists(normalizedUserId);

  const result = await pool.query(
    `
      INSERT INTO chat_conversations (user_id, title, preview, pinned, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, user_id, title, preview, pinned, created_at, updated_at
    `,
    [normalizedUserId, title, preview, pinned]
  );

  return result.rows[0] as ChatConversationRecord;
}

export async function loadConversation(
  userId: string,
  conversationId: string
): Promise<{
  conversation: ChatConversationRecord;
  messages: ChatMessageRecord[];
}> {
  const normalizedUserId = normalizeUserId(userId);

  await ensureUserExists(normalizedUserId);
  await ensureConversationOwnership(conversationId, normalizedUserId);

  const conversationResult = await pool.query(
    `
      SELECT id, user_id, title, preview, pinned, created_at, updated_at
      FROM chat_conversations
      WHERE id = $1 AND user_id = $2
    `,
    [conversationId, normalizedUserId]
  );

  if (conversationResult.rowCount === 0) {
    throw new Error("Conversation not found.");
  }

  const messagesResult = await pool.query(
    `
      SELECT id, conversation_id, user_id, role, content, created_at
      FROM chat_messages
      WHERE conversation_id = $1 AND user_id = $2
      ORDER BY created_at ASC
    `,
    [conversationId, normalizedUserId]
  );

  return {
    conversation: conversationResult.rows[0] as ChatConversationRecord,
    messages: messagesResult.rows as ChatMessageRecord[],
  };
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string
): Promise<ChatConversationRecord> {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedTitle = title.trim() || "New chat";

  await ensureUserExists(normalizedUserId);
  await ensureConversationOwnership(conversationId, normalizedUserId);

  const result = await pool.query(
    `
      UPDATE chat_conversations
      SET title = $3,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, title, preview, pinned, created_at, updated_at
    `,
    [conversationId, normalizedUserId, normalizedTitle]
  );

  return result.rows[0] as ChatConversationRecord;
}

export async function togglePinConversation(
  userId: string,
  conversationId: string
): Promise<ChatConversationRecord> {
  const normalizedUserId = normalizeUserId(userId);

  await ensureUserExists(normalizedUserId);
  await ensureConversationOwnership(conversationId, normalizedUserId);

  const result = await pool.query(
    `
      UPDATE chat_conversations
      SET pinned = NOT pinned,
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, user_id, title, preview, pinned, created_at, updated_at
    `,
    [conversationId, normalizedUserId]
  );

  return result.rows[0] as ChatConversationRecord;
}

export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const normalizedUserId = normalizeUserId(userId);

  await ensureUserExists(normalizedUserId);
  await ensureConversationOwnership(conversationId, normalizedUserId);

  const result = await pool.query(
    `
      DELETE FROM chat_conversations
      WHERE id = $1 AND user_id = $2
    `,
    [conversationId, normalizedUserId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function saveConversationMessage(
  userId: string,
  input: ChatMessageInput
): Promise<ChatMessageRecord> {
  const normalizedUserId = normalizeUserId(userId);
  const trimmedContent = input.content.trim();

  if (!trimmedContent) {
    throw new Error("Message content cannot be empty.");
  }

  await ensureUserExists(normalizedUserId);
  await ensureConversationOwnership(input.conversationId, normalizedUserId);

  return withTransaction(async (client) => {
    const messageResult = await client.query(
      `
        INSERT INTO chat_messages (conversation_id, user_id, role, content)
        VALUES ($1, $2, $3, $4)
        RETURNING id, conversation_id, user_id, role, content, created_at
      `,
      [input.conversationId, normalizedUserId, input.role, trimmedContent]
    );

    const message = messageResult.rows[0] as ChatMessageRecord;

    await client.query(
      `
        UPDATE chat_conversations
        SET preview = $1,
            updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `,
      [trimmedContent, input.conversationId, normalizedUserId]
    );

    return message;
  });
}
