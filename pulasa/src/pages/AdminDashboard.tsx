import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import unifiedAuthService from "@/services/UnifiedAuthService";
import MongoDBService from "@/services/MongoDBService";
import NotificationService from "@/services/NotificationService";
import NavigationHeader from "@/components/NavigationHeader";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
  products: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }> | string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  upi_reference?: string;
  mongo_user_id?: string;
  supabase_id?: string;
  sync_source?: string;
  last_synced?: string;
  updated_at?: string;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  // Scroll to top when component mounts
  useScrollToTop();

  // Status progression options
  const statusOptions = [
    { value: 'order_raised', label: 'Order Raised', color: 'bg-orange-100 text-orange-800' },
    { value: 'order_confirmed', label: 'Order Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'order_packed', label: 'Order Packed', color: 'bg-purple-100 text-purple-800' },
    { value: 'order_shipped', label: 'Order Shipped', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'order_delivered', label: 'Order Delivered', color: 'bg-green-100 text-green-800' },
    { value: 'order_cancelled', label: 'Order Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  const fetchOrders = async () => {
    try {
      console.log('Fetching all orders for admin...');
      const ordersData = await MongoDBService.getAllOrders();
      console.log('Orders data received:', ordersData);
      
      // Debug: Log first order's products
      if (ordersData.length > 0) {
        console.log('First order products:', ordersData[0].products);
        console.log('Parsed products:', parseProducts(ordersData[0].products));
      }
      
      setOrders(ordersData);

      // Calculate stats
      const totalOrders = ordersData.length;
      const totalRevenue = ordersData.reduce((sum, order) => sum + order.amount, 0);
      const pendingOrders = ordersData.filter(order => 
        order.status === 'order_raised' || order.status === 'order_confirmed' || 
        order.status === 'order_packed' || order.status === 'order_shipped'
      ).length;
      const completedOrders = ordersData.filter(order => 
        order.status === 'order_delivered'
      ).length;

      console.log('Calculated stats:', { totalOrders, totalRevenue, pendingOrders, completedOrders });

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success('Orders refreshed successfully');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const currentUser = await unifiedAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          
          if (!currentUser.is_admin) {
            toast.error("Access denied. Admin privileges required.");
            window.location.href = "/";
            return;
          }

          // Fetch orders
          await fetchOrders();
        } else {
          toast.error("Please login to access admin dashboard");
          window.location.href = "/login";
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
        toast.error("Failed to load admin dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await unifiedAuthService.logout();
      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Logout failed");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      // Find the order to get user details
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      console.log('🔄 Status update request:', {
        orderId,
        currentStatus: order.status,
        newStatus,
        orderNumber: order.order_number
      });

      // Map status to new format if needed
      const mappedStatus = mapStatusToNewFormat(newStatus);
      console.log('📋 Status mapping:', { original: newStatus, mapped: mappedStatus });

      // Call the API to update order status
      const updateResult = await MongoDBService.updateOrderStatus(orderId, mappedStatus);
      
      if (!updateResult.success) {
        toast.error(updateResult.error || `Failed to update order status`);
        return;
      }

      // Update local state with the updated order
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: mappedStatus }
            : order
        )
      );

      // Refresh orders to get the latest data from database
      await fetchOrders();

      // Get user details for email notification
      const userDetails = await MongoDBService.getUserById(order.user_id);
      const userEmail = userDetails?.email;

      // Send notification to the user
      const statusLabel = statusOptions.find(s => s.value === mappedStatus)?.label || getDisplayStatus(mappedStatus);
      
      console.log('📧 Frontend: About to send notification with:', {
        userId: order.user_id,
        orderNumber: order.order_number,
        statusLabel,
        orderId: order.id,
        userEmail,
        orderDetails: order
      });
      
      const notificationResult = await NotificationService.sendOrderStatusUpdateNotification(
          order.user_id,
          order.order_number,
          statusLabel,
          order.id,
          userEmail,
          order
        );
        
      console.log('📧 Frontend: Notification result:', notificationResult);
        
      if (notificationResult.success) {
        if (notificationResult.error === 'Notification service not available') {
          toast.success(`Order status updated to ${statusLabel}! (Notification service not available)`);
        } else {
          toast.success(`Order status updated to ${statusLabel}! Notification sent to customer.`);
        }
      } else {
        toast.success(`Order status updated to ${statusLabel}! (Notification failed to send)`);
      }
      
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error(`Failed to update order status`);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'order_delivered':
        return 'default';
      case 'order_raised':
        return 'secondary';
      case 'order_confirmed':
        return 'secondary';
      case 'order_packed':
        return 'secondary';
      case 'order_shipped':
        return 'secondary';
      case 'order_cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'order_delivered':
        return 'text-[hsl(var(--accent))]';
      case 'order_raised':
        return 'text-[hsl(var(--primary))]';
      case 'order_confirmed':
        return 'text-[hsl(var(--accent))]';
      case 'order_packed':
        return 'text-[hsl(var(--primary))]';
      case 'order_shipped':
        return 'text-[hsl(var(--accent))]';
      case 'order_cancelled':
        return 'text-[hsl(var(--destructive))]';
      default:
        return 'text-[hsl(var(--muted-foreground))]';
    }
  };

  const parseProducts = (products: string | Array<{ product_id: string; name: string; price: number; quantity: number }>) => {
    if (typeof products === 'string') {
      try {
        return JSON.parse(products);
      } catch (error) {
        console.error('Failed to parse products string:', error);
        return [];
      }
    }
    return products || [];
  };

  const getDisplayStatus = (status: string) => {
    // Map existing statuses to new format
    const statusMapping: { [key: string]: string } = {
      'order_raised': 'Order Raised',
      'order_confirmed': 'Order Confirmed',
      'order_packed': 'Order Packed',
      'order_shipped': 'Order Shipped',
      'order_delivered': 'Order Delivered',
      'order_cancelled': 'Order Cancelled',
      // Map old statuses to new ones
      'pending': 'Order Raised',
      'confirmed': 'Order Confirmed',
      'delivered': 'Order Delivered',
      'rejected': 'Order Cancelled',
      'completed': 'Order Delivered'
    };

    return statusMapping[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const mapStatusToNewFormat = (oldStatus: string) => {
    const statusMapping: { [key: string]: string } = {
      'pending': 'order_raised',
      'confirmed': 'order_confirmed',
      'delivered': 'order_delivered',
      'rejected': 'order_cancelled',
      'completed': 'order_delivered'
    };
    return statusMapping[oldStatus] || oldStatus;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAddress = (order: Order) => {
    const parts = [
      order.address,
      order.city,
      order.state,
      order.zip
    ].filter(Boolean);
    return parts.join(', ');
  };

  const formatProducts = (products: string | Array<{ product_id: string; name: string; price: number; quantity: number }>) => {
    const parsedProducts = parseProducts(products);
    return parsedProducts.map(product => `${product.name} per kg x ${product.quantity}`).join(', ');
  };

  const getNextStatusOptions = (currentStatus: string) => {
    const statusIndex = statusOptions.findIndex(s => s.value === currentStatus);
    if (statusIndex === -1) return statusOptions;
    
    // Return all statuses after current status, plus current status
    return statusOptions.slice(statusIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--secondary))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[hsl(var(--primary))] mx-auto"></div>
          <p className="mt-4 text-lg text-[hsl(var(--foreground))]">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--secondary))]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-[hsl(var(--foreground))]">Access Denied</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">You need admin privileges to access this page.</p>
          <Button onClick={() => window.location.href = "/"} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/90 text-[hsl(var(--accent-foreground))]">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--secondary))]">
      <NavigationHeader />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Admin Dashboard</h1>
              <p className="text-[hsl(var(--muted-foreground))]">Welcome back, {user.name}</p>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                variant="outline" 
                className="bg-[hsl(var(--card))] border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Orders
                  </>
                )}
              </Button>
            <Button onClick={handleLogout} variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--accent))] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
              Logout
            </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[hsl(var(--card-foreground))]">Total Orders</CardTitle>
                <svg className="w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[hsl(var(--card-foreground))]">Total Revenue</CardTitle>
                <svg className="w-4 h-4 text-[hsl(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--accent))]">₹{stats.totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[hsl(var(--card-foreground))]">Pending Orders</CardTitle>
                <svg className="w-4 h-4 text-[hsl(var(--primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--primary))]">{stats.pendingOrders}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-[hsl(var(--card))] border-[hsl(var(--border))]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[hsl(var(--card-foreground))]">Delivered Orders</CardTitle>
                <svg className="w-4 h-4 text-[hsl(var(--accent))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--accent))]">{stats.completedOrders}</div>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card className="hover:shadow-lg transition-shadow bg-[hsl(var(--card))] border-[hsl(var(--border))]">
            <CardHeader>
              <CardTitle className="text-xl text-[hsl(var(--card-foreground))]">Orders Management</CardTitle>
              <CardDescription className="text-[hsl(var(--muted-foreground))]">Review and manage customer orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">No Orders Yet</h3>
                  <p className="text-[hsl(var(--muted-foreground))]">Orders will appear here when customers place them.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Order #</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">User</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Products</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Status Update</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">UPI Reference</th>
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))]">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                  {orders.map((order) => (
                        <tr key={order.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-medium text-[hsl(var(--accent))] cursor-pointer hover:underline" onClick={() => openOrderDetails(order)}>
                              {order.order_number}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-[hsl(var(--foreground))]">
                                {order.first_name} {order.last_name}
                              </div>
                              <div className="text-sm text-[hsl(var(--muted-foreground))]">{order.phone}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-[hsl(var(--foreground))]">
                              {formatProducts(order.products)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[hsl(var(--accent))]">
                              ₹{order.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-[hsl(var(--foreground))]">
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusBadgeVariant(order.status)} className={getStatusColor(order.status)}>
                              {getDisplayStatus(order.status)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusUpdate(order.id, value)}
                                disabled={updatingOrder === order.id}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Update Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {getNextStatusOptions(order.status).map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">
                              {order.upi_reference || 'N/A'}
                        </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs truncate" title={formatAddress(order)}>
                              {formatAddress(order)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[hsl(var(--border))]">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[hsl(var(--card-foreground))]">Order #{selectedOrder.order_number}</h2>
                  <p className="text-[hsl(var(--muted-foreground))]">
                    {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                <Button
                  onClick={() => setShowOrderDetails(false)}
                  variant="outline"
                  size="sm"
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  ✕
                </Button>
              </div>

              {/* Order Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--card-foreground))]">Status</h3>
                <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="text-sm">
                  {getDisplayStatus(selectedOrder.status)}
                </Badge>
              </div>

              {/* Customer Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--card-foreground))]">Customer Information</h3>
                  <div className="bg-[hsl(var(--muted))] rounded-lg p-4 space-y-2">
                      <p className="text-[hsl(var(--card-foreground))]"><span className="font-medium">Name:</span> {selectedOrder.first_name} {selectedOrder.last_name}</p>
                      <p className="text-[hsl(var(--card-foreground))]"><span className="font-medium">Phone:</span> {selectedOrder.phone}</p>
                  <p className="text-[hsl(var(--card-foreground))]"><span className="font-medium">Address:</span> {formatAddress(selectedOrder)}</p>
                  <p className="text-[hsl(var(--card-foreground))]"><span className="font-medium">UPI Reference:</span> {selectedOrder.upi_reference || 'N/A'}</p>
                </div>
              </div>

              {/* Products */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--card-foreground))]">Products</h3>
                <div className="space-y-3">
                  {parseProducts(selectedOrder.products)?.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-[hsl(var(--muted))] rounded-lg">
                      <div>
                        <p className="font-medium text-[hsl(var(--card-foreground))]">{product.name} per kg</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Quantity: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[hsl(var(--card-foreground))]">₹{product.price ? product.price.toFixed(2) : '0.00'}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">₹{product.price ? (product.price * product.quantity).toFixed(2) : '0.00'} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-[hsl(var(--border))] pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-[hsl(var(--card-foreground))]">Total Amount</span>
                  <span className="text-2xl font-bold text-[hsl(var(--accent))]">₹{selectedOrder.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Status Update */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-[hsl(var(--card-foreground))]">Update Status</h3>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) => handleStatusUpdate(selectedOrder.id, value)}
                    disabled={updatingOrder === selectedOrder.id}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getNextStatusOptions(selectedOrder.status).map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
