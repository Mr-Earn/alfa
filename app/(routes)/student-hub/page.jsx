'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, BellRing, CalendarDays, Clock3, FileText, GraduationCap, MapPin, MessageCircle, ShieldAlert, Sparkles, Store, Users, Wallet, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAuthenticatedRequestHeaders, normalizeRole } from '@/lib/permissions';
import useSupabaseUser from '@/utils/supabase/useUser';

const assistantActions = [
  'Search accommodation using budget and campus filters',
  'Explain lease terms and payment expectations',
  'Guide students on NSFAS eligibility and documents',
];

const roleFeatureMap = {
  student: ['recommendations', 'roommate', 'transport', 'nsfas', 'maintenance', 'waitingList', 'marketplace', 'community', 'assistant', 'verification', 'loyalty'],
  agent: ['assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'verification'],
  owner: ['assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'verification'],
  university: ['assistant', 'visitor', 'inspections', 'events', 'communications', 'agreements', 'accreditations', 'verification'],
  admin: ['recommendations', 'roommate', 'transport', 'nsfas', 'maintenance', 'waitingList', 'marketplace', 'community', 'assistant', 'visitor', 'inspections', 'events', 'parentPortal', 'communications', 'invoices', 'agreements', 'accreditations', 'verification', 'loyalty'],
};

const hubPages = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'housing', label: 'Housing', features: ['recommendations', 'roommate', 'transport', 'nsfas'] },
  { slug: 'support', label: 'Support', features: ['maintenance', 'waitingList'] },
  { slug: 'community', label: 'Community', features: ['marketplace', 'community', 'assistant', 'verification'] },
  { slug: 'finance', label: 'Finance', features: ['parentPortal', 'communications', 'invoices'] },
  { slug: 'residence', label: 'Residence', features: ['visitor', 'inspections', 'events'] },
  { slug: 'documents', label: 'Documents & safety', features: ['agreements', 'accreditations'] },
  { slug: 'rewards', label: 'Rewards', features: ['loyalty'] },
];

