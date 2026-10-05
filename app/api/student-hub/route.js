import { supabaseAdmin } from '@/utils/supabase/admin';
import { canAccessResource, getAuthenticatedRequestContext } from '@/lib/permissions';

const tableMap = {
  maintenance: 'student_hub_maintenance_requests',
  waitingList: 'student_hub_waiting_list',
  visitor: 'student_hub_visitors',
  inspection: 'student_hub_inspections',
  event: 'student_hub_events',
  agreement: 'student_hub_agreements',
  accreditation: 'student_hub_accreditations',
  communication: 'student_hub_communications',
};

const emptyHub = {
  maintenance: [],
  waitingList: [],
  visitors: [],
  inspections: [],
  events: [],
  agreements: [],
  accreditations: [],
  communications: [],
  attendance: [],
  parentPortal: [],
  invoices: [],
  auditTrail: [],
};

async function readFromSupabase() {
  const tableNames = Object.values(tableMap);
  const results = await Promise.all(tableNames.map(async (tableName) => {
    const { data, error } = await supabaseAdmin.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }));
  const [maintenance, waitingList, visitors, inspections, events, agreements, accreditations, communications] = results;
  const { data: attendanceData, error: attendanceError } = await supabaseAdmin
    .from('student_hub_attendance')
    .select('*')
    .order('created_at', { ascending: false });
  if (attendanceError && !['PGRST205', '42P01'].includes(attendanceError.code)) throw attendanceError;
  const attendance = attendanceData || [];
  const eventTitles = new Map(events.map((event) => [String(event.id), event.title]));
  const attendanceCounts = new Map();
  attendance.forEach((entry) => {
    const eventId = String(entry.event_id);
    attendanceCounts.set(eventId, (attendanceCounts.get(eventId) || 0) + 1);
  });

  return {
    maintenance: maintenance.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: item.owner,
    })),
    waitingList: waitingList.map((item) => ({
      id: item.id,
      name: item.name,
      course: item.course,
      budget: item.budget,
      queue: item.queue,
    })),
    visitors: visitors.map((item) => ({
      id: item.id,
      name: item.name,
      purpose: item.purpose,
      status: item.status,
      overnight: Boolean(item.overnight),
    })),
    inspections: inspections.map((item) => ({ title: item.title, date: item.date, status: item.status })),
    events: events.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      time: item.time || 'TBD',
      attendees: attendanceCounts.get(String(item.id)) || 0,
      capacity: item.capacity ?? item.attendees ?? 0,
      category: item.category || 'General',
      host: item.host || 'Residence Team',
      location: item.location || 'On campus',
      description: item.description || '',
      status: item.status || 'Open',
      featured: Boolean(item.featured),
    })),
    agreements: agreements.map((item) => ({ title: item.title, party: item.party, status: item.status })),
    accreditations: accreditations.map((item) => ({ title: item.title, status: item.status })),
    communications: communications.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      detail: item.detail,
      priority: item.priority,
    })),
    attendance: attendance.map((item) => ({
      eventId: item.event_id,
      eventTitle: eventTitles.get(String(item.event_id)) || 'Event',
      status: item.status,
    })),
    parentPortal: [],
    invoices: [],
    auditTrail: [
      ...agreements.map((item) => ({ action: `Lease updated: ${item.title}`, detail: `${item.party || 'Student'} • ${item.status || 'Pending'}` })),
      ...accreditations.map((item) => ({ action: `Accreditation updated: ${item.title}`, detail: item.status || 'Pending' })),
      ...communications.map((item) => ({ action: `Communication updated: ${item.title}`, detail: `${item.type || 'Announcement'} • ${item.priority || 'Normal'}` })),
    ],
  };
}

