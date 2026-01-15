'use client';  // এটা খুব জরুরি! কারণ Supabase ক্লায়েন্ট সাইডে কাজ করে

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// তোমার Supabase প্রজেক্টের URL আর Anon Key দাও (environment variable থেকে)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function ConsentPage() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get('authorization_id');  // Supabase এটা পাঠায়

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authorizationId) {
      setError('কোনো authorization ID পাওয়া যায়নি। আবার OAuth শুরু করো।');
      setLoading(false);
      return;
    }

    async function getDetails() {
      try {
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (error) throw error;
        setDetails(data);
      } catch (err: any) {
        setError('ডিটেইলস লোড করতে সমস্যা: ' + (err.message || 'অজানা এরর। সম্ভবত সময় শেষ হয়ে গেছে।'));
      } finally {
        setLoading(false);
      }
    }

    getDetails();
  }, [authorizationId]);

  const handleApprove = async () => {
    if (!authorizationId) return;
    try {
      await supabase.auth.oauth.approveAuthorization(authorizationId);
      // Supabase নিজে redirect করে দেবে
    } catch (err: any) {
      alert('Approve করতে সমস্যা: ' + err.message);
    }
  };

  const handleDeny = async () => {
    if (!authorizationId) return;
    try {
      await supabase.auth.oauth.denyAuthorization(authorizationId);
      // অথবা home-এ redirect: window.location.href = '/';
    } catch (err: any) {
      alert('Deny করতে সমস্যা: ' + err.message);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Connecting to NexusConnect... দয়া করে অপেক্ষা করুন</div>;
  }

  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', padding: '50px' }}>
      <h2>সমস্যা হয়েছে</h2>
      <p>{error}</p>
      <p>টিপ: পেজ রিফ্রেশ করলে বা দেরি করলে এমন হয়। OAuth আবার শুরু করো।</p>
    </div>;
  }

  if (!details) {
    return <div style={{ textAlign: 'center' }}>কোনো ডিটেইলস পাওয়া যায়নি।</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <h1>অ্যাপকে অ্যাক্সেস দিতে চাও?</h1>
      <p>অ্যাপ নাম: {details.client?.name || 'অজানা অ্যাপ'}</p>
      <p>যা অ্যাক্সেস করবে: {details.scopes?.join(', ') || 'কিছু না'}</p>
      <button 
        onClick={handleApprove} 
        style={{ background: 'green', color: 'white', padding: '15px 30px', fontSize: '18px', margin: '10px' }}
      >
        Allow (অনুমতি দাও)
      </button>
      <button 
        onClick={handleDeny} 
        style={{ background: 'red', color: 'white', padding: '15px 30px', fontSize: '18px', margin: '10px' }}
      >
        Deny (অস্বীকার করো)
      </button>
    </div>
  );
}