export default function StudentHubPage({ section = 'overview' }) {
  const user = useSupabaseUser();
  const role = useMemo(() => normalizeRole(user?.user_metadata?.role || user?.role || 'student'), [user]);
  const visibleSections = useMemo(() => roleFeatureMap[role] || roleFeatureMap.student, [role]);
  const availableHubPages = useMemo(() => hubPages.filter((page) => !page.features || page.features.some((feature) => visibleSections.includes(feature))), [visibleSections]);
  const currentPage = availableHubPages.find((page) => page.slug === section) || hubPages[0];
  const currentSection = currentPage.slug;
  const [roommatePrefs, setRoommatePrefs] = useState({
    gender: 'No preference',
    smoking: 'No smoking',
    study: 'Quiet evenings',
    language: 'English',
  });
  const [listings, setListings] = useState([]);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [dataStatus, setDataStatus] = useState({ hub: 'loading', listings: 'loading', marketplace: 'loading' });
  const [maintenanceForm, setMaintenanceForm] = useState({ type: 'Maintenance', description: '' });
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [waitingListForm, setWaitingListForm] = useState({ name: '', course: '', budget: '' });
  const [waitingList, setWaitingList] = useState([]);
  const [visitorForm, setVisitorForm] = useState({ name: '', purpose: '', overnight: false });
  const [visitors, setVisitors] = useState([]);
  const [inspectionForm, setInspectionForm] = useState({ title: 'Move-in inspection', date: '' });
  const [inspections, setInspections] = useState([]);
  const [eventForm, setEventForm] = useState({ title: '', date: '', category: 'Orientation' });
  const [events, setEvents] = useState([]);
  const [agreementForm, setAgreementForm] = useState({ title: 'Lease agreement', party: 'Student & Owner', status: 'Pending' });
  const [agreements, setAgreements] = useState([]);
  const [accreditationForm, setAccreditationForm] = useState({ title: 'University accreditation', status: 'Pending' });
  const [accreditations, setAccreditations] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [communicationForm, setCommunicationForm] = useState({ title: '', type: 'Support ticket', detail: '', priority: 'Normal' });
  const [communications, setCommunications] = useState([]);
  const parentPortalItems = [];
  const invoices = [];
  const hubEmptyMessage = (emptyMessage) => (
    dataStatus.hub === 'loading' ? 'Loading records...' :
      dataStatus.hub === 'unavailable' ? 'Could not load Student Hub data.' : emptyMessage
  );

  const getStudentHubHeaders = useCallback(async () => {
    return getAuthenticatedRequestHeaders(normalizeRole(user?.user_metadata?.role || user?.role || 'student'));
  }, [user?.user_metadata?.role, user?.role]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const headers = await getStudentHubHeaders();
        const [hubResponse, listingsResponse, marketplaceResponse] = await Promise.all([
          fetch('/api/student-hub', { headers }),
          fetch('/api/listings-public'),
          fetch('/api/marketplace', { headers }),
        ]);
        const [data, listingsData, marketplaceData] = await Promise.all([
          hubResponse.ok ? hubResponse.json() : {},
          listingsResponse.ok ? listingsResponse.json() : { listings: [] },
          marketplaceResponse.ok ? marketplaceResponse.json() : { items: [] },
        ]);
        setDataStatus({
          hub: hubResponse.ok ? 'loaded' : 'unavailable',
          listings: listingsResponse.ok ? 'loaded' : 'unavailable',
          marketplace: marketplaceResponse.ok ? 'loaded' : 'unavailable',
        });
        setListings(listingsData.listings || []);
        setMarketplaceItems(marketplaceData.items || []);
        if (data?.maintenance) setMaintenanceRequests(data.maintenance);
        if (data?.waitingList) setWaitingList(data.waitingList);
        if (data?.visitors) setVisitors(data.visitors);
        if (data?.inspections) setInspections(data.inspections);
        if (data?.events) setEvents(data.events);
        if (data?.agreements) setAgreements(data.agreements);
        if (data?.accreditations) setAccreditations(data.accreditations);
        if (data?.auditTrail) setAuditTrail(data.auditTrail);
        if (data?.communications) setCommunications(data.communications);
      } catch (error) {
        setDataStatus({ hub: 'unavailable', listings: 'unavailable', marketplace: 'unavailable' });
        console.warn('Unable to load student hub data', error);
      }
    };

    loadData();
  }, [getStudentHubHeaders]);

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
        body: JSON.stringify({ type: 'event', entry: { ...eventForm, attendees: 0 } }),
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

  return (
    <div className="space-y-8 p-6 md:p-10">
      <nav aria-label="Student Hub sections" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {availableHubPages.map((page) => (
          <Link key={page.slug} href={page.slug === 'overview' ? '/student-hub' : `/student-hub/${page.slug}`} aria-current={currentSection === page.slug ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${currentSection === page.slug ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {page.label}
          </Link>
        ))}
      </nav>
      {currentSection !== 'overview' && (
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">{currentPage.label}</h1>
          <p className="mt-1 text-sm text-slate-500">Your student housing workspace</p>
        </header>
      )}
      {currentSection === 'overview' && <>
      <section className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">
              <Sparkles className="h-4 w-4" />
              Student Hub
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Housing, support, and campus life in one place.
            </h1>
            <p className="text-sm text-slate-300 sm:text-base">
              Browse active accommodation, manage support requests, and follow residence updates.
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
          { title: 'Active listings', value: dataStatus.listings === 'loaded' ? `${listings.length} records` : dataStatus.listings === 'loading' ? 'Loading...' : 'Unavailable', icon: GraduationCap },
          { title: 'Maintenance requests', value: dataStatus.hub === 'loaded' ? `${maintenanceRequests.length} records` : dataStatus.hub === 'loading' ? 'Loading...' : 'Unavailable', icon: Wrench },
          { title: 'Residence events', value: dataStatus.hub === 'loaded' ? `${events.length} records` : dataStatus.hub === 'loading' ? 'Loading...' : 'Unavailable', icon: CalendarDays },
          { title: 'Communications', value: dataStatus.hub === 'loaded' ? `${communications.length} records` : dataStatus.hub === 'loading' ? 'Loading...' : 'Unavailable', icon: MessageCircle },
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
      </>}

      {currentSection === 'housing' && (visibleSections.includes('recommendations') || visibleSections.includes('roommate') || visibleSections.includes('transport') || visibleSections.includes('nsfas')) && (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">Available accommodation</p>
                <h2 className="text-xl font-semibold">Active student housing listings</h2>
            </div>
          </div>
          <div className="space-y-3">
            {listings.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{dataStatus.listings === 'loading' ? 'Loading active listings...' : dataStatus.listings === 'unavailable' ? 'Could not load accommodation listings.' : 'No active accommodation listings are available right now.'}</p>}
            {listings.map((listing) => (
              <div key={listing.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      <Link href={`/view-listing/${listing.id}`} className="hover:underline">
                        {listing.title}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{listing.propertyType || 'Accommodation'}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{[listing.address, listing.city].filter(Boolean).join(', ') || 'Location not provided'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-slate-700">{listing.price ? `R${Number(listing.price).toLocaleString()}/month` : 'Price not provided'}</div>
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
                <span className="text-sm font-semibold text-slate-600">Not available</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Roommate profiles and match records are not connected.</p>
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
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:col-span-2">Campus distance and transport estimates are not available for the current listings.</p>
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
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">No data</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-emerald-900">Funding details are not connected</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Received</p>
                <p className="mt-1 font-semibold">No data</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Outstanding</p>
                <p className="mt-1 font-semibold">No data</p>
              </div>
            </div>
          </div>
        </div>
      </section>

        </>
      )}

      {currentSection === 'support' && (visibleSections.includes('maintenance') || visibleSections.includes('waitingList')) && (
        <>
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
            {maintenanceRequests.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No maintenance requests have been submitted.')}</p>}
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
            {waitingList.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('The waiting list is empty.')}</p>}
          </div>
        </div>
      </section>
        </>
      )}

      {currentSection === 'community' && (visibleSections.includes('marketplace') || visibleSections.includes('community') || visibleSections.includes('assistant') || visibleSections.includes('verification')) && (
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
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{item.price}</span>
                  <span className="text-xs text-slate-500">{item.seller_name || 'Campus seller'}</span>
                </div>
              </div>
            ))}
            {marketplaceItems.length === 0 && <p className="text-sm text-slate-500 sm:col-span-2">{dataStatus.marketplace === 'loading' ? 'Loading marketplace items...' : dataStatus.marketplace === 'unavailable' ? 'Could not load marketplace items.' : 'No marketplace items are currently listed.'}</p>}
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
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Student groups are not available yet.</p>
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
            Fraud monitoring data is not connected.
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
              {accreditations.map((item, index) => (
                <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                  <span className="font-medium text-slate-800">{item.title}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </div>
              ))}
              {accreditations.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No accreditation records are available.')}</p>}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Available documents</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {agreements.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {item.title} · {item.status}
                </li>
              ))}
              {agreements.length === 0 && <li>{hubEmptyMessage('No agreement records are available.')}</li>}
            </ul>
          </div>
        </div>
      </section>
        </>
      )}

      {currentSection === 'finance' && (visibleSections.includes('parentPortal') || visibleSections.includes('communications') || visibleSections.includes('invoices')) && (
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
          <div className="grid gap-3 sm:grid-cols-2">
            {parentPortalItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="mt-1 font-semibold text-slate-900">{item.amount}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{item.status}</p>
              </div>
            ))}
            {parentPortalItems.length === 0 && <p className="text-sm text-slate-500">Parent statements are not connected to a data source.</p>}
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
            {invoices.length === 0 && <p className="text-sm text-slate-500">Invoices are not connected to a data source.</p>}
          </div>
        </div>

      </section>
        </>
      )}

      {currentSection === 'residence' && (visibleSections.includes('visitor') || visibleSections.includes('inspections') || visibleSections.includes('events')) && (
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
            {visitors.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No visitors have been registered.')}</p>}
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
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">No data</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">Check-in and check-out records are not connected to a data source.</p>
          </div>
        </div>
      </section>
        </>
      )}

      {currentSection === 'documents' && (visibleSections.includes('agreements') || visibleSections.includes('accreditations')) && (
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
              <p className="text-sm text-red-700">Emergency contact and location-sharing details are not configured.</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">No emergency contacts are configured.</p>
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
            {inspections.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No inspections have been scheduled.')}</p>}
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{event.attendees} attendees</span>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No events have been created.')}</p>}
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
            {agreements.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No agreement records are available.')}</p>}
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
            {accreditations.length === 0 && <p className="text-sm text-slate-500">{hubEmptyMessage('No accreditation records are available.')}</p>}
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
              {auditTrail.length === 0 && <li>{hubEmptyMessage('No audit records are available.')}</li>}
            </ul>
          </div>
        </div>
      </section>
        </>
      )}

      {currentSection === 'rewards' && visibleSections.includes('loyalty') && (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Rewards</p>
            <h2 className="mt-1 text-xl font-semibold">Rewards data is not connected</h2>
            <p className="mt-2 text-sm text-slate-600">Points, activity, and event attendance will appear here when a data source is configured.</p>
          </section>
        </>
      )}
    </div>
  );
}