function getPayload(type, entry = {}) {
  const payloads = {
    maintenance: {
      title: entry.title || 'Maintenance',
      description: entry.description || '',
      status: 'Open',
      owner: 'Student Support',
    },
    waitingList: {
      name: entry.name || 'Student',
      course: entry.course || 'Unknown',
      budget: entry.budget || 'R6,500',
      queue: 0,
    },
    visitor: {
      name: entry.name || 'Guest',
      purpose: entry.purpose || 'Visit',
      status: 'Pending',
      overnight: Boolean(entry.overnight),
    },
    inspection: {
      title: entry.title || 'Inspection',
      date: entry.date || 'TBD',
      status: 'Scheduled',
    },
    event: {
      title: entry.title || 'Event',
      date: entry.date || 'TBD',
      attendees: 0,
    },
    agreement: {
      title: entry.title || 'Lease agreement',
      party: entry.party || 'Student & Owner',
      status: entry.status || 'Pending',
    },
    accreditation: {
      title: entry.title || 'Accreditation',
      status: entry.status || 'Pending',
    },
    communication: {
      title: entry.title || 'Resident update',
      type: entry.type || 'Announcement',
      detail: entry.detail || '',
      priority: entry.priority || 'Normal',
    },
  };
  return payloads[type] || null;
}

function isAvailable() {
  return Boolean(supabaseAdmin);
}

export async function GET(request) {
  try {
    const { role } = await getAuthenticatedRequestContext(request);
    if (!canAccessResource(role, 'studentHub', 'read')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAvailable()) return Response.json(emptyHub, { status: 503 });
    return Response.json(await readFromSupabase(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Student Hub read failed:', error);
    return Response.json({ error: 'Unable to load Student Hub data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { role } = await getAuthenticatedRequestContext(request);
    const type = body.type || 'maintenance';
    if (!canAccessResource(role, 'studentHub', 'write', type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAvailable()) return Response.json({ error: 'Student Hub database is not configured' }, { status: 503 });

    if (type === 'attendance') {
      const { user } = await getAuthenticatedRequestContext(request);
      const eventId = body.entry?.eventId;
      if (!user?.id) return Response.json({ error: 'Sign in to RSVP' }, { status: 401 });
      if (!eventId) return Response.json({ error: 'eventId is required' }, { status: 400 });

      const { data: event, error: eventError } = await supabaseAdmin
        .from('student_hub_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

      const { error } = await supabaseAdmin.from('student_hub_attendance').upsert([{
        event_id: eventId,
        student_id: user.id,
        status: 'Registered',
      }], { onConflict: 'event_id,student_id' });
      if (error?.code === 'PGRST205' || error?.code === '42P01') {
        return Response.json({ error: 'Apply sql/student_hub_tables.sql to enable event RSVPs' }, { status: 503 });
      }
      if (error) throw error;
      return Response.json(await readFromSupabase(), { status: 201 });
    }

    const tableName = tableMap[type];
    const payload = getPayload(type, body.entry);
    if (!tableName || !payload) return Response.json({ error: 'Unsupported Student Hub data type' }, { status: 400 });

    const { error } = await supabaseAdmin.from(tableName).insert([payload]);
    if (error) throw error;
    return Response.json(await readFromSupabase(), { status: 201 });
  } catch (error) {
    console.error('Student Hub write failed:', error);
    return Response.json({ error: 'Unable to save Student Hub data' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { role } = await getAuthenticatedRequestContext(request);
    const tableName = tableMap[body.type];
    if (!body.id || !tableName) return Response.json({ error: 'Valid type and id required' }, { status: 400 });
    if (!canAccessResource(role, 'studentHub', 'write', body.type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAvailable()) return Response.json({ error: 'Student Hub database is not configured' }, { status: 503 });

    const { error } = await supabaseAdmin.from(tableName).update(body.entry || {}).eq('id', body.id);
    if (error) throw error;
    return Response.json(await readFromSupabase());
  } catch (error) {
    console.error('Student Hub update failed:', error);
    return Response.json({ error: 'Unable to update Student Hub data' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { role } = await getAuthenticatedRequestContext(request);
    const tableName = tableMap[body.type];
    if (!body.id || !tableName) return Response.json({ error: 'Valid type and id required' }, { status: 400 });
    if (!canAccessResource(role, 'studentHub', 'write', body.type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAvailable()) return Response.json({ error: 'Student Hub database is not configured' }, { status: 503 });

    const { error } = await supabaseAdmin.from(tableName).delete().eq('id', body.id);
    if (error) throw error;
    return Response.json(await readFromSupabase());
  } catch (error) {
    console.error('Student Hub delete failed:', error);
    return Response.json({ error: 'Unable to delete Student Hub data' }, { status: 500 });
  }
}