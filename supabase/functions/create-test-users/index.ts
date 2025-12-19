import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const users = [
      {
        email: 'sayed.jilliyan@millennia21.id',
        password: 'password123',
        full_name: 'Sayed Jilliyan',
        role: 'staff',
        department: 'Web Developer'
      },
      {
        email: 'mahrukh@millennia21.id',
        password: 'password123',
        full_name: 'Mahrukh Bashir',
        role: 'director',
        department: null
      }
    ]

    const results = []

    // Get Web Developer department ID
    const { data: webDevDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', 'Web Developer')
      .maybeSingle()

    for (const user of users) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.full_name }
      })

      if (authError) {
        results.push({ email: user.email, success: false, error: authError.message })
        continue
      }

      const userId = authData.user.id

      // Update profile with department if applicable
      if (user.department && webDevDept) {
        await supabaseAdmin
          .from('profiles')
          .update({ department_id: webDevDept.id })
          .eq('user_id', userId)
      }

      // Add role if not staff (staff is default)
      if (user.role !== 'staff') {
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: userId, role: user.role })
      }

      results.push({ email: user.email, success: true, userId })
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
