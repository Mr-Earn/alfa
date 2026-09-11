import { promises as fs } from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { canAccessResource, getAuthenticatedRequestContext, normalizeRole } from '@/lib/permissions';

const storagePath = path.join(process.cwd(), 'data', 'student-hub.json');

const defaultStore = {
  maintenance: [
    { id: 1, title: 'Wi-Fi outage', status: 'In Progress', owner: 'Facilities' },
    { id: 2, title: 'Broken desk drawer', status: 'Open', owner: 'Housekeeping' },
  ],
  waitingList: [
    { name: 'Lerato M.', course: 'BCom Accounting', budget: 'R7,000', queue: 3 },
    { name: 'Sipho K.', course: 'Mechanical Engineering', budget: 'R8,200', queue: 6 },
  ],
  visitors: [
    { name: 'Mpho L.', purpose: 'Family visit', status: 'Approved', overnight: false },
    { name: 'Sizwe T.', purpose: 'Study group', status: 'Pending', overnight: true },
  ],
  inspections: [
    { title: 'Move-in inspection', date: 'Aug 10', status: 'Scheduled' },
    { title: 'Mid-term inspection', date: 'Sep 14', status: 'Planned' },
  ],
  events: [
    { title: 'Orientation Mixer', date: '2026-08-12', time: '18:00', attendees: 42, capacity: 50, category: 'Orientation', host: 'Residence Team', location: 'Main Hall', description: 'Welcome week mixer for new students and resident mentors.', status: 'Open', featured: true },
    { title: 'Residence Q&A', date: '2026-08-22', time: '17:30', attendees: 29, capacity: 35, category: 'Meeting', host: 'Housing Office', location: 'Student Lounge', description: 'Meet the housing team and learn about policies, services, and support.', status: 'Registration closing', featured: false },
  ],
  agreements: [
    { title: 'Lease agreement - Riverview Residence', party: 'Student & Owner', status: 'Signed' },
  ],
  accreditations: [
    { title: 'University accreditation', status: 'Verified' },
  ],
  auditTrail: [
    { action: 'Lease signed', detail: 'Riverview Residence' },
    { action: 'Accreditation verified', detail: 'University review complete' },
  ],
  parentPortal: [
    { title: 'July rent statement', amount: 'R6,800', status: 'Sent' },
    { title: 'Deposit acknowledgement', amount: 'R1,500', status: 'Received' },
  ],
  communications: [
    { title: 'Wi-Fi maintenance', type: 'Announcement', detail: 'Scheduled for tomorrow between 10:00 and 12:00.', priority: 'Normal' },
    { title: 'Late-night noise concern', type: 'Support ticket', detail: 'Resident reported a repeated noise issue near block B.', priority: 'High' },
  ],
  invoices: [
    { title: 'August rent invoice', amount: 'R6,800', dueDate: '2026-08-10', status: 'Pending' },
    { title: 'Deposit invoice', amount: 'R1,500', dueDate: '2026-08-15', status: 'Paid' },
  ],
  loyalty: {
    points: 1240,
    activity: [
      { title: 'Profile completed', detail: '+100 pts' },
      { title: 'Rent paid on time', detail: '+300 pts' },
    ],
  },
  attendance: [
    { eventTitle: 'Orientation Mixer', status: 'Registered' },
    { eventTitle: 'Residence Q&A', status: 'Reminder sent' },
  ],
};

