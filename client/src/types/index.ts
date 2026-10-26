export type Role = 'OWNER' | 'EMPLOYEE';

export type DeviceType = 'PS5' | 'PS4' | 'CAR_SIMULATOR' | 'PC';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  mobile: string;
  role: Role;
  isActive: boolean;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PricingRule {
  id: string;
  deviceType: DeviceType | string;
  controllerCount: number;
  hourlyRate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StationCurrentBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerMobile: string;
  controllerCount: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  gamingAmount: number;
  foodAmount: number;
  discount: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  createdByName?: string;
}

export interface StationUpcomingBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  startTime: string;
  endTime: string;
}

export interface Station {
  id: number;
  tableNumber: number;
  deviceType: DeviceType | string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  isOccupied?: boolean;
  remainingSeconds?: number;
  nextAvailableTime?: string;
  nextAvailableTimestamp?: string;
  availableUntil?: string | null;
  upcomingBookingsCount?: number;
  currentBooking?: StationCurrentBooking | null;
  nextUpcomingBooking?: StationUpcomingBooking | null;
  upcomingBookings?: StationUpcomingBooking[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingStationItem {
  id: string;
  bookingId: string;
  stationId: number;
  appliedRatePerHour: number;
  station: Station;
}

export interface BookingFoodItemDetail {
  id: string;
  bookingId: string;
  foodItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  foodName?: string;
  foodItem?: FoodItem;
}

export interface PaymentItem {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  recordedById?: string;
  recordedBy?: {
    id: string;
    name: string;
    employeeId: string;
  };
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerMobile: string;
  controllerCount: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  gamingAmount: number;
  foodAmount: number;
  discount: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMethod?: string | null;
  bookingStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'UPCOMING';
  notes?: string | null;
  cancelReason?: string | null;
  createdById?: string;
  createdByName?: string;
  createdBy?: {
    id: string;
    name: string;
    employeeId: string;
    role: string;
  };
  createdAt?: string;
  updatedAt?: string;
  stations: BookingStationItem[];
  foodItems?: BookingFoodItemDetail[];
  payments?: PaymentItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  targetRole: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  userName: string;
  userEmpId: string;
  role: string;
  action: string;
  target: string;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: string;
}

export type Payment = PaymentItem;

export interface DashboardSummary {
  todayRevenue: number;
  todayGamingSales: number;
  todayFoodSales: number;
  todayBookingsCount: number;
  activeSessions: number;
  availableStations: number;
  occupiedStations: number;
  totalStations: number;
  pendingPaymentsCount: number;
  pendingPaymentAmount: number;
  serverTime: string;
}

export interface ReportSummary {
  summary: {
    totalRevenue: number;
    totalGamingRevenue: number;
    totalFoodRevenue: number;
    totalDiscount: number;
    totalBookings: number;
    totalPaymentsCount: number;
    startDate: string;
    endDate: string;
  };
  paymentMethods: Record<string, number>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    gaming: number;
    food: number;
    bookings: number;
  }>;
  stationUsage: Array<{
    tableNumber: number;
    deviceType: string;
    bookingCount: number;
    totalMinutes: number;
    revenue: number;
  }>;
  employeeActivity: Array<{
    name: string;
    employeeId: string;
    bookingsCount: number;
    paymentsCollected: number;
  }>;
}

