"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  getUserNotifications,
  markNotificationRead,
  type Notification
} from "@/lib/notifications";

export function useUserNotifications() {
  const { currentUser, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const userId = currentUser.uid;

    async function loadNotifications() {
      setLoading(true);
      try {
        const nextNotifications = await getUserNotifications(userId);
        if (!cancelled) {
          setNotifications(nextNotifications);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [authLoading, currentUser]);

  return {
    notifications,
    loading: authLoading || loading,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    async markRead(notificationId: string) {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification
        )
      );
    }
  };
}
