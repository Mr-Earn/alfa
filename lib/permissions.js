import { supabaseAdmin } from '@/utils/supabase/admin'
import { supabase } from '@/utils/supabase/client'

export const ROLE_VALUES = ['student', 'agent', 'owner', 'university', 'admin']

export function normalizeRole(value) {
  const normalized = String(value || '').toLowerCase().trim()

  if (['agent', 'broker', 'realtor'].includes(normalized)) return 'agent'
  if (['owner', 'propertyowner', 'property-owner', 'landlord'].includes(normalized)) return 'owner'
  if (['university', 'institution', 'school'].includes(normalized)) return 'university'
  if (['admin', 'administrator', 'superadmin'].includes(normalized)) return 'admin'

  return 'student'
}

export function getDashboardForRole(role) {
  switch (normalizeRole(role)) {
    case 'agent':
      return 'agent'
    case 'owner':
      return 'owner'
    case 'university':
      return 'university'
    case 'admin':
      return 'admin'
    default:
      return 'student'
  }
}

export function canAccessResource(role, resource, action = 'read', subAction = null) {
  const resolvedRole = normalizeRole(role)

  const permissions = {
    profiles: {
      read: ['student', 'agent', 'owner', 'university', 'admin'],
      write: ['student', 'agent', 'owner', 'university', 'admin'],
    },
    bookings: {
      read: ['student', 'agent', 'owner', 'university', 'admin'],
      write: {
        create: ['student'],
        update: ['owner', 'university', 'admin'],
      },
    },
    studentHub: {
      read: ['student', 'agent', 'owner', 'university', 'admin'],
      write: {
        student: ['maintenance', 'waitingList', 'attendance', 'loyalty'],
        agent: ['event', 'communication', 'parentPortal', 'inspection', 'agreement', 'accreditation', 'invoice', 'visitor'],
        owner: ['event', 'communication', 'parentPortal', 'inspection', 'invoice', 'visitor'],
        university: ['event', 'communication', 'agreement', 'accreditation', 'inspection', 'visitor'],
        admin: ['maintenance', 'waitingList', 'attendance', 'loyalty', 'event', 'communication', 'parentPortal', 'inspection', 'agreement', 'accreditation', 'invoice', 'visitor'],
      },
    },
  }

  const resourceRules = permissions[resource]
  if (!resourceRules) return false

  if (action === 'write' && resource === 'studentHub') {
    const allowedSubActions = resourceRules.write[resolvedRole] || []
    return Boolean(subAction && allowedSubActions.includes(subAction))
  }

  if (action === 'write' && resource === 'bookings') {
    const writeRules = resourceRules.write || {}
    const actionKey = subAction || 'create'
    const allowedRoles = writeRules[actionKey] || []
    return allowedRoles.includes(resolvedRole)
  }

  if (!resourceRules[action]) return false
  return resourceRules[action].includes(resolvedRole)
}

export async function getAuthenticatedRequestContext(request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const roleHeader = request.headers.get('x-user-role')
  const userIdHeader = request.headers.get('x-user-id')
  const emailHeader = request.headers.get('x-user-email')

  if (token && supabaseAdmin) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && user) {
      return {
        user,
        role: normalizeRole(user.user_metadata?.role || roleHeader || 'student'),
      }
    }
  }

  if (roleHeader) {
    return {
      user: userIdHeader ? { id: userIdHeader, email: emailHeader || null } : { id: null, email: emailHeader || null },
      role: normalizeRole(roleHeader),
    }
  }

  if (userIdHeader) {
    return {
      user: { id: userIdHeader, email: emailHeader || null },
      role: normalizeRole('student'),
    }
  }

  return { user: null, role: null }
}

export async function getAuthenticatedRequestHeaders(role = null, accessToken = null) {
  const headers = { 'Content-Type': 'application/json' }
  const resolvedRole = normalizeRole(role)

  try {
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
    }

    if (resolvedRole) {
      headers['x-user-role'] = resolvedRole
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      headers['x-user-id'] = session.user.id
    }
    if (session?.user?.email) {
      headers['x-user-email'] = session.user.email
    }
  } catch (error) {
    console.warn('Unable to build authenticated request headers', error)
  }

  return headers
}
