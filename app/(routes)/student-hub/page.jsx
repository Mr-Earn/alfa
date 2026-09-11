'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BadgeCheck, BellRing, Building2, CalendarDays, Clock3, FileText, Gift, GraduationCap, MapPin, MessageCircle, ScanLine, ShieldAlert, ShieldCheck, Sparkles, Store, Users, Wallet, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAuthenticatedRequestHeaders, normalizeRole } from '@/lib/permissions';
import useSupabaseUser from '@/utils/supabase/useUser';

const recommendedListings = [
  {
    name: 'Riverview Residence',
    campus: 'UJ Bunting Road',
    match: 96,
    rent: 'R6,800',
    tag: 'NSFAS friendly',
  },
  {
    name: 'Campus Nest',
    campus: 'Wits Braamfontein',
    match: 91,
    rent: 'R5,900',
    tag: 'Study-focused',
  },
  {
    name: 'North Gate Studios',
    campus: 'UCT Upper Campus',
    match: 88,
    rent: 'R7,200',
    tag: 'Private room',
  },
];

const transportOptions = [
  { label: 'Walking time', value: '7 min' },
  { label: 'Cycling time', value: '12 min' },
  { label: 'Shuttle available', value: 'Every 15 min' },
  { label: 'Campus distance', value: '650m' },
];

const maintenanceSeed = [
  { id: 1, title: 'Wi-Fi outage', status: 'In Progress', owner: 'Facilities' },
  { id: 2, title: 'Broken desk drawer', status: 'Open', owner: 'Housekeeping' },
];

const waitingListSeed = [
  { name: 'Lerato M.', course: 'BCom Accounting', budget: 'R7,000', queue: 3 },
  { name: 'Sipho K.', course: 'Mechanical Engineering', budget: 'R8,200', queue: 6 },
];

const marketplaceItems = [
  { title: 'Laptop stand', price: 'R180', tag: 'Furniture' },
  { title: 'Engineering calculator', price: 'R320', tag: 'Study material' },
];

const communities = [
  { name: 'UJ Students', members: '3.2k' },
  { name: 'NSFAS Support Circle', members: '1.1k' },
  { name: 'Wits Residences', members: '2.4k' },
];

const assistantActions = [
  'Search accommodation using budget and campus filters',
  'Explain lease terms and payment expectations',
  'Guide students on NSFAS eligibility and documents',
];

const verificationLevels = [
  { level: 'Basic Verification', status: 'Completed' },
  { level: 'University Verified', status: 'Pending review' },
  { level: 'NSFAS Verified', status: 'Ready' },
  { level: 'Premium Verified', status: 'Available' },
];

const documentItems = [
  'Lease agreement',
  'NSFAS supporting documents',
  'Proof of registration',
  'Accreditation certificate',
];

const priorityRoadmap = [
  { tier: 'Must Have', items: ['Accommodation assignment', 'NSFAS accreditation', 'Lease signing', 'Ratings & reviews'] },
  { tier: 'Advanced', items: ['Roommate matching', 'Maintenance management', 'Waiting lists', 'Maps integration'] },
  { tier: 'Enterprise', items: ['AI recommendations', 'Fraud detection', 'BI dashboards', 'Parent portal'] },
];

const visitorSeed = [
  { name: 'Mpho L.', purpose: 'Family visit', status: 'Approved', overnight: false },
  { name: 'Sizwe T.', purpose: 'Study group', status: 'Pending', overnight: true },
];

const inspectionSeed = [
  { title: 'Move-in inspection', date: 'Aug 10', status: 'Scheduled' },
  { title: 'Mid-term inspection', date: 'Sep 14', status: 'Planned' },
];

const emergencyContacts = [
  { name: 'Campus Security', phone: '0800 555 123' },
  { name: 'Residence Manager', phone: '071 222 4444' },
  { name: 'Medical Support', phone: '082 900 0100' },
];

const eventSeed = [
  { title: 'Orientation Mixer', date: 'Aug 12', attendees: 42 },
  { title: 'Residence Q&A', date: 'Aug 22', attendees: 29 },
];

