import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { socket } from "../../plugins/socket";
import { useEffect } from "react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "../context/AuthContext";
import api from "../../plugins/axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Link } from "react-router-dom";
export default function Header() {
  const [notifications, setNotifications] = useState([]);
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isTenantsPage = location.pathname === "/tenants";

  // Initialize notificationsCleared from localStorage
  const getNotificationsCleared = () => {
    if (!user) return false;
    const userId = user._id || user.id;
    const stored = localStorage.getItem(`notificationsCleared_${userId}`);
    return stored === "true";
  };

  const [notificationsCleared, setNotificationsCleared] = useState(() => getNotificationsCleared());

  // Update localStorage when notificationsCleared changes
  useEffect(() => {
    if (!user) return;
    const userId = user._id || user.id;
    if (notificationsCleared) {
      localStorage.setItem(`notificationsCleared_${userId}`, "true");
    } else {
      localStorage.removeItem(`notificationsCleared_${userId}`);
    }
  }, [notificationsCleared, user]);

  // Update notificationsCleared state when user loads
  useEffect(() => {
    if (user) {
      const cleared = getNotificationsCleared();
      setNotificationsCleared(cleared);
    } else {
      setNotificationsCleared(false);
    }
  }, [user]);

  async function markAllAsRead() {
    try {
      const response = await api.patch("/api/notification/mark-all-notifications-as-read");
      if (response.data.success) {
        setNotifications([]); // Clear notifications from UI
        setNotificationsCleared(true); // Prevent them from coming back
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      // Even if API fails, clear notifications locally
      setNotifications([]);
      setNotificationsCleared(true);
    }
  }
  async function markAsRead(notificationId) {
    try {
      const response = await api.patch(`/api/notification/mark-notification-as-read/${notificationId}`);
      if (response.data.success) {
        setNotifications(notifications.map((notification) => notification._id === notificationId ? { ...notification, isRead: true } : notification));
      }
    }
    catch (error) {
      console.error("Error marking as read:", error);
    }
  }

  // Fetch notifications when user is loaded
  useEffect(() => {
    if (loading || !user || notificationsCleared) return;

    const getNotifications = async () => {
      try {
        // The backend uses the authenticated user's ID from the token, so we don't need to pass it in the URL
        const response = await api.get("/api/notification/get-notifications");
        if (response.data.success) {
          setNotifications(response.data.notifications || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        // Don't show error toast - notifications are not critical
      }
    };

    getNotifications();
  }, [user, loading, notificationsCleared]);

  // Connect socket and listen for new notifications
  useEffect(() => {
    if (!user) {
      socket.disconnect();
      return;
    }

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Join admin room when connected
    const handleConnect = () => {
      if (user?._id || user?.id) {
        socket.emit("join:admin", user._id || user.id);
      }
    };

    // Handle new notifications
    const handleNewNotification = (data) => {
      if (notificationsCleared) return; // Don't add notifications if they've been cleared
      const notification = data.notification;
      setNotifications((prev) => [notification, ...prev]);

      // Show toast for payment notifications
      if (notification.type === "PAYMENT_NOTIFICATION") {
        toast.success(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("new-notification", handleNewNotification);

    // Join room immediately if already connected
    if (socket.connected && (user?._id || user?.id)) {
      socket.emit("join:admin", user._id || user.id);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new-notification", handleNewNotification);
    };
  }, [user, notificationsCleared]);
  return (
    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center  sm:p-4 w-full gap-4">
      {!isTenantsPage && (
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            type="text"
            className="w-full sm:pl-10 pl-4 h-10 text-sm border-gray-300 rounded-md pl-8"
            placeholder={
              isMobile
                ? "Search..."
                : "Search name, unit, lease end (YYYY-MM-DD)"
            }
          />
        </div>
      )}
      <div className={isTenantsPage ? "ml-auto" : ""}>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-10 h-10 rounded-full relative"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notifications.filter((n) => !n.isRead).length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <Button variant="outline" className="w-fit ml-auto mr-3 mb-1 border-none text-sm" onClick={() => {
                markAllAsRead();
              }}>
                Mark All as Read
              </Button>
            )}

            <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto mt-1">


              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id || notification.id}
                    className={`flex items-start gap-3 mb-2 rounded-md border  p-3 ml-3 mr-3 ${!notification.isRead
                      ? "bg-gray-50 border-gray-200"
                      : "bg-gray-50 border-gray-200"
                      }`}

                  >
                    <Bell
                      className={`w-5 h-5 mt-0.5 ${!notification.isRead
                        ? "text-primary-500"
                        : "text-gray-400"
                        }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-black">
                        {notification.title}
                      </p>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-sm text-gray-600 mt-1" onClick={() => {
                            markAsRead(notification._id || notification.id);
                          }}>
                            View details {notification.isRead ? " (Read)" : " (Unread)"}
                          </AccordionTrigger>
                          <AccordionContent>
                            {notification.message}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {notification.createdAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}