async function readStore() {
  try {
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    const file = await fs.readFile(storagePath, 'utf8');
    return JSON.parse(file);
  } catch (error) {
    return defaultStore;
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(storagePath, JSON.stringify(store, null, 2), 'utf8');
}

async function safeSelectFromTable(tableName) {
  try {
    const { data, error } = await supabaseAdmin.from(tableName).select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
}

async function readFromSupabase() {
  if (!supabaseAdmin) {
    return null;
  }

  const [
    maintenanceResult,
    waitingListResult,
    visitorsResult,
    inspectionsResult,
    eventsResult,
    agreementsResult,
    accreditationsResult,
    communicationsResult,
  ] = await Promise.all([
    safeSelectFromTable('student_hub_maintenance_requests'),
    safeSelectFromTable('student_hub_waiting_list'),
    safeSelectFromTable('student_hub_visitors'),
    safeSelectFromTable('student_hub_inspections'),
    safeSelectFromTable('student_hub_events'),
    safeSelectFromTable('student_hub_agreements'),
    safeSelectFromTable('student_hub_accreditations'),
    safeSelectFromTable('student_hub_communications'),
  ]);

  const maintenanceData = maintenanceResult.data || []
  const waitingListData = waitingListResult.data || []
  const visitorsData = visitorsResult.data || []
  const inspectionsData = inspectionsResult.data || []
  const eventsData = eventsResult.data || []
  const agreementsData = agreementsResult.data || []
  const accreditationsData = accreditationsResult.data || []
  const communicationsData = communicationsResult.data || []

  return {
    maintenance: (maintenanceData || []).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: item.owner,
    })),
    waitingList: (waitingListData || []).map((item) => ({
      name: item.name,
      course: item.course,
      budget: item.budget,
      queue: item.queue,
    })),
    visitors: (visitorsData || []).map((item) => ({
      name: item.name,
      purpose: item.purpose,
      status: item.status,
      overnight: Boolean(item.overnight),
    })),
    inspections: (inspectionsData || []).map((item) => ({
      title: item.title,
      date: item.date,
      status: item.status,
    })),
    events: (eventsData || []).map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      time: item.time || 'TBD',
      attendees: item.attendees ?? 0,
      capacity: item.capacity ?? item.attendees ?? 0,
      category: item.category || 'General',
      host: item.host || 'Residence Team',
      location: item.location || 'On campus',
      description: item.description || '',
      status: item.status || 'Open',
      featured: Boolean(item.featured),
    })),
    agreements: (agreementsData || []).map((item) => ({
      title: item.title,
      party: item.party,
      status: item.status,
    })),
    accreditations: (accreditationsData || []).map((item) => ({
      title: item.title,
      status: item.status,
    })),
    communications: (communicationsData || []).map((item) => ({
      title: item.title,
      type: item.type,
      detail: item.detail,
      priority: item.priority,
    })),
    auditTrail: (agreementsData || []).map((item) => ({
      action: `Lease updated: ${item.title}`,
      detail: `${item.party || 'Student'} • ${item.status || 'Pending'}`,
    })).concat((accreditationsData || []).map((item) => ({
      action: `Accreditation updated: ${item.title}`,
      detail: item.status || 'Pending',
    })).concat((communicationsData || []).map((item) => ({
      action: `Communication updated: ${item.title}`,
      detail: `${item.type || 'Announcement'} • ${item.priority || 'Normal'}`,
    })))),
  };
}

async function writeToSupabase(type, entry) {
  if (!supabaseAdmin) {
    return null;
  }

  if (type === 'maintenance') {
    await supabaseAdmin.from('student_hub_maintenance_requests').insert([{
      title: entry?.title || 'Maintenance',
      description: entry?.description || '',
      status: 'Open',
      owner: 'Student Support',
    }]);
  }

  if (type === 'waitingList') {
    await supabaseAdmin.from('student_hub_waiting_list').insert([{
      name: entry?.name || 'Student',
      course: entry?.course || 'Unknown',
      budget: entry?.budget || 'R6,500',
      queue: 0,
    }]);
  }

  if (type === 'visitor') {
    await supabaseAdmin.from('student_hub_visitors').insert([{
      name: entry?.name || 'Guest',
      purpose: entry?.purpose || 'Visit',
      status: 'Pending',
      overnight: Boolean(entry?.overnight),
    }]);
  }

  if (type === 'inspection') {
    await supabaseAdmin.from('student_hub_inspections').insert([{
      title: entry?.title || 'Inspection',
      date: entry?.date || 'TBD',
      status: 'Scheduled',
    }]);
  }

  if (type === 'event') {
    await supabaseAdmin.from('student_hub_events').insert([{
      title: entry?.title || 'Event',
      date: entry?.date || 'TBD',
      time: entry?.time || 'TBD',
      attendees: Number(entry?.attendees || entry?.capacity || 18),
      capacity: Number(entry?.capacity || entry?.attendees || 18),
      category: entry?.category || 'General',
      host: entry?.host || 'Residence Team',
      location: entry?.location || 'On campus',
      description: entry?.description || '',
      status: entry?.status || 'Open',
      featured: Boolean(entry?.featured),
    }]);
  }

  if (type === 'agreement') {
    await supabaseAdmin.from('student_hub_agreements').insert([{
      title: entry?.title || 'Lease agreement',
      party: entry?.party || 'Student & Owner',
      status: entry?.status || 'Pending',
    }]);
  }

  if (type === 'accreditation') {
    await supabaseAdmin.from('student_hub_accreditations').insert([{
      title: entry?.title || 'Accreditation',
      status: entry?.status || 'Pending',
    }]);
  }

  if (type === 'communication') {
    await supabaseAdmin.from('student_hub_communications').insert([{
      title: entry?.title || 'Resident update',
      type: entry?.type || 'Announcement',
      detail: entry?.detail || '',
      priority: entry?.priority || 'Normal',
    }]);
  }

  return readFromSupabase();
}