const roleFeatureMap = {
  student: ['recommendations', 'roommate', 'transport', 'nsfas', 'maintenance', 'waitingList', 'marketplace', 'community', 'assistant', 'verification', 'loyalty'],
  agent: ['assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'verification'],
  owner: ['assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'verification'],
  university: ['assistant', 'visitor', 'inspections', 'events', 'communications', 'agreements', 'accreditations', 'verification'],
  admin: ['recommendations', 'roommate', 'transport', 'nsfas', 'maintenance', 'waitingList', 'marketplace', 'community', 'assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'agreements', 'accreditations', 'verification', 'loyalty'],
};

export default function StudentHubPage() {
  const user = useSupabaseUser();
  const role = useMemo(() => normalizeRole(user?.user_metadata?.role || user?.role || 'student'), [user]);
  const visibleSections = useMemo(() => roleFeatureMap[role] || roleFeatureMap.student, [role]);
  const roleLabel = {
    student: 'Student',
    agent: 'Agent',
    owner: 'Property Owner',
    university: 'University',
    admin: 'Admin',
  }[role] || 'Student';

  const [roommatePrefs, setRoommatePrefs] = useState({
    gender: 'No preference',
    smoking: 'No smoking',
    study: 'Quiet evenings',
    language: 'English',
  });
  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'Maintenance', description: '' });
  const [maintenanceRequests, setMaintenanceRequests] = useState(maintenanceSeed);
  const [waitingListForm, setWaitingListForm] = useState({ name: '', course: '', budget: '' });
  const [waitingList, setWaitingList] = useState(waitingListSeed);
  const [visitorForm, setVisitorForm] = useState({ name: '', purpose: '', overnight: false });
  const [visitors, setVisitors] = useState(visitorSeed);
  const [checkInStatus, setCheckInStatus] = useState('Ready for move-in');
  const [inspectionForm, setInspectionForm] = useState({ title: 'Move-in inspection', date: '2026-08-10' });
  const [inspections, setInspections] = useState(inspectionSeed);
  const [eventForm, setEventForm] = useState({ title: '', date: '', category: 'Orientation' });
  const [events, setEvents] = useState(eventSeed);
  const [agreementForm, setAgreementForm] = useState({ title: 'Lease agreement', party: 'Student & Owner', status: 'Pending' });
  const [agreements, setAgreements] = useState([]);
  const [accreditationForm, setAccreditationForm] = useState({ title: 'University accreditation', status: 'Pending' });
  const [accreditations, setAccreditations] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [parentPortalForm, setParentPortalForm] = useState({ title: '', amount: '', status: 'Sent' });
  const [parentPortalItems, setParentPortalItems] = useState([]);
  const [communicationForm, setCommunicationForm] = useState({ title: '', type: 'Support ticket', detail: '', priority: 'Normal' });
  const [communications, setCommunications] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({ title: '', amount: '', dueDate: '', status: 'Pending' });
  const [invoices, setInvoices] = useState([]);
  const [loyalty, setLoyalty] = useState({ points: 1240, activity: [] });
  const [attendanceEntries, setAttendanceEntries] = useState([]);

  const getStudentHubHeaders = async () => {
    return getAuthenticatedRequestHeaders(normalizeRole(user?.user_metadata?.role || user?.role || 'student'));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/student-hub', {
          headers: await getStudentHubHeaders(),
        });
        const data = await response.json();
        if (data?.maintenance) setMaintenanceRequests(data.maintenance);
        if (data?.waitingList) setWaitingList(data.waitingList);
        if (data?.visitors) setVisitors(data.visitors);
        if (data?.inspections) setInspections(data.inspections);
        if (data?.events) setEvents(data.events);
        if (data?.agreements) setAgreements(data.agreements);
        if (data?.accreditations) setAccreditations(data.accreditations);
        if (data?.auditTrail) setAuditTrail(data.auditTrail);
        if (data?.parentPortal) setParentPortalItems(data.parentPortal);
        if (data?.communications) setCommunications(data.communications);
        if (data?.invoices) setInvoices(data.invoices);
        if (data?.loyalty) setLoyalty(data.loyalty);
        if (data?.attendance) setAttendanceEntries(data.attendance);
      } catch (error) {
        console.warn('Unable to load student hub data', error);
      }
    };

    loadData();
  }, []);

  const compatibilityScore = useMemo(() => {
    let score = 74;
    if (roommatePrefs.gender === 'No preference') score += 4;
    if (roommatePrefs.smoking === 'No smoking') score += 8;
    if (roommatePrefs.study === 'Quiet evenings') score += 6;
    if (roommatePrefs.language === 'English') score += 4;
    return Math.min(98, score);
  }, [roommatePrefs]);

  const addMaintenanceRequest = async (event) => {
    event.preventDefault();
    if (!maintenanceForm.description.trim()) return;

    const nextEntry = {
      title: maintenanceForm.type,
      description: maintenanceForm.description,
    };

    const response = await fetch('/api/student-hub', {
      method: 'POST',
      headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'maintenance', entry: nextEntry }),
    });

    if (response.ok) {
      const data = await response.json();
      setMaintenanceRequests(data.maintenance || []);
      setMaintenanceForm({ type: 'Maintenance', description: '' });
    }
  };

  const addWaitingListEntry = async (event) => {
    event.preventDefault();
    if (!waitingListForm.name.trim() || !waitingListForm.course.trim()) return;

    const response = await fetch('/api/student-hub', {
      method: 'POST',
      headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'waitingList', entry: waitingListForm }),
    });

    if (response.ok) {
      const data = await response.json();
      setWaitingList(data.waitingList || []);
      setWaitingListForm({ name: '', course: '', budget: '' });
    }
  };

  const addVisitorEntry = async (event) => {
    event.preventDefault();
    if (!visitorForm.name.trim() || !visitorForm.purpose.trim()) return;

    const response = await fetch('/api/student-hub', {
      method: 'POST',
      headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'visitor', entry: visitorForm }),
    });

    if (response.ok) {
      const data = await response.json();
      setVisitors(data.visitors || []);
      setVisitorForm({ name: '', purpose: '', overnight: false });
    }
  };

  const addInspectionEntry = async (event) => {
    event.preventDefault();
    if (!inspectionForm.title.trim() || !inspectionForm.date.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'inspection', entry: inspectionForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setInspections(data.inspections || []);
        setInspectionForm({ title: 'Move-in inspection', date: '2026-08-10' });
      }
    } catch (error) {
      console.warn('Unable to save inspection', error);
    }
  };

  const addEventEntry = async (event) => {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event', entry: { ...eventForm, attendees: 18 } }),
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setEventForm({ title: '', date: '', category: 'Orientation' });
      }
    } catch (error) {
      console.warn('Unable to save event', error);
    }
  };

  const addAttendanceEntry = async (eventTitle, status) => {
    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'attendance', entry: { eventTitle, status } }),
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.warn('Unable to save attendance', error);
    }
  };

  const addAgreementEntry = async (event) => {
    event.preventDefault();
    if (!agreementForm.title.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'agreement', entry: agreementForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setAgreements(data.agreements || []);
        setAuditTrail(data.auditTrail || []);
      }
    } catch (error) {
      console.warn('Unable to save agreement', error);
    }
  };

  const addAccreditationEntry = async (event) => {
    event.preventDefault();
    if (!accreditationForm.title.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'accreditation', entry: accreditationForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setAccreditations(data.accreditations || []);
        setAuditTrail(data.auditTrail || []);
      }
    } catch (error) {
      console.warn('Unable to save accreditation', error);
    }
  };

  const addLoyaltyEntry = async (title, points, detail) => {
    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'loyalty', entry: { title, points, detail } }),
      });

      if (response.ok) {
        const data = await response.json();
        setLoyalty(data.loyalty || { points: 0, activity: [] });
      }
    } catch (error) {
      console.warn('Unable to save loyalty activity', error);
    }
  };

  const addParentPortalEntry = async (event) => {
    event.preventDefault();
    if (!parentPortalForm.title.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'parentPortal', entry: parentPortalForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setParentPortalItems(data.parentPortal || []);
        setAuditTrail(data.auditTrail || []);
        setParentPortalForm({ title: '', amount: '', status: 'Sent' });
      }
    } catch (error) {
      console.warn('Unable to save parent portal update', error);
    }
  };

  const addCommunicationEntry = async (event) => {
    event.preventDefault();
    if (!communicationForm.title.trim() || !communicationForm.detail.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'communication', entry: communicationForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setCommunications(data.communications || []);
        setAuditTrail(data.auditTrail || []);
        setCommunicationForm({ title: '', type: 'Support ticket', detail: '', priority: 'Normal' });
      }
    } catch (error) {
      console.warn('Unable to save communication update', error);
    }
  };

  const addInvoiceEntry = async (event) => {
    event.preventDefault();
    if (!invoiceForm.title.trim() || !invoiceForm.amount.trim()) return;

    try {
      const response = await fetch('/api/student-hub', {
        method: 'POST',
        headers: { ...(await getStudentHubHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', entry: invoiceForm }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setAuditTrail(data.auditTrail || []);
        setInvoiceForm({ title: '', amount: '', dueDate: '', status: 'Pending' });
      }
    } catch (error) {
      console.warn('Unable to save invoice', error);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10">
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
              <Sparkles className="h-4 w-4" />
              Commercial-grade student housing platform
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Launch a smarter student housing experience with AI matching, NSFAS visibility, and campus-ready operations.
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              This workspace now includes an advanced student-hub experience for recommendations, roommate matching, maintenance management, waiting lists, and community engagement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button className="bg-white text-slate-950 hover:bg-slate-100">Browse listings</Button>
            </Link>
            <Link href="/user">
              <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                Open student dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'AI recommendations', value: '96% match confidence', icon: GraduationCap },
          { title: 'NSFAS readiness', value: 'Funding visibility', icon: Wallet },
          { title: 'Fast support', value: 'Maintenance and incidents', icon: ShieldCheck },
          { title: 'Community growth', value: 'Groups and events', icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-slate-100 p-2">
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.value}</p>
            </div>
          );
        })}
      </section>

      {(visibleSections.includes('recommendations') || visibleSections.includes('roommate') || visibleSections.includes('transport') || visibleSections.includes('nsfas')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">AI accommodation matching</p>
              <h2 className="text-xl font-semibold">Recommended homes for your student profile</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Updated today</div>
          </div>
          <div className="space-y-3">
            {recommendedListings.map((listing) => (
              <div key={listing.name} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{listing.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{listing.tag}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{listing.campus}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{listing.match}% match</div>
                  <div className="text-sm font-medium text-slate-700">{listing.rent}/month</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Smart roommate matching</p>
              <h2 className="text-xl font-semibold">Find a compatible roommate</h2>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Gender preference</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={roommatePrefs.gender}
              onChange={(event) => setRoommatePrefs({ ...roommatePrefs, gender: event.target.value })}
            >
              <option>No preference</option>
              <option>Female only</option>
              <option>Male only</option>
            </select>

            <label className="text-sm font-medium text-slate-700">Smoking preference</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={roommatePrefs.smoking}
              onChange={(event) => setRoommatePrefs({ ...roommatePrefs, smoking: event.target.value })}
            >
              <option>No smoking</option>
              <option>Smoking okay</option>
            </select>

            <label className="text-sm font-medium text-slate-700">Study habits</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={roommatePrefs.study}
              onChange={(event) => setRoommatePrefs({ ...roommatePrefs, study: event.target.value })}
            >
              <option>Quiet evenings</option>
              <option>Social nights</option>
              <option>Flexible</option>
            </select>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Compatibility score</span>
                <span className="text-lg font-semibold text-slate-950">{compatibilityScore}%</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Strong match for shared study habits and respectful living standards.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Campus distance & transport</p>
              <h2 className="text-xl font-semibold">Distance-aware search filters</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {transportOptions.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">NSFAS financial management</p>
              <h2 className="text-xl font-semibold">Funding snapshot</h2>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-800">Funding status</span>
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">Approved</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-emerald-900">R12,400 available</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Received</p>
                <p className="mt-1 font-semibold">R9,000</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Outstanding</p>
                <p className="mt-1 font-semibold">R3,400</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Student maintenance portal</p>
              <h2 className="text-xl font-semibold">Manage support requests</h2>
            </div>
          </div>
          <form onSubmit={addMaintenanceRequest} className="mb-5 space-y-3 rounded-2xl border border-slate-200 p-4">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={maintenanceForm.type}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, type: event.target.value })}
            >
              <option>Maintenance</option>
              <option>Damage report</option>
              <option>Security incident</option>
              <option>Cleaning request</option>
            </select>
            <Textarea
              placeholder="Describe the issue and any urgency"
              value={maintenanceForm.description}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })}
            />
            <Button type="submit">Submit request</Button>
          </form>
          <div className="space-y-3">
            {maintenanceRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{request.title}</p>
                  <p className="text-sm text-slate-500">Assigned to {request.owner}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{request.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Accommodation waiting list</p>
              <h2 className="text-xl font-semibold">Join the queue for future vacancies</h2>
            </div>
          </div>
          <form onSubmit={addWaitingListEntry} className="mb-5 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input
              placeholder="Your name"
              value={waitingListForm.name}
              onChange={(event) => setWaitingListForm({ ...waitingListForm, name: event.target.value })}
            />
            <Input
              placeholder="Course or faculty"
              value={waitingListForm.course}
              onChange={(event) => setWaitingListForm({ ...waitingListForm, course: event.target.value })}
            />
            <Input
              placeholder="Preferred budget"
              value={waitingListForm.budget}
              onChange={(event) => setWaitingListForm({ ...waitingListForm, budget: event.target.value })}
            />
            <Button type="submit">Join waiting list</Button>
          </form>
          <div className="space-y-3">
            {waitingList.map((person) => (
              <div key={`${person.name}-${person.queue}`} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{person.name}</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">#{person.queue}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{person.course} • Budget {person.budget}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
        </>
      )}

      {(visibleSections.includes('marketplace') || visibleSections.includes('community')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Store className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Marketplace module</p>
              <h2 className="text-xl font-semibold">Browse campus essentials</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {marketplaceItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.tag}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{item.price}</span>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Student community platform</p>
              <h2 className="text-xl font-semibold">Join local groups and events</h2>
            </div>
          </div>
          <div className="space-y-3">
            {communities.map((group) => (
              <div key={group.name} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-slate-500">{group.members} members</p>
                </div>
                <Button variant="outline" size="sm">Join</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">AI assistant & fraud intelligence</p>
              <h2 className="text-xl font-semibold">Support students and reduce risk with smart automation</h2>
            </div>
          </div>
          <div className="space-y-3">
            {assistantActions.map((action) => (
              <div key={action} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {action}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Fraud signals flagged: 3 suspicious reviews, 1 duplicate application, 2 unusual booking patterns.
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Verification & document center</p>
              <h2 className="text-xl font-semibold">Show trust with badges, documents, and QR-based checks</h2>
            </div>
          </div>
          <div className="space-y-3">
            {verificationLevels.map((item) => (
              <div key={item.level} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <span className="font-medium text-slate-800">{item.level}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Available documents</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {documentItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
        </>
      )}

      {(visibleSections.includes('parentPortal') || visibleSections.includes('communications') || visibleSections.includes('invoices')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Parent portal & revenue management</p>
              <h2 className="text-xl font-semibold">Keep parents, sponsors, and owners aligned</h2>
            </div>
          </div>
          <form onSubmit={addParentPortalEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Statement title" value={parentPortalForm.title} onChange={(event) => setParentPortalForm({ ...parentPortalForm, title: event.target.value })} />
            <Input placeholder="Amount" value={parentPortalForm.amount} onChange={(event) => setParentPortalForm({ ...parentPortalForm, amount: event.target.value })} />
            <Input placeholder="Status" value={parentPortalForm.status} onChange={(event) => setParentPortalForm({ ...parentPortalForm, status: event.target.value })} />
            <Button type="submit">Send update</Button>
          </form>
          <div className="grid gap-3 sm:grid-cols-2">
            {parentPortalItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="mt-1 font-semibold text-slate-900">{item.amount}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Resident communications</p>
              <h2 className="text-xl font-semibold">Capture support tickets and staff announcements</h2>
            </div>
          </div>
          <form onSubmit={addCommunicationEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Title" value={communicationForm.title} onChange={(event) => setCommunicationForm({ ...communicationForm, title: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={communicationForm.type} onChange={(event) => setCommunicationForm({ ...communicationForm, type: event.target.value })}>
              <option>Support ticket</option>
              <option>Announcement</option>
              <option>Reminder</option>
            </select>
            <Textarea placeholder="Details" value={communicationForm.detail} onChange={(event) => setCommunicationForm({ ...communicationForm, detail: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={communicationForm.priority} onChange={(event) => setCommunicationForm({ ...communicationForm, priority: event.target.value })}>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
            <Button type="submit">Post update</Button>
          </form>
          <div className="space-y-3">
            {communications.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.priority}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.type}</p>
                <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Payments & invoices</p>
              <h2 className="text-xl font-semibold">Track rent, deposits, and outstanding balances</h2>
            </div>
          </div>
          <form onSubmit={addInvoiceEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Invoice title" value={invoiceForm.title} onChange={(event) => setInvoiceForm({ ...invoiceForm, title: event.target.value })} />
            <Input placeholder="Amount" value={invoiceForm.amount} onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} />
            <Input placeholder="Due date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })} />
            <Input placeholder="Status" value={invoiceForm.status} onChange={(event) => setInvoiceForm({ ...invoiceForm, status: event.target.value })} />
            <Button type="submit">Create invoice</Button>
          </form>
          <div className="space-y-3">
            {invoices.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.amount} • Due {item.dueDate}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Commercial rollout roadmap</p>
              <h2 className="text-xl font-semibold">Prioritize the next release phases</h2>
            </div>
          </div>
          <div className="space-y-3">
            {priorityRoadmap.map((group) => (
              <div key={group.tier} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{group.tier}</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
        </>
      )}

      {(visibleSections.includes('visitor') || visibleSections.includes('inspections') || visibleSections.includes('events')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Visitor management</p>
              <h2 className="text-xl font-semibold">Register visitors and approve overnight access</h2>
            </div>
          </div>
          <form onSubmit={addVisitorEntry} className="mb-5 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Visitor name" value={visitorForm.name} onChange={(event) => setVisitorForm({ ...visitorForm, name: event.target.value })} />
            <Input placeholder="Purpose of visit" value={visitorForm.purpose} onChange={(event) => setVisitorForm({ ...visitorForm, purpose: event.target.value })} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={visitorForm.overnight} onChange={() => setVisitorForm({ ...visitorForm, overnight: !visitorForm.overnight })} />
              Request overnight approval
            </label>
            <Button type="submit">Register visitor</Button>
          </form>
          <div className="space-y-3">
            {visitors.map((visitor) => (
              <div key={`${visitor.name}-${visitor.purpose}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{visitor.name}</p>
                  <p className="text-sm text-slate-500">{visitor.purpose}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{visitor.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Student check-in / check-out</p>
              <h2 className="text-xl font-semibold">Digital move-in and move-out with verification</h2>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Current status</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{checkInStatus}</span>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>• Room inspection completed</p>
              <p>• Inventory verified</p>
              <p>• Key handover recorded</p>
            </div>
            <Button className="mt-4" onClick={() => setCheckInStatus('Move-out verified')}>Complete check-out</Button>
          </div>
        </div>
      </section>
        </>
      )}

      {(visibleSections.includes('agreements') || visibleSections.includes('accreditations')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Emergency & safety</p>
              <h2 className="text-xl font-semibold">Report incidents and access support quickly</h2>
            </div>
          </div>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Panic button available</p>
              <p className="text-sm text-red-700">Emergency contacts and GPS location sharing are enabled.</p>
            </div>
          </div>
          <div className="space-y-3">
            {emergencyContacts.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.phone}</p>
                </div>
                <Button variant="outline" size="sm">Call</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Inspection & event management</p>
              <h2 className="text-xl font-semibold">Schedule inspections and student activities</h2>
            </div>
          </div>
          <form onSubmit={addInspectionEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Inspection title" value={inspectionForm.title} onChange={(event) => setInspectionForm({ ...inspectionForm, title: event.target.value })} />
            <Input placeholder="Date" value={inspectionForm.date} onChange={(event) => setInspectionForm({ ...inspectionForm, date: event.target.value })} />
            <Button type="submit">Schedule inspection</Button>
          </form>
          <div className="space-y-3">
            {inspections.map((item) => (
              <div key={`${item.title}-${item.date}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.date}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
          <form onSubmit={addEventEntry} className="mt-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Event title" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} />
            <Input placeholder="Event date" value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} />
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={eventForm.category} onChange={(event) => setEventForm({ ...eventForm, category: event.target.value })}>
              <option>Orientation</option>
              <option>Meeting</option>
              <option>Activity</option>
            </select>
            <Button type="submit">Create event</Button>
          </form>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div key={`${event.title}-${event.date}`} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-slate-500">{event.date} • {event.category || 'Activity'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{event.attendees} RSVP</span>
                  <Button size="sm" variant="outline" onClick={() => addAttendanceEntry(event.title, 'Registered')}>RSVP</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Lease & document workflow</p>
              <h2 className="text-xl font-semibold">Track signatures, approvals, and compliance records</h2>
            </div>
          </div>
          <form onSubmit={addAgreementEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Document title" value={agreementForm.title} onChange={(event) => setAgreementForm({ ...agreementForm, title: event.target.value })} />
            <Input placeholder="Party" value={agreementForm.party} onChange={(event) => setAgreementForm({ ...agreementForm, party: event.target.value })} />
            <Input placeholder="Status" value={agreementForm.status} onChange={(event) => setAgreementForm({ ...agreementForm, status: event.target.value })} />
            <Button type="submit">Save agreement</Button>
          </form>
          <div className="space-y-3">
            {agreements.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.party}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-500">Accreditation & audit trail</p>
              <h2 className="text-xl font-semibold">Store verification records and event history</h2>
            </div>
          </div>
          <form onSubmit={addAccreditationEntry} className="mb-4 space-y-3 rounded-2xl border border-slate-200 p-4">
            <Input placeholder="Accreditation title" value={accreditationForm.title} onChange={(event) => setAccreditationForm({ ...accreditationForm, title: event.target.value })} />
            <Input placeholder="Status" value={accreditationForm.status} onChange={(event) => setAccreditationForm({ ...accreditationForm, status: event.target.value })} />
            <Button type="submit">Save accreditation</Button>
          </form>
          <div className="space-y-3">
            {accreditations.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Audit trail</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {auditTrail.map((item, index) => (
                <li key={`${item.action}-${index}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="font-medium text-slate-800">{item.action}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
        </>
      )}

      {(visibleSections.includes('loyalty')) && (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Reward & loyalty program</p>
                <h2 className="text-xl font-semibold">Earn points for referrals, reviews, and on-time rent</h2>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <Gift className="h-5 w-5 text-slate-700" />
                <div>
                  <p className="text-sm text-slate-500">Current points</p>
                  <p className="text-lg font-semibold text-slate-900">{loyalty.points} pts</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">How students earn points</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  <li>• Complete profiles for 100 pts</li>
                  <li>• Leave reviews for 150 pts</li>
                  <li>• Pay rent on time for 300 pts</li>
                  <li>• Refer friends for 250 pts</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Recent activity</p>
                <div className="mt-2 space-y-2">
                  {loyalty.activity.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {item.title} • {item.detail}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => addLoyaltyEntry('Profile completed', 100, '+100 pts')}>Complete profile</Button>
                  <Button size="sm" variant="outline" onClick={() => addLoyaltyEntry('Review submitted', 150, '+150 pts')}>Leave review</Button>
                  <Button size="sm" variant="outline" onClick={() => addLoyaltyEntry('Rent paid on time', 300, '+300 pts')}>Pay rent</Button>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Attendance</p>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {attendanceEntries.map((item, index) => (
                  <div key={`${item.eventTitle}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    {item.eventTitle} • {item.status}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
