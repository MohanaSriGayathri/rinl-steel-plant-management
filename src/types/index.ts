export type UserRole = 'admin' | 'supervisor' | 'vendor' | 'employee';

export interface UserProfile {
  id: string;
  employee_id: string;
  role: UserRole | string;
  email: string;
  created_at?: string;
  last_login?: string | null;
  login_count?: number;
}

export interface InventoryItem {
  id: string;
  item_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'In Stock' | 'Low Stock' | 'Critical' | string;
  min_threshold?: number;
  max_threshold?: number;
  location?: string | null;
  supplier?: string | null;
  cost_per_unit?: number | null;
  last_updated?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionRecord {
  id: string;
  date: string;
  shift: 'Day' | 'Evening' | 'Night' | string;
  steel_production: number;
  molten_iron: number;
  efficiency: number;
  quality_rate: number;
  uptime_hours: number;
  downtime_hours?: number;
  downtime_reason?: string | null;
  energy_consumption?: number | null;
  raw_materials_used?: Record<string, unknown> | null;
  products_breakdown?: Record<string, unknown> | null;
  operator_id?: string | null;
  supervisor_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaterialRequest {
  id: string;
  request_id: string;
  user_id: string;
  material: string;
  quantity: number;
  unit: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  status: 'Pending' | 'Approved' | 'In Transit' | 'Delivered' | 'Rejected' | string;
  request_date: string;
  required_date?: string | null;
  estimated_delivery?: string | null;
  actual_delivery?: string | null;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  total_cost?: number | null;
  supplier?: string | null;
  created_at?: string;
  updated_at?: string;
  error?: string;
}

export interface Vendor {
  id: string | number;
  name: string;
  category: string;
  contact_person?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
  status?: string;
}

export interface VendorOrder {
  id: string;
  order_id: string;
  user_id: string;
  vendor_id?: string | null;
  product: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  specifications?: string | null;
  delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | string;
  payment_status: 'Pending' | 'Paid' | 'Failed' | string;
  payment_method?: string | null;
  tracking_number?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  login_timestamp: string;
  logout_timestamp?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_duration?: string | null;
  role_at_login: string;
  created_at?: string;
}

export interface ChatMessage {
  text: string;
  isBot: boolean;
}
