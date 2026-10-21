import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

const LOCAL_STORAGE_KEY = 'bikeRentalRecords_v2';

export function useRecords(user) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load records
  const fetchRecords = useCallback(async () => {
    if (!isSupabaseConfigured() || !user || user.isHardcoded) {
      // Local fallback
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        setRecords(raw ? JSON.parse(raw) : []);
      } catch {
        setRecords([]);
      }
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rental_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map Supabase snake_case fields back to React camelCase state
      const mapped = data.map(item => ({
        id: item.id,
        entryDate: item.entry_date,
        customerName: item.customer_name,
        customerPhone: item.customer_phone,
        customerAddress: item.customer_address,
        bikeModel: item.bike_model,
        bikeNumber: item.bike_number,
        dateFrom: item.date_from,
        dateTo: item.date_to,
        duration: item.duration,
        rentAmount: parseFloat(item.rent_amount) || 0,
        safetyDeposit: parseFloat(item.safety_deposit) || 0,
        advanceAmount: parseFloat(item.advance_amount) || 0,
        paidAmount: parseFloat(item.paid_amount) || 0,
        balanceDue: parseFloat(item.balance_due) || 0,
        notes: item.notes,
        aadharCard: item.aadhar_card ? JSON.parse(item.aadhar_card) : null,
        drivingLicense: item.driving_license ? JSON.parse(item.driving_license) : null,
      }));

      setRecords(mapped);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Upload file helper
  const uploadFile = async (file, path) => {
    if (!supabase || !file) return null;
    const { data, error } = await supabase.storage
      .from('rental_docs')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('rental_docs')
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  };

  const addRecord = useCallback(async (record, aadharFile, dlFile) => {
    if (!isSupabaseConfigured() || !user || user.isHardcoded) {
      // Local fallback
      setRecords(prev => {
        const next = [record, ...prev];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return;
    }

    try {
      let aadharUrl = null;
      let dlUrl = null;

      // Upload file blobs to Supabase storage if provided
      if (aadharFile) {
        const ext = aadharFile.name.split('.').pop();
        const path = `${user.id}/${record.id}_aadhar.${ext}`;
        aadharUrl = await uploadFile(aadharFile, path);
      }

      if (dlFile) {
        const ext = dlFile.name.split('.').pop();
        const path = `${user.id}/${record.id}_dl.${ext}`;
        dlUrl = await uploadFile(dlFile, path);
      }

      const dbRecord = {
        entry_date: record.entryDate,
        customer_name: record.customerName,
        customer_phone: record.customerPhone,
        customer_address: record.customerAddress,
        bike_model: record.bikeModel,
        bike_number: record.bikeNumber,
        date_from: record.dateFrom,
        date_to: record.dateTo,
        duration: record.duration,
        rent_amount: record.rentAmount,
        safety_deposit: record.safetyDeposit,
        advance_amount: record.advanceAmount,
        paid_amount: record.paidAmount,
        balance_due: record.balanceDue,
        notes: record.notes,
        user_id: user.id,
        aadhar_card: record.aadharCard ? JSON.stringify({ ...record.aadharCard, data: aadharUrl || record.aadharCard.data }) : null,
        driving_license: record.drivingLicense ? JSON.stringify({ ...record.drivingLicense, data: dlUrl || record.drivingLicense.data }) : null,
      };

      const { data, error } = await supabase
        .from('rental_records')
        .insert([dbRecord])
        .select();

      if (error) throw error;
      fetchRecords();
    } catch (e) {
      console.error('Failed to save to Supabase:', e);
      throw e;
    }
  }, [user, fetchRecords]);

  const updateRecord = useCallback(async (id, updatedData) => {
    if (!isSupabaseConfigured() || !user || user.isHardcoded) {
      // Local fallback
      setRecords(prev => {
        const next = prev.map(r => r.id === id ? { ...r, ...updatedData } : r);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return;
    }

    try {
      // Map update fields back to snake_case for DB
      const dbUpdate = {};
      if (updatedData.advanceAmount !== undefined) dbUpdate.advance_amount = updatedData.advanceAmount;
      if (updatedData.paidAmount !== undefined) dbUpdate.paid_amount = updatedData.paidAmount;
      if (updatedData.balanceDue !== undefined) dbUpdate.balance_due = updatedData.balanceDue;

      const { error } = await supabase
        .from('rental_records')
        .update(dbUpdate)
        .eq('id', id);

      if (error) throw error;
      fetchRecords();
    } catch (e) {
      console.error('Failed to update in Supabase:', e);
      throw e;
    }
  }, [user, fetchRecords]);

  const deleteRecord = useCallback(async (id) => {
    if (!isSupabaseConfigured() || !user || user.isHardcoded) {
      // Local fallback
      setRecords(prev => {
        const next = prev.filter(r => r.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rental_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRecords();
    } catch (e) {
      console.error('Failed to delete from Supabase:', e);
      throw e;
    }
  }, [user, fetchRecords]);

  const clearAll = useCallback(async () => {
    if (!isSupabaseConfigured() || !user || user.isHardcoded) {
      // Local fallback
      setRecords([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    try {
      const { error } = await supabase
        .from('rental_records')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setRecords([]);
    } catch (e) {
      console.error('Failed to clear records:', e);
    }
  }, [user]);

  const stats = {
    total: records.length,
    today: records.filter(r => {
      const today = new Date().toDateString();
      return new Date(r.entryDate).toDateString() === today;
    }).length,
    revenue: records.reduce((s, r) => s + (r.rentAmount || 0), 0),
    deposit: records.reduce((s, r) => s + (r.safetyDeposit || 0), 0),
  };

  return { records, loading, addRecord, updateRecord, deleteRecord, clearAll, stats };
}
