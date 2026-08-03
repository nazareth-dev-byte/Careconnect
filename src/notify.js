import { supabase } from './supabaseClient'

// Reads the one shared clinic_settings row. Defaults to "on" if the row
// doesn't exist yet, so notifications work even before Settings has ever
// been saved.
async function toggleOn(key) {
  const { data } = await supabase.from('clinic_settings').select(key).eq('id', 1).maybeSingle()
  return data ? !!data[key] : true
}

// A patient/doctor row doesn't always have a login (e.g. patients registered
// by front desk via New Patient never get a profiles row). These resolve to
// null in that case, and callers just skip notifying that side.
async function resolvePatientProfileId(patientId) {
  if (!patientId) return null
  const { data } = await supabase.from('profiles').select('id').eq('patient_id', patientId).maybeSingle()
  return data?.id || null
}

async function resolveDoctorProfileId(doctorId) {
  if (!doctorId) return null
  const { data } = await supabase.from('profiles').select('id').eq('doctor_id', doctorId).maybeSingle()
  return data?.id || null
}

export async function notifyBookingConfirmation({ appointmentId, patientId, doctorId, doctorName, date, time }) {
  if (!(await toggleOn('booking_confirmations'))) return
  const [patientProfileId, doctorProfileId] = await Promise.all([
    resolvePatientProfileId(patientId),
    resolveDoctorProfileId(doctorId),
  ])

  const rows = []
  if (patientProfileId) {
    rows.push({
      recipient_profile_id: patientProfileId,
      type: 'booking_confirmation',
      title: 'Appointment booked',
      body: doctorName ? `${date} · ${time} with Dr. ${doctorName}` : `${date} · ${time}`,
      appointment_id: appointmentId,
    })
  }
  if (doctorProfileId) {
    rows.push({
      recipient_profile_id: doctorProfileId,
      type: 'booking_confirmation',
      title: 'New appointment',
      body: `${date} · ${time}`,
      appointment_id: appointmentId,
    })
  }
  if (rows.length) await supabase.from('notifications').insert(rows)
}

export async function notifyCancellation({ appointmentId, date, time }) {
  if (!(await toggleOn('cancellation_alerts'))) return
  await supabase.from('notifications').insert([
    { recipient_role: 'Admin', type: 'cancellation', title: 'Appointment cancelled', body: `${date} · ${time}`, appointment_id: appointmentId },
    { recipient_role: 'Receptionist', type: 'cancellation', title: 'Appointment cancelled', body: `${date} · ${time}`, appointment_id: appointmentId },
  ])
}

export async function notifyVisitComplete({ appointmentId, patientId }) {
  if (!(await toggleOn('lab_result_flags'))) return
  const patientProfileId = await resolvePatientProfileId(patientId)
  if (!patientProfileId) return
  await supabase.from('notifications').insert([{
    recipient_profile_id: patientProfileId,
    type: 'visit_complete',
    title: 'Visit summary ready',
    body: 'Your doctor has completed your visit record.',
    appointment_id: appointmentId,
  }])
}

// Best-effort reminder: fires when a screen holding this appointment loads
// and the visit is within 24h. Not a true background job — see note in chat.
export async function notifyReminderIfDue(appointment) {
  if (!(await toggleOn('reminders_24h'))) return
  if (!appointment?.appointment_date) return

  const apptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time || '00:00:00'}`)
  const hoursAway = (apptDateTime - new Date()) / 3600000
  if (hoursAway <= 0 || hoursAway > 24) return

  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('appointment_id', appointment.id)
    .eq('type', 'reminder_24h')
    .limit(1)
  if (existing && existing.length > 0) return

  const [patientProfileId, doctorProfileId] = await Promise.all([
    resolvePatientProfileId(appointment.patient_id),
    resolveDoctorProfileId(appointment.doctor_id),
  ])

  const rows = []
  const body = `${appointment.appointment_date} · ${appointment.appointment_time?.slice(0, 5) || ''}`
  if (patientProfileId) rows.push({ recipient_profile_id: patientProfileId, type: 'reminder_24h', title: 'Upcoming appointment', body, appointment_id: appointment.id })
  if (doctorProfileId) rows.push({ recipient_profile_id: doctorProfileId, type: 'reminder_24h', title: 'Upcoming appointment', body, appointment_id: appointment.id })
  if (rows.length) await supabase.from('notifications').insert(rows)
}
