import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is authenticated and get their profile
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Profile lookup:', { profile, profileError });

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('User not authorized. Admin role required.');
    }

    // Parse request body
    const { userId, newPassword } = await req.json();

    console.log('Reset password request for userId:', userId);

    if (!userId || !newPassword) {
      throw new Error('Missing required fields: userId and newPassword');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // First check if the user exists in auth.users
    const { data: targetUser, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (lookupError) {
      console.error('User lookup error:', lookupError);
      throw new Error(`User not found: ${lookupError.message}`);
    }

    if (!targetUser || !targetUser.user) {
      throw new Error('User not found in authentication system');
    }

    console.log('Found user:', targetUser.user.email);

    // Update the user's password using admin client
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    console.log('Password updated successfully for:', targetUser.user.email);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in reset-user-password:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});