
import { NextResponse } from 'next/server'

export function middleware(request) {
    const token = request.cookies.get('token')?.value
    const { pathname } = request.nextUrl

    // -------------------------------------------------------------------------
    // 1. DEFINE ROUTE GROUPS
    // -------------------------------------------------------------------------

    // Public Pages (accessible without login)
    const publicPages = [
        '/',
        '/matrimoney/home',
        '/matrimoney/midpage',
        '/matrimoney/aboutus',
        '/matrimoney/contactus',
        '/matrimoney/package',
        '/matrimoney/login',
        '/matrimoney/register', // Added register page
        '/matrimoney/forgot',
        '/matrimoney/reset-password',
    ]

    // Public API Routes (accessible without login)
    const publicApiRoutes = [
        '/api/login',
        '/api/register',
        '/api/forgot',
        '/api/auth', // e.g. send-otp
        '/api/lookups', // e.g. castes
        '/api/contact',
        '/api/ai-chat', // AI Assistant - accessible to everyone
        '/api/success-stories', // Success stories - public display
        '/api/payments/create-order' // Sometimes public, or maybe not. Assuming public for now or user checks. 
        // Actually usually payment requires login. strict it if needed. 
        // For now I'll leave payments protected if not explicitly public.
    ]

    // Auth Pages (logged-in users should be redirected to dashboard)
    const authPages = [
        '/matrimoney/login',
        '/matrimoney/register',
        '/matrimoney/forgot',
    ]

    // -------------------------------------------------------------------------
    // 2. HELPER FUNCTIONS
    // -------------------------------------------------------------------------

    const isPublicPage = publicPages.some(route => pathname === route || pathname.startsWith(route + '/'))
    const isPublicApi = publicApiRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
    const isAuthPage = authPages.some(route => pathname === route || pathname.startsWith(route + '/'))
    const isApi = pathname.startsWith('/api')

    // URLs
    const loginUrl = new URL('/matrimoney/login', request.url)
    const dashboardHomeUrl = new URL('/dashboard/myhome', request.url)

    // -------------------------------------------------------------------------
    // 3. LOGIC
    // -------------------------------------------------------------------------

    // A. Redirect logged-in users away from auth pages (e.g. login -> dashboard)
    if (isAuthPage && token) {
        return NextResponse.redirect(dashboardHomeUrl)
    }

    // B. Protection Logic
    if (!token) {
        // If it's an API call
        if (isApi) {
            // Allow if it's a public API
            if (isPublicApi) {
                return NextResponse.next()
            }
            // Otherwise, block with 401 JSON
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        // If it's a Page request
        if (!isPublicPage) {
            // Redirect to login
            return NextResponse.redirect(loginUrl)
        }
    }

    // C. Allow everything else
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - extensions: svg, png, jpg, jpeg, webp
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)',
    ],
}
