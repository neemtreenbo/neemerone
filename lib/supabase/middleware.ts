import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware');
      // Return original response if env vars are missing
      return supabaseResponse;
    }

    // With Fluid compute, don't put this client in a global environment
    // variable. Always create a new one on each request.
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

    // IMPORTANT: If you remove getClaims() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const { data, error: authError } = await supabase.auth.getClaims()

    if (authError) {
      console.error('Middleware auth error:', authError);

      // Handle rate limiting - avoid redirect loops
      if (authError.message?.includes('rate limit') || authError.status === 429) {
        // Return 429 status instead of redirecting to prevent loops
        return new NextResponse('Rate limit exceeded. Please try again later.', { status: 429 })
      }

      // For refresh token errors, clear auth cookies and redirect to login
      if (authError.message?.includes('refresh_token_not_found') || authError.status === 400) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        const response = NextResponse.redirect(url)

        // Clear auth cookies to reset auth state
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        response.cookies.set('sb-access-token', '', { maxAge: 0 })
        response.cookies.set('sb-refresh-token', '', { maxAge: 0 })

        return response
      }

      // For other auth errors, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    const user = data?.claims

  // Public routes that don't require authentication
  const publicRoutes = ['/auth', '/login']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    // no user, redirect to login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check onboarding status
  if (user && !isPublicRoute && request.nextUrl.pathname !== '/onboarding') {
    try {
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.sub)
        .single()

      // If profile doesn't exist or onboarding not completed, redirect to onboarding
      if (!profile || !profile.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // If we can't check onboarding status, redirect to onboarding to be safe
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // If user is on onboarding page but has already completed it, redirect to dashboard
  if (user && request.nextUrl.pathname === '/onboarding') {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.sub)
        .single()

      if (profile && profile.onboarding_completed) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If error checking profile, let them stay on onboarding page
      console.error('Error checking onboarding status:', error)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

    return supabaseResponse;
  } catch (error) {
    console.error('Critical middleware error:', error);

    // In case of critical error, redirect to error page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/error'
    return NextResponse.redirect(url)
  }
}
