import { toast } from "sonner";

export interface Notification {
  id: string;
  userId: string;
  type: 'order_approved' | 'order_rejected' | 'order_shipped' | 'order_status_update' | 'general';
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  createdAt: string;
  read: boolean;
}

class NotificationService {
  private baseURL: string;

  constructor() {
    this.baseURL = 'https://api.pulasa.com';
    console.log('📧 Frontend: NotificationService initialized with updated code!');
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<{ success: boolean; error?: string }> {
    try {
      // Get token from unified auth service session
      const session = localStorage.getItem('pulasa_unified_session');
      let token = null;
      
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          token = sessionData.tokens?.jwtToken;
        } catch (error) {
          console.error('Failed to parse session data:', error);
        }
      }

      console.log('📧 Sending notification with token:', token ? 'Available' : 'Not available');
      console.log('📧 Base URL:', this.baseURL);

      // First, let's test if the server is running
      try {
        const healthCheck = await fetch(`${this.baseURL}/health`);
        console.log('📧 Health check response:', healthCheck.status);
        if (healthCheck.ok) {
          const healthData = await healthCheck.json();
          console.log('📧 Health check data:', healthData);
        }
      } catch (error) {
        console.error('📧 Health check failed:', error);
      }

      // Test the root endpoint to see available routes
      try {
        const rootCheck = await fetch(`${this.baseURL}/`);
        console.log('📧 Root endpoint response:', rootCheck.status);
        if (rootCheck.ok) {
          const rootData = await rootCheck.json();
          console.log('📧 Available endpoints:', rootData.endpoints);
        }
      } catch (error) {
        console.error('📧 Root endpoint check failed:', error);
      }

      // Test the notification test route
      try {
        const testCheck = await fetch(`${this.baseURL}/api/notifications/test`);
        console.log('📧 Notification test route response:', testCheck.status);
        if (testCheck.ok) {
          const testData = await testCheck.json();
          console.log('📧 Test route data:', testData);
        }
      } catch (error) {
        console.error('📧 Notification test route failed:', error);
      }

      const requestBody = {
        userId,
        ...notification
      };
      
      console.log('📧 Frontend: Sending notification request to:', `${this.baseURL}/api/notifications`);
      console.log('📧 Frontend: Request body:', requestBody);
      console.log('📧 Frontend: Authorization token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${this.baseURL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error('📧 Notification API error:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('📧 Error response:', errorData);
        
        // If the unified auth service is not running, we'll just log the error but not fail
        if (response.status === 404) {
          console.warn('📧 Unified auth service notifications endpoint not available - notifications will be skipped');
          return { success: true, error: 'Notification service not available' };
        }
        
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      console.log('📧 Frontend: Notification API response:', JSON.stringify(data, null, 2));
      console.log('📧 Frontend: Email sent status:', data.emailSent);
      console.log('📧 Frontend: Email message ID:', data.emailMessageId);
      console.log('📧 Frontend: Full response keys:', Object.keys(data));
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  }

  /**
   * Send order approval notification
   */
  async sendOrderApprovalNotification(userId: string, orderNumber: string, orderId: string): Promise<{ success: boolean; error?: string }> {
    const notification = {
      userId,
      type: 'order_approved' as const,
      title: '🎉 Order Approved!',
      message: `Great news! Your order #${orderNumber} has been approved and is being prepared for shipment. You'll receive tracking details soon. Thank you for choosing Pulasa!`,
      orderId,
      orderNumber
    };

    return this.sendNotification(userId, notification);
  }

  /**
   * Send order rejection notification
   */
  async sendOrderRejectionNotification(userId: string, orderNumber: string, orderId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const defaultReason = "We couldn't process your order at this time.";
    const notification = {
      userId,
      type: 'order_rejected' as const,
      title: 'Order Update',
      message: `We're sorry, but your order #${orderNumber} could not be processed. ${reason || defaultReason} Please contact our support team if you have any questions.`,
      orderId,
      orderNumber
    };

    return this.sendNotification(userId, notification);
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdateNotification(userId: string, orderNumber: string, statusLabel: string, orderId: string, userEmail?: string, orderDetails?: any): Promise<{ success: boolean; error?: string }> {
    const notification = {
      userId,
      type: 'order_status_update' as const,
      title: `📦 Order Status Updated: ${statusLabel}`,
      message: `Your order #${orderNumber} status has been updated to "${statusLabel}". We'll keep you informed of any further updates. Thank you for your patience!`,
      orderId,
      orderNumber,
      userEmail,
      orderDetails
    };

    return this.sendNotification(userId, notification);
  }

  /**
   * Get notifications for current user
   */
  async getUserNotifications(): Promise<Notification[]> {
    try {
      // Get token from unified auth service session
      const session = localStorage.getItem('pulasa_unified_session');
      let token = null;
      
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          token = sessionData.tokens?.jwtToken;
        } catch (error) {
          console.error('Failed to parse session data:', error);
        }
      }

      if (!token) return [];

      const response = await fetch(`${this.baseURL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.success ? data.notifications : [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get token from unified auth service session
      const session = localStorage.getItem('pulasa_unified_session');
      let token = null;
      
      if (session) {
        try {
          const sessionData = JSON.parse(session);
          token = sessionData.tokens?.jwtToken;
        } catch (error) {
          console.error('Failed to parse session data:', error);
        }
      }

      const response = await fetch(`${this.baseURL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  /**
   * Show notification toast to user (for immediate feedback)
   */
  showNotificationToast(type: 'success' | 'error' | 'info', title: string, message: string) {
    switch (type) {
      case 'success':
        toast.success(title, {
          description: message,
          duration: 5000,
        });
        break;
      case 'error':
        toast.error(title, {
          description: message,
          duration: 5000,
        });
        break;
      case 'info':
        toast.info(title, {
          description: message,
          duration: 5000,
        });
        break;
    }
  }
}

export default new NotificationService(); 