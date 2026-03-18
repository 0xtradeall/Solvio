"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, User } from 'lucide-react';

const CONTACTS_KEY = 'solvio_contacts';

interface Contact {
  id: string;
  name: string;
  address: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
      setContacts(saved);
    } catch {
      setContacts([]);
    }
  }, []);

  const saveContacts = (updated: Contact[]) => {
    setContacts(updated);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!name.trim() || !address.trim()) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      name: name.trim(),
      address: address.trim()
    };
    saveContacts([...contacts, newContact]);
    setName('');
    setAddress('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    saveContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm">Saved Solana wallet addresses</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <UserPlus size={16} /> Add Contact
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">New Contact</h2>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 outline-none focus:border-purple-400"
          />
          <input
            type="text"
            placeholder="Wallet Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-purple-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contacts yet. Add one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map(contact => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{contact.name}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {contact.address.slice(0, 8)}...{contact.address.slice(-6)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(contact.id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ nickname?: string; address?: string }>({});
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setContacts(getContacts());
  }, []);

  useEffect(() => {
    if (!connected && !walletAddress) {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [connected, walletAddress]);

  const refresh = () => {
    setContacts(getContacts());
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.nickname.trim()) errs.nickname = 'Name is required';
    if (!form.addressInput.trim()) {
      errs.address = 'Wallet address is required';
    } else if (!validateSolanaAddress(form.resolvedAddress)) {
      errs.address = form.snsName && !form.resolvedAddress
        ? 'Waiting for .sol name to resolve…'
        : 'Invalid Solana wallet address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const contact = {
      id: editingId ?? Date.now().toString(),
      nickname: form.nickname.trim(),
      address: form.resolvedAddress,
      snsName: form.snsName || undefined,
      note: form.note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveContact(contact);
    refresh();
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setForm({
      nickname: c.nickname,
      addressInput: c.snsName || c.address,
      resolvedAddress: c.address,
      snsName: c.snsName || '',
      note: c.note ?? '',
    });
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    deleteContact(id);
    setDeleteConfirm(null);
    refresh();
  };

  const handleSendPayment = (c: Contact) => {
    router.push(`/split?add=${encodeURIComponent(c.address)}&name=${encodeURIComponent(c.nickname)}`);
  };

  const handleUseInSplit = (c: Contact) => {
    router.push(`/split?add=${encodeURIComponent(c.address)}&name=${encodeURIComponent(c.nickname)}`);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  return (
    <div className="p-4 space-y-5 pb-20">
      <DevnetBanner />
      <div className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Saved Solana wallet addresses</p>
      </div>

      {/* Always show add form and contacts, even if not connected */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 font-medium text-sm">
              <Check size={16} /> Contact saved!
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-primary-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{editingId ? 'Edit Contact' : 'New Contact'}</h2>
                <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Name / Nickname *</label>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                  placeholder="e.g. Alice, Client - Logo Design"
                  className={`w-full border-2 rounded-xl p-3 focus:outline-none transition-colors ${errors.nickname ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-primary-400'}`}
                />
                {errors.nickname && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.nickname}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Solana Wallet Address *</label>
                <SnsAddressInput
                  value={form.addressInput}
                  onChange={(raw, resolved, snsName) =>
                    setForm(f => ({
                      ...f,
                      addressInput: raw,
                      resolvedAddress: resolved || (!snsName ? raw : ''),
                      snsName: snsName || '',
                    }))
                  }
                  error={errors.address}
                  inputClassName="p-3"
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.address}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Note (optional)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Roommate, Client - Logo project"
                  className="w-full border-2 border-gray-200 focus:border-primary-400 rounded-xl p-3 text-sm focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={cancelForm} className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  {editingId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setErrors({}); }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 font-semibold py-4 rounded-2xl transition-colors"
            >
              <Plus size={18} /> Add Contact
            </button>
          )}

          {contacts.length === 0 && !showForm ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <Contact2 className="text-gray-400" size={28} />
              </div>
              <p className="text-gray-700 font-semibold">No contacts yet</p>
              <p className="text-sm text-gray-400">Add frequently used wallets to save time when sending payments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
              {contacts.map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-700 font-bold text-base">
                        {c.nickname.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.nickname}</p>
                        {c.snsName ? (
                          <p className="text-xs font-mono text-gray-400 truncate">
                            {c.snsName} ({c.address.slice(0, 4)}…{c.address.slice(-4)})
                          </p>
                        ) : (
                          <p className="text-xs font-mono text-gray-400 truncate">{c.address.slice(0, 8)}...{c.address.slice(-6)}</p>
                        )}
                        {c.note && <p className="text-xs text-gray-500 mt-0.5 italic">{c.note}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => startEdit(c)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => setDeleteConfirm(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {deleteConfirm === c.id && (
                    <div className="bg-red-50 rounded-xl p-3 space-y-2">
                      <p className="text-sm text-red-700 font-semibold">Delete "{c.nickname}"?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 text-sm border border-gray-200 bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={() => handleDelete(c.id)} className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors">Delete</button>
                      </div>
                    </div>
                  )}

                  {deleteConfirm !== c.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendPayment(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary-500 hover:bg-primary-600 active:scale-95 text-white text-sm font-semibold py-2.5 rounded-xl transition-all min-h-[44px]"
                      >
                        <Send size={14} /> Send Payment
                      </button>
                      <button
                        onClick={() => handleUseInSplit(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 border-2 border-secondary-200 text-secondary-700 hover:bg-secondary-50 active:scale-95 text-sm font-semibold py-2.5 rounded-xl transition-all min-h-[44px]"
                      >
                        <Users size={14} /> Use in Split
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
