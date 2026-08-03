import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export default function NotificationBell({ profileId, role }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!profileId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`recipient_profile_id.eq.${profileId},recipient_role.eq.${role}`)
      .order('created_at', { ascending: false })
      .limit(20)
    setItems(data || [])
  }, [profileId, role])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  const unreadCount = items.filter((n) => !n.read).length

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    load()
  }

  const markAllRead = async () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    load()
  }

  return (
    <div className="notif-wrap">
      <button className="notif-bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notif-scrim" onClick={() => setOpen(false)} />
          <div className="notif-panel">
            <div className="notif-panel-head">
              <span>Notifications</span>
              {unreadCount > 0 && <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>}
            </div>
            {items.length === 0 ? (
              <div className="notif-empty">Nothing yet.</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => markRead(n.id)}>
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="notif-body">{n.body}</div>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
