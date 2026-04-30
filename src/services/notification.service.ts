import { prisma } from "@/lib/prisma";

// ============================================================
// Types
// ============================================================

export type NotificationType =
  | "RECOMMENDATION_ASSIGNED"
  | "RECOMMENDATION_STATUS_CHANGED"
  | "RECOMMENDATION_OVERDUE"
  | "ACTION_ASSIGNED"
  | "ACTION_STATUS_CHANGED"
  | "ACTION_DUE_SOON"
  | "EVIDENCE_DEPOSITED"
  | "EVIDENCE_VALIDATED"
  | "EVIDENCE_REJECTED"
  | "EXTENSION_REQUESTED"
  | "EXTENSION_VALIDATED"
  | "EXTENSION_REJECTED"
  | "SYSTEM";

export interface NotificationData {
  recommendationId?: string;
  actionId?: string;
  evidenceId?: string;
  extensionId?: string;
  url?: string;
  [key: string]: unknown;
}

// ============================================================
// Create notification
// ============================================================

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      isRead: false,
      data: data ? (data as object) : undefined,
      ...(data?.recommendationId
        ? { recommendationId: data.recommendationId }
        : {}),
    },
  });
}

// ============================================================
// Get user notifications
// ============================================================

export async function getNotifications(
  userId: string,
  options: {
    onlyUnread?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { onlyUnread = false, page = 1, pageSize = 30 } = options;

  const where: Record<string, unknown> = { userId };
  if (onlyUnread) where.isRead = false;

  const [total, data] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// Mark as read
// ============================================================

export async function markAsRead(id: string, userId: string) {
  // Ensure the notification belongs to the user
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new Error("Notification introuvable.");
  }

  if (notification.isRead) {
    return notification; // Already read — no-op
  }

  return prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ============================================================
// Mark all as read for a user
// ============================================================

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ============================================================
// Get unread count
// ============================================================

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ============================================================
// Delete notification
// ============================================================

export async function deleteNotification(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new Error("Notification introuvable.");
  }

  return prisma.notification.delete({ where: { id } });
}
