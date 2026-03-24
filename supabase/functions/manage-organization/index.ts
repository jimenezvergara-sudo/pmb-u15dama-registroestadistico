import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is super_admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super_admin role
    const { data: roleCheck } = await anonClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "super_admin",
    });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { action } = body;

    // ACTION: create_organization
    if (action === "create_organization") {
      const { name, plan, admin_email, admin_password, admin_name } = body;

      if (!name || !admin_email || !admin_password || !admin_name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const maxStaff =
        plan === "elite" ? 9 : plan === "pro" ? 6 : 3;

      // 1. Create organization
      const { data: org, error: orgError } = await adminClient
        .from("organizations")
        .insert({
          name,
          plan: plan || "free",
          max_staff: maxStaff,
          created_by: caller.id,
        })
        .select()
        .single();

      if (orgError) {
        return new Response(JSON.stringify({ error: orgError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Create admin user
      const { data: newUser, error: userError } =
        await adminClient.auth.admin.createUser({
          email: admin_email,
          password: admin_password,
          email_confirm: true,
          user_metadata: { full_name: admin_name },
        });

      if (userError) {
        // Rollback org
        await adminClient.from("organizations").delete().eq("id", org.id);
        return new Response(JSON.stringify({ error: userError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Update profile to use this org's club_id
      await adminClient
        .from("profiles")
        .update({ club_id: org.id })
        .eq("user_id", newUser.user.id);

      // 4. Set role to club_admin_elite
      await adminClient
        .from("user_roles")
        .update({ role: "club_admin_elite" })
        .eq("user_id", newUser.user.id);

      return new Response(
        JSON.stringify({ success: true, organization: org, user_id: newUser.user.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ACTION: list_organizations
    if (action === "list_organizations") {
      const { data, error } = await adminClient
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ organizations: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: delete_organization
    if (action === "delete_organization") {
      const { org_id } = body;
      const { error } = await adminClient
        .from("organizations")
        .delete()
        .eq("id", org_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