async function updateInSupabase(type, id, entry) {
  if (!supabaseAdmin) return null
  const tableMap = {
    maintenance: 'student_hub_maintenance_requests',
    waitingList: 'student_hub_waiting_list',
    visitor: 'student_hub_visitors',
    inspection: 'student_hub_inspections',
    event: 'student_hub_events',
    agreement: 'student_hub_agreements',
    accreditation: 'student_hub_accreditations',
    communication: 'student_hub_communications',
  }
  const tableName = tableMap[type]
  if (!tableName) return null

  try {
    const { data, error } = await supabaseAdmin.from(tableName).update(entry).eq('id', id).select()
    if (error) return { error }
    return await readFromSupabase()
  } catch (error) {
    return { error }
  }
}

async function deleteFromSupabase(type, id) {
  if (!supabaseAdmin) return null
  const tableMap = {
    maintenance: 'student_hub_maintenance_requests',
    waitingList: 'student_hub_waiting_list',
    visitor: 'student_hub_visitors',
    inspection: 'student_hub_inspections',
    event: 'student_hub_events',
    agreement: 'student_hub_agreements',
    accreditation: 'student_hub_accreditations',
    communication: 'student_hub_communications',
  }
  const tableName = tableMap[type]
  if (!tableName) return null

  try {
    const { error } = await supabaseAdmin.from(tableName).delete().eq('id', id)
    if (error) return { error }
    return await readFromSupabase()
  } catch (error) {
    return { error }
  }
}

function findIndexByIdOrKey(list, id, keyCandidates = ['id', 'title', 'name']) {
  if (!Array.isArray(list)) return -1
  const byId = list.findIndex((item) => String(item?.id) === String(id))
  if (byId >= 0) return byId
  for (const key of keyCandidates) {
    const idx = list.findIndex((item) => item && String(item[key]) === String(id))
    if (idx >= 0) return idx
  }
  return -1
}

async function updateInStore(type, id, entry) {
  const store = await readStore()
  const map = {
    maintenance: 'maintenance',
    waitingList: 'waitingList',
    visitor: 'visitors',
    inspection: 'inspections',
    event: 'events',
    agreement: 'agreements',
    accreditation: 'accreditations',
    communication: 'communications',
  }
  const key = map[type]
  if (!key || !store[key]) return store

  const index = findIndexByIdOrKey(store[key], id)
  if (index >= 0) {
    store[key][index] = { ...(store[key][index] || {}), ...(entry || {}) }
    await writeStore(store)
  }
  return store
}

