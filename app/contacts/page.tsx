"use client";

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, User } from 'lucide-react';


const CONTACTS_KEY = 'solvio_contacts';

interface Contact {
  id: string;
  name: string;
  address: string;
  nickname?: string;
  snsName?: string;
  note?: string;
  createdAt?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');


  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
      // Defensive: filter to array of objects with id, name, address
      if (Array.isArray(saved)) {
        setContacts(saved.filter(c => c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.address === 'string'));
      } else {
        setContacts([]);
      }
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
      address: address.trim(),
      createdAt: new Date().toISOString(),
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
          <UserPlus size={16} />
          Add Contact
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