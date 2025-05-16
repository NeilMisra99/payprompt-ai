import { Hono } from "hono";
import { handle } from "hono/vercel";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase, supabaseMiddleware } from "./supabase-middleware";

export const runtime = "edge";

export type Variables = {
  supabase: SupabaseClient;
  user: User;
};

type Bindings = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  ENV: string;
};

const app = new Hono<{ Variables: Variables; Bindings: Bindings }>().basePath(
  "/api/hono"
);

app.use("*", async (c, next) => {
  // Debug the cookies
  //   const cookieHeader = c.req.header("cookie") || "";
  //   console.log("Cookies received:", cookieHeader.substring(0, 50));

  // Let Supabase handle authentication
  await supabaseMiddleware()(c, next);
  //   const supabase = getSupabase(c);

  // Try both methods to diagnose the issue
  //   const {
  //     data: { session },
  //   } = await supabase.auth.getSession();
  //   const {
  //     data: { user },
  //   } = await supabase.auth.getUser();

  //   console.log("Session found:", session ? "Yes" : "No");
  //   console.log("User found:", user ? "Yes" : "No");

  //   if (!user) {
  //     return c.json(
  //       { message: "Unauthorized", error: "No valid session found" },
  //       401
  //     );
  //   }
});

app.get("/test", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  return c.json({ message: "Hello World" }, 200);
});

app.get("/clients", async (c) => {
  const supabase = getSupabase(c);

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Fetch client details along with their last invoice number using RPC
  const { data: clients, error: clientError } = await supabase.rpc(
    "get_clients_with_last_invoice",
    { user_id_param: user.id }
  );

  if (clientError) {
    console.error("Error fetching clients:", clientError);
    return c.json({ error: "Failed to fetch clients" }, 500);
  }

  return c.json(clients ?? []);
});

// Endpoint to fetch user profile
app.get("/profile", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // Ignore 'No rows found' error
    console.error("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }

  // Provide default fallback if profile is null
  const userProfile = profile ?? {
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.email,
    avatar_url: user.user_metadata?.avatar_url,
  };

  return c.json(userProfile);
});

// Endpoint to fetch user invoices
app.get("/invoices", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Build the query (back to original)
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      clients (name)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return c.json({ error: "Failed to fetch invoices" }, 500);
  }

  return c.json(data ?? []);
});

// Endpoint to fetch user reminders
app.get("/reminders", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { data, error } = await supabase
    .from("reminders")
    .select(
      `
      *,
      invoices (
        invoice_number,
        total,
        clients (
          name
        )
      )
    `
    )
    .eq("user_id", user.id) // Ensure reminders are fetched for the correct user
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reminders:", error);
    return c.json({ error: "Failed to fetch reminders" }, 500);
  }

  return c.json(data ?? []);
});

// Endpoint to fetch dashboard data (invoices and client count)
app.get("/dashboard", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Fetch invoices
  const { data: invoicesData, error: invoicesError } = await supabase
    .from("invoices")
    .select("*, clients ( name )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch client count
  const { count: clientCount, error: clientsError } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true }) // Use count aggregation
    .eq("user_id", user.id);

  if (invoicesError || clientsError) {
    console.error("Error fetching dashboard data:", {
      invoicesError,
      clientsError,
    });
    return c.json({ error: "Failed to fetch dashboard data" }, 500);
  }

  return c.json({
    invoices: invoicesData ?? [],
    clientCount: clientCount ?? 0,
  });
});

// Endpoint to fetch a single client by ID
app.get("/clients/:id", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const clientId = c.req.param("id");

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!clientId) {
    return c.json({ error: "Client ID is required" }, 400);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching client:", error);
    // Handle not found specifically
    if (error.code === "PGRST116") {
      return c.json({ error: "Client not found" }, 404);
    }
    return c.json({ error: "Failed to fetch client" }, 500);
  }

  return c.json(data);
});

// Endpoint to fetch data needed for the new invoice page
app.get("/invoices/new-data", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Fetch only clients (with last invoice) and profile
  const [clientsResult, profileResult] = await Promise.all([
    supabase.rpc("get_clients_with_last_invoice", { user_id_param: user.id }),
    supabase
      .from("profiles")
      .select(
        `id, company_name, full_name, company_logo_url, company_address_street, company_address_line2, company_address_city, company_address_state, company_address_postal_code, company_address_country`
      )
      .eq("id", user.id)
      .single(),
  ]);

  const { data: clients, error: clientError } = clientsResult;
  const { data: profile, error: profileError } = profileResult;

  // Check for errors
  if (clientError || profileError) {
    console.error("Error fetching new invoice data:", {
      clientError,
      profileError,
    });
    return c.json({ error: "Failed to fetch necessary data" }, 500);
  }

  // Return clients and profile only
  return c.json({
    clients: clients ?? [],
    profile: profile ?? {},
  });
});