async function deleteInStore(type, id) {
  const store = await readStore()
  const map = {
    maintenance: 'maintenance',
    waitingList: 'waitingList',
    visitor: 'visitors',
    inspection: 'inspections',
    event: 'events',
    agreement: 'agreements',
    accreditation: 'accreditations',
    communication: 'communications',
  }
  const key = map[type]
  if (!key || !store[key]) return store

  const index = findIndexByIdOrKey(store[key], id)
  if (index >= 0) {
    store[key].splice(index, 1)
    await writeStore(store)
  }
  return store
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { role } = await getAuthenticatedRequestContext(request)
    const type = body.type
    const id = body.id
    const entry = body.entry || {}

    if (!type || !id) return Response.json({ error: 'type and id required' }, { status: 400 })
    if (!canAccessResource(role, 'studentHub', 'write', type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (supabaseAdmin) {
      const result = await updateInSupabase(type, id, entry)
      if (result && result.error) return Response.json({ error: result.error?.message || 'Update failed' }, { status: 500 })
      if (result) return Response.json(result)
    }

    const store = await updateInStore(type, id, entry)
    return Response.json(store)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json()
    const { role } = await getAuthenticatedRequestContext(request)
    const type = body.type
    const id = body.id

    if (!type || !id) return Response.json({ error: 'type and id required' }, { status: 400 })
    if (!canAccessResource(role, 'studentHub', 'write', type)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (supabaseAdmin) {
      const result = await deleteFromSupabase(type, id)
      if (result && result.error) return Response.json({ error: result.error?.message || 'Delete failed' }, { status: 500 })
      if (result) return Response.json(result)
    }

    const store = await deleteInStore(type, id)
    return Response.json(store)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { role } = await getAuthenticatedRequestContext(req)
    if (!canAccessResource(role, 'studentHub', 'read')) {
      return Response.json({ maintenance: [], waitingList: [], visitors: [], inspections: [], events: [], agreements: [], accreditations: [] }, { status: 403 })
    }

    const supabaseData = await readFromSupabase();
    if (supabaseData) {
      return Response.json(supabaseData);
    }
    const store = await readStore();
    return Response.json(store);
  } catch (error) {
    const store = await readStore();
    return Response.json(store);
  }
}

export async function POST(request) {
  const body = await request.json();

  try {
    const { role } = await getAuthenticatedRequestContext(request)
    const normalizedType = body.type || 'maintenance'
    if (!canAccessResource(role, 'studentHub', 'write', normalizedType)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabaseData = await writeToSupabase(normalizedType, body.entry);
    if (supabaseData) {
      return Response.json(supabaseData, { status: 201 });
    }
  } catch (error) {
    console.warn('Supabase student hub write failed, falling back to file storage', error);
  }

  const store = await readStore();

  if (body.type === 'maintenance') {
    const nextEntry = {
      id: Date.now(),
      title: body.entry?.title || 'Maintenance',
      status: 'Open',
      owner: 'Student Support',
    };
    store.maintenance = [nextEntry, ...(store.maintenance || [])];
  }

  if (body.type === 'waitingList') {
    const nextEntry = {
      name: body.entry?.name || 'Student',
      course: body.entry?.course || 'Unknown',
      budget: body.entry?.budget || 'R6,500',
      queue: (store.waitingList?.length || 0) + 4,
    };
    store.waitingList = [nextEntry, ...(store.waitingList || [])];
  }

  if (body.type === 'visitor') {
    const nextEntry = {
      name: body.entry?.name || 'Guest',
      purpose: body.entry?.purpose || 'Visit',
      status: 'Pending',
      overnight: Boolean(body.entry?.overnight),
    };
    store.visitors = [nextEntry, ...(store.visitors || [])];
  }

  if (body.type === 'inspection') {
    const nextEntry = {
      title: body.entry?.title || 'Inspection',
      date: body.entry?.date || 'TBD',
      status: 'Scheduled',
    };
    store.inspections = [nextEntry, ...(store.inspections || [])];
  }

  if (body.type === 'event') {
    const nextEntry = {
      title: body.entry?.title || 'Event',
      date: body.entry?.date || 'TBD',
      time: body.entry?.time || 'TBD',
      attendees: Number(body.entry?.attendees || body.entry?.capacity || 18),
      capacity: Number(body.entry?.capacity || body.entry?.attendees || 18),
      category: body.entry?.category || 'General',
      host: body.entry?.host || 'Residence Team',
      location: body.entry?.location || 'On campus',
      description: body.entry?.description || '',
      status: body.entry?.status || 'Open',
      featured: Boolean(body.entry?.featured),
    };
    store.events = [nextEntry, ...(store.events || [])];
  }

  if (body.type === 'agreement') {
    const nextEntry = {
      title: body.entry?.title || 'Lease agreement',
      party: body.entry?.party || 'Student & Owner',
      status: body.entry?.status || 'Pending',
    };
    store.agreements = [nextEntry, ...(store.agreements || [])];
    store.auditTrail = [{ action: `Lease updated: ${nextEntry.title}`, detail: `${nextEntry.party} • ${nextEntry.status}` }, ...(store.auditTrail || [])];
  }

  if (body.type === 'accreditation') {
    const nextEntry = {
      title: body.entry?.title || 'Accreditation',
      status: body.entry?.status || 'Pending',
    };
    store.accreditations = [nextEntry, ...(store.accreditations || [])];
    store.auditTrail = [{ action: `Accreditation updated: ${nextEntry.title}`, detail: nextEntry.status }, ...(store.auditTrail || [])];
  }

  if (body.type === 'parentPortal') {
    const nextEntry = {
      title: body.entry?.title || 'Parent statement',
      amount: body.entry?.amount || 'R0',
      status: body.entry?.status || 'Sent',
    };
    store.parentPortal = [nextEntry, ...(store.parentPortal || [])];
    store.auditTrail = [{ action: `Parent update: ${nextEntry.title}`, detail: `${nextEntry.amount} • ${nextEntry.status}` }, ...(store.auditTrail || [])];
  }

  if (body.type === 'communication') {
    const nextEntry = {
      title: body.entry?.title || 'Resident update',
      type: body.entry?.type || 'Support ticket',
      detail: body.entry?.detail || '',
      priority: body.entry?.priority || 'Normal',
    };
    store.communications = [nextEntry, ...(store.communications || [])];
    store.auditTrail = [{ action: `Communication update: ${nextEntry.title}`, detail: `${nextEntry.type} • ${nextEntry.priority}` }, ...(store.auditTrail || [])];
  }

  if (body.type === 'invoice') {
    const nextEntry = {
      title: body.entry?.title || 'Invoice',
      amount: body.entry?.amount || 'R0',
      dueDate: body.entry?.dueDate || 'TBD',
      status: body.entry?.status || 'Pending',
    };
    store.invoices = [nextEntry, ...(store.invoices || [])];
    store.auditTrail = [{ action: `Invoice update: ${nextEntry.title}`, detail: `${nextEntry.amount} • ${nextEntry.status}` }, ...(store.auditTrail || [])];
  }

  if (body.type === 'event') {
    const nextEntry = {
      title: body.entry?.title || 'Event',
      date: body.entry?.date || 'TBD',
      time: body.entry?.time || 'TBD',
      attendees: Number(body.entry?.attendees || body.entry?.capacity || 18),
      capacity: Number(body.entry?.capacity || body.entry?.attendees || 18),
      category: body.entry?.category || 'General',
      host: body.entry?.host || 'Residence Team',
      location: body.entry?.location || 'On campus',
      description: body.entry?.description || '',
      status: body.entry?.status || 'Open',
      featured: Boolean(body.entry?.featured),
    };
    store.events = [nextEntry, ...(store.events || [])];
    store.auditTrail = [{ action: `Event created: ${nextEntry.title}`, detail: `${nextEntry.category} • ${nextEntry.date}` }, ...(store.auditTrail || [])];
  }

  if (body.type === 'attendance') {
    const nextEntry = {
      eventTitle: body.entry?.eventTitle || 'Event',
      status: body.entry?.status || 'Registered',
    };
    store.attendance = [nextEntry, ...(store.attendance || [])];
    store.loyalty = {
      points: (store.loyalty?.points || 0) + 50,
      activity: [{ title: 'RSVP confirmed', detail: '+50 pts' }, ...(store.loyalty?.activity || [])],
    };
  }

  if (body.type === 'loyalty') {
    const nextEntry = {
      title: body.entry?.title || 'Activity',
      detail: body.entry?.detail || '+0 pts',
    };
    store.loyalty = {
      points: (store.loyalty?.points || 0) + Number(body.entry?.points || 0),
      activity: [nextEntry, ...(store.loyalty?.activity || [])],
    };
  }

  await writeStore(store);
  return Response.json(store, { status: 201 });
}
