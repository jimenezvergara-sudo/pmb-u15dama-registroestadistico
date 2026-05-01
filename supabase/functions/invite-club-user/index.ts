import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ROLES = ['coach', 'club_staff', 'fan'];
const ADMIN_ROLES = ['club_admin', 'club_admin_pro', 'club_admin_elite', 'super_admin', 'system_operator'];

interface Body {
  email?: string;
  role?: string;
  category?: string | null;
  invitationId?: string; // for resend
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'No autenticado' }, 401);
    }

    // 1. Validar usuario invocante
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'No autenticado' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 2. Verificar rol admin
    const { data: rolesData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roles = (rolesData ?? []).map((r: any) => r.role);
    if (!roles.some((r: string) => ADMIN_ROLES.includes(r))) {
      return json({ error: 'No autorizado para gestionar usuarios del club' }, 403);
    }

    // 3. Obtener club + nombre del admin
    const { data: profile } = await admin
      .from('profiles')
      .select('club_id, full_name, my_team_name')
      .eq('user_id', user.id)
      .single();
    if (!profile?.club_id) return json({ error: 'No se pudo determinar el club' }, 400);

    const body = (await req.json().catch(() => ({}))) as Body;

    // === RESEND FLOW ===
    if (body.invitationId) {
      const { data: inv } = await admin
        .from('club_invitations')
        .select('*')
        .eq('id', body.invitationId)
        .eq('club_id', profile.club_id)
        .single();
      if (!inv) return json({ error: 'Invitación no encontrada' }, 404);
      if (inv.status === 'accepted') return json({ error: 'La invitación ya fue aceptada' }, 400);

      const redirectTo = `${getOrigin(req)}/accept-invite`;
      const { error: invErr } = await admin.auth.admin.inviteUserByEmail(inv.email, {
        redirectTo,
        data: {
          invited_club_id: inv.club_id,
          invited_role: inv.role,
          invited_category: inv.assigned_category,
          invited_by_name: profile.full_name || profile.my_team_name || 'BASQUEST+',
          club_name: profile.my_team_name || '',
        },
      });
      if (invErr) return json({ error: invErr.message }, 400);

      await admin
        .from('club_invitations')
        .update({ status: 'pending', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', inv.id);

      return json({ success: true, mode: 'resent' });
    }

    // === NEW INVITE FLOW ===
    const email = (body.email || '').trim().toLowerCase();
    const role = body.role || '';
    const category = body.category || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Email inválido' }, 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: 'Rol no permitido' }, 400);
    }

    // 4. ¿Existe el usuario?
    const { data: existing } = await admin
      .from('profiles')
      .select('user_id, club_id')
      .eq('user_id', await findUserIdByEmail(admin, email))
      .maybeSingle();

    const adminName = profile.full_name || 'el administrador';
    const clubName = profile.my_team_name || 'el club';

    if (existing?.user_id) {
      // Ya existe → asignar directo
      if (existing.user_id === user.id) {
        return json({ error: 'No podés modificarte a vos mismo' }, 400);
      }

      await admin
        .from('profiles')
        .update({ club_id: profile.club_id, assigned_category: category, updated_at: new Date().toISOString() })
        .eq('user_id', existing.user_id);

      await admin.from('user_roles').delete().eq('user_id', existing.user_id);
      await admin.from('user_roles').insert({ user_id: existing.user_id, role });

      // Registrar en invitaciones como "accepted" para tracking
      await admin.from('club_invitations').insert({
        email,
        club_id: profile.club_id,
        role,
        assigned_category: category,
        status: 'accepted',
        invited_by: user.id,
        invited_by_name: adminName,
        accepted_at: new Date().toISOString(),
      });

      return json({
        success: true,
        mode: 'assigned_existing',
        message: `${email} fue agregado a ${clubName} como ${roleLabel(role)}.`,
      });
    }

    // No existe → invitar por email
    const redirectTo = `${getOrigin(req)}/accept-invite`;
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_club_id: profile.club_id,
        invited_role: role,
        invited_category: category,
        invited_by_name: adminName,
        club_name: clubName,
      },
    });
    if (inviteErr) {
      // Si Supabase devuelve "already registered" pero no lo encontramos arriba, propagar
      return json({ error: inviteErr.message }, 400);
    }

    await admin.from('club_invitations').insert({
      email,
      club_id: profile.club_id,
      role,
      assigned_category: category,
      status: 'pending',
      invited_by: user.id,
      invited_by_name: adminName,
    });

    return json({
      success: true,
      mode: 'invited',
      message: `Le enviamos un email a ${email}. Cuando acepte aparecerá en la lista.`,
    });
  } catch (e: any) {
    console.error('invite-club-user error', e);
    return json({ error: e.message || 'Error interno' }, 500);
  }
});

async function findUserIdByEmail(admin: any, email: string): Promise<string | null> {
  // Listamos usuarios filtrando por email (paginación corta es ok para flujos de invite)
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error || !data?.users) return null;
  const found = data.users.find((u: any) => (u.email || '').toLowerCase() === email);
  return found?.id ?? null;
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    coach: 'Entrenador',
    club_staff: 'Staff',
    fan: 'Fan',
  };
  return map[role] || role;
}

function getOrigin(req: Request) {
  return req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://basquestplus.cl';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
