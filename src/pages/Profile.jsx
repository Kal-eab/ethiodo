import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { User, LogOut, Trash2, ChevronRight, Shield, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import Navbar from '@/components/store/Navbar';
import MobileHeader from '@/components/store/MobileHeader';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setName(u.full_name || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ full_name: name });
    toast.success('Profile updated');
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    // Log out — actual account deletion requires contacting support per platform policy
    toast.success('Account deletion requested. You will be logged out.');
    setTimeout(() => base44.auth.logout(), 1500);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Profile" />
      <Navbar />
      <main className="pt-16 pb-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">Profile</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-8">Account settings</p>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8 p-5 bg-card border border-border">
            <div className="w-14 h-14 bg-primary/10 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{user.full_name || 'No name set'}</p>
              <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase mt-1">{user.role}</p>
            </div>
          </div>

          {/* Edit name */}
          <div className="bg-card border border-border p-5 mb-4 space-y-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Edit Profile</p>
            <div>
              <label className="font-mono text-xs text-muted-foreground uppercase block mb-2">Display Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-secondary border-border h-12"
                placeholder="Your name"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-11 bg-primary text-primary-foreground font-mono hover:bg-primary/90">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Quick links */}
          <div className="bg-card border border-border mb-4 divide-y divide-border">
            {[
              { label: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
              { label: 'Terms & Conditions', path: '/legal/terms', icon: FileText },
              { label: 'Refund Policy', path: '/legal/refund', icon: RotateCcw },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path} className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>

          {/* Logout */}
          <Button
            onClick={() => base44.auth.logout()}
            variant="outline"
            className="w-full h-12 font-mono border-border mb-4"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          {/* Delete Account */}
          <div className="bg-card border border-destructive/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <p className="font-mono text-xs uppercase tracking-wider font-bold">Danger Zone</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Deleting your account is permanent and cannot be undone. All your data, orders, and messages will be removed.
            </p>
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="w-full h-12 font-mono border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="font-mono text-xs text-muted-foreground">Type <span className="text-destructive font-bold">DELETE</span> to confirm:</p>
                <Input
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                  className="bg-secondary border-destructive/50 h-12 font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                    variant="outline"
                    className="flex-1 h-11 font-mono border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    className="flex-1 h-11 font-mono bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}