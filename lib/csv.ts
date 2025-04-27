// TODO: Add papaparse integration for client-side parsing (consider dynamic import)
// TODO: Define interfaces for CSV row types (ClientCsvRow, InvoiceCsvRow, etc.)
// TODO: Implement validation functions (e.g., email format, date parsing using date-fns)
// TODO: Add data mapping/transformation logic

export interface ClientCsvRow {
  // Define expected client CSV columns based on spec
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  // Add other potential variations from user CSVs
  [key: string]: unknown; // Allow for extra columns
}

export interface InvoiceCsvRow {
  // Define expected invoice CSV columns based on spec
  invoice_number?: string;
  client_email?: string; // Needs resolution to client_id
  issue_date?: string;
  due_date?: string;
  subtotal?: string | number;
  tax?: string | number;
  discount?: string | number;
  total?: string | number;
  status?: string;
  notes?: string;
  payment_terms?: string;
  // Add other potential variations
  [key: string]: unknown;
}

export interface InvoiceItemCsvRow {
  // Define expected invoice item CSV columns based on spec
  invoice_number?: string; // Needs resolution to invoice_id
  description?: string;
  quantity?: string | number;
  price?: string | number;
  amount?: string | number;
  // Add other potential variations
  [key: string]: unknown;
}

// Add utility functions here