// Endpoint to fetch detailed invoice data (invoice, client, items, reminders)
app.get("/invoices/:id/details", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const invoiceId = c.req.param("id");

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!invoiceId) {
    return c.json({ error: "Invoice ID is required" }, 400);
  }

  // Fetch invoice with client details
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
      *,
      client:clients(*)
    `
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  // Fetch invoice items
  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("id", { ascending: true });

  // Fetch reminders
  const { data: reminders, error: remindersError } = await supabase
    .from("reminders")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    if (invoiceError.code === "PGRST116") {
      return c.json({ error: "Invoice not found" }, 404);
    }
    return c.json({ error: "Failed to fetch invoice details" }, 500);
  }

  if (itemsError || remindersError) {
    console.error("Error fetching invoice items or reminders:", {
      itemsError,
      remindersError,
    });
    // Proceeding even if items/reminders fail, but log error
  }

  if (!invoice || !invoice.client) {
    // This case implies the invoice exists but client data is missing unexpectedly
    console.error("Invoice found but client data missing for id:", invoiceId);
    return c.json({ error: "Invoice data incomplete" }, 500);
  }

  return c.json({
    invoice,
    items: items ?? [],
    reminders: reminders ?? [],
  });
});

// Endpoint to fetch data needed for the edit invoice page
app.get("/invoices/:id/edit-data", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const invoiceId = c.req.param("id");

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!invoiceId) {
    return c.json({ error: "Invoice ID is required" }, 400);
  }

  // Fetch invoice with client details and items in parallel
  const [invoiceResult, itemsResult, clientsResult, profileResult] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(`*, client:clients(*)`)
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true }),
      supabase
        .from("clients")
        .select("*") // Select all client fields for the dropdown
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("profiles")
        .select(
          `
          id,
          company_name,
          full_name,
          company_logo_url,
          company_address_street,
          company_address_line2,
          company_address_city,
          company_address_state,
          company_address_postal_code,
          company_address_country
        `
        )
        .eq("id", user.id)
        .single(),
    ]);

  const { data: invoice, error: invoiceError } = invoiceResult;
  const { data: items, error: itemsError } = itemsResult;
  const { data: clients, error: clientError } = clientsResult;
  const { data: profile, error: profileError } = profileResult;

  // Handle critical errors (invoice fetch)
  if (invoiceError) {
    console.error("Error fetching invoice for edit:", invoiceError);
    if (invoiceError.code === "PGRST116") {
      return c.json({ error: "Invoice not found" }, 404);
    }
    return c.json({ error: "Failed to fetch invoice data" }, 500);
  }

  // Handle other potential errors
  if (itemsError || clientError || profileError) {
    console.warn("Warning: Error fetching related data for invoice edit:", {
      itemsError,
      clientError,
      profileError,
    });
    // Continue if possible, form might handle missing data gracefully
  }

  if (!invoice || !invoice.client) {
    console.error("Invoice found but client data missing for id:", invoiceId);
    return c.json({ error: "Invoice data incomplete" }, 500);
  }

  return c.json({
    invoice,
    items: items ?? [],
    clients: clients ?? [],
    profile: profile ?? {},
  });
});

// Endpoint to get the next invoice number for a specific prefix
app.get("/invoices/next-number", async (c) => {
  const supabase = getSupabase(c);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const prefix = c.req.query("prefix");
  if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
    return c.json(
      { error: "Missing or invalid 'prefix' query parameter" },
      400
    );
  }

  try {
    const { data: nextNumber, error: rpcError } = await supabase.rpc(
      "get_next_invoice_number_for_prefix",
      { user_id_param: user.id, prefix_param: prefix }
    );

    if (rpcError) {
      console.error(
        "Error calling get_next_invoice_number_for_prefix RPC:",
        rpcError
      );
      throw new Error("Failed to calculate next invoice number.");
    }

    if (!nextNumber) {
      console.error(
        "RPC get_next_invoice_number_for_prefix returned null/undefined"
      );
      throw new Error("Failed to determine next invoice number.");
    }

    return c.json({ nextInvoiceNumber: nextNumber });
  } catch (error) {
    console.error("Error in /invoices/next-number endpoint:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return c.json({ error: message }, 500);
  }
});

app.get("/hello", (c) => {
  return c.json({
    message: "Hello Next.js!",
  });
});

export const GET = handle(app);
export const POST = handle(app);
