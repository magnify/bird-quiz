/**
 * Audit logging helper.
 * Used by all admin API routes to track content changes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from './supabase/types'

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert']

interface AuditParams {
  userId: string
  action: string
  entityType: string
  entityId?: string
  oldData?: Json
  newData?: Json
}

export async function logAudit(
  supabase: SupabaseClient<Database>,
  params: AuditParams
) {
  const row: AuditLogInsert = {
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_data: params.oldData ?? null,
    new_data: params.newData ?? null,
  }

  const { error } = await supabase.from('audit_log').insert(row as never)

  if (error) {
    console.error('Failed to write audit log:', error)
  }
}
